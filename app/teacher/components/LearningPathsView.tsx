import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

interface SubjectWithContent {
  _id: string;
  id: string;
  name: string;
  description?: string;
  totalContent: number;
  videos: any[];
  assessments: any[];
  asliPrepContent: any[];
}

export default function LearningPathsView() {
  const [subjects, setSubjects] = useState<SubjectWithContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const subRes = await teacherService.subjects();
      const subs = subRes.data ?? [];
      const enriched = await Promise.all(
        (Array.isArray(subs) ? subs : []).map(async (subject: any) => {
          const id = subject._id || subject.id;
          try {
            const contentRes = await teacherService.asliPrepContent({ subject: id });
            const content = contentRes.data ?? [];
            const list = Array.isArray(content) ? content : [];
            return {
              _id: id,
              id,
              name: subject.name || 'Subject',
              description: subject.description,
              totalContent: list.length,
              videos: list.filter((c: any) => c.type === 'Video'),
              assessments: list.filter((c: any) => c.type === 'Assessment'),
              asliPrepContent: list,
            };
          } catch {
            return {
              _id: id,
              id,
              name: subject.name || 'Subject',
              description: subject.description,
              totalContent: 0,
              videos: [],
              assessments: [],
              asliPrepContent: [],
            };
          }
        })
      );
      setSubjects(enriched);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TeacherShimmer variant="card" count={3} />;

  if (!subjects.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="book-outline" size={48} color={TEACHER.textMuted} />
        <Text style={styles.emptyTitle}>No Subjects Available</Text>
        <Text style={styles.emptySub}>No subjects have been assigned to you yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="book" size={22} color={TEACHER.primaryLight} />
        <Text style={styles.headerTitle}>Learning Paths</Text>
      </View>
      {subjects.map((subject, index) => (
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
            <Text style={styles.desc} numberOfLines={2}>{subject.description}</Text>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="play" size={14} color={TEACHER.primaryLight} />
              <Text style={styles.statVal}>{subject.videos.length}</Text>
              <Text style={styles.statLbl}>Videos</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="document-text" size={14} color={TEACHER.success} />
              <Text style={styles.statVal}>{subject.assessments.length}</Text>
              <Text style={styles.statLbl}>Quizzes</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="layers" size={14} color={TEACHER.secondary} />
              <Text style={styles.statVal}>{subject.asliPrepContent.length}</Text>
              <Text style={styles.statLbl}>Content</Text>
            </View>
          </View>
          {subject.videos.slice(0, 2).map((v, i) => (
            <Text key={v._id || i} style={styles.recent} numberOfLines={1}>
              • {v.title || 'Untitled Video'}
            </Text>
          ))}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Content</Text>
            <Ionicons name="arrow-forward" size={16} color={TEACHER.textOnPrimary} />
          </View>
        </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, backgroundColor: TEACHER.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: TEACHER_SPACING.lg },
  headerTitle: { ...TEACHER_TYPO.section, color: TEACHER.text },
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
