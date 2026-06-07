import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { fetchStudentTimetable, timetableEntriesToSlots } from '../../src/lib/timetable-helpers';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui';
import { COLORS, FONT, RADIUS, SPACING } from '../../src/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SUBJECT_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

type Slot = {
  day?: string;
  period?: number;
  subject?: string;
  teacher?: string;
  time?: string;
};

export default function StudentTimetable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);

  useBackNavigation('/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) throw new Error('Not authenticated');
      const entries = await fetchStudentTimetable(token);
      setSlots(timetableEntriesToSlots(entries));
    } catch (e: any) {
      setError(e?.message || 'Could not load timetable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const periods = Math.max(6, ...slots.map((s) => Number(s.period || 0)));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Weekly Timetable</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <LoadingState variant="cards" style={{ padding: SPACING.lg }} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} style={{ margin: SPACING.lg }} />
      ) : slots.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No timetable" subtitle="Your schedule will appear here." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.grid}>
            <View style={styles.row}>
              <View style={styles.corner} />
              {DAYS.map((d) => (
                <View key={d} style={styles.dayHead}>
                  <Text style={styles.dayText}>{d}</Text>
                </View>
              ))}
            </View>
            {Array.from({ length: periods }).map((_, p) => (
              <View key={p} style={styles.row}>
                <View style={styles.periodHead}>
                  <Text style={styles.periodText}>P{p + 1}</Text>
                </View>
                {DAYS.map((day, di) => {
                  const slot = slots.find(
                    (s) =>
                      (s.day?.toLowerCase().startsWith(day.toLowerCase()) || s.day === String(di + 1)) &&
                      Number(s.period) === p + 1
                  );
                  const color = SUBJECT_COLORS[di % SUBJECT_COLORS.length];
                  return (
                    <View key={`${day}-${p}`} style={[styles.cell, slot && { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
                      {slot ? (
                        <>
                          <Text style={[styles.subject, { color }]} numberOfLines={2}>
                            {slot.subject}
                          </Text>
                          {slot.teacher ? (
                            <Text style={styles.teacher} numberOfLines={1}>
                              {slot.teacher}
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const CELL_W = 110;
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
  grid: { padding: SPACING.lg },
  row: { flexDirection: 'row' },
  corner: { width: 44, height: 44 },
  dayHead: { width: CELL_W, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontWeight: FONT.bold, color: COLORS.text, fontSize: FONT.sm },
  periodHead: { width: 44, height: 72, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: FONT.semibold },
  cell: {
    width: CELL_W,
    height: 72,
    margin: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: SPACING.xs,
    justifyContent: 'center',
  },
  subject: { fontSize: FONT.xs, fontWeight: FONT.bold },
  teacher: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
});
