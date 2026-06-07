import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  loadLearningPathCatalog,
  type SubjectWithPathContent,
} from '../../../src/lib/learningPathCatalog';

export default function LearningPathsView() {
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
  }, [load]);

  if (programLoading || loading) return <TeacherShimmer variant="card" count={3} />;

  if (!subjects.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="book-outline" size={48} color={TEACHER.textMuted} />
        <Text style={styles.emptyTitle}>No Learning Paths</Text>
        <Text style={styles.emptySub}>
          {isAsliPrepExclusive
            ? 'No catalog content is available for your subjects yet.'
            : 'Curriculum schools see Audio, TextBook and Homework only.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.wrapContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Ionicons name="book" size={22} color={TEACHER.primaryLight} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Learning Paths</Text>
          <Text style={styles.headerSub}>
            {isAsliPrepExclusive ? 'Asli Prep — full catalog' : 'Curriculum — Audio, TextBook & Homework'}
          </Text>
        </View>
      </View>
      {subjects.map((subject, index) => {
        const videos = subject.asliPrepContent.filter((c) => c.type === 'Video');
        const homework = subject.asliPrepContent.filter((c) => c.type === 'Homework');
        return (
          <Animated.View key={subject.id} entering={FadeInDown.duration(350).delay(Math.min(index * 70, 490))}>
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push(`/teacher/subject/${subject.id}` as any)}
            >
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="library" size={22} color={TEACHER.textOnPrimary} />
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{subject.totalContent} items</Text>
                </View>
              </View>
              <Text style={styles.name}>{subject.name}</Text>
              {subject.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {subject.description}
                </Text>
              ) : null}
              <View style={styles.statsRow}>
                {isAsliPrepExclusive ? (
                  <View style={styles.stat}>
                    <Ionicons name="play" size={14} color={TEACHER.primaryLight} />
                    <Text style={styles.statVal}>{videos.length}</Text>
                    <Text style={styles.statLbl}>Videos</Text>
                  </View>
                ) : null}
                <View style={styles.stat}>
                  <Ionicons name="headset" size={14} color={TEACHER.success} />
                  <Text style={styles.statVal}>
                    {subject.asliPrepContent.filter((c) => c.type === 'Audio').length}
                  </Text>
                  <Text style={styles.statLbl}>Audio</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="clipboard" size={14} color={TEACHER.secondary} />
                  <Text style={styles.statVal}>{homework.length}</Text>
                  <Text style={styles.statLbl}>Homework</Text>
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
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: TEACHER.bg },
  wrapContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: TEACHER_SPACING.lg, marginTop: TEACHER_SPACING.sm },
  headerText: { flex: 1 },
  headerTitle: { ...TEACHER_TYPO.section, color: TEACHER.text },
  headerSub: { fontSize: 12, color: TEACHER.textMuted, marginTop: 2 },
  card: {
    ...glassCard,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
  },
  pressed: { opacity: 0.92 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: TEACHER_SPACING.md },
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
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEACHER.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: TEACHER.textMuted, marginTop: 8, textAlign: 'center' },
});
