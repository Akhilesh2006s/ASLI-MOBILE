import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, useAnimatedProps } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/services/api/api';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { AnimatedStatInput, useCountUp } from '../../src/hooks/useCountUp';
import { Badge, DonutChart, EmptyState, ErrorState, LoadingState, SearchBar } from '../../src/components/ui';
import StudentScreenHeader from '../../src/components/student/StudentScreenHeader';
import GlassCard from '../../src/components/student/GlassCard';
import ChipNav from '../../src/components/student/ChipNav';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../src/theme/student';

const SORT_CHIPS = [
  { id: 'recent', label: 'Recent' },
  { id: 'score', label: 'Score' },
  { id: 'subject', label: 'Subject' },
];

type ResultItem = {
  _id?: string;
  subject?: string;
  examName?: string;
  title?: string;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  createdAt?: string;
  passed?: boolean;
};

function AnimatedPctLabel({ pct, size }: { pct: number; size: number }) {
  const value = useCountUp(pct, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.round(value.value)}%`,
  }));

  return (
    <AnimatedStatInput
      editable={false}
      animatedProps={animatedProps as never}
      style={[styles.pctLabel, { width: size, height: size }]}
      underlineColorAndroid="transparent"
    />
  );
}

function ResultCard({ r, index }: { r: ResultItem; index: number }) {
  const pct = r.percentage ?? (r.score && r.totalMarks ? Math.round((r.score / r.totalMarks) * 100) : 0);
  const passed = r.passed ?? pct >= 40;
  const chartSize = 72;

  return (
    <GlassCard animate delay={index * 60} style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.chartWrap}>
          <DonutChart
            size={chartSize}
            segments={[
              { value: pct, color: passed ? STUDENT.success : STUDENT.danger },
              { value: 100 - pct, color: STUDENT.surfaceBorder },
            ]}
          />
          <AnimatedPctLabel pct={pct} size={chartSize} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{r.examName || r.title || 'Exam'}</Text>
          <Text style={styles.cardSub}>{r.subject || 'Subject'}</Text>
          <Text style={styles.cardMarks}>
            {r.score ?? '—'}/{r.totalMarks ?? '—'} marks
          </Text>
          <Badge label={passed ? 'Pass' : 'Fail'} color={passed ? STUDENT.success : STUDENT.danger} size="sm" />
        </View>
      </View>
    </GlassCard>
  );
}

export default function StudentResults() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ResultItem[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'score' | 'subject'>('recent');

  useBackNavigation('/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await SecureStore.getItemAsync('authToken');
      const res = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load results');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results || data?.data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((r) => (r.subject || r.examName || r.title || '').toLowerCase().includes(q));
    }
    if (sort === 'score') list.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    else if (sort === 'subject') list.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
    else list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }, [items, query, sort]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StudentScreenHeader title="Exam Results" onBack={() => router.back()} />

      <View style={styles.filters}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Filter by subject..." />
        <ChipNav chips={SORT_CHIPS} active={sort} onChange={(id) => setSort(id as typeof sort)} />
      </View>

      {loading ? (
        <LoadingState variant="list" style={{ padding: STUDENT_SPACING.lg }} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} style={{ margin: STUDENT_SPACING.lg }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No results yet" subtitle="Your exam results will show here." />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
            {filtered.map((r, index) => (
              <ResultCard key={r._id || `${r.subject}-${r.createdAt}`} r={r} index={index} />
            ))}
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: STUDENT.bg },
  filters: { padding: STUDENT_SPACING.lg, gap: STUDENT_SPACING.md },
  list: { paddingHorizontal: STUDENT_SPACING.lg, paddingBottom: STUDENT_SPACING.xxxl },
  card: { marginBottom: STUDENT_SPACING.md },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: STUDENT_SPACING.lg },
  chartWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  pctLabel: {
    position: 'absolute',
    textAlign: 'center',
    ...STUDENT_TYPO.body,
    fontWeight: '800',
    color: STUDENT.text,
    padding: 0,
    margin: 0,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { ...STUDENT_TYPO.body, fontWeight: '800', color: STUDENT.text },
  cardSub: { ...STUDENT_TYPO.caption, color: STUDENT.textSecondary },
  cardMarks: { ...STUDENT_TYPO.caption, color: STUDENT.textMuted, marginBottom: STUDENT_SPACING.xs },
});
