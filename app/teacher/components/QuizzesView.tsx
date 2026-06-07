import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';

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
        onPress={() => router.push('/teacher/tools/worksheet-mcq-generator' as any)}
      >
        <Ionicons name="add-circle" size={20} color={TEACHER.textOnPrimary} />
        <Text style={styles.createBtnText}>Create New Quiz</Text>
      </Pressable>

      {quizzes.map((quiz) => (
        <View key={quiz._id || quiz.id} style={styles.card}>
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
        </View>
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
  wrap: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: TEACHER_SPACING.xxl },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEACHER.primary,
    padding: 14,
    borderRadius: TEACHER_RADIUS.md,
    marginBottom: TEACHER_SPACING.lg,
  },
  createBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  card: {
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: TEACHER.text },
  badge: {
    backgroundColor: TEACHER.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted },
  meta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 6 },
  score: { fontSize: 13, color: TEACHER.primaryLight, fontWeight: '600', marginTop: 8 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.text, fontWeight: '700', marginTop: 12 },
  emptySub: { color: TEACHER.textMuted, fontSize: 13, marginTop: 4 },
});
