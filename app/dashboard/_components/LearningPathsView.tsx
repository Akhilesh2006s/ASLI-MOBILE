import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import api from '../../../src/services/api/api';
import GlassCard from '../../../src/components/student/GlassCard';
import ChipNav from '../../../src/components/student/ChipNav';
import DigitalLibraryBrowseSection from '../../../src/components/student/DigitalLibraryBrowseSection';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
  SUBJECT_COLORS,
} from '../../../src/theme/student';

function AnimatedProgressBar({ progress, delay = 0 }: { progress: number; delay?: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(Math.min(100, progress), { duration: 900, easing: Easing.out(Easing.quad) })
    );
  }, [progress, delay, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, animStyle]} />
    </View>
  );
}

export default function LearningPathsView({ dark }: { dark?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const useThreeColumns = width >= 380;
  const subjectTileWidth = useThreeColumns ? '31.5%' : '48%';
  const subjectCardPadding = useThreeColumns ? 12 : 16;
  const subjectIconSize = useThreeColumns ? 44 : 52;
  const subjectGlyphSize = useThreeColumns ? 22 : 26;
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

  const tabChips = [
    { id: 'subjects', label: 'Browse by Subject' },
    { id: 'quizzes', label: 'My Quizzes' },
  ];

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      {!dark ? (
        <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
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

      <View style={styles.tabsContainer}>
        <ChipNav
          chips={tabChips}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'subjects' | 'quizzes')}
        />
      </View>

      {activeTab === 'subjects' && (
        <View style={styles.content}>
          {isLoadingSubjects ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : subjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book" size={64} color={STUDENT.surfaceBorder} />
              <Text style={styles.emptyStateTitle}>No Subjects Available</Text>
              <Text style={styles.emptyStateText}>Check back later for new learning content.</Text>
            </View>
          ) : (
            <View style={styles.subjectsGrid}>
              {subjects.map((subject: any, index: number) => {
                const iconName = getSubjectIcon(subject.name);
                const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                return (
                  <GlassCard
                    key={subject._id || subject.id}
                    variant="elevated"
                    style={[styles.subjectTile, { width: subjectTileWidth }]}
                    padding={subjectCardPadding}
                    animate
                    delay={index * 50}
                    onPress={() =>
                      router.push({
                        pathname: '/subject/[id]',
                        params: { id: String(subject._id || subject.id), returnTo: 'learning' },
                      })
                    }
                  >
                    <View style={styles.subjectCardInner}>
                      <LinearGradient
                        colors={[color, `${color}cc`]}
                        style={[
                          styles.subjectIconContainer,
                          {
                            width: subjectIconSize,
                            height: subjectIconSize,
                            borderRadius: subjectIconSize / 2,
                          },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name={iconName as any} size={subjectGlyphSize} color={STUDENT.textOnPrimary} />
                      </LinearGradient>
                      <Text
                        style={[styles.subjectName, useThreeColumns && styles.subjectNameCompact]}
                        numberOfLines={2}
                      >
                        {subject.name}
                      </Text>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}

          {!isLoadingSubjects && subjects.length > 0 ? (
            <GlassCard variant="default" padding={14} style={styles.sectionCard}>
              <DigitalLibraryBrowseSection returnTo="learning" dark={dark} />
            </GlassCard>
          ) : null}
        </View>
      )}

      {activeTab === 'quizzes' && (
        <View style={styles.content}>
          {isLoadingQuizzes ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : quizzes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={64} color={STUDENT.surfaceBorder} />
              <Text style={styles.emptyStateTitle}>No Quizzes Assigned</Text>
              <Text style={styles.emptyStateText}>Your teacher hasn't assigned any quizzes yet.</Text>
            </View>
          ) : (
            <View style={styles.quizzesList}>
              {quizzes.map((quiz: any, index: number) => (
                <GlassCard key={quiz._id} variant="elevated" padding={16} animate delay={index * 60}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push(`/quiz/${quiz._id}`)}
                  >
                    <View style={styles.quizHeader}>
                      <View style={styles.quizIconContainer}>
                        <Ionicons name="document-text" size={24} color={STUDENT.textOnPrimary} />
                      </View>
                      {quiz.hasAttempted && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={STUDENT.success} />
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
                        <Ionicons name="time" size={16} color={STUDENT.warning} />
                        <Text style={styles.quizStatText}>{quiz.duration || 60} min</Text>
                      </View>
                      <View style={styles.quizStat}>
                        <Ionicons name="help-circle" size={16} color={STUDENT.warning} />
                        <Text style={styles.quizStatText}>
                          {quiz.questions?.length || quiz.questionCount || 0} questions
                        </Text>
                      </View>
                    </View>
                    {quiz.hasAttempted && quiz.bestScore !== null && (
                      <View style={styles.bestScoreContainer}>
                        <View style={styles.bestScoreHeader}>
                          <Text style={styles.bestScoreLabel}>Best Score:</Text>
                          <Text style={styles.bestScoreValue}>{quiz.bestScore}%</Text>
                        </View>
                        <AnimatedProgressBar progress={quiz.bestScore} delay={index * 80} />
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
                </GlassCard>
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
    marginBottom: STUDENT_SPACING.lg,
    ...STUDENT.shadow.md,
  },
  bannerTitle: {
    ...STUDENT_TYPO.section,
    color: STUDENT.textOnPrimary,
  },
  bannerSub: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  tabsContainer: {
    marginBottom: STUDENT_SPACING.xl,
  },
  content: {
    flex: 1,
  },
  shimmerWrap: {
    gap: STUDENT_SPACING.md,
    marginTop: STUDENT_SPACING.sm,
  },
  sectionCard: {
    marginTop: STUDENT_SPACING.lg,
    width: '100%',
    alignSelf: 'stretch',
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
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: STUDENT_SPACING.sm,
    width: '100%',
    alignSelf: 'stretch',
  },
  subjectTile: {
    marginBottom: STUDENT_SPACING.xs,
  },
  subjectCardInner: {
    alignItems: 'center',
    gap: STUDENT_SPACING.sm,
    width: '100%',
  },
  subjectIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    ...STUDENT_TYPO.body,
    fontWeight: '800',
    color: STUDENT.text,
    textAlign: 'center',
    width: '100%',
  },
  subjectNameCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  quizzesList: {
    gap: STUDENT_SPACING.lg,
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  libraryTile: {
    width: '48%',
    marginBottom: STUDENT_SPACING.sm,
  },
  libraryTileCard: {
    width: '100%',
  },
  libraryCardInner: {
    alignItems: 'center',
    width: '100%',
  },
  libraryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: STUDENT_RADIUS.inner,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  libraryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.text,
    textAlign: 'center',
  },
  libraryCount: {
    marginTop: 4,
    fontSize: 11,
    color: STUDENT.textMuted,
    textAlign: 'center',
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizIconContainer: {
    width: 48,
    height: 48,
    borderRadius: STUDENT_RADIUS.inner,
    backgroundColor: STUDENT.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STUDENT.navActiveBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: STUDENT_RADIUS.sm,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.success,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STUDENT.text,
    marginTop: STUDENT_SPACING.md,
  },
  quizDescription: {
    fontSize: 14,
    color: STUDENT.textMuted,
    marginTop: 4,
  },
  quizStats: {
    flexDirection: 'row',
    gap: STUDENT_SPACING.lg,
    marginTop: STUDENT_SPACING.sm,
  },
  quizStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizStatText: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  bestScoreContainer: {
    backgroundColor: STUDENT.navActiveBg,
    padding: 12,
    borderRadius: STUDENT_RADIUS.sm,
    marginTop: STUDENT_SPACING.sm,
    gap: 8,
  },
  bestScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestScoreLabel: {
    fontSize: 14,
    color: STUDENT.success,
    fontWeight: '600',
  },
  bestScoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: STUDENT.success,
  },
  progressTrack: {
    height: 6,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: 'rgba(16,185,129,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.primary,
  },
  quizButton: {
    backgroundColor: STUDENT.warning,
    paddingVertical: 12,
    borderRadius: STUDENT_RADIUS.sm,
    alignItems: 'center',
    marginTop: STUDENT_SPACING.md,
  },
  quizButtonText: {
    color: STUDENT.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
