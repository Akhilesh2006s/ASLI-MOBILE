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
  prepareLibraryContents,
  isIitTrackContent,
  type LibraryContentRow,
} from '../../../src/lib/dedupe-library-content';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
  SUBJECT_COLORS,
} from '../../../src/theme/student';
import {
  learningPathDisplayName,
  prepareStudentLearningPathSubjects,
} from '../../../src/lib/learning-path-subjects';

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

function parseSubjectsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.subjects)) return data.subjects;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function subjectIdFromContentRow(item: LibraryContentRow): string {
  const sub = item.subjectId ?? item.subject;
  if (sub == null) return '';
  if (typeof sub === 'string') return sub.trim();
  return String(sub._id || '').trim();
}

/** When /api/student/subjects is down, rebuild a subject list from library content. */
function subjectsFromPrepContent(rows: LibraryContentRow[]): any[] {
  const byId = new Map<string, { _id: string; id: string; name: string }>();

  for (const item of rows) {
    const subj = item?.subjectId ?? item?.subject;
    if (subj == null) continue;
    const id =
      typeof subj === 'object'
        ? String(subj._id || '')
        : String(subj).trim();
    if (!id || byId.has(id)) continue;
    const name =
      typeof subj === 'object'
        ? String(subj.name || (item as { subjectName?: string }).subjectName || 'Subject')
        : String((item as { subjectName?: string }).subjectName || 'Subject');
    byId.set(id, { _id: id, id, name });
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  );
}

function countItemsBySubject(rows: LibraryContentRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of rows) {
    const id = subjectIdFromContentRow(item);
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

export default function LearningPathsView({ dark }: { dark?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const [activeTab, setActiveTab] = useState<'subjects' | 'quizzes'>('subjects');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);

  useEffect(() => {
    if (programLoading) return;
    void fetchSubjects();
    void fetchQuizzes();
  }, [programLoading, isAsliPrepExclusive]);

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    setSubjectsError(null);

    let list: any[] = [];
    let primaryFailed = false;
    let prepared: LibraryContentRow[] = [];

    try {
      const { data } = await api.get('/api/student/subjects');
      list = parseSubjectsPayload(data);
    } catch {
      primaryFailed = true;
    }

    try {
      const { data } = await api.get('/api/student/asli-prep-content', {
        params: { surface: 'learning-path' },
      });
      const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      prepared = prepareLibraryContents(raw, isAsliPrepExclusive);
      setItemCounts(countItemsBySubject(prepared.filter((item) => !isIitTrackContent(item))));
      if (list.length === 0) {
        list = subjectsFromPrepContent(prepared);
      }
    } catch {
      setItemCounts({});
    }

    setSubjects(prepareStudentLearningPathSubjects(list));
    if (list.length === 0 && primaryFailed) {
      setSubjectsError(
        'Subjects are temporarily unavailable. Please try again in a moment.'
      );
    } else {
      setSubjectsError(null);
    }
    setIsLoadingSubjects(false);
  };

  const fetchQuizzes = async () => {
    try {
      setIsLoadingQuizzes(true);
      setQuizzesError(null);
      const { data } = await api.get('/api/student/quizzes');
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setQuizzes(list);
    } catch (error: any) {
      setQuizzes([]);
      const status = error?.response?.status;
      setQuizzesError(
        status === 500
          ? 'Quizzes are temporarily unavailable. Please try again in a moment.'
          : error?.friendlyMessage ||
              error?.response?.data?.message ||
              'Could not load quizzes. Try again.'
      );
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
                  ? 'Open a subject for textbooks, materials, and videos.'
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
                <Ionicons
                  name={subjectsError ? 'cloud-offline-outline' : 'book-outline'}
                  size={28}
                  color={STUDENT.primary}
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                {subjectsError ? 'Couldn’t load subjects' : 'No subjects yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                {subjectsError ||
                  'Subjects for your class will show up here once they are assigned.'}
              </Text>
              {subjectsError ? (
                <TouchableOpacity style={styles.retryBtn} onPress={fetchSubjects} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={16} color={STUDENT.textOnPrimary} />
                  <Text style={styles.retryBtnText}>Try again</Text>
                </TouchableOpacity>
              ) : null}
            </GlassPanel>
          ) : (
            <View style={styles.subjectsList}>
              <Text style={styles.sectionLabel}>Your subjects</Text>
              {subjects.map((subject: any, index: number) => {
                const displayName = learningPathDisplayName(subject.name);
                const iconName = getSubjectIcon(displayName);
                const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                const subjectId = String(subject._id || subject.id || '');
                const count = itemCounts[subjectId];
                const hint =
                  typeof count === 'number'
                    ? `${count} ${count === 1 ? 'item' : 'items'}`
                    : 'View content';
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
                        params: { id: subjectId, returnTo: 'learning' },
                      })
                    }
                  >
                    <View style={styles.subjectRow}>
                      <View style={[styles.subjectIcon, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
                        <Ionicons name={iconName} size={22} color={color} />
                      </View>
                      <View style={styles.subjectMeta}>
                        <Text style={styles.subjectName} numberOfLines={2}>
                          {displayName}
                        </Text>
                        <Text style={styles.subjectHint}>{hint}</Text>
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

          {!isLoadingSubjects ? (
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
                <Ionicons
                  name={quizzesError ? 'cloud-offline-outline' : 'document-text-outline'}
                  size={28}
                  color={STUDENT.primary}
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                {quizzesError ? 'Couldn’t load quizzes' : 'No quizzes assigned'}
              </Text>
              <Text style={styles.emptyStateText}>
                {quizzesError || "Your teacher hasn't assigned any quizzes yet."}
              </Text>
              {quizzesError ? (
                <TouchableOpacity style={styles.retryBtn} onPress={fetchQuizzes} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={16} color={STUDENT.textOnPrimary} />
                  <Text style={styles.retryBtnText}>Try again</Text>
                </TouchableOpacity>
              ) : null}
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
  retryBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STUDENT.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: STUDENT_RADIUS.md,
  },
  retryBtnText: {
    color: STUDENT.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
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
