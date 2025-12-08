import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

export default function LearningPathsView() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'quizzes'>('subjects');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

  useEffect(() => {
    fetchSubjects();
    fetchQuizzes();
  }, []);

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subjectsArray = data.subjects || data.data || [];
        setSubjects(subjectsArray);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setIsLoadingQuizzes(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/quizzes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const getSubjectIcon = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('math')) return 'calculator';
    if (name.includes('physics')) return 'nuclear';
    if (name.includes('chemistry')) return 'flask';
    if (name.includes('biology')) return 'leaf';
    if (name.includes('english')) return 'book';
    return 'book';
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subjects' && styles.tabActive]}
          onPress={() => setActiveTab('subjects')}
        >
          <Text style={[styles.tabText, activeTab === 'subjects' && styles.tabTextActive]}>
            Browse by Subject
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quizzes' && styles.tabActive]}
          onPress={() => setActiveTab('quizzes')}
        >
          <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>
            My Quizzes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <View style={styles.content}>
          {isLoadingSubjects ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : subjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Subjects Available</Text>
              <Text style={styles.emptyStateText}>Check back later for new learning content.</Text>
            </View>
          ) : (
            <View style={styles.subjectsGrid}>
              {subjects.map((subject: any) => {
                const iconName = getSubjectIcon(subject.name);
                return (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={styles.subjectCard}
                    onPress={() => router.push(`/subject/${subject._id || subject.id}`)}
                  >
                    <View style={styles.subjectIconContainer}>
                      <Ionicons name={iconName as any} size={40} color="#fff" />
                    </View>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Quizzes Tab */}
      {activeTab === 'quizzes' && (
        <View style={styles.content}>
          {isLoadingQuizzes ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : quizzes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Quizzes Assigned</Text>
              <Text style={styles.emptyStateText}>Your teacher hasn't assigned any quizzes yet.</Text>
            </View>
          ) : (
            <View style={styles.quizzesList}>
              {quizzes.map((quiz: any) => (
                <TouchableOpacity
                  key={quiz._id}
                  style={styles.quizCard}
                  onPress={() => router.push(`/quiz/${quiz._id}`)}
                >
                  <View style={styles.quizHeader}>
                    <View style={styles.quizIconContainer}>
                      <Ionicons name="document-text" size={24} color="#fff" />
                    </View>
                    {quiz.hasAttempted && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.completedText}>Completed</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quizTitle}>{quiz.title}</Text>
                  <Text style={styles.quizDescription}>
                    {quiz.description || `Quiz on ${quiz.subject?.name || quiz.subject}`}
                  </Text>
                  <View style={styles.quizStats}>
                    <View style={styles.quizStat}>
                      <Ionicons name="time" size={16} color="#fb923c" />
                      <Text style={styles.quizStatText}>{quiz.duration || 60} min</Text>
                    </View>
                    <View style={styles.quizStat}>
                      <Ionicons name="help-circle" size={16} color="#fb923c" />
                      <Text style={styles.quizStatText}>
                        {quiz.questions?.length || quiz.questionCount || 0} questions
                      </Text>
                    </View>
                  </View>
                  {quiz.hasAttempted && quiz.bestScore !== null && (
                    <View style={styles.bestScoreContainer}>
                      <Text style={styles.bestScoreLabel}>Best Score:</Text>
                      <Text style={styles.bestScoreValue}>{quiz.bestScore}%</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.quizButton}
                    onPress={() => router.push(`/quiz/${quiz._id}`)}
                  >
                    <Text style={styles.quizButtonText}>
                      {quiz.hasAttempted ? 'Review Quiz' : 'Start Quiz'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subjectCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  subjectIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  quizzesList: {
    gap: 16,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fb923c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  quizDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  quizStats: {
    flexDirection: 'row',
    gap: 16,
  },
  quizStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizStatText: {
    fontSize: 14,
    color: '#6b7280',
  },
  bestScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
  },
  bestScoreLabel: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  bestScoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  quizButton: {
    backgroundColor: '#fb923c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quizButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


