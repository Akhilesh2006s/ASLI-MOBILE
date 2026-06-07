import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/services/api/api';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { ActionButton, ErrorState, LoadingState, PremiumCard } from '../../src/components/ui';
import { COLORS, FONT, SPACING } from '../../src/theme';

const REPORTS = [
  { id: 'attendance', label: 'Attendance Report', icon: 'calendar-outline' as const },
  { id: 'performance', label: 'Performance Report', icon: 'trending-up-outline' as const },
  { id: 'exams', label: 'Exam Results', icon: 'document-text-outline' as const },
];

export default function AdminReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useBackNavigation('/admin/dashboard', false);

  const download = useCallback(async (type: string) => {
    setLoading(true);
    setError('');
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/reports?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate report');
    } catch (e: any) {
      setError(e?.message || 'Could not download report');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Reports Center</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? <LoadingState variant="list" style={{ padding: SPACING.lg }} /> : null}
      {error ? <ErrorState message={error} onRetry={() => setError('')} style={{ margin: SPACING.lg }} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {REPORTS.map((r) => (
          <PremiumCard key={r.id} title={r.label} icon={r.icon} gradient={COLORS.gradientAdmin}>
            <ActionButton label="Export CSV" onPress={() => download(`${r.id}&format=csv`)} variant="secondary" />
            <ActionButton label="Export PDF" onPress={() => download(`${r.id}&format=pdf`)} style={{ marginTop: SPACING.sm }} />
          </PremiumCard>
        ))}
      </ScrollView>
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
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxxl },
});
