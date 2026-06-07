import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/services/api/api';
import { ActionButton, EmptyState, ErrorState, LoadingState } from '../../../src/components/ui';
import { COLORS, FONT, RADIUS, SPACING } from '../../../src/theme';

type StudentRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  rollNo?: string;
  status?: 'present' | 'absent' | 'late';
};

export default function AttendanceTrackerView() {
  const [tab, setTab] = useState<'mark' | 'history'>('mark');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await SecureStore.getItemAsync('authToken');
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load attendance');
      const data = await res.json();
      const roster = data?.students || data?.roster || data?.data?.students || [];
      const hist = data?.history || data?.records || [];
      setStudents(
        (Array.isArray(roster) ? roster : []).map((s: StudentRow) => ({
          ...s,
          status: s.status || 'present',
        }))
      );
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (id: string, status: StudentRow['status']) => {
    setStudents((prev) => prev.map((s) => ((s._id || s.id) === id ? { ...s, status } : s)));
  };

  const markAllPresent = () => setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));

  const submit = async () => {
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      });
      if (!res.ok) throw new Error('Failed to submit attendance');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState variant="list" />;

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {(['mark', 'history'] as const).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'mark' ? 'Mark' : 'History'}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <ErrorState message={error} onRetry={load} style={{ marginBottom: SPACING.md }} /> : null}

      {tab === 'mark' ? (
        <>
          <Pressable style={styles.bulkBtn} onPress={markAllPresent}>
            <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
            <Text style={styles.bulkText}>Mark All Present</Text>
          </Pressable>
          <ScrollView style={styles.list}>
            {students.length === 0 ? (
              <EmptyState icon="people-outline" title="No students" subtitle="Select a class to mark attendance." />
            ) : (
              students.map((s) => {
                const id = s._id || s.id || s.fullName || '';
                return (
                  <View key={id} style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.name}>{s.fullName || s.name}</Text>
                      {s.rollNo ? <Text style={styles.roll}>Roll {s.rollNo}</Text> : null}
                    </View>
                    <View style={styles.statusRow}>
                      {(['present', 'absent', 'late'] as const).map((st) => (
                        <Pressable
                          key={st}
                          style={[
                            styles.statusBtn,
                            s.status === st && (st === 'present' ? styles.statusPresent : st === 'absent' ? styles.statusAbsent : styles.statusLate),
                          ]}
                          onPress={() => setStatus(String(id), st)}
                        >
                          <Text style={[styles.statusText, s.status === st && styles.statusTextActive]}>
                            {st[0].toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
          <ActionButton label="Submit Attendance" onPress={submit} loading={submitting} gradient={COLORS.gradientTeacher} />
        </>
      ) : (
        <ScrollView style={styles.list}>
          {history.length === 0 ? (
            <EmptyState icon="time-outline" title="No history" subtitle="Past attendance records appear here." />
          ) : (
            history.map((h, i) => (
              <View key={i} style={styles.historyCard}>
                <Text style={styles.historyDate}>{h.date || h.createdAt || 'Record'}</Text>
                <Text style={styles.historyMeta}>
                  Present: {h.present ?? '—'} • Absent: {h.absent ?? '—'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabs: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: FONT.semibold },
  tabTextActive: { color: COLORS.primary },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  bulkText: { color: COLORS.primary, fontWeight: FONT.semibold, fontSize: FONT.sm },
  list: { flex: 1, marginBottom: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowInfo: { flex: 1 },
  name: { fontSize: FONT.base, fontWeight: FONT.semibold, color: COLORS.text },
  roll: { fontSize: FONT.xs, color: COLORS.textMuted },
  statusRow: { flexDirection: 'row', gap: 4 },
  statusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.divider,
  },
  statusPresent: { backgroundColor: '#D1FAE5' },
  statusAbsent: { backgroundColor: '#FEE2E2' },
  statusLate: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: FONT.bold },
  statusTextActive: { color: COLORS.text },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDate: { fontWeight: FONT.semibold, color: COLORS.text },
  historyMeta: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 4 },
});
