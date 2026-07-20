import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  subject: {
    _id: string;
    name: string;
  };
  classNumber: string;
  difficulty: string;
  totalQuestions: number;
  isCompleted?: boolean;
  createdAt: string;
}

interface SubjectWithQuizzes {
  _id: string;
  name: string;
  quizzes: Quiz[];
  totalQuizzes: number;
  totalQuestions: number;
  difficulties: string[];
  latestScore?: number;
  latestCompletedAt?: string;
}

export default function IQRankBoostSubjects() {
  const [subjects, setSubjects] = useState<SubjectWithQuizzes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [quizResultsMap, setQuizResultsMap] = useState<Map<string, { score: number; completedAt: string }>>(new Map());
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    fetchStudentClassAndQuizzes();
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  const fetchStudentClassAndQuizzes = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      
      const [questionsResponse, resultsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/iq-rank-questions`, {
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

      const quizResultsMapLocal = new Map<string, { score: number; completedAt: string }>();
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = resultsData.data || [];
        results.forEach((result: any) => {
          const key = result.subjectId;
          if (key) {
            quizResultsMapLocal.set(key.toString(), {
              score: result.score,
              completedAt: result.completedAt,
            });
          }
        });
      }
      setQuizResultsMap(quizResultsMapLocal);

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const questions: any[] = questionsData.data || questionsData.questions || [];

        if (questionsData.classNumber) {
          setStudentClass(questionsData.classNumber);
        }

        const subjectMap = new Map<
          string,
          { name: string; questions: any[]; difficulties: Set<string> }
        >();

        questions.forEach((q: any) => {
          const subjectId =
            typeof q.subject === 'object' ? q.subject?._id : q.subject;
          const subjectName =
            typeof q.subject === 'object' ? q.subject?.name : 'Unknown Subject';
          if (!subjectId) return;

          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              name: subjectName,
              questions: [],
              difficulties: new Set(),
            });
          }
          const subjectData = subjectMap.get(subjectId)!;
          subjectData.questions.push(q);
          if (q.difficulty) subjectData.difficulties.add(q.difficulty);
        });

        const subjectsArray: SubjectWithQuizzes[] = Array.from(subjectMap.entries()).map(
          ([id, data]) => {
            const result = quizResultsMapLocal.get(id);
            const pseudoQuiz: Quiz = {
              _id: id,
              title: `${data.name} IQ Quiz`,
              subject: { _id: id, name: data.name },
              classNumber: questionsData.classNumber || '',
              difficulty: Array.from(data.difficulties)[0] || 'medium',
              totalQuestions: data.questions.length,
              createdAt: new Date().toISOString(),
            };
            return {
              _id: id,
              name: data.name,
              quizzes: [pseudoQuiz],
              totalQuizzes: 1,
              totalQuestions: data.questions.length,
              difficulties: Array.from(data.difficulties),
              latestScore: result?.score,
              latestCompletedAt: result?.completedAt,
            };
          }
        );

        setSubjects(subjectsArray);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#8b5cf6', '#7c3aed']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="trophy" size={28} color="#fff" />
              <Text style={styles.headerTitle}>IQ/Rank Boost</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {studentClass ? `Class ${studentClass}` : 'Boost your IQ and Rank'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading subjects...</Text>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No subjects available</Text>
            <Text style={styles.emptySubtext}>IQ/Rank Boost quizzes will appear here</Text>
          </View>
        ) : (
          <View style={styles.subjectsList}>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject._id}
                style={styles.subjectCard}
                onPress={() => {
                  if (subject.quizzes.length > 0) {
                    router.push({
                      pathname: '/iq-rank-boost-quiz/[quizId]',
                      params: { quizId: subject.quizzes[0]._id }
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                {/* the touchable stays for hit area; the glass card carries the padding */}
                <GlassPanel style={styles.subjectCardInner} radius={12} tone="medium">
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectIcon}>
                      <Ionicons name="book" size={24} color="#8b5cf6" />
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectStats}>
                        {subject.totalQuizzes} quizzes • {subject.totalQuestions} questions
                      </Text>
                    </View>
                    {subject.latestScore !== undefined && (
                      <View style={styles.scoreBadge}>
                        <Ionicons name="trophy" size={16} color="#f59e0b" />
                        <Text style={styles.scoreText}>{subject.latestScore}%</Text>
                      </View>
                    )}
                  </View>

                  {subject.difficulties.length > 0 && (
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
                  )}

                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => {
                      if (subject.quizzes.length > 0) {
                        router.push({
                          pathname: '/iq-rank-boost-quiz/[quizId]',
                          params: { quizId: subject.quizzes[0]._id }
                        });
                      }
                    }}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>
                      {subject.quizzes.length > 0 ? 'Start Quiz' : 'No Quizzes'}
                    </Text>
                  </TouchableOpacity>
                </GlassPanel>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows through the glass cards
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  subjectsList: {
    padding: 16,
  },
  subjectCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  subjectCardInner: {
    borderRadius: 12,
    padding: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subjectStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d97706',
  },
  difficultiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


