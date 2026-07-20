import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import GlassPanel from '../../../src/components/ui/GlassPanel';
import { GLASS_ROW, GLASS_VIOLET } from '../../../src/theme/glass';
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

function getSubjectIcon(subjectName: string): keyof typeof Ionicons.glyphMap {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return 'calculator-outline';
  if (name.includes('physics')) return 'nuclear-outline';
  if (name.includes('chemistry')) return 'flask-outline';
  if (name.includes('biology') || name.includes('science')) return 'leaf-outline';
  if (name.includes('english')) return 'book-outline';
  if (name.includes('history') || name.includes('social')) return 'globe-outline';
  if (name.includes('computer') || name.includes('it')) return 'laptop-outline';
  return 'library-outline';
}

export default function LearningPathsView({ dark }: { dark?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
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
      setSubjects(data.subjects || data.data || []);
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

  const tabChips = [
    { id: 'subjects', label: 'Browse Subjects', shortLabel: 'Subjects' },
    { id: 'quizzes', label: 'My Quizzes', shortLabel: 'Quizzes' },
  ];

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      {!dark ? (
        <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
          <GlassPanel
            tone="strong"
            elevated
            colors={[...GLASS_VIOLET]}
            radius={STUDENT_RADIUS.xxl}
            style={styles.banner}
            contentStyle={[styles.bannerInner, compact && { paddingHorizontal: 16 }]}
          >
            <View style={styles.bannerIcon}>
              <Ionicons name="book-outline" size={22} color={STUDENT.primaryDark} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>
                {activeTab === 'subjects' ? 'Browse subjects' : 'My quizzes'}
              </Text>
              <Text style={styles.bannerSub}>
                {activeTab === 'subjects'
                  ? 'Open a subject for chapters, topics, and practice materials.'
                  : 'Short checks assigned by your teacher to lock in what you studied.'}
              </Text>
            </View>
          </GlassPanel>
        </Animated.View>
      ) : null}

      <View style={styles.tabsContainer}>
        <ChipNav
          chips={tabChips}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'subjects' | 'quizzes')}
        />
      </View>

      {activeTab === 'subjects' ? (
        <View style={styles.content}>
          {isLoadingSubjects ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : subjects.length === 0 ? (
            <GlassPanel tone="medium" radius={STUDENT_RADIUS.card} style={styles.emptyCard} contentStyle={styles.emptyInner}>
              <View style={styles.emptyIcon}>
                <Ionicons name="book-outline" size={28} color={STUDENT.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>No subjects yet</Text>
              <Text style={styles.emptyStateText}>
                Subjects for your class will show up here once they are assigned.
              </Text>
            </GlassPanel>
          ) : (
            <View style={styles.subjectsList}>
              <Text style={styles.sectionLabel}>Your subjects</Text>
              {subjects.map((subject: any, index: number) => {
                const iconName = getSubjectIcon(subject.name);
                const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                return (
                  <GlassCard
                    key={subject._id || subject.id}
                    variant="glass"
                    padding={0}
                    animate
                    delay={index * 40}
                    style={styles.subjectCard}
                    onPress={() =>
                      router.push({
                        pathname: '/subject/[id]',
                        params: { id: String(subject._id || subject.id), returnTo: 'learning' },
                      })
                    }
                  >
                    <View style={styles.subjectRow}>
                      <View style={[styles.subjectIcon, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
                        <Ionicons name={iconName} size={22} color={color} />
                      </View>
                      <View style={styles.subjectMeta}>
                        <Text style={styles.subjectName} numberOfLines={2}>
                          {subject.name}
                        </Text>
                        <Text style={styles.subjectHint}>Open chapters & materials</Text>
                      </View>
                      <View style={styles.subjectChevron}>
                        <Ionicons name="chevron-forward" size={16} color={STUDENT.textMuted} />
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}

          {!isLoadingSubjects && subjects.length > 0 ? (
            <GlassPanel
              tone="medium"
              elevated
              radius={STUDENT_RADIUS.card}
              style={styles.sectionCard}
              contentStyle={styles.sectionInner}
            >
              <DigitalLibraryBrowseSection returnTo="learning" dark={dark} />
            </GlassPanel>
          ) : null}
        </View>
      ) : null}

      {activeTab === 'quizzes' ? (
        <View style={styles.content}>
          {isLoadingQuizzes ? (
            <View style={styles.shimmerWrap}>
              <ShimmerCard />
              <ShimmerCard />
            </View>
          ) : quizzes.length === 0 ? (
            <GlassPanel tone="medium" radius={STUDENT_RADIUS.card} style={styles.emptyCard} contentStyle={styles.emptyInner}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={28} color={STUDENT.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>No quizzes assigned</Text>
              <Text style={styles.emptyStateText}>Your teacher hasn&apos;t assigned any quizzes yet.</Text>
            </GlassPanel>
          ) : (
            <View style={styles.quizzesList}>
              {quizzes.map((quiz: any, index: number) => (
                <GlassCard key={quiz._id} variant="glass" padding={16} animate delay={index * 50}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/quiz/${quiz._id}`)}>
                    <View style={styles.quizHeader}>
                      <View style={styles.quizIconContainer}>
                        <Ionicons name="document-text-outline" size={22} color={STUDENT.primaryDark} />
                      </View>
                      {quiz.hasAttempted ? (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={STUDENT.success} />
                          <Text style={styles.completedText}>Completed</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.quizTitle}>{quiz.title}</Text>
                    <Text style={styles.quizDescription}>
                      {quiz.description || `Quiz on ${quiz.subject?.name || quiz.subject || 'subject'}`}
                    </Text>
                    <View style={styles.quizStats}>
                      <View style={styles.quizStat}>
                        <Ionicons name="time-outline" size={15} color={STUDENT.textMuted} />
                        <Text style={styles.quizStatText}>{quiz.duration || 60} min</Text>
                      </View>
                      <View style={styles.quizStat}>
                        <Ionicons name="help-circle-outline" size={15} color={STUDENT.textMuted} />
                        <Text style={styles.quizStatText}>
                          {quiz.questions?.length || quiz.questionCount || 0} questions
                        </Text>
                      </View>
                    </View>
                    {quiz.hasAttempted && quiz.bestScore != null ? (
                      <View style={styles.bestScoreContainer}>
                        <View style={styles.bestScoreHeader}>
                          <Text style={styles.bestScoreLabel}>Best score</Text>
                          <Text style={styles.bestScoreValue}>{quiz.bestScore}%</Text>
                        </View>
                        <AnimatedProgressBar progress={quiz.bestScore} delay={index * 80} />
                      </View>
                    ) : null}
                    <View style={styles.quizButton}>
                      <Text style={styles.quizButtonText}>
                        {quiz.hasAttempted ? 'Review quiz' : 'Start quiz'}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={STUDENT.textOnPrimary} />
                    </View>
                  </TouchableOpacity>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerDark: { backgroundColor: 'transparent' },
  banner: {
    marginBottom: STUDENT_SPACING.lg,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: {
    ...STUDENT_TYPO.section,
    color: STUDENT.text,
  },
  bannerSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: STUDENT.textSecondary,
  },
  tabsContainer: {
    marginBottom: STUDENT_SPACING.lg,
  },
  content: { flex: 1 },
  shimmerWrap: {
    gap: STUDENT_SPACING.md,
  },
  sectionLabel: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionCard: {
    marginTop: STUDENT_SPACING.xl,
    width: '100%',
  },
  sectionInner: {
    padding: 14,
  },
  emptyCard: {
    marginTop: 4,
  },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
    marginTop: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: STUDENT.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  subjectsList: {
    gap: 10,
  },
  subjectCard: {
    width: '100%',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  subjectMeta: {
    flex: 1,
    minWidth: 0,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
  },
  subjectHint: {
    marginTop: 2,
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  subjectChevron: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizzesList: {
    gap: STUDENT_SPACING.md,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizIconContainer: {
    width: 44,
    height: 44,
    borderRadius: STUDENT_RADIUS.inner,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,150,105,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: STUDENT_RADIUS.sm,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.success,
  },
  quizTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
    marginTop: STUDENT_SPACING.md,
  },
  quizDescription: {
    fontSize: 13,
    color: STUDENT.textMuted,
    marginTop: 4,
    lineHeight: 18,
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
    fontSize: 13,
    color: STUDENT.textMuted,
  },
  bestScoreContainer: {
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
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
    fontSize: 13,
    color: STUDENT.success,
    fontWeight: '700',
  },
  bestScoreValue: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.success,
  },
  progressTrack: {
    height: 6,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: 'rgba(109,91,208,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.primary,
  },
  quizButton: {
    backgroundColor: STUDENT.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: STUDENT_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: STUDENT_SPACING.md,
  },
  quizButtonText: {
    color: STUDENT.textOnPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
