import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { getTodayStudyTime, getWeeklyStudyTime, updateStudyTime, setupAppStateListener } from '../../../src/utils/studyTimeTracker';
import VidyaAICornerButton from './VidyaAICornerButton';

interface OverviewViewProps {
  user: any;
}

const OverviewView = memo(function OverviewView({ user }: OverviewViewProps) {
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
    
    // Update study time every 5 minutes (reduced from 1 minute for better performance)
    const interval = setInterval(async () => {
      const timeData = await updateStudyTime();
      setStudyTimeToday(timeData.today);
      setStudyTimeThisWeek(timeData.thisWeek);
    }, 300000); // 5 minutes instead of 1 minute
    
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

      const [examsRes, resultsRes, rankingsRes] = await Promise.all([
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
        examsData = examsJson.data || [];
      }

      let resultsData = [];
      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        resultsData = resultsJson.data || [];
      }

      let rankingsData = [];
      if (rankingsRes.ok) {
        const rankingsJson = await rankingsRes.json();
        rankingsData = rankingsJson.data || [];
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

      // Fetch subjects and calculate progress
      const subjectsResponse = await fetch(`${API_BASE_URL}/api/student/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        const subjectsList = subjectsData.subjects || subjectsData.data || [];

        // Calculate subject-wise progress from exam results
        const subjectMap = new Map<string, { total: number; correct: number; exams: number }>();
        
        resultsData.forEach((result: any) => {
          if (result.subjectWiseScore && typeof result.subjectWiseScore === 'object') {
            Object.entries(result.subjectWiseScore).forEach(([subject, score]: [string, any]) => {
              if (!subjectMap.has(subject)) {
                subjectMap.set(subject, { total: 0, correct: 0, exams: 0 });
              }
              const subj = subjectMap.get(subject)!;
              subj.total += score.total || 0;
              subj.correct += score.correct || 0;
              subj.exams += 1;
            });
          }
        });

        const progressArray = Array.from(subjectMap.entries()).map(([key, data]) => {
          const progress = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
          const colors = [
            'bg-orange-100 text-orange-600',
            'bg-sky-100 text-sky-600',
            'bg-teal-100 text-teal-600',
          ];
          return {
            id: key.toLowerCase(),
            name: key.charAt(0).toUpperCase() + key.slice(1),
            progress: progress,
            color: colors[Math.min(subjectMap.size - 1, Math.floor(Math.random() * colors.length))]
          };
        });

        setSubjectProgress(progressArray);
        const calculatedOverallProgress = progressArray.length > 0
          ? Math.round(progressArray.reduce((sum, s) => sum + s.progress, 0) / progressArray.length)
          : 0;
        setOverallProgress(calculatedOverallProgress);
      }

      // Fetch incomplete content and quizzes for schedule
      const [contentRes, quizzesRes] = await Promise.all([
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
        })
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

  return (
    <View style={styles.container}>
      {/* Welcome Card */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
        style={styles.welcomeCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>
              Welcome back, {user?.email?.split('@')[0] || user?.fullName?.split(' ')[0] || 'Student'}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to continue your {user?.educationStream || 'JEE'} preparation journey? Your Vidya AI has personalized recommendations waiting.
            </Text>
            <View style={styles.welcomeActions}>
              <TouchableOpacity
                style={styles.welcomeButton}
                onPress={() => router.push('/learning-paths')}
              >
                <Text style={styles.welcomeButtonText}>Continue Learning</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.welcomeButton, styles.welcomeButtonOutline]}
                onPress={() => router.push('/ai-tutor')}
              >
                <Text style={[styles.welcomeButtonText, styles.welcomeButtonTextOutline]}>Ask Vidya AI</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Vidya AI Image */}
          <View style={styles.vidyaImageContainer}>
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
          style={styles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="target" size={24} color="#fff" style={styles.statIcon} />
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
          style={styles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="time" size={24} color="#fff" style={styles.statIcon} />
            <Text style={styles.statLabel}>Study Time</Text>
            <Text style={styles.statValue}>
              {studyTimeToday >= 60 
                ? `${(studyTimeToday / 60).toFixed(1)} hrs` 
                : `${Math.round(studyTimeToday)}m`}
            </Text>
            <Text style={styles.statSubtext}>Logged in today</Text>
          </View>
        </LinearGradient>

        {/* This Week */}
        <LinearGradient
          colors={['#14b8a6', '#0d9488']}
          style={styles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statCardContent}>
            <Ionicons name="calendar" size={24} color="#fff" style={styles.statIcon} />
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>
              {studyTimeThisWeek >= 60 
                ? `${(studyTimeThisWeek / 60).toFixed(1)} hrs` 
                : `${Math.round(studyTimeThisWeek)}m`}
            </Text>
            <Text style={styles.statSubtext}>Logged in this week</Text>
          </View>
        </LinearGradient>

        {/* Efficiency */}
        <LinearGradient
          colors={['#fb923c', '#f97316']}
          style={styles.statCard}
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

      {/* Quick Stats */}
      <View style={styles.quickStatsGrid}>
        <View style={styles.quickStatCard}>
          <Ionicons name="checkmark-circle" size={32} color="#fb923c" />
          <Text style={styles.quickStatLabel}>Questions Solved</Text>
          <Text style={styles.quickStatValue}>{stats.questionsAnswered.toLocaleString()}</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Ionicons name="trending-up" size={32} color="#3b82f6" />
          <Text style={styles.quickStatLabel}>Accuracy Rate</Text>
          <Text style={styles.quickStatValue}>{stats.accuracyRate}%</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Ionicons name="bar-chart" size={32} color="#14b8a6" />
          <Text style={styles.quickStatLabel}>Rank</Text>
          <Text style={styles.quickStatValue}>#{stats.rank || 0}</Text>
        </View>
      </View>

      {/* Learning Progress */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Learning Progress</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Asli Learn</Text>
          </View>
        </View>
        <View style={styles.progressOverview}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressPercentage}>{overallProgress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#fb923c', '#3b82f6', '#14b8a6']}
              style={[styles.progressFill, { width: `${overallProgress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
        <View style={styles.subjectProgressList}>
          {subjectProgress.length > 0 ? subjectProgress.map((subject) => (
            <View key={subject.id} style={styles.subjectProgressItem}>
              <View style={styles.subjectInfo}>
                <View style={styles.subjectIcon}>
                  <Text style={styles.subjectIconText}>{subject.name.substring(0, 2)}</Text>
                </View>
                <View style={styles.subjectDetails}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectTopic}>{subject.name} - Recent Exams</Text>
                </View>
              </View>
              <View style={styles.subjectProgressRight}>
                <Text style={styles.subjectProgressPercent}>{subject.progress}%</Text>
                <View style={styles.subjectProgressBar}>
                  <View style={[styles.subjectProgressFill, { width: `${subject.progress}%` }]} />
                </View>
              </View>
            </View>
          )) : (
            <Text style={styles.noProgressText}>Complete exams to see your subject-wise progress</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push('/learning-paths')}
        >
          <Text style={styles.viewButtonText}>View Complete Learning Path</Text>
        </TouchableOpacity>
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
    color: '#3b82f6',
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
    overflow: 'hidden',
  },
  vidyaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});

