import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import api from '../../src/services/api/api';
import { GlassPanel } from '../../src/components/ui';
import { TEACHER, TEACHER_SPACING, TEACHER_TYPO } from '../../src/theme/teacher';

type PlatformQuiz = {
  _id: string;
  title: string;
  description?: string;
  scheduleType?: string;
  difficulty?: string;
  durationMinutes?: number;
  totalQuestions?: number;
  subject?: { name?: string } | string;
};

export default function TeacherPlatformQuizScreen() {
  useBackNavigation('/teacher/dashboard', false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quizzes, setQuizzes] = useState<PlatformQuiz[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/teacher/platform-quizzes');
      const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      setQuizzes(list);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <LinearGradient
          colors={[...TEACHER.headerGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEACHER.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Quiz</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={styles.subtitle}>Daily and weekly quizzes assigned to teachers by AsliLearn</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={TEACHER.primary} />
            <Text style={styles.muted}>Loading quizzes…</Text>
          </View>
        ) : quizzes.length === 0 ? (
          <GlassPanel radius={14} style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={40} color={TEACHER.textMuted} />
            <Text style={styles.emptyTitle}>No quizzes yet</Text>
            <Text style={styles.muted}>Quizzes assigned to you will appear here.</Text>
          </GlassPanel>
        ) : (
          quizzes.map((quiz) => {
            const subjectName =
              typeof quiz.subject === 'object' ? quiz.subject?.name : String(quiz.subject || '');
            return (
              <GlassPanel key={quiz._id} radius={14} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{quiz.title}</Text>
                  {quiz.scheduleType && quiz.scheduleType !== 'once' ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{quiz.scheduleType}</Text>
                    </View>
                  ) : null}
                </View>
                {quiz.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {quiz.description}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  {subjectName ? (
                    <Text style={styles.meta}>
                      <Ionicons name="book-outline" size={12} color={TEACHER.textMuted} /> {subjectName}
                    </Text>
                  ) : null}
                  {quiz.durationMinutes ? <Text style={styles.meta}>{quiz.durationMinutes} min</Text> : null}
                  {quiz.totalQuestions != null ? (
                    <Text style={styles.meta}>{quiz.totalQuestions} questions</Text>
                  ) : null}
                  {quiz.difficulty ? (
                    <Text style={[styles.meta, styles.difficulty]}>{quiz.difficulty}</Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.startBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/teacher/quiz/[quizId]',
                      params: { quizId: quiz._id },
                    })
                  }
                >
                  <Text style={styles.startBtnText}>Start quiz</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              </GlassPanel>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  body: { flex: 1 },
  bodyContent: { padding: TEACHER_SPACING.lg, gap: 12, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: TEACHER.textMuted, marginBottom: 4 },
  centered: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  muted: { fontSize: 13, color: TEACHER.textMuted, textAlign: 'center' },
  emptyCard: { alignItems: 'center', padding: 28, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEACHER.text },
  card: { padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: TEACHER.text },
  badge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0369a1', textTransform: 'capitalize' },
  cardDesc: { fontSize: 13, color: TEACHER.textMuted, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  meta: { fontSize: 12, color: TEACHER.textMuted },
  difficulty: { textTransform: 'capitalize', fontWeight: '700' },
  startBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
