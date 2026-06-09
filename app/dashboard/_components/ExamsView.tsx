import { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  ExamAnalysisResult,
  formatAttemptHistoryLabel,
  getDisplayPercentage,
  getExamResultRowId,
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

type ExamsViewProps = {
  dark?: boolean;
  initialTab?: 'available' | 'attempted' | 'ranking' | 'upcoming';
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

export default function ExamsView({ initialTab = 'available' }: ExamsViewProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [activeTab, setActiveTab] = useState<'available' | 'attempted' | 'ranking' | 'upcoming'>(initialTab);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttemptByExam, setSelectedAttemptByExam] = useState<Record<string, string>>({});
  const [attemptPickerExamId, setAttemptPickerExamId] = useState<string | null>(null);
  const [showExamResults, setShowExamResults] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState<{
    exam: Exam;
    result: ExamAnalysisResult;
  } | null>(null);
  const [loadingExamResults, setLoadingExamResults] = useState(false);

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
        setResults(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
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

      const formattedResult: ExamAnalysisResult = {
        _id: reviewResult._id
          ? String(reviewResult._id)
          : displayResult._id
            ? String(displayResult._id)
            : undefined,
        attemptNumber:
          Number(reviewResult.attemptNumber) >= 1
            ? Number(reviewResult.attemptNumber)
            : attemptNum,
        examId: getExamIdFromResult(reviewResult) || exam._id,
        examTitle: reviewResult.examTitle || examWithQuestions.title || exam.title,
        totalQuestions:
          reviewResult.totalQuestions || examWithQuestions.totalQuestions || exam.totalQuestions || 0,
        correctAnswers: reviewResult.correctAnswers || 0,
        wrongAnswers: reviewResult.wrongAnswers || 0,
        unattempted: reviewResult.unattempted || 0,
        totalMarks: reviewResult.totalMarks || examWithQuestions.totalMarks || exam.totalMarks || 0,
        obtainedMarks: reviewResult.obtainedMarks || 0,
        percentage: Number.isFinite(Number(reviewResult.percentage))
          ? Number(reviewResult.percentage)
          : getDisplayPercentage(reviewResult),
        timeTaken: reviewResult.timeTaken || 0,
        subjectWiseScore: reviewResult.subjectWiseScore || {
          maths: { correct: 0, total: 0, marks: 0 },
          physics: { correct: 0, total: 0, marks: 0 },
          chemistry: { correct: 0, total: 0, marks: 0 },
        },
        answers: reviewResult.answers || {},
        questions: examWithQuestions.questions || [],
        questionTimings: reviewResult.questionTimings || displayResult.questionTimings,
        questionAnalytics: reviewResult.questionAnalytics || displayResult.questionAnalytics,
      };

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

  const examTabChips = useMemo(
    () => [
      { id: 'available', label: 'Available Exams' },
      { id: 'attempted', label: 'Attempted Exams' },
      { id: 'ranking', label: 'My Rankings' },
      { id: 'upcoming', label: 'Upcoming' },
    ],
    []
  );

  const subjectChips = useMemo(
    () => [
      { id: 'all', label: 'All subjects' },
      ...availableSubjectOptions.map((subject) => ({
        id: subject,
        label: subject.charAt(0).toUpperCase() + subject.slice(1),
      })),
    ],
    [availableSubjectOptions]
  );

  const avgPercentile = rankings.length
    ? Math.round(rankings.reduce((sum: number, r: any) => sum + (r.percentile || 0), 0) / rankings.length)
    : 0;
  const avgScore = rankings.length
    ? Math.round(
        (rankings.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / rankings.length) * 10
      ) / 10
    : 0;

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
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
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Subject</Text>
            <ChipNav
              chips={subjectChips}
              active={examSubjectFilter}
              onChange={setExamSubjectFilter}
            />
          </View>
        </View>
      </View>

      <View style={[styles.tabsContainer, compact && { marginBottom: 14 }]}>
        <ChipNav
          chips={examTabChips}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />
      </View>

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
            <View style={styles.examsList}>
              {availableActiveExams.map((exam) => {
                const status = getExamStatus(exam);
                const typeColor = getExamTypeColor(exam.examType);
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                const usedAttempts = attemptCountByExamId.get(String(exam._id)) || 0;
                const maxAttempts = getMaxAttemptsForExam(exam);
                const hydratedQuestionCount = Array.isArray(exam.questions)
                  ? exam.questions.length
                  : Number(exam.totalQuestions || 0);
                return (
                  <GlassCard key={exam._id} variant="elevated" padding={16} style={styles.examCardWrap} onPress={() => handleStartExam(exam)}>
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
            <View style={[styles.examsList, styles.attemptedListContent]}>
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
                const grade =
                  displayPercentage >= 70 ? 'Excellent' : displayPercentage >= 50 ? 'Good' : 'Needs Improvement';
                const gradeBg =
                  displayPercentage >= 70 ? '#16a34a' : displayPercentage >= 50 ? '#ca8a04' : '#dc2626';
                const totalMarksDisplay = displayResult.totalMarks || exam.totalMarks;

                return (
                  <LinearGradient
                    key={examIdStr}
                    colors={scheme.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.attemptedCard}
                  >
                    <Text style={styles.attemptedCardTitle}>{exam.title}</Text>
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
                    ) : null}

                    <View style={styles.attemptedScoreBox}>
                      <CountUpText
                        target={displayResult.obtainedMarks || 0}
                        style={styles.attemptedScoreMain}
                      />
                      <Text style={styles.attemptedScoreDenom}>/{totalMarksDisplay} marks</Text>
                    </View>

                    <View style={styles.attemptedStatsList}>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Correct Answers</Text>
                        <Text style={styles.attemptedStatsValue}>{displayResult.correctAnswers || 0}</Text>
                      </View>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Wrong Answers</Text>
                        <Text style={styles.attemptedStatsValue}>{displayResult.wrongAnswers || 0}</Text>
                      </View>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Unattempted</Text>
                        <Text style={styles.attemptedStatsValue}>{displayResult.unattempted || 0}</Text>
                      </View>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Time Taken</Text>
                        <Text style={styles.attemptedStatsValue}>
                          {displayResult.timeTaken
                            ? `${Math.floor(displayResult.timeTaken / 60)}m ${displayResult.timeTaken % 60}s`
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.attemptedGradeBadge, { backgroundColor: gradeBg }]}>
                      <Text style={styles.attemptedGradeText}>{grade}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.attemptedDetailsButton}
                      disabled={loadingExamResults}
                      onPress={() => void openAttemptedExamResults(exam, displayResult)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#111827" />
                      <Text style={styles.attemptedDetailsButtonText}>View Details</Text>
                    </TouchableOpacity>
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
          {rankings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Rankings Yet</Text>
              <Text style={styles.emptyStateText}>Complete exams to see your rankings.</Text>
            </View>
          ) : (
            <View style={styles.rankingsList}>
              {/* Overall Performance Summary */}
              <GlassCard variant="elevated" padding={16} style={styles.summaryCardWrap}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="bar-chart" size={24} color={STUDENT.statGradients.efficiency[0]} />
                  <Text style={styles.summaryTitle}>Overall Performance Summary</Text>
                </View>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average Percentile</Text>
                    <CountUpText target={avgPercentile} style={styles.summaryValue} />
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Exams Completed</Text>
                    <CountUpText target={rankings.length} style={styles.summaryValue} />
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average Score</Text>
                    <CountUpText target={avgScore} suffix="%" style={styles.summaryValue} />
                  </View>
                </View>
              </GlassCard>

              {/* Individual Rankings */}
              {rankings.map((ranking: any, index: number) => {
                const percentile = ranking.percentile || 0;
                const percentileBadge = percentile >= 90 
                  ? { bg: '#fef3c7', text: '#d97706', label: 'Top 10%' }
                  : percentile >= 75
                  ? { bg: '#d1fae5', text: '#059669', label: 'Top 25%' }
                  : percentile >= 50
                  ? { bg: '#dbeafe', text: '#2563eb', label: 'Top 50%' }
                  : { bg: '#f3f4f6', text: '#6b7280', label: 'Below 50%' };
                
                return (
                  <GlassCard key={ranking._id || index} variant="elevated" padding={16} style={styles.rankingCardWrap}>
                    <View style={styles.rankingHeader}>
                      <View style={styles.rankingPosition}>
                        <Text style={styles.rankingPositionText}>#{ranking.rank || index + 1}</Text>
                      </View>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingTitle}>
                          {ranking.examId?.title || ranking.examTitle || 'Exam'}
                        </Text>
                        <Text style={styles.rankingSubtitle}>
                          Score: {ranking.percentage?.toFixed(1) || 0}% | Marks: {ranking.obtainedMarks || 0}/{ranking.totalMarks || 0}
                        </Text>
                      </View>
                      <View style={styles.rankingTrophy}>
                        {ranking.rank <= 3 && (
                          <Ionicons 
                            name="trophy" 
                            size={24} 
                            color={ranking.rank === 1 ? '#fbbf24' : ranking.rank === 2 ? '#94a3b8' : '#cd7f32'} 
                          />
                        )}
                      </View>
                    </View>
                    <View style={styles.rankingStats}>
                      <View style={[styles.rankingStatCard, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="trophy" size={16} color="#2563eb" />
                        <Text style={styles.rankingStatLabel}>Rank</Text>
                        <Text style={[styles.rankingStatValue, { color: '#2563eb' }]}>
                          #{ranking.rank || index + 1}
                        </Text>
                        <Text style={styles.rankingStatSubtext}>out of {ranking.totalStudents || 'N/A'}</Text>
                      </View>
                      <View style={[styles.rankingStatCard, { backgroundColor: percentileBadge.bg }]}>
                        <Ionicons name="trending-up" size={16} color={percentileBadge.text} />
                        <Text style={styles.rankingStatLabel}>Percentile</Text>
                        <Text style={[styles.rankingStatValue, { color: percentileBadge.text }]}>
                          {percentile}
                        </Text>
                        <View style={[styles.percentileBadge, { backgroundColor: percentileBadge.bg }]}>
                          <Text style={[styles.percentileBadgeText, { color: percentileBadge.text }]}>
                            {percentileBadge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {ranking.completedAt && (
                      <View style={styles.rankingFooter}>
                        <Ionicons name="calendar" size={14} color="#6b7280" />
                        <Text style={styles.rankingFooterText}>
                          Completed: {new Date(ranking.completedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          )}
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
            <View style={styles.examsList}>
              {upcomingExams.map((exam) => {
                const typeColor = getExamTypeColor(exam.examType);
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                return (
                  <GlassCard key={exam._id} variant="elevated" padding={16} style={styles.examCardWrap}>
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
    gap: STUDENT_SPACING.md,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    fontWeight: '500',
  },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: STUDENT.accentSoft,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  classBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.accent,
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
  examCardWrap: {
    marginBottom: STUDENT_SPACING.md,
  },
  rankingCardWrap: {
    marginBottom: STUDENT_SPACING.md,
  },
  summaryCardWrap: {
    marginBottom: STUDENT_SPACING.lg,
  },
  attemptedCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
  rankingsList: {
    gap: STUDENT_SPACING.md,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.md,
  },
  rankingPosition: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: STUDENT.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingPositionText: {
    fontSize: 18,
    fontWeight: '800',
    color: STUDENT.textOnPrimary,
  },
  rankingInfo: {
    flex: 1,
    gap: 4,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: STUDENT.text,
  },
  rankingSubtitle: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  rankingTrophy: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attemptedScoreBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  attemptedScoreMain: {
    fontSize: 30,
    fontWeight: '800',
    color: STUDENT.text,
  },
  attemptedScoreDenom: {
    fontSize: 14,
    fontWeight: '600',
    color: STUDENT.textSecondary,
    marginTop: 2,
  },
  attemptedStatsList: {
    gap: 8,
  },
  attemptedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attemptedStatsLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  attemptedStatsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  attemptedGradeBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
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
    marginTop: 2,
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STUDENT.statGradients.efficiency[0],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: STUDENT_SPACING.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: STUDENT_SPACING.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.sm,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: STUDENT.textMuted,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: STUDENT.statGradients.efficiency[0],
  },
  rankingStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rankingStatCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  rankingStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  rankingStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  rankingStatSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  percentileBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rankingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  rankingFooterText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

