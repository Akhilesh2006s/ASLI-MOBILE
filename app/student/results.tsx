import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/services/api/api';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { Badge, DonutChart, EmptyState, ErrorState, LoadingState, SearchBar } from '../../src/components/ui';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../../src/theme';

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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Exam Results</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.filters}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Filter by subject..." />
        <View style={styles.sortRow}>
          {(['recent', 'score', 'subject'] as const).map((s) => (
            <Pressable key={s} style={[styles.chip, sort === s && styles.chipActive]} onPress={() => setSort(s)}>
              <Text style={[styles.chipText, sort === s && styles.chipTextActive]}>
                {s === 'recent' ? 'Recent' : s === 'score' ? 'Score' : 'Subject'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingState variant="list" style={{ padding: SPACING.lg }} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} style={{ margin: SPACING.lg }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No results yet" subtitle="Your exam results will show here." />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((r) => {
            const pct = r.percentage ?? (r.score && r.totalMarks ? Math.round((r.score / r.totalMarks) * 100) : 0);
            const passed = r.passed ?? pct >= 40;
            return (
              <View key={r._id || `${r.subject}-${r.createdAt}`} style={styles.card}>
                <DonutChart
                  size={72}
                  centerLabel={`${pct}%`}
                  segments={[
                    { value: pct, color: passed ? COLORS.success : COLORS.danger },
                    { value: 100 - pct, color: COLORS.divider },
                  ]}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{r.examName || r.title || 'Exam'}</Text>
                  <Text style={styles.cardSub}>{r.subject || 'Subject'}</Text>
                  <Text style={styles.cardMarks}>
                    {r.score ?? '—'}/{r.totalMarks ?? '—'} marks
                  </Text>
                  <Badge label={passed ? 'Pass' : 'Fail'} color={passed ? COLORS.success : COLORS.danger} size="sm" />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT.xl, fontWeight: FONT.bold, color: COLORS.text },
  filters: { padding: SPACING.lg, gap: SPACING.md },
  sortRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  chipText: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: FONT.medium },
  chipTextActive: { color: COLORS.primary, fontWeight: FONT.bold },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.text },
  cardSub: { fontSize: FONT.sm, color: COLORS.textSecondary },
  cardMarks: { fontSize: FONT.sm, color: COLORS.textMuted, marginBottom: SPACING.xs },
});
