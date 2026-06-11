import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { setupAppStateListener } from '../../../src/utils/studyTimeTracker';
import { setupSessionTimeSync } from '../../../src/lib/session-time-sync';
import QuickStatsModule from './overview/QuickStatsModule';
import LearningProgressModule from './overview/LearningProgressModule';
import AdaptiveLearningModule from './overview/AdaptiveLearningModule';
import TodaysTasksSection from './overview/TodaysTasksSection';
import StudyCalendarSection from './overview/StudyCalendarSection';
import ClassTimetableSection from './overview/ClassTimetableSection';
import MyHomeworkSection from './overview/MyHomeworkSection';
import {
  buildTodaysTasksContentList,
  capTodaysTasksForDay,
  getContentSubjectId,
  isVideoContentType,
  nextChapterCompletedDates,
  type ChapterCompletedDates,
} from '../../../src/lib/video-chapter-schedule';
import {
  collectCompletedContentIds,
  loadCompletedScheduleIds,
  saveCompletedScheduleIds,
} from '../../../src/lib/todays-tasks-helpers';
import { StudentHomeHeader } from '../../../src/components/student';
import TeacherDiaryFeed from '../../../src/components/student/TeacherDiaryFeed';
import { STUDENT } from '../../../src/theme/student';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import {
  filterContentsBySchoolProgram,
  resolveIsAsliPrepExclusive,
} from '../../../src/lib/school-program';

/** Web-parity home modules only — no RemarksView/DigitalLibrary extras */

interface OverviewViewProps {
  user: any;
  onGoExams?: () => void;
  onOpenExam?: (examId: string) => void;
  onGoProfile?: () => void;
  onLogout?: () => void;
}

const STAT_SUMMARY_CARDS = {
  today: {
    bg: '#FEFCE8',
    accent: '#f97316',
    iconBg: '#fef08a',
    icon: 'locate-outline' as const,
  },
  study: {
    bg: '#F0F9FF',
    accent: '#2563eb',
    iconBg: '#dbeafe',
    icon: 'time' as const,
  },
  week: {
    bg: '#F0FDFB',
    accent: '#0d9488',
    iconBg: '#ccfbf1',
    icon: 'calendar' as const,
  },
  efficiency: {
    bg: '#F5F3FF',
    accent: '#7c3aed',
    iconBg: '#ede9fe',
    icon: 'trending-up' as const,
  },
};

const OverviewView = memo(function OverviewView({
  user,
  onGoExams,
  onOpenExam,
  onGoProfile,
  onLogout,
}: OverviewViewProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= 768;
  const statCardWidth = '48%';
  const [stats, setStats] = useState({
    questionsAnswered: 0,
    accuracyRate: 0,
    rank: 0,
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [studyTimeToday, setStudyTimeToday] = useState(0);
  const [studyTimeThisWeek, setStudyTimeThisWeek] = useState(0);
  const [weeklyStudyData, setWeeklyStudyData] = useState<{ [key: string]: number }>({});
  const [incompleteContent, setIncompleteContent] = useState<any[]>([]);
  const [incompleteQuizzes, setIncompleteQuizzes] = useState<any[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<any[]>([]);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<string>>(new Set());
  const [scheduleAllContent, setScheduleAllContent] = useState<any[]>([]);
  const [videoChapterProgressBySubject, setVideoChapterProgressBySubject] = useState<
    Record<string, ChapterCompletedDates>
  >({});
  const [exams, setExams] = useState<any[]>([]);
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState<any[]>([]);
  const [riskReports, setRiskReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      // Fetch exam results to calculate stats - with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const [meRes, examsRes, resultsRes, rankingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch(`${API_BASE_URL}/api/student/exams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch(`${API_BASE_URL}/api/student/exam-results`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch(`${API_BASE_URL}/api/student/rankings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      let isAsliPrepExclusive = false;
      if (meRes.ok) {
        const meData = await meRes.json();
        isAsliPrepExclusive = resolveIsAsliPrepExclusive(meData?.user);
        const backendOverall = meData?.user?.overallProgress;
        if (backendOverall !== undefined && backendOverall !== null) {
          setOverallProgress(Number(backendOverall) || 0);
        }
      }

      let examsData: any[] = [];
      if (examsRes.ok) {
        const examsJson = await examsRes.json();
        examsData = examsJson.data || examsJson.exams || [];
        setExams(examsData);
      }

      let resultsData = [];
      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        resultsData = resultsJson.data || resultsJson.results || resultsJson || [];
      }

      const completedIds = new Set<string>();
      resultsData.forEach((result: any) => {
        const raw = result?.examId ?? result?.exam;
        if (!raw) return;
        const examId =
          typeof raw === 'string'
            ? raw
            : typeof raw === 'object' && raw._id != null
              ? String(raw._id)
              : String(raw);
        if (examId && examId !== '[object Object]') completedIds.add(examId);
      });
      setCompletedExamIds(completedIds);

      let rankingsData = [];
      if (rankingsRes.ok) {
        const rankingsJson = await rankingsRes.json();
        rankingsData = rankingsJson.data || rankingsJson.rankings || rankingsJson || [];
      }

      // Calculate stats
      const totalQuestions = resultsData.reduce((sum: number, r: any) => sum + (r.totalQuestions || 0), 0);
      const correctAnswers = resultsData.reduce((sum: number, r: any) => sum + (r.correctAnswers || 0), 0);
      const totalMarks = resultsData.reduce((sum: number, r: any) => sum + (r.totalMarks || 0), 0);
      const obtainedMarks = resultsData.reduce((sum: number, r: any) => sum + (r.obtainedMarks || 0), 0);
      const avgAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const avgScore = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      const avgRank = rankingsData.length > 0 
        ? Math.round(rankingsData.reduce((sum: number, r: any) => sum + (r.rank || 0), 0) / rankingsData.length)
        : 0;

      setStats({
        questionsAnswered: totalQuestions,
        accuracyRate: Math.round(avgAccuracy),
        rank: avgRank || 0
      });
      // Match web logic: derive progress from exams + learning path completion
      const subjectsResponse = await fetch(`${API_BASE_URL}/api/student/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const subjectsData = subjectsResponse.ok ? await subjectsResponse.json() : {};
      const subjectsList = subjectsData.subjects || subjectsData.data || [];

      const subjectNameMap = new Map<string, string>();
      subjectsList.forEach((subject: any) => {
        const subjectName = subject.name || '';
        const normalized = subjectName.toLowerCase();
        subjectNameMap.set(normalized, subjectName);
        if (normalized.includes('math')) {
          subjectNameMap.set('maths', subjectName);
          subjectNameMap.set('mathematics', subjectName);
        }
        if (normalized.includes('physics')) subjectNameMap.set('physics', subjectName);
        if (normalized.includes('chemistry')) subjectNameMap.set('chemistry', subjectName);
      });

      const examSubjectMap = new Map<string, { total: number; correct: number }>();
      resultsData.forEach((result: any) => {
        const subjectWise =
          result?.subjectWiseScore ||
          result?.subjectWiseScores ||
          result?.subjectScores ||
          null;
        if (subjectWise && typeof subjectWise === 'object') {
          Object.entries(subjectWise).forEach(([subject, score]: [string, any]) => {
            if (!examSubjectMap.has(subject)) examSubjectMap.set(subject, { total: 0, correct: 0 });
            const current = examSubjectMap.get(subject)!;
            current.total += score.total || 0;
            current.correct += score.correct || 0;
          });
        }
      });

      const mergedProgress = new Map<
        string,
        { id: string; name: string; progress: number; currentTopic: string }
      >();
      Array.from(examSubjectMap.entries()).forEach(([key, value]) => {
        const progress = value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0;
        const name = subjectNameMap.get(key.toLowerCase()) || key.charAt(0).toUpperCase() + key.slice(1);
        mergedProgress.set(key.toLowerCase(), {
          id: key.toLowerCase(),
          name,
          progress,
          currentTopic: `${name} - Recent Exams`,
        });
      });

      for (const subject of subjectsList) {
        const subjectId = subject._id || subject.id;
        const subjectName = subject.name || 'Subject';
        const localProgressKey = `completed_content_${subjectId}`;
        let learningPathProgress = 0;
        try {
          const stored = await SecureStore.getItemAsync(localProgressKey);
          const completedIds = stored ? JSON.parse(stored) : [];
          if (Array.isArray(completedIds)) {
            const contentResponse = await fetch(
              `${API_BASE_URL}/api/student/asli-prep-content?subject=${encodeURIComponent(subjectId)}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              const contents = filterContentsBySchoolProgram(
                contentData.data || contentData || [],
                isAsliPrepExclusive
              );
              const totalContent = contents.length;
              learningPathProgress = totalContent > 0 ? Math.round((completedIds.length / totalContent) * 100) : 0;
            }
          }
        } catch (e) {
          // Ignore per-subject progress read errors
        }

        const existing = Array.from(mergedProgress.values()).find((s) => s.name === subjectName);
        if (existing) {
          existing.progress = Math.round((existing.progress + learningPathProgress) / 2);
          existing.currentTopic = `${subjectName} - Learning Path`;
        } else if (learningPathProgress > 0) {
          mergedProgress.set(String(subjectId), {
            id: String(subjectId),
            name: subjectName,
            progress: learningPathProgress,
            currentTopic: `${subjectName} - Learning Path`,
          });
        }
      }

      const finalProgressArray = Array.from(mergedProgress.values());
      if (finalProgressArray.length > 0) {
        setSubjectProgress(finalProgressArray);
        const calculatedOverallProgress = Math.round(
          finalProgressArray.reduce((sum, s) => sum + (s.progress || 0), 0) / finalProgressArray.length
        );
        setOverallProgress(calculatedOverallProgress);
        try {
          await fetch(`${API_BASE_URL}/api/student/overall-progress`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ overallProgress: calculatedOverallProgress })
          });
        } catch (e) {
          // Ignore save failures, UI already has calculated value
        }
      } else {
        setSubjectProgress([]);
        try {
          const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            const backendOverall = meData?.user?.overallProgress;
            if (backendOverall !== undefined && backendOverall !== null) {
              setOverallProgress(Number(backendOverall) || 0);
            } else {
              setOverallProgress(0);
            }
          }
        } catch (e) {
          setOverallProgress(0);
        }
      }

      setIsLoadingSchedule(true);
      const subjectIds = subjectsList.map((s: any) => String(s._id || s.id)).filter(Boolean);
      const [contentRes, quizzesRes, homeworkRes, chapterProgressRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/homework-submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/video-chapter-progress`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      let chapterProgressBySubject: Record<string, ChapterCompletedDates> = {};
      if (chapterProgressRes.ok) {
        const progressJson = await chapterProgressRes.json();
        if (progressJson.success && progressJson.data) {
          chapterProgressBySubject = progressJson.data;
        }
      }
      setVideoChapterProgressBySubject(chapterProgressBySubject);

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        const allContent = filterContentsBySchoolProgram(
          contentData.data || contentData || [],
          isAsliPrepExclusive
        );
        setScheduleAllContent(allContent);
        const completedContentIds = await collectCompletedContentIds(subjectIds);
        const slicedContent = buildTodaysTasksContentList(
          allContent,
          completedContentIds,
          chapterProgressBySubject,
          { includeHomework: true }
        );
        setIncompleteContent(slicedContent);
      }

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        const allQuizzes = quizzesData.data || [];
        const incompleteQuiz = allQuizzes.filter((quiz: any) => {
          return !quiz.hasAttempted || !quiz.completedAt;
        });
        incompleteQuiz.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        setIncompleteQuizzes(incompleteQuiz.slice(0, 10));
      }
      setIsLoadingSubmissions(true);
      if (homeworkRes.ok) {
        const homeworkData = await homeworkRes.json();
        setHomeworkSubmissions(
          homeworkData?.success ? homeworkData.data || [] : homeworkData?.data || []
        );
      } else {
        setHomeworkSubmissions([]);
      }
      setIsLoadingSubmissions(false);

      try {
        const remarksRes = await fetch(`${API_BASE_URL}/api/student/remarks`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (remarksRes.ok) {
          const remarksData = await remarksRes.json();
          setRemarks(remarksData?.success ? remarksData.data || [] : []);
        }
      } catch {
        setRemarks([]);
      }

      try {
        const riskRes = await fetch(`${API_BASE_URL}/api/student/risk-analysis-reports`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (riskRes.ok) {
          const riskData = await riskRes.json();
          setRiskReports(riskData?.success ? riskData.data || [] : []);
        }
      } catch {
        setRiskReports([]);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request timeout');
      } else {
        console.error('Failed to fetch dashboard data:', error);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    loadCompletedScheduleIds().then(setCompletedScheduleIds);
    fetchDashboardData();
    setupAppStateListener();
    const cleanupSessionSync = setupSessionTimeSync((times) => {
      setStudyTimeToday(times.today);
      setStudyTimeThisWeek(times.thisWeek);
    });
    return () => cleanupSessionSync();
  }, [fetchDashboardData]);

  const handleToggleScheduleComplete = useCallback(
    async (item: any, isQuiz: boolean) => {
      const itemId = String(item._id || item.id);
      const newCompleted = new Set(completedScheduleIds);
      const isCurrentlyCompleted = newCompleted.has(itemId);

      if (isCurrentlyCompleted) newCompleted.delete(itemId);
      else newCompleted.add(itemId);

      setCompletedScheduleIds(newCompleted);
      await saveCompletedScheduleIds(newCompleted);

      const subjectId = !isQuiz ? getContentSubjectId(item) : '';
      if (!isQuiz && subjectId) {
        const subjectKey = `completed_content_${subjectId}`;
        try {
          const stored = await SecureStore.getItemAsync(subjectKey);
          let completed: string[] = stored ? JSON.parse(stored) : [];
          if (isCurrentlyCompleted) {
            completed = completed.filter((id) => String(id) !== itemId);
          } else if (!completed.includes(itemId)) {
            completed.push(itemId);
          }
          await SecureStore.setItemAsync(subjectKey, JSON.stringify(completed));
        } catch {
          /* ignore */
        }
      }

      if (!isQuiz && isVideoContentType(item.type)) {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          fetch(`${API_BASE_URL}/api/student/content-progress`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentId: itemId,
              completed: !isCurrentlyCompleted,
              progress: !isCurrentlyCompleted ? 100 : 0,
            }),
          }).catch(() => undefined);
        }
      }

      const subjectIds = scheduleAllContent
        .map((c) => getContentSubjectId(c))
        .filter(Boolean);
      const mergedCompleted = await collectCompletedContentIds([...new Set(subjectIds)]);
      newCompleted.forEach((id) => mergedCompleted.add(id));

      let chapterProgressForRebuild = videoChapterProgressBySubject;
      if (!isQuiz && isVideoContentType(item.type) && subjectId && scheduleAllContent.length > 0 && !isCurrentlyCompleted) {
        const currentDates = videoChapterProgressBySubject[subjectId] || {};
        const updatedDates = nextChapterCompletedDates(
          subjectId,
          scheduleAllContent,
          mergedCompleted,
          currentDates
        );
        if (updatedDates) {
          chapterProgressForRebuild = {
            ...videoChapterProgressBySubject,
            [subjectId]: updatedDates,
          };
          setVideoChapterProgressBySubject(chapterProgressForRebuild);
          const token = await SecureStore.getItemAsync('authToken');
          if (token) {
            fetch(`${API_BASE_URL}/api/student/video-chapter-progress`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ subjectId, chapterDates: updatedDates }),
            }).catch(() => undefined);
          }
        }
      }

      if (scheduleAllContent.length > 0) {
        setIncompleteContent(
          buildTodaysTasksContentList(
            scheduleAllContent,
            mergedCompleted,
            chapterProgressForRebuild,
            { includeHomework: true }
          )
        );
      }
    },
    [completedScheduleIds, scheduleAllContent, videoChapterProgressBySubject]
  );

  const handleOpenScheduleItem = useCallback((item: any, isQuiz: boolean) => {
    if (isQuiz) {
      router.push(`/quiz/${item._id || item.id}`);
      return;
    }

    const hasPreviewUrl = Boolean(
      item.fileUrl ||
        item.fileUrls?.[0] ||
        item.videoUrl ||
        item.driveLink ||
        item.youtubeUrl
    );

    if (hasPreviewUrl || isVideoContentType(item.type)) {
      openContentPreview(router, item);
      return;
    }

    if (String(item.type || '').toLowerCase() === 'homework') {
      router.push('/assignments');
      return;
    }

    router.push({
      pathname: '/asli-prep-content',
      params: item.type ? { type: String(item.type) } : {},
    });
  }, []);

  const dailyTasks = useMemo(
    () => capTodaysTasksForDay(incompleteQuizzes, incompleteContent),
    [incompleteQuizzes, incompleteContent]
  );

  const { totalTodos, completedTodos, todayProgress, efficiency } = useMemo(() => {
    const { quizzes, content } = dailyTasks;
    const total = content.length + quizzes.length;
    const completed =
      content.filter((c: any) => completedScheduleIds.has(String(c._id || c.id))).length +
      quizzes.filter((q: any) => completedScheduleIds.has(String(q._id || q.id))).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const eff = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTodos: total, completedTodos: completed, todayProgress: progress, efficiency: eff };
  }, [dailyTasks, completedScheduleIds]);

  const { studyTodayProgress, studyWeekProgress } = useMemo(() => {
    const dailyGoalMins = 8 * 60;
    const weeklyGoalMins = 40 * 60;
    return {
      studyTodayProgress: Math.min(Math.round((studyTimeToday / dailyGoalMins) * 100), 100),
      studyWeekProgress: Math.min(Math.round((studyTimeThisWeek / weeklyGoalMins) * 100), 100),
    };
  }, [studyTimeToday, studyTimeThisWeek]);

  const dayStreak = Number(user?.dayStreak ?? 0);
  const schoolName = String(user?.assignedAdmin?.schoolName || user?.schoolName || '').trim();

  return (
    <View style={styles.container}>
      <StudentHomeHeader
        user={user}
        streak={dayStreak}
        onAvatarPress={onGoProfile}
        onLogout={onLogout}
      />

      {/* Summary Statistics Cards */}
      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { width: statCardWidth, backgroundColor: STAT_SUMMARY_CARDS.today.bg },
          ]}
        >
          <View style={styles.statCardContent}>
            <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.today.iconBg }]}>
              <Ionicons name={STAT_SUMMARY_CARDS.today.icon} size={20} color={STAT_SUMMARY_CARDS.today.accent} />
            </View>
            <Text style={styles.statLabel}>Today's Progress</Text>
            <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.today.accent }]}>
              {completedTodos}/{totalTodos}
            </Text>
            <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.today.accent}22` }]}>
              <View
                style={[
                  styles.statProgressFill,
                  { width: `${todayProgress}%`, backgroundColor: STAT_SUMMARY_CARDS.today.accent },
                ]}
              />
            </View>
            <Text style={styles.statSubtext}>Tasks completed {todayProgress}%</Text>
          </View>
        </View>

        <View
          style={[
            styles.statCard,
            { width: statCardWidth, backgroundColor: STAT_SUMMARY_CARDS.study.bg },
          ]}
        >
          <View style={styles.statCardContent}>
            <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.study.iconBg }]}>
              <Ionicons name={STAT_SUMMARY_CARDS.study.icon} size={20} color={STAT_SUMMARY_CARDS.study.accent} />
            </View>
            <Text style={styles.statLabel}>Study Time</Text>
            <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.study.accent }]}>
              {studyTimeToday >= 60
                ? `${(studyTimeToday / 60).toFixed(1)} hrs`
                : studyTimeToday < 1 && studyTimeToday > 0
                  ? '<1m'
                  : `${Math.round(studyTimeToday)}m`}
            </Text>
            <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.study.accent}22` }]}>
              <View
                style={[
                  styles.statProgressFill,
                  { width: `${studyTodayProgress}%`, backgroundColor: STAT_SUMMARY_CARDS.study.accent },
                ]}
              />
            </View>
            <Text style={styles.statSubtext}>Logged in today</Text>
          </View>
        </View>

        <View
          style={[
            styles.statCard,
            { width: statCardWidth, backgroundColor: STAT_SUMMARY_CARDS.week.bg },
          ]}
        >
          <View style={styles.statCardContent}>
            <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.week.iconBg }]}>
              <Ionicons name={STAT_SUMMARY_CARDS.week.icon} size={20} color={STAT_SUMMARY_CARDS.week.accent} />
            </View>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.week.accent }]}>
              {studyTimeThisWeek >= 60
                ? `${(studyTimeThisWeek / 60).toFixed(1)} hrs`
                : studyTimeThisWeek < 1 && studyTimeThisWeek > 0
                  ? '<1m'
                  : `${Math.round(studyTimeThisWeek)}m`}
            </Text>
            <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.week.accent}22` }]}>
              <View
                style={[
                  styles.statProgressFill,
                  { width: `${studyWeekProgress}%`, backgroundColor: STAT_SUMMARY_CARDS.week.accent },
                ]}
              />
            </View>
            <Text style={styles.statSubtext}>Logged this week</Text>
          </View>
        </View>

        <View
          style={[
            styles.statCard,
            { width: statCardWidth, backgroundColor: STAT_SUMMARY_CARDS.efficiency.bg },
          ]}
        >
          <View style={styles.statCardContent}>
            <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.efficiency.iconBg }]}>
              <Ionicons
                name={STAT_SUMMARY_CARDS.efficiency.icon}
                size={20}
                color={STAT_SUMMARY_CARDS.efficiency.accent}
              />
            </View>
            <Text style={styles.statLabel}>Efficiency</Text>
            <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.efficiency.accent }]}>{efficiency}%</Text>
            <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.efficiency.accent}22` }]}>
              <View
                style={[
                  styles.statProgressFill,
                  { width: `${efficiency}%`, backgroundColor: STAT_SUMMARY_CARDS.efficiency.accent },
                ]}
              />
            </View>
            <Text style={styles.statSubtext}>Completion rate</Text>
          </View>
        </View>
      </View>

      <StudyCalendarSection
        incompleteQuizzes={incompleteQuizzes}
        exams={exams}
        completedExamIds={completedExamIds}
        onOpenQuiz={(quiz) => router.push(`/quiz/${quiz._id || quiz.id}`)}
        onOpenExam={(examId) => onOpenExam?.(examId)}
      />

      <ClassTimetableSection schoolName={schoolName} />

      <TodaysTasksSection
        incompleteQuizzes={dailyTasks.quizzes}
        incompleteContent={dailyTasks.content}
        completedScheduleIds={completedScheduleIds}
        isLoading={isLoadingSchedule}
        onToggleComplete={handleToggleScheduleComplete}
        onOpenItem={handleOpenScheduleItem}
      />

      <TeacherDiaryFeed />

      {remarks.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.remarksHeader}>
            <Ionicons name="chatbubbles" size={20} color={STUDENT.accent} />
            <Text style={styles.sectionTitle}>Teacher Remarks</Text>
          </View>
          {remarks.slice(0, 5).map((remark: any) => (
            <View
              key={remark._id}
              style={[
                styles.remarkCard,
                remark.isPositive ? styles.remarkPositive : styles.remarkNeutral,
              ]}
            >
              <Text style={styles.remarkTeacher}>
                {remark.teacherId?.fullName || 'Teacher'}
                {remark.subject?.name ? ` · ${remark.subject.name}` : ''}
              </Text>
              <Text style={styles.remarkText}>{remark.remark}</Text>
              <Text style={styles.remarkDate}>
                {new Date(remark.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {riskReports.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.remarksHeader}>
            <Ionicons name="warning" size={20} color={STUDENT.warning} />
            <Text style={styles.sectionTitle}>AI Risk Analysis Reports</Text>
          </View>
          {riskReports.map((report: any) => (
            <View key={report._id} style={styles.riskCard}>
              <Text style={styles.riskTitle}>Performance Risk Analysis Report</Text>
              <Text style={styles.riskMeta}>
                Sent by {report.adminId?.fullName || 'Administrator'} on{' '}
                {new Date(report.sentAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <MyHomeworkSection
        allContent={scheduleAllContent}
        homeworkSubmissions={homeworkSubmissions}
        isLoading={isLoadingSubmissions}
      />

      <QuickStatsModule stats={stats} />

      <LearningProgressModule
        overallProgress={overallProgress}
        subjectProgress={subjectProgress}
      />

      <AdaptiveLearningModule />
    </View>
  );
});

export default OverviewView;

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  quickStatsScroll: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 10,
  },
  quickStatCard: {
    width: 108,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    marginRight: 10,
  },
  qsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  qsLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  welcomeTextContainer: {
    flex: 1,
    gap: 12,
  },
  vidyaImageContainer: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vidyaImageWrapper: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  welcomeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  welcomeButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  welcomeButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeButtonText: {
    color: '#ea580c',
    fontWeight: '700',
    fontSize: 14,
  },
  welcomeButtonTextOutline: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 24,
    padding: 16,
    minHeight: 140,
    borderWidth: 0,
    ...STUDENT.shadow.sm,
  },
  statCardContent: {
    flex: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  statProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statSubtext: {
    fontSize: 11,
    color: STUDENT.textMuted,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickStatCardAlt: {
    flex: 1,
    backgroundColor: STUDENT.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  sectionCard: {
    backgroundColor: STUDENT.surface,
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    ...STUDENT.shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: STUDENT.text,
  },
  badge: {
    backgroundColor: '#fb923c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressOverview: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  subjectProgressList: {
    gap: 16,
    marginBottom: 16,
  },
  subjectProgressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  subjectTopic: {
    fontSize: 12,
    color: '#6b7280',
  },
  subjectProgressRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  subjectProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  subjectProgressBar: {
    width: 64,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  noProgressText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 20,
  },
  viewButton: {
    backgroundColor: '#fb923c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    marginTop: -4,
  },
  weeklyList: {
    gap: 10,
    marginTop: 8,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyDay: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  weeklyBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: '#fed7aa',
    borderRadius: 999,
    overflow: 'hidden',
  },
  weeklyBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fb923c',
  },
  weeklyHours: {
    width: 44,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  todoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  todoEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
  todoEmptySub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  todoList: {
    gap: 10,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  todoDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginTop: 2,
  },
  todoDotHomework: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  todoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  todoItemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  vidyaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  quickLinksScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 4,
  },
  quickLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STUDENT.surface,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.text,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  remarkCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  remarkPositive: {
    backgroundColor: '#ecfdf5',
    borderLeftColor: '#22c55e',
  },
  remarkNeutral: {
    backgroundColor: '#fff7ed',
    borderLeftColor: '#f97316',
  },
  remarkTeacher: { fontSize: 13, fontWeight: '700', color: '#111827' },
  remarkText: { fontSize: 13, color: '#374151', marginTop: 6 },
  remarkDate: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  riskCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  riskTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  riskMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  viewAllLink: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.primary,
  },
  homeworkCta: {
    marginTop: 12,
    backgroundColor: STUDENT.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  homeworkCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  homeworkIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeworkTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  homeworkEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  homeworkEmptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  homeworkEmptySub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  adaptiveList: {
    gap: 10,
  },
  adaptiveCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  adaptiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adaptiveSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  adaptiveProgress: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  adaptiveLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  adaptiveItem: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  pathTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  pathTab: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  pathTabActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pathTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  pathTabTextActive: {
    color: '#111827',
  },
  miniLibraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniLibraryCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  miniLibraryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniLibraryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  recommendedList: {
    marginTop: 10,
    gap: 10,
  },
  recommendedCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  recommendedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  recommendedText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  recommendedChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recommendedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
});

