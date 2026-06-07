import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { fetchStudentTimetable, timetableEntriesToSlots } from '../../../../src/lib/timetable-helpers';
import { STUDENT, STUDENT_RADIUS, SUBJECT_COLORS } from '../../../../src/theme/student';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_W = 100;

type Slot = {
  day?: string;
  period?: number;
  subject?: string;
  teacher?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
};

type Props = {
  schoolName?: string;
};

function getCurrentDayIndex(): number {
  const day = new Date().getDay();
  if (day === 0) return -1;
  return day - 1;
}

function ClassTimetableSectionComponent({ schoolName }: Props) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const currentDayIndex = getCurrentDayIndex();

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const entries = await fetchStudentTimetable(token);
        setSlots(timetableEntriesToSlots(entries));
      } catch {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const periods = Math.max(6, ...slots.map((s) => Number(s.period || 0)), 0);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[...STUDENT.cardGradient]} style={styles.headerCard}>
        <View style={styles.headerRow}>
          <LinearGradient colors={[...STUDENT.statGradients.study]} style={styles.headerIcon}>
            <Ionicons name="calendar" size={22} color={STUDENT.textOnPrimary} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            {schoolName ? <Text style={styles.school}>{schoolName}</Text> : null}
            <Text style={styles.title}>Class Timetable</Text>
            <Text style={styles.sub}>Monday – Saturday · same schedule every week</Text>
          </View>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>{slots.length} sessions</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.gridCard}>
        {loading ? (
          <ActivityIndicator color={STUDENT.accent} style={{ padding: 24 }} />
        ) : slots.length === 0 ? (
          <Text style={styles.empty}>No classes in your weekly timetable yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.row}>
                <View style={styles.corner} />
                {Array.from({ length: periods }).map((_, p) => (
                  <View key={p} style={styles.timeHead}>
                    <Text style={styles.timeHeadText}>{9 + p} AM</Text>
                  </View>
                ))}
              </View>
              {DAYS.map((day, di) => {
                const isCurrentDay = di === currentDayIndex;
                return (
                  <View key={day} style={styles.row}>
                    <View style={[styles.dayLabel, isCurrentDay && styles.dayLabelCurrent]}>
                      {isCurrentDay ? <View style={styles.currentDot} /> : null}
                      <Text style={styles.dayLabelText}>{day}</Text>
                    </View>
                    {Array.from({ length: periods }).map((_, p) => {
                      const slot = slots.find(
                        (s) =>
                          (s.day?.toLowerCase().startsWith(day.toLowerCase()) ||
                            s.day === String(di + 1)) &&
                          Number(s.period) === p + 1
                      );
                      const color = SUBJECT_COLORS[(di + p) % SUBJECT_COLORS.length];
                      return (
                        <View
                          key={`${day}-${p}`}
                          style={[
                            styles.cell,
                            isCurrentDay && styles.cellCurrentDay,
                            slot && styles.cellFilled,
                            slot && { borderLeftColor: color, borderLeftWidth: 4 },
                          ]}
                        >
                          {slot ? (
                            <>
                              <Text style={[styles.cellSubject, { color }]} numberOfLines={2}>
                                {slot.subject || 'Class'}
                              </Text>
                              {slot.teacher ? (
                                <Text style={styles.cellTeacher} numberOfLines={1}>
                                  {slot.teacher}
                                </Text>
                              ) : null}
                            </>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headerCard: {
    borderRadius: STUDENT_RADIUS.card,
    padding: 14,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  school: { fontSize: 10, fontWeight: '700', color: STUDENT.accent, marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '800', color: STUDENT.text },
  sub: { fontSize: 12, color: STUDENT.textMuted, marginTop: 2 },
  sessionBadge: {
    backgroundColor: STUDENT.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sessionBadgeText: { fontSize: 11, fontWeight: '700', color: STUDENT.accent },
  gridCard: {
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.card,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    overflow: 'hidden',
  },
  empty: { textAlign: 'center', color: STUDENT.textMuted, fontSize: 12, padding: 20 },
  row: { flexDirection: 'row' },
  corner: { width: 52, height: 44 },
  timeHead: {
    width: CELL_W,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STUDENT.accentSoft,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: 12,
    margin: 1,
  },
  timeHeadText: { fontSize: 10, fontWeight: '700', color: STUDENT.accent },
  dayLabel: {
    width: 52,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: STUDENT.navActiveBg,
    borderRadius: 12,
    margin: 1,
  },
  dayLabelCurrent: {
    backgroundColor: STUDENT.bg,
  },
  currentDot: {
    position: 'absolute',
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STUDENT.primary,
  },
  dayLabelText: { fontSize: 10, fontWeight: '800', color: STUDENT.navActiveText },
  cell: {
    width: CELL_W,
    height: 64,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    padding: 6,
    justifyContent: 'center',
    borderRadius: 12,
    margin: 1,
    backgroundColor: STUDENT.surfaceHover,
  },
  cellFilled: {
    backgroundColor: STUDENT.surface,
  },
  cellCurrentDay: {
    backgroundColor: STUDENT.bg,
  },
  cellSubject: { fontSize: 10, fontWeight: '700' },
  cellTeacher: { fontSize: 9, color: STUDENT.textMuted, marginTop: 2 },
});

export default memo(ClassTimetableSectionComponent);
