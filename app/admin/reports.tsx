import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import adminService from '../../src/services/api/adminService';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { ActionButton, ErrorState, LoadingState, PremiumCard } from '../../src/components/ui';
import { COLORS, FONT, SPACING } from '../../src/theme';

const REPORTS = [
  { id: 'attendance', label: 'Attendance Report', icon: 'calendar-outline' as const },
  { id: 'performance', label: 'Performance Report', icon: 'trending-up-outline' as const },
  { id: 'exams', label: 'Exam Results', icon: 'document-text-outline' as const },
];

export default function AdminReports() {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [error, setError] = useState('');

  useBackNavigation('/admin/dashboard', false);

  const download = useCallback(async (type: string, format: 'csv' | 'pdf') => {
    setLoadingType(`${type}-${format}`);
    setError('');
    try {
      const response = await adminService.downloadReport(type, format);
      if (format === 'pdf') {
        const message = response?.data?.message || 'Report generated on server.';
        Alert.alert('Report ready', message);
      } else {
        const rowHint =
          typeof response?.data === 'string'
            ? `${response.data.split('\n').length - 1} rows exported`
            : 'CSV export completed';
        Alert.alert('Export complete', rowHint);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not download report');
    } finally {
      setLoadingType(null);
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

      {loadingType ? <LoadingState variant="list" style={{ padding: SPACING.lg }} /> : null}
      {error ? <ErrorState message={error} onRetry={() => setError('')} style={{ margin: SPACING.lg }} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {REPORTS.map((r) => (
          <PremiumCard key={r.id} title={r.label} icon={r.icon} gradient={COLORS.gradientAdmin}>
            <ActionButton
              label="Export CSV"
              onPress={() => download(r.id, 'csv')}
              variant="secondary"
              loading={loadingType === `${r.id}-csv`}
            />
            <ActionButton
              label="Export PDF"
              onPress={() => download(r.id, 'pdf')}
              style={{ marginTop: SPACING.sm }}
              loading={loadingType === `${r.id}-pdf`}
            />
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
