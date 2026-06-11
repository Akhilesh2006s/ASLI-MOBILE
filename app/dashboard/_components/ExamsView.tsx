import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAnimatedProps } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import GlassCard from '../../../src/components/student/GlassCard';
import ChipNav from '../../../src/components/student/ChipNav';
import StudentFilterDropdown from '../../../src/components/student/StudentFilterDropdown';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import { AnimatedStatInput, useCountUp } from '../../../src/hooks/useCountUp';
import {
  STUDENT,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';
import {
  examMatchesStudentAssignedClass,
  getExamClassLabelsForStudent,
  normalizeClassNumber,
} from '../../../src/lib/exam-classes';
import { dedupeStudentExamResults } from '../../../src/lib/dedupe-exam-results';
import ExamResultsView from '../../../src/components/student/ExamResultsView';
import RankingsTab from './RankingsTab';
import DonutChart from '../../../src/components/ui/charts/DonutChart';
import {
  ExamAnalysisResult,
  buildQuestionDistributionSegments,
  formatAttemptHistoryLabel,
  formatReviewResultForAnalysis,
  getDisplayPercentage,
  getExamResultRowId,
  getMarksPercentage,
  normalizeExamResultFromApi,
} from '../../../src/lib/exam-analysis-helpers';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxAttempts?: number;
  assignedClasses?: string[] | string;
  classNumber?: string;
  subjects?: string[];
  subject?: string;
  questions?: any[];
}

interface ExamResult {
  examId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeTaken: number;
}

type CalendarFocusExam = {
  examId: string;
  mode: 'upcoming' | 'ended' | 'live' | 'completed';
  title: string;
  startDate: string;
  endDate: string;
  scoreLabel?: string;
  completedAt?: string;
};

type ExamsViewProps = {
  dark?: boolean;
  initialTab?: 'available' | 'attempted' | 'ranking' | 'upcoming';
  focusExamId?: string | null;
  onFocusExamHandled?: () => void;
};

const ATTEMPTED_CARD_SCHEMES = [
  { gradient: [STUDENT.warning, STUDENT.statGradients.today[0]] as const, typeBadgeBg: 'rgba(249,115,22,0.25)', typeBadgeText: STUDENT.textOnPrimary },
  { gradient: [STUDENT.accent, STUDENT.statGradients.study[1]] as const, typeBadgeBg: 'rgba(14,165,233,0.25)', typeBadgeText: STUDENT.textOnPrimary },
  { gradient: [STUDENT.primaryLight, STUDENT.primary] as const, typeBadgeBg: 'rgba(20,184,166,0.25)', typeBadgeText: STUDENT.textOnPrimary },
];

function CountUpText({
  target,
  suffix = '',
  prefix = '',
  style,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  style?: object;
}) {
  const value = useCountUp(target, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(value.value)}${suffix}`,
  }));

  return (
    <AnimatedStatInput
      animatedProps={animatedProps as never}
      editable={false}
      style={style}
      underlineColorAndroid="transparent"
    />
  );
}

const EXAMS_TABLET_MIN_WIDTH = 768;
const EXAMS_GRID_MIN_WIDTH = 1024;
const EXAMS_CONTENT_MAX_WIDTH = 1040;
const EXAMS_CARD_MAX_WIDTH = 680;

export default function ExamsView({
  initialTab = 'available',
  focusExamId,
  onFocusExamHandled,
}: ExamsViewProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= EXAMS_TABLET_MIN_WIDTH;
  const isGridLayout = width >= EXAMS_GRID_MIN_WIDTH;
  const attemptedCardWidth = isGridLayout
    ? (Math.min(width, EXAMS_CONTENT_MAX_WIDTH) - STUDENT_SPACING.lg * 2 - STUDENT_SPACING.md) / 2
    : isTablet
      ? Math.min(width - STUDENT_SPACING.lg * 2, EXAMS_CARD_MAX_WIDTH)
      : undefined;
  const [activeTab, setActiveTab] = useState<'available' | 'attempted' | 'ranking' | 'upcoming'>(initialTab);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [selectedAttemptByExam, setSelectedAttemptByExam] = useState<Record<string, string>>({});
  const [attemptPickerExamId, setAttemptPickerExamId] = useState<string | null>(null);
  const [showExamResults, setShowExamResults] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState<{
    exam: Exam;
    result: ExamAnalysisResult;
  } | null>(null);
  const [loadingExamResults, setLoadingExamResults] = useState(false);
  const [calendarFocusExam, setCalendarFocusExam] = useState<CalendarFocusExam | null>(null);
  const handledFocusExamIdRef = useRef<string | null>(null);

  const studentClassNumber = normalizeClassNumber(user?.classNumber);

  useEffect(() => {
    fetchUser();
    fetchExams();
    fetchResults();
    fetchRankings();
  }, []);

  const fetchUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const examsList = Array.isArray(data) ? data : (data.data || data.exams || []);
        setExams(examsList);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rows = data.data || data || [];
        setResults(Array.isArray(rows) ? rows.map(normalizeExamResultFromApi) : []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setResultsLoaded(true);
    }
  };

  const fetchRankings = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/rankings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRankings(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    }
  };

  const getExamIdFromResult = useCallback((result: any): string | null => {
    if (!result || !result.examId) return null;
    if (typeof result.examId === 'object' && result.examId._id) {
      return result.examId._id.toString();
    }
    return result.examId.toString();
  }, []);

  const getMaxAttemptsForExam = (exam: Exam): number =>
    Math.max(1, Number(exam.maxAttempts) || 1);

  const getExamSubjects = (exam: Exam): string[] => {
    const qSubjects = Array.isArray(exam.questions)
      ? exam.questions
          .map((q) => String(q?.subject || '').trim().toLowerCase())
          .filter(Boolean)
      : [];
    const merged = [
      ...qSubjects,
      ...(Array.isArray(exam.subjects) ? exam.subjects : []),
      exam.subject,
    ]
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(merged));
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'upcoming', color: '#fbbf24', bg: '#fef3c7' };
    if (now > endDate) return { status: 'ended', color: '#ef4444', bg: '#fee2e2' };
    return { status: 'active', color: '#10b981', bg: '#d1fae5' };
  };

  const classFilteredExams = useMemo(
    () => exams.filter((e) => examMatchesStudentAssignedClass(e, user?.classNumber)),
    [exams, user?.classNumber]
  );

  const availableSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    classFilteredExams.forEach((exam) => {
      getExamSubjects(exam).forEach((s) => set.add(s));
    });
    return Array.from(set.values()).sort();
  }, [classFilteredExams]);

  const subjectFilteredExams = useMemo(
    () =>
      classFilteredExams.filter((exam) => {
        if (examSubjectFilter === 'all') return true;
        return getExamSubjects(exam).includes(String(examSubjectFilter).toLowerCase());
      }),
    [classFilteredExams, examSubjectFilter]
  );

  const dedupedExamResults = useMemo(
    () => dedupeStudentExamResults(results, getExamIdFromResult),
    [results, getExamIdFromResult]
  );

  const attemptCountByExamId = useMemo(() => {
    const m = new Map<string, number>();
    for (const result of dedupedExamResults) {
      const id = getExamIdFromResult(result);
      if (!id) continue;
      const k = String(id);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [dedupedExamResults, getExamIdFromResult]);

  const availableActiveExams = useMemo(
    () =>
      subjectFilteredExams.filter((exam) => {
        const examId = String(exam._id || '');
        if (!examId) return false;
        const used = attemptCountByExamId.get(examId) || 0;
        if (used >= getMaxAttemptsForExam(exam)) return false;
        const hydratedQuestionCount = Array.isArray(exam.questions) ? exam.questions.length : 0;
        if (hydratedQuestionCount <= 0) return false;
        const now = new Date();
        const startDate = new Date(exam.startDate);
        const endDate = new Date(exam.endDate);
        const isActiveByDate = now >= startDate && now <= endDate;
        return exam.isActive !== false && isActiveByDate;
      }),
    [subjectFilteredExams, attemptCountByExamId]
  );

  const attemptedResultRows = useMemo(() => {
    const filtered = dedupedExamResults.filter((result) => {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) return false;
      if (examSubjectFilter === 'all') return true;
      const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
      if (!catalogExam) return true;
      if (!examMatchesStudentAssignedClass(catalogExam, user?.classNumber)) return false;
      return getExamSubjects(catalogExam).includes(String(examSubjectFilter).toLowerCase());
    });

    const latestByExam = new Map<string, any>();
    for (const result of filtered) {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) continue;
      const key = String(examIdStr);
      const existing = latestByExam.get(key);
      if (!existing) {
        latestByExam.set(key, result);
        continue;
      }
      const attNew = Number(result.attemptNumber) >= 1 ? Number(result.attemptNumber) : 1;
      const attOld = Number(existing.attemptNumber) >= 1 ? Number(existing.attemptNumber) : 1;
      const dateNew = new Date(result.completedAt || 0).getTime();
      const dateOld = new Date(existing.completedAt || 0).getTime();
      if (attNew > attOld || (attNew === attOld && dateNew > dateOld)) {
        latestByExam.set(key, result);
      }
    }

    return Array.from(latestByExam.values()).sort(
      (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );
  }, [dedupedExamResults, exams, examSubjectFilter, getExamIdFromResult, user?.classNumber]);

  const attemptHistoryByExamId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const result of dedupedExamResults) {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) continue;
      if (examSubjectFilter !== 'all') {
        const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
        if (
          catalogExam &&
          !getExamSubjects(catalogExam).includes(String(examSubjectFilter).toLowerCase())
        ) {
          continue;
        }
      }
      const key = String(examIdStr);
      const list = map.get(key) || [];
      list.push(result);
      map.set(key, list);
    }
    Array.from(map.entries()).forEach(([key, list]) => {
      list.sort((a, b) => {
        const attA = Number(a.attemptNumber) >= 1 ? Number(a.attemptNumber) : 1;
        const attB = Number(b.attemptNumber) >= 1 ? Number(b.attemptNumber) : 1;
        if (attB !== attA) return attB - attA;
        return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
      });
      map.set(key, list);
    });
    return map;
  }, [dedupedExamResults, exams, examSubjectFilter, getExamIdFromResult]);

  const upcomingExams = useMemo(
    () => subjectFilteredExams.filter((exam) => getExamStatus(exam).status === 'upcoming'),
    [subjectFilteredExams]
  );

  const findExamForResult = (examIdStr: string, result: any): Exam => {
    const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
    if (catalogExam) return catalogExam;
    return {
      _id: examIdStr,
      title: result.examTitle || result.examId?.title || 'Exam',
      description: '',
      examType: 'practice',
      duration: 0,
      totalQuestions: result.totalQuestions || 0,
      totalMarks: result.totalMarks || 0,
      startDate: '',
      endDate: '',
      isActive: false,
    };
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'mains':
      case 'advanced':
        return { bg: STUDENT.accentSoft, text: STUDENT.accent };
      case 'weekend':
        return { bg: STUDENT.navActiveBg, text: STUDENT.success };
      case 'practice':
        return { bg: 'rgba(245,158,11,0.15)', text: STUDENT.warning };
      default:
        return { bg: STUDENT.surfaceHover, text: STUDENT.textMuted };
    }
  };

  const openAttemptedExamResults = async (exam: Exam, displayResult: any) => {
    const attemptNum =
      Number(displayResult.attemptNumber) >= 1 ? Number(displayResult.attemptNumber) : 1;
    setLoadingExamResults(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const reviewQs =
        displayResult._id != null && String(displayResult._id).trim() !== ''
          ? `?resultId=${encodeURIComponent(String(displayResult._id))}`
          : '';
      const reviewResponse = await fetch(
        `${API_BASE_URL}/api/student/exam-results/${exam._id}/review${reviewQs}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let examWithQuestions = exam;
      let reviewResult = displayResult;
      let reviewedQuestions: any[] = [];

      if (reviewResponse.ok) {
        const reviewJson = await reviewResponse.json();
        reviewResult = reviewJson?.data?.result || displayResult;
        reviewedQuestions = reviewJson?.data?.questions || [];
        examWithQuestions = {
          ...exam,
          questions: reviewedQuestions,
          totalQuestions: reviewJson?.data?.exam?.totalQuestions || exam.totalQuestions,
          totalMarks: reviewJson?.data?.exam?.totalMarks || exam.totalMarks,
          title: reviewJson?.data?.exam?.title || exam.title,
        };
      } else {
        const response = await fetch(`${API_BASE_URL}/api/student/exams/${exam._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          examWithQuestions = data.data || exam;
        }
      }

      const formattedResult = formatReviewResultForAnalysis(
        { ...reviewResult, attemptNumber: Number(reviewResult.attemptNumber) >= 1 ? Number(reviewResult.attemptNumber) : attemptNum },
        exam,
        examWithQuestions,
        displayResult
      );

      setSelectedExamForResults({ exam: examWithQuestions, result: formattedResult });
      setShowExamResults(true);
    } catch (error) {
      console.error('Failed to load exam review:', error);
      setSelectedExamForResults({
        exam,
        result: {
          ...displayResult,
          examId: getExamIdFromResult(displayResult) || exam._id,
          examTitle: displayResult.examTitle || exam.title,
        },
      });
      setShowExamResults(true);
    } finally {
      setLoadingExamResults(false);
    }
  };

  const handleStartExam = (exam: Exam) => {
    const maxA = getMaxAttemptsForExam(exam);
    const used = attemptCountByExamId.get(String(exam._id)) || 0;
    if (used >= maxA) {
      Alert.alert(
        'No Attempts Left',
        `You have used all ${maxA} attempt(s) for this exam. Open "Attempted Exams" to review your results.`
      );
      return;
    }

    router.push(`/exam/${exam._id}`);
  };

  useEffect(() => {
    if (!focusExamId?.trim()) {
      handledFocusExamIdRef.current = null;
      return;
    }
    if (isLoading || !exams.length || !resultsLoaded) return;
    if (handledFocusExamIdRef.current === focusExamId) return;

    const targetId = focusExamId.trim();
    const exam = exams.find((e) => String(e._id) === targetId);
    handledFocusExamIdRef.current = targetId;
    onFocusExamHandled?.();

    if (!exam) {
      setActiveTab('available');
      return;
    }

    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    const scheduleLabel = {
      title: exam.title || 'Exam',
      startDate: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      endDate: end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    const attempts = attemptCountByExamId.get(targetId) || 0;
    if (attempts > 0) {
      const latest = attemptedResultRows.find((r) => getExamIdFromResult(r) === targetId);
      const scoreLabel = latest
        ? `${latest.obtainedMarks || 0}/${latest.totalMarks || exam.totalMarks} (${getDisplayPercentage(latest)}%)`
        : undefined;
      const completedAt = latest?.completedAt
        ? new Date(latest.completedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : undefined;
      setCalendarFocusExam({
        examId: targetId,
        mode: 'completed',
        ...scheduleLabel,
        scoreLabel,
        completedAt,
      });
      setActiveTab('attempted');
      return;
    }

    if (now < start) {
      setCalendarFocusExam({ examId: targetId, mode: 'upcoming', ...scheduleLabel });
      setActiveTab('upcoming');
      return;
    }

    if (now > end) {
      setCalendarFocusExam({ examId: targetId, mode: 'ended', ...scheduleLabel });
      setActiveTab('attempted');
      return;
    }

    setCalendarFocusExam({ examId: targetId, mode: 'live', ...scheduleLabel });
    setActiveTab('available');
  }, [
    focusExamId,
    exams,
    isLoading,
    resultsLoaded,
    attemptCountByExamId,
    attemptedResultRows,
    getExamIdFromResult,
    onFocusExamHandled,
  ]);

  const examTabChips = useMemo(
    () => [
      { id: 'available', label: 'Available Exams' },
      { id: 'attempted', label: 'Attempted Exams' },
      { id: 'ranking', label: 'My Rankings' },
      { id: 'upcoming', label: 'Upcoming' },
    ],
    []
  );

  const subjectFilterOptions = useMemo(
    () => [
      {
        value: 'all',
        label: 'All subjects',
        count: classFilteredExams.length,
      },
      ...availableSubjectOptions.map((subject) => ({
        value: subject,
        label: subject.charAt(0).toUpperCase() + subject.slice(1),
        count: classFilteredExams.filter((exam) =>
          getExamSubjects(exam).includes(subject)
        ).length,
      })),
    ],
    [availableSubjectOptions, classFilteredExams]
  );

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, compact && { marginBottom: 14 }]}>
        <Text style={[styles.headerTitle, compact && { fontSize: 26 }]}>Exams</Text>
        <Text style={styles.headerSubtitle}>Take practice exams and track your progress</Text>
        <View style={styles.filtersRow}>
          {studentClassNumber ? (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Class</Text>
              <View style={styles.classBadge}>
                <Text style={styles.classBadgeText}>Class {studentClassNumber}</Text>
              </View>
            </View>
          ) : null}
          <StudentFilterDropdown
            label="Subject"
            placeholder="All subjects"
            value={examSubjectFilter}
            options={subjectFilterOptions}
            onChange={setExamSubjectFilter}
          />
        </View>
      </View>

      <View style={[styles.tabsContainer, compact && { marginBottom: 14 }]}>
        <ChipNav
          chips={examTabChips}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />
      </View>

      {calendarFocusExam ? (
        <View
          style={[
            styles.calendarFocusBanner,
            calendarFocusExam.mode === 'upcoming'
              ? styles.calendarFocusUpcoming
              : calendarFocusExam.mode === 'live'
                ? styles.calendarFocusLive
                : calendarFocusExam.mode === 'completed'
                  ? styles.calendarFocusCompleted
                  : styles.calendarFocusEnded,
          ]}
        >
          <View style={styles.calendarFocusTextWrap}>
            <Text style={styles.calendarFocusTitle}>
              {calendarFocusExam.mode === 'upcoming'
                ? 'Upcoming exam'
                : calendarFocusExam.mode === 'live'
                  ? 'Live exam'
                  : calendarFocusExam.mode === 'completed'
                    ? 'Exam completed'
                    : 'Past exam'}{' '}
              — {calendarFocusExam.title}
            </Text>
            <Text style={styles.calendarFocusSub}>
              {calendarFocusExam.mode === 'upcoming'
                ? `Opens ${calendarFocusExam.startDate} · Closes ${calendarFocusExam.endDate}. You can start it once the exam window begins.`
                : calendarFocusExam.mode === 'live'
                  ? `Open now until ${calendarFocusExam.endDate}. Tap Start Exam on the card below when you are ready.`
                  : calendarFocusExam.mode === 'completed'
                    ? calendarFocusExam.scoreLabel
                      ? `You scored ${calendarFocusExam.scoreLabel}${
                          calendarFocusExam.completedAt ? ` on ${calendarFocusExam.completedAt}` : ''
                        }. Review your attempt below.`
                      : 'You have already completed this exam. Review your attempt below.'
                    : `Ran ${calendarFocusExam.startDate} – ${calendarFocusExam.endDate}. Check your attempts below if you already took it.`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.calendarFocusDismiss}
            onPress={() => setCalendarFocusExam(null)}
          >
            <Text style={styles.calendarFocusDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Available Exams Tab */}
      {activeTab === 'available' && (
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : availableActiveExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Available Exams</Text>
              <Text style={styles.emptyStateText}>
                No active exams are available right now. Check Upcoming for scheduled exams.
              </Text>
            </View>
          ) : (
            <View style={[styles.examsList, isTablet && styles.examsListTablet]}>
              {availableActiveExams.map((exam) => {
                const status = getExamStatus(exam);
                const typeColor = getExamTypeColor(exam.examType);
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                const usedAttempts = attemptCountByExamId.get(String(exam._id)) || 0;
                const maxAttempts = getMaxAttemptsForExam(exam);
                const hydratedQuestionCount = Array.isArray(exam.questions)
                  ? exam.questions.length
                  : Number(exam.totalQuestions || 0);
                const isCalendarFocus =
                  calendarFocusExam?.examId === String(exam._id) &&
                  calendarFocusExam.mode === 'live';
                return (
                  <GlassCard
                    key={exam._id}
                    variant="elevated"
                    padding={16}
                    style={[styles.examCardWrap, isCalendarFocus && styles.examCardFocused]}
                    onPress={() => handleStartExam(exam)}
                  >
                    <View style={styles.examHeader}>
                      <View style={[styles.examTypeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.examTypeText, { color: typeColor.text }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.classPill}>
                          <Text style={styles.classPillText}>Class {cl}</Text>
                        </View>
                      ))}
                      <View style={[styles.examStatusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.examStatusText, { color: status.color }]}>
                          {status.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    {exam.description && (
                      <Text style={styles.examDescription} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    )}
                    <View style={styles.examStats}>
                      <View style={styles.examStat}>
                        <Ionicons name="time-outline" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.duration} minutes</Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="book-outline" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>
                          {hydratedQuestionCount} questions • {exam.totalMarks} marks
                        </Text>
                      </View>
                      {exam.startDate && exam.endDate ? (
                        <View style={styles.examStat}>
                          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                          <Text style={styles.examStatText}>
                            {new Date(exam.startDate).toLocaleDateString()} -{' '}
                            {new Date(exam.endDate).toLocaleDateString()}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.examStat}>
                        <Ionicons name="locate-outline" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>
                          Attempts: {usedAttempts} / {maxAttempts}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleStartExam(exam)}
                    >
                      <Text style={styles.startButtonText}>Start Exam</Text>
                    </TouchableOpacity>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Attempted Exams Tab */}
      {activeTab === 'attempted' && (
        <View style={styles.content}>
          {attemptedResultRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Attempted Exams</Text>
              <Text style={styles.emptyStateText}>You haven't attempted any exams yet.</Text>
            </View>
          ) : (
            <View
              style={[
                styles.examsList,
                styles.attemptedListContent,
                isTablet && styles.attemptedListTablet,
                isGridLayout && styles.attemptedListGrid,
              ]}
            >
              {attemptedResultRows.map((result, index) => {
                const examIdStr = getExamIdFromResult(result);
                if (!examIdStr) return null;
                const exam = findExamForResult(examIdStr, result);
                const scheme = ATTEMPTED_CARD_SCHEMES[index % ATTEMPTED_CARD_SCHEMES.length];
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                const attemptHistory = attemptHistoryByExamId.get(examIdStr) || [result];
                const totalAttempts = attemptHistory.length;
                const selectedRowId = selectedAttemptByExam[examIdStr];
                const displayResult =
                  (selectedRowId &&
                    attemptHistory.find((r) => getExamResultRowId(r) === selectedRowId)) ||
                  attemptHistory[0] ||
                  result;
                const displayPercentage = getDisplayPercentage(displayResult);
                const marksPercentage = getMarksPercentage(displayResult);
                const gradePct =
                  (displayResult.totalMarks || exam.totalMarks || 0) > 0
                    ? marksPercentage
                    : displayPercentage;
                const grade =
                  gradePct >= 70 ? 'Excellent' : gradePct >= 50 ? 'Good' : 'Needs Improvement';
                const gradeBg =
                  gradePct >= 70 ? '#16a34a' : gradePct >= 50 ? '#ca8a04' : '#dc2626';
                const totalMarksDisplay = displayResult.totalMarks || exam.totalMarks;
                const obtainedMarksDisplay = Number(displayResult.obtainedMarks ?? 0);
                const distributionSegments = buildQuestionDistributionSegments(displayResult);

                const isCalendarFocus =
                  calendarFocusExam?.examId === examIdStr &&
                  (calendarFocusExam.mode === 'ended' || calendarFocusExam.mode === 'completed');
                return (
                  <LinearGradient
                    key={examIdStr}
                    colors={scheme.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.attemptedCard,
                      isGridLayout ? styles.attemptedCardGridItem : isTablet && styles.attemptedCardTablet,
                      attemptedCardWidth != null ? { width: attemptedCardWidth } : null,
                      isCalendarFocus && styles.examCardFocused,
                    ]}
                  >
                    <View style={[styles.attemptedCardBody, isGridLayout && styles.attemptedCardBodyGrid]}>
                    <Text style={styles.attemptedCardTitle} numberOfLines={isTablet ? 3 : 2}>
                      {exam.title}
                    </Text>
                    {exam.description ? (
                      <Text style={styles.attemptedCardDesc} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    ) : null}
                    <View style={styles.attemptedBadgeRow}>
                      <View style={[styles.attemptedTypeBadge, { backgroundColor: scheme.typeBadgeBg }]}>
                        <Text style={[styles.attemptedTypeBadgeText, { color: scheme.typeBadgeText }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.attemptedClassBadge}>
                          <Text style={styles.attemptedClassBadgeText}>Class {cl}</Text>
                        </View>
                      ))}
                    </View>

                    {totalAttempts > 1 ? (
                      <View style={styles.attemptPickerSection}>
                        <Text style={styles.attemptPickerLabel}>View attempt</Text>
                        <TouchableOpacity
                          style={styles.attemptPickerTrigger}
                          onPress={() => setAttemptPickerExamId(examIdStr)}
                        >
                          <Text style={styles.attemptPickerValue} numberOfLines={1}>
                            {formatAttemptHistoryLabel(displayResult, totalMarksDisplay)}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color="#111827" />
                        </TouchableOpacity>
                      </View>
                    ) : isGridLayout ? (
                      <View style={styles.attemptPickerPlaceholder} />
                    ) : null}

                    <View style={[styles.attemptedCardMetrics, isTablet && styles.attemptedCardMetricsGrid]}>
                      <View style={[styles.attemptedScoreBox, isTablet && styles.attemptedScoreBoxGrid]}>
                        <View style={[styles.attemptedScoreRow, isTablet && styles.attemptedScoreRowGrid]}>
                          <DonutChart
                            size={isTablet ? 68 : 78}
                            centerLabel={`${Math.round(
                              totalMarksDisplay > 0 ? marksPercentage : displayPercentage
                            )}%`}
                            segments={distributionSegments}
                          />
                          <View style={styles.attemptedScoreTextWrap}>
                            <Text style={[styles.attemptedScoreMain, isTablet && styles.attemptedScoreMainGrid]}>
                              {obtainedMarksDisplay}
                              <Text style={styles.attemptedScoreDenom}>/{totalMarksDisplay}</Text>
                            </Text>
                            <Text style={styles.attemptedScoreLabel}>marks</Text>
                            {!isTablet ? (
                              <Text style={styles.attemptedScoreMeta}>
                                {displayResult.correctAnswers || 0} correct · {displayResult.wrongAnswers || 0} wrong ·{' '}
                                {displayResult.unattempted || 0} skipped
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={[styles.attemptedStatsList, isTablet && styles.attemptedStatsListGrid]}>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                            Correct
                          </Text>
                          <Text style={styles.attemptedStatsValue}>{displayResult.correctAnswers || 0}</Text>
                        </View>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                            Wrong
                          </Text>
                          <Text style={styles.attemptedStatsValue}>{displayResult.wrongAnswers || 0}</Text>
                        </View>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                            Unattempted
                          </Text>
                          <Text style={styles.attemptedStatsValue}>{displayResult.unattempted || 0}</Text>
                        </View>
                        <View style={[styles.attemptedStatsRow, isTablet && styles.attemptedStatsRowTablet]}>
                          <Text style={styles.attemptedStatsLabel} numberOfLines={1}>
                            Time
                          </Text>
                          <Text style={styles.attemptedStatsValue} numberOfLines={1}>
                            {displayResult.timeTaken
                              ? `${Math.floor(displayResult.timeTaken / 60)}m ${displayResult.timeTaken % 60}s`
                              : 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    </View>

                    <View
                      style={[
                        styles.attemptedCardFooter,
                        isTablet && styles.attemptedCardFooterAligned,
                        isGridLayout && styles.attemptedCardFooterGridPin,
                      ]}
                    >
                      <View
                        style={[
                          styles.attemptedGradeBadge,
                          isTablet && styles.attemptedGradeBadgeAligned,
                          { backgroundColor: gradeBg },
                        ]}
                      >
                        <Text style={styles.attemptedGradeText} numberOfLines={1}>
                          {grade}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.attemptedDetailsButton,
                          isTablet && styles.attemptedDetailsButtonGrid,
                        ]}
                        disabled={loadingExamResults}
                        onPress={() => void openAttemptedExamResults(exam, displayResult)}
                      >
                        <Ionicons name="eye-outline" size={18} color="#111827" />
                        <Text style={styles.attemptedDetailsButtonText} numberOfLines={1}>
                          View Details
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Rankings Tab */}
      {activeTab === 'ranking' && (
        <View style={styles.content}>
          <RankingsTab rankings={rankings} />
        </View>
      )}

      {/* Upcoming Exams Tab */}
      {activeTab === 'upcoming' && (
        <View style={styles.content}>
          {upcomingExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Upcoming Exams</Text>
              <Text style={styles.emptyStateText}>No upcoming exams scheduled at the moment.</Text>
            </View>
          ) : (
            <View style={[styles.examsList, isTablet && styles.examsListTablet]}>
              {upcomingExams.map((exam) => {
                const typeColor = getExamTypeColor(exam.examType);
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                const isCalendarFocus =
                  calendarFocusExam?.examId === String(exam._id) &&
                  calendarFocusExam.mode === 'upcoming';
                return (
                  <GlassCard
                    key={exam._id}
                    variant="elevated"
                    padding={16}
                    style={[styles.examCardWrap, isCalendarFocus && styles.examCardFocused]}
                  >
                    <View style={styles.examHeader}>
                      <View style={[styles.examTypeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.examTypeText, { color: typeColor.text }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.classPill}>
                          <Text style={styles.classPillText}>Class {cl}</Text>
                        </View>
                      ))}
                      <View style={[styles.examStatusBadge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.examStatusText, { color: '#fbbf24' }]}>
                          UPCOMING
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    {exam.description && (
                      <Text style={styles.examDescription} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    )}
                    <View style={styles.examStats}>
                      <View style={styles.examStat}>
                        <Ionicons name="calendar" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>
                          Starts: {new Date(exam.startDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="time" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.duration} min</Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="help-circle" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.totalQuestions} questions</Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>

      <Modal
        visible={attemptPickerExamId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAttemptPickerExamId(null)}
      >
        <View style={styles.attemptPickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAttemptPickerExamId(null)}
          />
          <View style={styles.attemptPickerSheet}>
            <Text style={styles.attemptPickerSheetTitle}>View attempt</Text>
            {(attemptPickerExamId ? attemptHistoryByExamId.get(attemptPickerExamId) : [])?.map(
              (attemptRow) => {
                const examIdStr = attemptPickerExamId!;
                const exam = findExamForResult(
                  examIdStr,
                  attemptHistoryByExamId.get(examIdStr)?.[0] || attemptRow
                );
                const rowId = getExamResultRowId(attemptRow);
                const selectedRowId = selectedAttemptByExam[examIdStr];
                const displayRowId =
                  selectedRowId ||
                  getExamResultRowId(attemptHistoryByExamId.get(examIdStr)?.[0] || attemptRow);
                const isSelected = rowId === displayRowId;
                return (
                  <TouchableOpacity
                    key={rowId}
                    style={[styles.attemptPickerOption, isSelected && styles.attemptPickerOptionActive]}
                    onPress={() => {
                      setSelectedAttemptByExam((prev) => ({ ...prev, [examIdStr]: rowId }));
                      setAttemptPickerExamId(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.attemptPickerOptionText,
                        isSelected && styles.attemptPickerOptionTextActive,
                      ]}
                    >
                      {formatAttemptHistoryLabel(attemptRow, exam.totalMarks)}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color="#ea580c" /> : null}
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>
      </Modal>

      {loadingExamResults ? (
        <Modal visible transparent animationType="fade">
          <View style={styles.resultsLoadingOverlay}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.resultsLoadingText}>Loading exam details...</Text>
          </View>
        </Modal>
      ) : null}

      {showExamResults && selectedExamForResults ? (
        <Modal
          visible={showExamResults}
          animationType="slide"
          onRequestClose={() => setShowExamResults(false)}
        >
          <ExamResultsView
            result={selectedExamForResults.result}
            examTitle={selectedExamForResults.exam.title}
            onBack={() => setShowExamResults(false)}
            onRetake={() => {
              setShowExamResults(false);
              handleStartExam(selectedExamForResults.exam);
            }}
            attemptsRemaining={Math.max(
              0,
              getMaxAttemptsForExam(selectedExamForResults.exam) -
                (attemptHistoryByExamId.get(String(selectedExamForResults.exam._id))?.length || 0)
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STUDENT.bg,
  },
  scrollContent: {
    paddingBottom: 110,
    flexGrow: 1,
  },
  scrollContentTablet: {
    maxWidth: EXAMS_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: STUDENT_SPACING.xl,
  },
  headerTitle: {
    ...STUDENT_TYPO.hero,
    fontSize: 30,
    color: STUDENT.warning,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: STUDENT.textSecondary,
  },
  filtersRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: STUDENT_SPACING.md,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    fontWeight: '600',
  },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: STUDENT.accentSoft,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  classBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730a3',
  },
  tabsContainer: {
    marginBottom: STUDENT_SPACING.lg,
  },
  shimmerWrap: {
    gap: STUDENT_SPACING.md,
    marginTop: STUDENT_SPACING.sm,
  },
  classPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.text,
  },
  content: {
    paddingTop: 4,
  },
  attemptedListContent: {
    paddingBottom: STUDENT_SPACING.xxl,
    gap: STUDENT_SPACING.lg,
  },
  attemptedListTablet: {
    alignSelf: 'center',
    width: '100%',
  },
  attemptedListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    alignContent: 'flex-start',
  },
  examsListTablet: {
    maxWidth: EXAMS_CARD_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  examCardWrap: {
    marginBottom: STUDENT_SPACING.md,
  },
  examCardFocused: {
    borderWidth: 2,
    borderColor: STUDENT.primary,
  },
  calendarFocusBanner: {
    borderWidth: 1,
    borderRadius: STUDENT_RADIUS.lg,
    padding: 14,
    marginBottom: STUDENT_SPACING.md,
    gap: 10,
  },
  calendarFocusUpcoming: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  calendarFocusLive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  calendarFocusCompleted: {
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
  },
  calendarFocusEnded: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  calendarFocusTextWrap: {
    gap: 4,
  },
  calendarFocusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.text,
  },
  calendarFocusSub: {
    fontSize: 12,
    color: STUDENT.textSecondary,
    lineHeight: 18,
  },
  calendarFocusDismiss: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  calendarFocusDismissText: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  attemptedCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  attemptedCardTablet: {
    alignSelf: 'center',
  },
  attemptedCardGridItem: {
    alignSelf: 'stretch',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  attemptedCardBody: {
    gap: 14,
  },
  attemptedCardBodyGrid: {
    flexGrow: 1,
  },
  attemptedCardMetrics: {
    gap: 12,
  },
  attemptedCardMetricsTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  attemptedCardMetricsCompact: {
    gap: 10,
  },
  attemptedCardMetricsGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  attemptedCardFooter: {
    gap: 10,
  },
  attemptedCardFooterTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attemptedCardFooterCompact: {
    gap: 8,
  },
  attemptedCardFooterAligned: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
  },
  attemptedCardFooterGridPin: {
    marginTop: 'auto',
    flexShrink: 0,
  },
  attemptedGradeBadgeAligned: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    maxWidth: '46%',
    minHeight: 44,
    marginTop: 0,
  },
  attemptedCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
  },
  attemptedCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
  },
  attemptedBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attemptedTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attemptedTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attemptedClassBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attemptedClassBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STUDENT.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: STUDENT.navInactive,
    textAlign: 'center',
  },
  examsList: {
    gap: 0,
  },
  examHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  examTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  examTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  examStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STUDENT.text,
  },
  examDescription: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  examStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  examStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examStatText: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  startButton: {
    backgroundColor: STUDENT.accent,
    paddingVertical: 12,
    borderRadius: STUDENT_RADIUS.sm,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonText: {
    color: STUDENT.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  resultStats: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  resultStat: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  attemptedScoreBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  attemptedScoreBoxTablet: {
    flex: 1,
    minWidth: 0,
    maxWidth: 300,
    justifyContent: 'center',
  },
  attemptedScoreBoxCompact: {
    width: '100%',
  },
  attemptedScoreBoxGrid: {
    width: '100%',
    maxWidth: '100%',
    alignItems: 'center',
  },
  attemptedScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  attemptedScoreRowGrid: {
    justifyContent: 'center',
    width: '100%',
  },
  attemptedScoreTextWrap: {
    flexShrink: 1,
    gap: 2,
  },
  attemptedScoreMain: {
    fontSize: 28,
    fontWeight: '800',
    color: STUDENT.text,
  },
  attemptedScoreMainCompact: {
    fontSize: 22,
  },
  attemptedScoreMainGrid: {
    fontSize: 24,
  },
  attemptedScoreDenom: {
    fontSize: 16,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  attemptedScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  attemptedScoreMeta: {
    fontSize: 11,
    color: STUDENT.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  attemptedStatsList: {
    gap: 8,
  },
  attemptedStatsListTablet: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  attemptedStatsListGrid: {
    width: '100%',
    flexGrow: 0,
    gap: 6,
  },
  attemptedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attemptedStatsRowTablet: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    alignItems: 'center',
  },
  attemptedStatsLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 16,
  },
  attemptedStatsValue: {
    flexShrink: 0,
    width: 64,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'right',
    lineHeight: 18,
  },
  attemptedGradeBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    flexShrink: 0,
  },
  attemptedGradeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  attemptedDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 2,
    overflow: 'hidden',
  },
  attemptedDetailsButtonTablet: {
    flex: 1,
    marginTop: 0,
    minHeight: 44,
  },
  attemptedDetailsButtonGrid: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginTop: 0,
    minHeight: 44,
  },
  attemptedDetailsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
  },
  attemptPickerSection: {
    gap: 6,
    marginBottom: 4,
  },
  attemptPickerPlaceholder: {
    minHeight: 66,
  },
  attemptPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  attemptPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attemptPickerValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.text,
  },
  attemptPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  attemptPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 4,
  },
  attemptPickerSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
    marginBottom: 8,
  },
  attemptPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  attemptPickerOptionActive: {
    backgroundColor: '#fff7ed',
  },
  attemptPickerOptionText: {
    flex: 1,
    fontSize: 14,
    color: STUDENT.textSecondary,
    fontWeight: '500',
  },
  attemptPickerOptionTextActive: {
    color: STUDENT.text,
    fontWeight: '700',
  },
  resultsLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resultsLoadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

