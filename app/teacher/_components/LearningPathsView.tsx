import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, glassCard } from '../../../src/theme/teacher';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  loadLearningPathCatalog,
  type SubjectWithPathContent,
} from '../../../src/lib/learningPathCatalog';
import {
  countLearningPathDisplayStats,
  learningPathStatsTotal,
} from '../../../src/lib/learning-path-stats';

type Props = {
  refreshKey?: number;
};

const GRID_MAX_WIDTH = 1080;
const COLUMN_GAP = TEACHER_SPACING.md;

function useTeacherTabletGrid(itemCount: number) {
  const { width: screenWidth } = useWindowDimensions();
  const maxColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const numColumns = itemCount > 0 ? Math.min(maxColumns, itemCount) : maxColumns;
  const isGrid = numColumns > 1;
  const innerWidth = Math.min(screenWidth, GRID_MAX_WIDTH) - TEACHER_SPACING.lg * 2;
  const cardWidth = isGrid
    ? (innerWidth - COLUMN_GAP * (numColumns - 1)) / numColumns
    : innerWidth;

  return { numColumns, isGrid, cardWidth, innerWidth };
}

function SubjectPathCard({
  subject,
  width,
}: {
  subject: SubjectWithPathContent;
  width: number;
}) {
  const stats = countLearningPathDisplayStats(subject.asliPrepContent);
  const itemCount = learningPathStatsTotal(stats);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width, marginBottom: 0 },
        pressed && styles.pressed,
      ]}
      onPress={() => router.push(`/teacher/subject/${subject.id}?returnTo=learning`)}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name="library" size={22} color={TEACHER.textOnPrimary} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount} items</Text>
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {subject.name}
      </Text>
      {subject.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {subject.description}
        </Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="book" size={14} color={TEACHER.success} />
          <Text style={styles.statVal}>{stats.textbooks}</Text>
          <Text style={styles.statLbl}>Textbooks</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="document-text" size={14} color={TEACHER.secondary} />
          <Text style={styles.statVal}>{stats.materials}</Text>
          <Text style={styles.statLbl}>Materials</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="play" size={14} color={TEACHER.primaryLight} />
          <Text style={styles.statVal}>{stats.videos}</Text>
          <Text style={styles.statLbl}>Videos</Text>
        </View>
      </View>
      {subject.asliPrepContent.slice(0, 2).map((item, i) => (
        <Text key={item._id || i} style={styles.recent} numberOfLines={1}>
          • {item.title || 'Untitled'}
        </Text>
      ))}
      <View style={styles.cta}>
        <Text style={styles.ctaText}>View Content</Text>
        <Ionicons name="arrow-forward" size={16} color={TEACHER.textOnPrimary} />
      </View>
    </Pressable>
  );
}

export default function LearningPathsView({ refreshKey = 0 }: Props) {
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const [subjects, setSubjects] = useState<SubjectWithPathContent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (programLoading) return;
    setLoading(true);
    try {
      const rows = await loadLearningPathCatalog('teacher', isAsliPrepExclusive);
      setSubjects(rows);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [isAsliPrepExclusive, programLoading]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const { isGrid, cardWidth } = useTeacherTabletGrid(subjects.length);

  const subtitle = useMemo(
    () =>
      isAsliPrepExclusive ? 'Asli Prep — full catalog' : 'Textbooks, Materials & Videos',
    [isAsliPrepExclusive]
  );

  if (programLoading || loading) {
    return <TeacherShimmer variant="card" count={3} />;
  }

  if (!subjects.length) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="book-outline" size={48} color={TEACHER.textMuted} />
        <Text style={styles.emptyTitle}>No Learning Paths</Text>
        <Text style={styles.emptySub}>
          No catalog content is available for your subjects yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerSub}>{subtitle}</Text>
      <View style={[styles.grid, isGrid && styles.gridMulti]}>
        {subjects.map((subject) => (
          <SubjectPathCard
            key={subject.mergedSubjectIds?.join(':') || subject.id}
            subject={subject}
            width={cardWidth}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TEACHER.bg,
  },
  listContent: {
    width: '100%',
    maxWidth: GRID_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: 96,
  },
  grid: {
    width: '100%',
  },
  gridMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: COLUMN_GAP,
    rowGap: COLUMN_GAP,
  },
  headerSub: {
    fontSize: 14,
    color: TEACHER.textMuted,
    marginBottom: TEACHER_SPACING.lg,
  },
  card: {
    ...glassCard,
    padding: TEACHER_SPACING.lg,
  },
  pressed: { opacity: 0.92 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: TEACHER_SPACING.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: TEACHER.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted },
  name: { fontSize: 18, fontWeight: '800', color: TEACHER.text },
  desc: { fontSize: 13, color: TEACHER.textMuted, marginTop: 4, marginBottom: TEACHER_SPACING.md },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: TEACHER_SPACING.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: TEACHER.surfaceElevated,
    padding: 10,
    borderRadius: TEACHER_RADIUS.sm,
  },
  statVal: { fontSize: 16, fontWeight: '800', color: TEACHER.text, marginTop: 4 },
  statLbl: { fontSize: 10, color: TEACHER.textMuted },
  recent: { fontSize: 12, color: TEACHER.textSecondary, marginTop: 4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEACHER.primary,
    padding: 12,
    borderRadius: TEACHER_RADIUS.md,
    marginTop: TEACHER_SPACING.md,
  },
  ctaText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: TEACHER.bg,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEACHER.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: TEACHER.textMuted, marginTop: 8, textAlign: 'center' },
});
