import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import adminService from '../../src/services/api/adminService';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { ErrorState, LoadingState } from '../../src/components/ui';
import { AdminScalePressable, AdminSectionHeader, useAdminTheme } from './ui';

const REPORTS = [
  { id: 'attendance', label: 'Attendance Report', icon: 'calendar-outline' as const, desc: 'Daily & monthly attendance summaries' },
  { id: 'performance', label: 'Performance Report', icon: 'trending-up-outline' as const, desc: 'Student scores and class averages' },
  { id: 'exams', label: 'Exam Results', icon: 'document-text-outline' as const, desc: 'Detailed exam outcome reports' },
];

export default function AdminReports() {
  const { colors, spacing, radius } = useAdminTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder }]}>
        <AdminScalePressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgElevated, borderRadius: radius.full }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </AdminScalePressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reports Center</Text>
        <View style={styles.backBtn} />
      </View>

      {loadingType ? <LoadingState variant="list" style={{ padding: spacing.lg }} /> : null}
      {error ? <ErrorState message={error} onRetry={() => setError('')} style={{ margin: spacing.lg }} /> : null}

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
        <AdminSectionHeader
          title="Export Reports"
          subtitle="Download attendance, performance, and exam data"
          icon="download-outline"
        />

        {REPORTS.map((r, idx) => (
          <Animated.View key={r.id} entering={FadeInUp.delay(idx * 80).duration(400)}>
            <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.lg }]}>
              <LinearGradient
                colors={[...colors.statGradients[idx % colors.statGradients.length]]}
                style={[styles.reportIcon, { borderRadius: radius.md }]}
              >
                <Ionicons name={r.icon} size={22} color="#fff" />
              </LinearGradient>
              <View style={styles.reportInfo}>
                <Text style={[styles.reportTitle, { color: colors.text }]}>{r.label}</Text>
                <Text style={[styles.reportDesc, { color: colors.textMuted }]}>{r.desc}</Text>
              </View>
              <View style={styles.reportActions}>
                <AdminScalePressable
                  onPress={() => download(r.id, 'csv')}
                  style={[styles.exportBtn, { backgroundColor: colors.primaryMuted, borderRadius: radius.sm }]}
                >
                  <Ionicons name="document-outline" size={16} color={colors.primary} />
                  <Text style={[styles.exportText, { color: colors.primary }]}>
                    {loadingType === `${r.id}-csv` ? '...' : 'CSV'}
                  </Text>
                </AdminScalePressable>
                <AdminScalePressable
                  onPress={() => download(r.id, 'pdf')}
                  style={[styles.exportBtn, { backgroundColor: colors.bgElevated, borderRadius: radius.sm }]}
                >
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.exportText, { color: colors.textSecondary }]}>
                    {loadingType === `${r.id}-pdf` ? '...' : 'PDF'}
                  </Text>
                </AdminScalePressable>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { gap: 16, paddingBottom: 40 },
  reportCard: {
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  reportIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  reportInfo: { gap: 4 },
  reportTitle: { fontSize: 17, fontWeight: '800' },
  reportDesc: { fontSize: 13, lineHeight: 18 },
  reportActions: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  exportText: { fontSize: 14, fontWeight: '700' },
});
