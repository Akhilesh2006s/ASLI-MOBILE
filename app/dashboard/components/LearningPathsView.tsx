import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import api from '../../../src/services/api/api';
import { STUDENT, STUDENT_RADIUS } from '../../../src/theme/student';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function LearningPathsView({ dark }: { dark?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= 768;
  const cardWidth = isTablet ? '31.5%' : '47%';
  const [activeTab, setActiveTab] = useState<'subjects' | 'quizzes'>('subjects');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

  useEffect(() => {
    fetchSubjects();
    fetchQuizzes();
    fetchLibraryCounts();
  }, []);

  const fetchLibraryCounts = async () => {
    try {
      const { data } = await api.get('/api/student/asli-prep-content');
      const allContent = data.data || data || [];
      const counts: Record<string, number> = {
        TextBook: 0,
        Workbook: 0,
        Material: 0,
        Video: 0,
        Audio: 0,
        Homework: 0,
      };
      (Array.isArray(allContent) ? allContent : []).forEach((item: any) => {
        const t = item.type || 'Material';
        counts[t] = (counts[t] || 0) + 1;
      });
      setLibraryCounts(counts);
    } catch (error) {
      console.error('Failed to fetch library counts:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true);
      const { data } = await api.get('/api/student/subjects');
      const subjectsArray = data.subjects || data.data || [];
      setSubjects(subjectsArray);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setIsLoadingQuizzes(true);
      const { data } = await api.get('/api/student/quizzes');
      setQuizzes(data.data || []);
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

  const [libraryCounts, setLibraryCounts] = useState<Record<string, number>>({});

  const openLibraryType = (type: string) => {
    if (type === 'Homework') {
      router.push('/assignments');
      return;
    }
    router.push({ pathname: '/asli-prep-content', params: { type } });
  };

  const libraryTiles = [
    { key: 'textbook', label: 'TextBook', type: 'TextBook', icon: 'book-outline' as keyof typeof Ionicons.glyphMap },
    { key: 'workbook', label: 'Workbook', type: 'Workbook', icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap },
    { key: 'material', label: 'Material', type: 'Material', icon: 'document-outline' as keyof typeof Ionicons.glyphMap },
    { key: 'video', label: 'Video', type: 'Video', icon: 'videocam-outline' as keyof typeof Ionicons.glyphMap },
    { key: 'audio', label: 'Audio', type: 'Audio', icon: 'headset-outline' as keyof typeof Ionicons.glyphMap },
    { key: 'homework', label: 'Homework', type: 'Homework', icon: 'clipboard-outline' as keyof typeof Ionicons.glyphMap },
  ];

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      {!dark ? (
        <Animated.View entering={FadeInDown.duration(280)}>
          <LinearGradient
            colors={[...STUDENT.heroGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.banner, compact && { paddingHorizontal: 14 }]}
          >
            <Text style={styles.bannerTitle}>Learning Paths</Text>
            <Text style={styles.bannerSub}>Subjects, quizzes, and your digital library in one place.</Text>
          </LinearGradient>
        </Animated.View>
      ) : null}

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
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                    style={[styles.subjectCard, { width: cardWidth }]}
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

          {!isLoadingSubjects && subjects.length > 0 && (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Digital Library</Text>
                <Text style={styles.sectionSub}>Browse by Type</Text>
                <View style={styles.libraryGrid}>
                  {libraryTiles.map((tile) => (
                    <TouchableOpacity
                      key={tile.key}
                      style={[styles.libraryCard, { width: cardWidth }]}
                      activeOpacity={0.85}
                      onPress={() => openLibraryType(tile.type)}
                    >
                      <LinearGradient
                        colors={['#60a5fa', '#8b5cf6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.libraryIconWrap}
                      >
                        <Ionicons name={tile.icon} size={24} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.libraryTitle}>{tile.label}</Text>
                      <Text style={styles.libraryCount}>
                        {libraryCounts[tile.type] ?? 0} files
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Recommended for You</Text>
                <View style={styles.recommendList}>
                  <View style={styles.recommendCard}>
                    <View style={styles.recommendIconPill}>
                      <Ionicons name="flash-outline" size={16} color="#fb923c" />
                    </View>
                    <Text style={styles.recommendTitle}>IQ/Rank Boost Practice</Text>
                    <Text style={styles.recommendDesc}>
                      Boost your IQ and improve your rank with targeted practice.
                    </Text>
                    <TouchableOpacity
                      style={styles.recommendButton}
                      activeOpacity={0.85}
                      onPress={() => router.push('/iq-rank-boost-subjects')}
                    >
                      <Text style={styles.recommendButtonText}>Start Learning</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.recommendCard}>
                    <View style={styles.recommendIconPill}>
                      <Ionicons name="game-controller-outline" size={16} color="#3b82f6" />
                    </View>
                    <Text style={styles.recommendTitle}>Play Games</Text>
                    <Text style={styles.recommendDesc}>
                      Engage in fun educational games to enhance your learning experience.
                    </Text>
                    <View style={styles.comingSoonChip}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
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
  containerDark: {
    backgroundColor: 'transparent',
  },
  banner: {
    borderRadius: STUDENT_RADIUS.xxl,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    ...STUDENT.shadow.md,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  bannerSub: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
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
  sectionCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSub: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: '#6b7280',
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
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  libraryCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  libraryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  libraryCount: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  recommendList: {
    gap: 12,
  },
  recommendCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  recommendIconPill: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  recommendDesc: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  recommendButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recommendButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  comingSoonChip: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
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






