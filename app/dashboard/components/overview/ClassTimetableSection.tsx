import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { fetchStudentTimetable, timetableEntriesToSlots } from '../../../../src/lib/timetable-helpers';

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

function ClassTimetableSectionComponent({ schoolName }: Props) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);

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
      <LinearGradient colors={['#f0f9ff', '#fff', '#eef2ff']} style={styles.headerCard}>
        <View style={styles.headerRow}>
          <LinearGradient colors={['#0284c7', '#4f46e5']} style={styles.headerIcon}>
            <Ionicons name="calendar" size={22} color="#fff" />
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
          <ActivityIndicator color="#4f46e5" style={{ padding: 24 }} />
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
              {DAYS.map((day, di) => (
                <View key={day} style={styles.row}>
                  <View style={styles.dayLabel}>
                    <Text style={styles.dayLabelText}>{day}</Text>
                  </View>
                  {Array.from({ length: periods }).map((_, p) => {
                    const slot = slots.find(
                      (s) =>
                        (s.day?.toLowerCase().startsWith(day.toLowerCase()) ||
                          s.day === String(di + 1)) &&
                        Number(s.period) === p + 1
                    );
                    return (
                      <View key={`${day}-${p}`} style={[styles.cell, slot && styles.cellFilled]}>
                        {slot ? (
                          <>
                            <Text style={styles.cellSubject} numberOfLines={2}>
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
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headerCard: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e0e7ff' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  school: { fontSize: 10, fontWeight: '700', color: '#4f46e5', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sessionBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sessionBadgeText: { fontSize: 11, fontWeight: '700', color: '#4338ca' },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 20 },
  row: { flexDirection: 'row' },
  corner: { width: 52, height: 44 },
  timeHead: {
    width: CELL_W,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeHeadText: { fontSize: 10, fontWeight: '700', color: '#4338ca' },
  dayLabel: {
    width: 52,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayLabelText: { fontSize: 10, fontWeight: '800', color: '#374151' },
  cell: {
    width: CELL_W,
    height: 64,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 6,
    justifyContent: 'center',
  },
  cellFilled: { backgroundColor: '#f8fafc' },
  cellSubject: { fontSize: 10, fontWeight: '700', color: '#111827' },
  cellTeacher: { fontSize: 9, color: '#6b7280', marginTop: 2 },
});

export default memo(ClassTimetableSectionComponent);
