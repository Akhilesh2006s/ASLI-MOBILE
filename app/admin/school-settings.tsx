import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import adminService from '../../src/services/api/adminService';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { ActionButton, ErrorState, LoadingState } from '../../src/components/ui';
import { COLORS, FONT, RADIUS, SPACING } from '../../src/theme';

export default function SchoolSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    schoolName: '',
    board: '',
    workingHours: '',
  });

  useBackNavigation('/admin/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await adminService.getSchoolSettings();
      const s = data?.settings || data?.data || data;
      setForm({
        schoolName: s?.schoolName || s?.name || '',
        board: s?.board || s?.curriculum || '',
        workingHours: s?.workingHours || '',
      });
    } catch (e: any) {
      setError(e?.message || 'Could not load school settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await adminService.updateSchoolSettings(form);
      Alert.alert('Saved', 'School settings updated successfully.');
    } catch (e: any) {
      setError(e?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>School Settings</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <LoadingState variant="cards" style={{ padding: SPACING.lg }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <ErrorState message={error} onRetry={load} /> : null}
          {(['schoolName', 'board', 'workingHours'] as const).map((key) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>
                {key === 'schoolName' ? 'School Name' : key === 'board' ? 'Board / Curriculum' : 'Working Hours'}
              </Text>
              <TextInput
                style={styles.input}
                value={form[key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          ))}
          <ActionButton label="Save Settings" onPress={save} loading={saving} gradient={COLORS.gradientAdmin} />
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
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxxl },
  field: { gap: SPACING.sm },
  label: { fontSize: FONT.sm, fontWeight: FONT.semibold, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT.base,
    color: COLORS.text,
  },
});
