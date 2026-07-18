import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { fetchStudentTimetable, timetableEntriesToSlots } from '../../src/lib/timetable-helpers';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui';
import StudentScreenHeader from '../../src/components/student/StudentScreenHeader';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
  SUBJECT_COLORS,
} from '../../src/theme/student';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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
      <StudentScreenHeader title="Weekly Timetable" onBack={() => router.back()} />

      {loading ? (
        <LoadingState variant="cards" style={{ padding: STUDENT_SPACING.lg }} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} style={{ margin: STUDENT_SPACING.lg }} />
      ) : slots.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No timetable" subtitle="Your schedule will appear here." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.grid}>
            <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)} style={styles.row}>
              <View style={styles.corner} />
              {DAYS.map((d) => (
                <View key={d} style={styles.dayHead}>
                  <Text style={styles.dayText}>{d}</Text>
                </View>
              ))}
            </Animated.View>
            {Array.from({ length: periods }).map((_, p) => (
              <Animated.View
                key={p}
                entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay((p + 1) * 60)}
                style={styles.row}
              >
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
                    <View
                      key={`${day}-${p}`}
                      style={[
                        styles.cell,
                        slot && { backgroundColor: `${color}15`, borderColor: `${color}40` },
                      ]}
                    >
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
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const CELL_W = 110;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: STUDENT.bg },
  grid: { padding: STUDENT_SPACING.lg },
  row: { flexDirection: 'row' },
  corner: { width: 44, height: 44 },
  dayHead: { width: CELL_W, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayText: { ...STUDENT_TYPO.caption, color: STUDENT.text },
  periodHead: { width: 44, height: 72, alignItems: 'center', justifyContent: 'center' },
  periodText: { ...STUDENT_TYPO.label, color: STUDENT.textMuted },
  cell: {
    width: CELL_W,
    height: 72,
    margin: 2,
    borderRadius: STUDENT_RADIUS.sm,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: STUDENT.surface,
    padding: STUDENT_SPACING.xs,
    justifyContent: 'center',
  },
  subject: { ...STUDENT_TYPO.label, fontSize: 11 },
  teacher: { fontSize: 10, color: STUDENT.textMuted, marginTop: 2 },
});
