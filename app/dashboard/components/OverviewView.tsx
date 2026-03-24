import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  getTodayStudyTime,
  getWeeklyStudyTime,
  getWeeklyStudyData,
  updateStudyTime,
  setupAppStateListener,
} from '../../../src/utils/studyTimeTracker';
import VidyaAICornerButton from './VidyaAICornerButton';
import QuickStatsModule from './overview/QuickStatsModule';
import LearningProgressModule from './overview/LearningProgressModule';
import AdaptiveLearningModule from './overview/AdaptiveLearningModule';
import DigitalLibraryModule from './overview/DigitalLibraryModule';

interface OverviewViewProps {
  user: any;
}

const OverviewView = memo(function OverviewView({ user }: OverviewViewProps) {
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    setupAppStateListener();
    
    // Initial load
    updateStudyTime().then(timeData => {
      setStudyTimeToday(timeData.today);
      setStudyTimeThisWeek(timeData.thisWeek);
    });
    
    // Update study time + weekly chart data periodically (aligned with website dashboard)
    const interval = setInterval(async () => {
      const timeData = await updateStudyTime();
      setStudyTimeToday(timeData.today);
      setStudyTimeThisWeek(timeData.thisWeek);
      const w = await getWeeklyStudyData();
      setWeeklyStudyData(w);
    }, 300000);

    (async () => {
      const w = await getWeeklyStudyData();
      setWeeklyStudyData(w);
    })();

    return () => {
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

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

      let examsData = [];
      if (examsRes.ok) {
        const examsJson = await examsRes.json();
        examsData = examsJson.data || examsJson.exams || [];
      }

      let resultsData = [];
      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        resultsData = resultsJson.data || resultsJson.results || resultsJson || [];
      }

      let rankingsData = [];
      if (rankingsRes.ok) {
        const rankingsJson = await rankingsRes.json();
        rankingsData = rankingsJson.data || rankingsJson.rankings || rankingsJson || [];
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        const backendOverall = meData?.user?.overallProgress;
        if (backendOverall !== undefined && backendOverall !== null) {
          setOverallProgress(Number(backendOverall) || 0);
        }
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

      const mergedProgress = new Map<string, { id: string; name: string; progress: number }>();
      Array.from(examSubjectMap.entries()).forEach(([key, value]) => {
        const progress = value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0;
        const name = subjectNameMap.get(key.toLowerCase()) || key.charAt(0).toUpperCase() + key.slice(1);
        mergedProgress.set(key.toLowerCase(), { id: key.toLowerCase(), name, progress });
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
              const contents = contentData.data || contentData || [];
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
        } else if (learningPathProgress > 0) {
          mergedProgress.set(String(subjectId), {
            id: String(subjectId),
            name: subjectName,
            progress: learningPathProgress,
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

      // Fetch incomplete content and quizzes for schedule
      const [contentRes, quizzesRes, homeworkRes] = await Promise.all([
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
      ]);

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        const allContent = contentData.data || contentData || [];
        const incomplete = allContent.filter((content: any) => {
          const contentId = content._id || content.id;
          return !completedScheduleIds.has(contentId);
        });
        setIncompleteContent(incomplete.slice(0, 10));
      }

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        const allQuizzes = quizzesData.data || [];
        const incompleteQuiz = allQuizzes.filter((quiz: any) => {
          return !quiz.hasAttempted || !quiz.completedAt;
        });
        setIncompleteQuizzes(incompleteQuiz.slice(0, 10));
      }
      if (homeworkRes.ok) {
        const homeworkData = await homeworkRes.json();
        setHomeworkSubmissions(homeworkData?.data || []);
      } else {
        setHomeworkSubmissions([]);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request timeout');
      } else {
        console.error('Failed to fetch dashboard data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [completedScheduleIds]);

  const { totalTodos, completedTodos, todayProgress, efficiency } = useMemo(() => {
    const total = incompleteContent.length + incompleteQuizzes.length;
    const completed = incompleteContent.filter((c: any) => completedScheduleIds.has(c._id)).length + 
                      incompleteQuizzes.filter((q: any) => completedScheduleIds.has(q._id)).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const eff = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTodos: total, completedTodos: completed, todayProgress: progress, efficiency: eff };
  }, [incompleteContent, incompleteQuizzes, completedScheduleIds]);

  /** Monday–Sunday of current week — same idea as website Weekly Overview */
  const weekBarRows = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() - daysFromMonday);
    const maxHours = 8;
    return labels.map((label, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateKey = d.toDateString();
      const minutes = weeklyStudyData[dateKey] || 0;
      const studyHours = (minutes / 60).toFixed(1);
      const pct = Math.min((minutes / 60 / maxHours) * 100, 100);
      return { label, studyHours, pct };
    });
  }, [weeklyStudyData]);

  return (
    <View style={styles.container}>
      {/* Welcome — matches website gradient (blue → teal) */}
      <LinearGradient
        colors={['#3b82f6', '#38bdf8', '#2dd4bf']}
        style={[styles.welcomeCard, compact && { padding: 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.welcomeContent, compact && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>
              Welcome back, {user?.email?.split('@')[0] || user?.fullName?.split(' ')[0] || 'Student'}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to continue your {user?.educationStream || 'JEE'} preparation journey? Your Vidya AI has personalized recommendations waiting.
            </Text>
            <View style={[styles.welcomeActions, compact && { flexDirection: 'column', width: '100%' }]}>
              <TouchableOpacity
                style={[styles.welcomeButton, compact && { width: '100%', alignItems: 'center' }]}
                onPress={() => router.push('/learning-paths')}
              >
                <Text style={styles.welcomeButtonText}>Continue Learning</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.welcomeButton, styles.welcomeButtonOutline, compact && { width: '100%', alignItems: 'center' }]}
                onPress={() => router.push('/ai-tutor')}
              >
                <Text style={[styles.welcomeButtonText, styles.welcomeButtonTextOutline]}>Ask Vidya AI</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Vidya AI Image */}
          <View style={[styles.vidyaImageContainer, compact && { width: 84, height: 84 }]}>
            <View style={styles.vidyaImageWrapper}>
              <Image
                source={require('../../../assets/Vidya-ai.jpg')}
                style={styles.vidyaImage}
                contentFit="contain"
                transition={200}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Summary Statistics Cards */}
      <View style={styles.statsGrid}>
        {/* Today's Progress */}
        <LinearGradient
          colors={['#fb923c', '#f97316']}
          style={[styles.statCard, { width: statCardWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="locate-outline" size={24} color="#fff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Today's Progress</Text>
            <Text style={styles.statValue}>{completedTodos}/{totalTodos}</Text>
            <View style={styles.statProgressBar}>
              <View style={[styles.statProgressFill, { width: `${todayProgress}%` }]} />
            </View>
            <Text style={styles.statSubtext}>Tasks completed {todayProgress}%</Text>
          </View>
        </LinearGradient>

        {/* Study Time */}
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={[styles.statCard, { width: statCardWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="time" size={24} color="#fff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Study Time</Text>
            <Text style={styles.statValue}>
              {studyTimeToday >= 60
                ? `${(studyTimeToday / 60).toFixed(1)} hrs`
                : studyTimeToday < 1 && studyTimeToday > 0
                  ? '<1m'
                  : `${Math.round(studyTimeToday)}m`}
            </Text>
            <Text style={styles.statSubtext}>Logged in today</Text>
          </View>
        </LinearGradient>

        {/* This Week */}
        <LinearGradient
          colors={['#14b8a6', '#0d9488']}
          style={[styles.statCard, { width: statCardWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="calendar" size={24} color="#fff" style={styles.statIcon} />
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>
              {studyTimeThisWeek >= 60
                ? `${(studyTimeThisWeek / 60).toFixed(1)} hrs`
                : studyTimeThisWeek < 1 && studyTimeThisWeek > 0
                  ? '<1m'
                  : `${Math.round(studyTimeThisWeek)}m`}
            </Text>
            <Text style={styles.statSubtext}>Logged in this week</Text>
          </View>
        </LinearGradient>

        {/* Efficiency */}
        <LinearGradient
          colors={['#fb923c', '#f97316']}
          style={[styles.statCard, { width: statCardWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="trending-up" size={24} color="#fff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Efficiency</Text>
            <Text style={styles.statValue}>{efficiency}%</Text>
            <Text style={styles.statSubtext}>Completion rate</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Weekly Overview — same section as website */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Weekly Overview</Text>
        <Text style={styles.sectionSub}>Your study plan for this week</Text>
        <View style={styles.weeklyList}>
          {weekBarRows.map((row) => (
            <View key={row.label} style={styles.weeklyRow}>
              <Text style={styles.weeklyDay}>{row.label}</Text>
              <View style={styles.weeklyBarTrack}>
                <View style={[styles.weeklyBarFill, { width: `${row.pct}%` }]} />
              </View>
              <Text style={styles.weeklyHours}>{row.studyHours}h</Text>
            </View>
          ))}
        </View>
      </View>

      {/* To-Dos — incomplete quizzes & content (website To-Dos) */}
      <View style={styles.sectionCard}>
        <View style={styles.todoHeader}>
          <View style={styles.todoIconWrap}>
            <Ionicons name="checkmark-circle" size={22} color="#0d9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>To-Dos</Text>
            <Text style={styles.sectionSub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
        {incompleteQuizzes.length === 0 && incompleteContent.length === 0 ? (
          <View style={styles.todoEmpty}>
            <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
            <Text style={styles.todoEmptyTitle}>All caught up!</Text>
            <Text style={styles.todoEmptySub}>No pending content or quizzes</Text>
          </View>
        ) : (
          <View style={styles.todoList}>
            {incompleteQuizzes.slice(0, 8).map((quiz: any) => (
              <TouchableOpacity
                key={quiz._id || quiz.id}
                style={styles.todoItem}
                onPress={() => router.push('/learning-paths')}
                activeOpacity={0.8}
              >
                <View style={styles.todoDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.todoItemTitle} numberOfLines={2}>
                    Complete {quiz.title || 'Quiz'}
                  </Text>
                  <Text style={styles.todoItemMeta} numberOfLines={1}>
                    {typeof quiz.subject === 'string' ? quiz.subject : quiz.subject?.name || 'Subject'} · {quiz.duration || 30} min
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {incompleteContent.slice(0, 8).map((content: any) => (
              <TouchableOpacity
                key={content._id || content.id}
                style={styles.todoItem}
                onPress={() => router.push('/learning-paths')}
                activeOpacity={0.8}
              >
                <View style={[styles.todoDot, content.type === 'Homework' && styles.todoDotHomework]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.todoItemTitle} numberOfLines={2}>
                    {content.type === 'Homework' ? 'Homework: ' : ''}
                    {content.title || 'Content'}
                  </Text>
                  <Text style={styles.todoItemMeta} numberOfLines={1}>
                    {content.type || 'Material'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <QuickStatsModule stats={stats} />

      {/* My Homework Submissions */}
      <View style={styles.sectionCard}>
        <View style={styles.homeworkHeader}>
          <View style={styles.homeworkIcon}>
            <Ionicons name="document-text-outline" size={18} color="#ea580c" />
          </View>
          <Text style={styles.homeworkTitle}>My Homework Submissions</Text>
        </View>
        {homeworkSubmissions.length === 0 ? (
          <View style={styles.homeworkEmpty}>
            <Ionicons name="document-outline" size={44} color="#9ca3af" />
            <Text style={styles.homeworkEmptyTitle}>No homework submissions yet</Text>
            <Text style={styles.homeworkEmptySub}>Submit your homework assignments to see them here</Text>
          </View>
        ) : (
          <View style={styles.todoList}>
            {homeworkSubmissions.slice(0, 5).map((item: any) => (
              <TouchableOpacity
                key={item._id || item.id}
                style={styles.todoItem}
                onPress={() => router.push('/learning-paths')}
                activeOpacity={0.8}
              >
                <View style={[styles.todoDot, styles.todoDotHomework]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.todoItemTitle} numberOfLines={2}>
                    {item.homework?.title || item.title || 'Homework'}
                  </Text>
                  <Text style={styles.todoItemMeta} numberOfLines={1}>
                    {item.subject?.name || item.homework?.subject?.name || item.subject || 'Subject'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <LearningProgressModule
        overallProgress={overallProgress}
        subjectProgress={subjectProgress}
        onPressViewPath={() => router.push('/learning-paths')}
      />

      <AdaptiveLearningModule subjectProgress={subjectProgress} />

      {/* Learning Paths */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Learning Paths</Text>
        </View>
        <View style={styles.pathTabs}>
          <TouchableOpacity style={[styles.pathTab, styles.pathTabActive]} onPress={() => router.push('/learning-paths')}>
            <Text style={[styles.pathTabText, styles.pathTabTextActive]}>Browse by Subject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pathTab} onPress={() => router.push('/learning-paths')}>
            <Text style={styles.pathTabText}>My Quizzes</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DigitalLibraryModule onPressLibrary={() => router.push('/learning-paths')} />

      {/* Recommended for You */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <View style={styles.recommendedList}>
          <View style={styles.recommendedCard}>
            <Text style={styles.recommendedTitle}>IQ/Rank Boost Practice</Text>
            <Text style={styles.recommendedText}>Boost your IQ and improve your rank with targeted practice.</Text>
          </View>
          <View style={styles.recommendedCard}>
            <Text style={styles.recommendedTitle}>Play Games</Text>
            <Text style={styles.recommendedText}>Engage in educational games to enhance your learning experience.</Text>
            <View style={styles.recommendedChip}>
              <Text style={styles.recommendedChipText}>Coming Soon</Text>
            </View>
          </View>
        </View>
      </View>
      <VidyaAICornerButton />
    </View>
  );
});

export default OverviewView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
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
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
  },
  statCardContent: {
    flex: 1,
  },
  statIcon: {
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  statProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  statProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  statSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
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
    color: '#111827',
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
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
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

