import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

export default function QuizzesView() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await teacherService.quizzes();
      setQuizzes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.createBtn}
        onPress={() =>
          router.push({
            pathname: '/teacher/tools/worksheet-mcq-generator' as any,
            params: { returnTab: 'dashboard' },
          })
        }
      >
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.createBtnGrad}>
          <Ionicons name="add-circle" size={20} color={TEACHER.textOnPrimary} />
          <Text style={styles.createBtnText}>Create New Quiz</Text>
        </LinearGradient>
      </Pressable>

      {quizzes.map((quiz, index) => (
        <Animated.View key={quiz._id || quiz.id} entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}>
          <GlassPanel style={styles.card} radius={TEACHER_RADIUS.lg} tone="medium">
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{quiz.title || 'Untitled Quiz'}</Text>
              <View style={[styles.badge, quiz.isActive !== false && styles.badgeActive]}>
                <Text style={styles.badgeText}>{quiz.isActive !== false ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {quiz.subject || 'General'} · {quiz.questions?.length || quiz.questionCount || 0} questions
            </Text>
            {quiz.averageScore != null ? (
              <Text style={styles.score}>Avg score: {quiz.averageScore}%</Text>
            ) : null}
          </GlassPanel>
        </Animated.View>
      ))}

      {!quizzes.length ? (
        <View style={styles.empty}>
          <Ionicons name="help-circle-outline" size={40} color={TEACHER.textMuted} />
          <Text style={styles.emptyText}>No quizzes created yet</Text>
          <Text style={styles.emptySub}>Use the quiz builder to create your first quiz</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  wrap: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, backgroundColor: 'transparent' },
  createBtn: { borderRadius: TEACHER_RADIUS.md, overflow: 'hidden', marginBottom: TEACHER_SPACING.lg },
  createBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  createBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  card: {
    ...glassCard,
    backgroundColor: 'transparent',
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: TEACHER.text },
  badge: {
    backgroundColor: TEACHER.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeActive: { backgroundColor: 'rgba(0,214,143,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted },
  meta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 6 },
  score: { fontSize: 13, color: TEACHER.primaryLight, fontWeight: '600', marginTop: 8 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.text, fontWeight: '700', marginTop: 12 },
  emptySub: { color: TEACHER.textMuted, fontSize: 13, marginTop: 4 },
});
