import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import { GlassPanel } from '../src/components/ui';

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject: { _id: string; name: string } | string;
  classNumber?: string;
  difficulty?: string;
  totalQuestions?: number;
  scheduleType?: string;
  activityType?: string;
  questionBankSource?: string;
  dailyPickCount?: number;
  createdAt?: string;
}

interface SubjectWithQuizzes {
  _id: string;
  name: string;
  quizzes: Quiz[];
  totalQuizzes: number;
  totalQuestions: number;
  difficulties: string[];
  latestScore?: number;
}

export default function IQRankBoostSubjects() {
  const [subjects, setSubjects] = useState<SubjectWithQuizzes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    void load();
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const [quizzesResponse, resultsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/iq-rank-quizzes`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-results`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      const scoreByQuiz = new Map<string, number>();
      const scoreBySubject = new Map<string, number>();
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = resultsData.data || [];
        results.forEach((result: any) => {
          if (result.quizId) scoreByQuiz.set(String(result.quizId), Number(result.score) || 0);
          if (result.subjectId) scoreBySubject.set(String(result.subjectId), Number(result.score) || 0);
        });
      }

      if (!quizzesResponse.ok) {
        setSubjects([]);
        return;
      }

      const quizzesData = await quizzesResponse.json();
      const quizzes: Quiz[] = Array.isArray(quizzesData.data) ? quizzesData.data : [];
      if (quizzesData.classNumber) setStudentClass(String(quizzesData.classNumber));

      // Pin daily class bank quizzes first
      quizzes.sort((a, b) => {
        const aDaily = a.questionBankSource === 'daily-quiz-xlsx' || a.activityType === 'daily' ? 1 : 0;
        const bDaily = b.questionBankSource === 'daily-quiz-xlsx' || b.activityType === 'daily' ? 1 : 0;
        return bDaily - aDaily;
      });

      const subjectMap = new Map<string, SubjectWithQuizzes>();
      for (const quiz of quizzes) {
        const isDaily =
          quiz.questionBankSource === 'daily-quiz-xlsx' || quiz.activityType === 'daily';
        const subjectId = isDaily
          ? 'daily-quiz'
          : typeof quiz.subject === 'object'
            ? String(quiz.subject?._id || '')
            : String(quiz.subject || '');
        const subjectName = isDaily
          ? 'Daily Quiz'
          : typeof quiz.subject === 'object'
            ? String(quiz.subject?.name || 'Subject')
            : 'Subject';
        if (!subjectId) continue;
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            _id: subjectId,
            name: subjectName,
            quizzes: [],
            totalQuizzes: 0,
            totalQuestions: 0,
            difficulties: [],
            latestScore: scoreBySubject.get(
              typeof quiz.subject === 'object' ? String(quiz.subject?._id || '') : String(quiz.subject || ''),
            ),
          });
        }
        const bucket = subjectMap.get(subjectId)!;
        bucket.quizzes.push(quiz);
        bucket.totalQuizzes += 1;
        bucket.totalQuestions += Number(
          isDaily ? quiz.dailyPickCount || quiz.totalQuestions || 5 : quiz.totalQuestions || 0,
        );
        if (quiz.difficulty && !bucket.difficulties.includes(quiz.difficulty)) {
          bucket.difficulties.push(quiz.difficulty);
        }
        const quizScore = scoreByQuiz.get(String(quiz._id));
        if (quizScore != null) bucket.latestScore = quizScore;
      }

      // Daily Quiz section first
      const ordered = Array.from(subjectMap.values()).sort((a, b) => {
        if (a._id === 'daily-quiz') return -1;
        if (b._id === 'daily-quiz') return 1;
        return a.name.localeCompare(b.name);
      });
      setSubjects(ordered);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#0284c7', '#0d9488']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="trophy" size={28} color="#fff" />
              <Text style={styles.headerTitle}>Quiz</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {studentClass
                ? `Class ${studentClass} · 5 questions / day from your class bank`
                : 'Daily 5-question quizzes for your class'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Loading quizzes...</Text>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No quizzes available</Text>
            <Text style={styles.emptySubtext}>Quizzes assigned to you will appear here</Text>
          </View>
        ) : (
          <View style={styles.subjectsList}>
            {subjects.map((subject) => (
              <GlassPanel key={subject._id} style={styles.subjectCardInner} radius={12} tone="medium">
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectIcon}>
                    <Ionicons name="book" size={24} color="#0284c7" />
                  </View>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectStats}>
                      {subject.totalQuizzes} quizzes • {subject.totalQuestions} questions
                    </Text>
                  </View>
                  {subject.latestScore !== undefined ? (
                    <View style={styles.scoreBadge}>
                      <Ionicons name="trophy" size={16} color="#f59e0b" />
                      <Text style={styles.scoreText}>{subject.latestScore}%</Text>
                    </View>
                  ) : null}
                </View>

                {subject.difficulties.length > 0 ? (
                  <View style={styles.difficultiesRow}>
                    {subject.difficulties.map((diff) => (
                      <View
                        key={diff}
                        style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(diff) + '20' }]}
                      >
                        <Text style={[styles.difficultyText, { color: getDifficultyColor(diff) }]}>
                          {diff}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={{ gap: 8, marginTop: 10 }}>
                  {subject.quizzes.map((quiz) => {
                    const isDaily =
                      quiz.questionBankSource === 'daily-quiz-xlsx' || quiz.activityType === 'daily';
                    return (
                      <TouchableOpacity
                        key={quiz._id}
                        style={[styles.quizItem, isDaily && styles.quizItemDaily]}
                        activeOpacity={0.75}
                        onPress={() =>
                          router.push({
                            pathname: '/iq-rank-boost-quiz/[quizId]',
                            params: { quizId: quiz._id },
                          })
                        }
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.quizItemTitle} numberOfLines={1}>
                            {quiz.title}
                          </Text>
                          <Text style={styles.quizItemMeta} numberOfLines={2}>
                            {isDaily
                              ? `Today · ${quiz.dailyPickCount || 5} Q · your class only · IQ, reasoning, vocab, maths & science`
                              : [
                                  quiz.scheduleType && quiz.scheduleType !== 'once'
                                    ? quiz.scheduleType
                                    : null,
                                  quiz.difficulty,
                                  quiz.totalQuestions != null ? `${quiz.totalQuestions} Q` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassPanel>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1 },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b' },
  emptyContainer: { alignItems: 'center', padding: 48 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#334155' },
  emptySubtext: { marginTop: 4, fontSize: 13, color: '#64748b' },
  subjectsList: { padding: 16, gap: 12 },
  subjectCardInner: { padding: 14 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  subjectStats: { fontSize: 12, color: '#64748b', marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  difficultiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  difficultyBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  difficultyText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  quizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quizItemDaily: {
    backgroundColor: '#f0f9ff',
    borderColor: '#7dd3fc',
  },
  quizItemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  quizItemMeta: { fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
});
