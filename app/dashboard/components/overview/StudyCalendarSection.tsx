import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  buildExamCalendarEntries,
  formatCalendarDateKey,
  parseCalendarDate,
} from '../../../../src/lib/exam-calendar-entries';

type CalendarEntry = {
  id: string;
  type: 'quiz' | 'exam' | 'timetable';
  title: string;
  subject: string;
  date: Date;
  source?: any;
  startTime?: string;
  endTime?: string;
  teacher?: string;
  room?: string;
};

type Props = {
  incompleteQuizzes: any[];
  exams: any[];
  onOpenQuiz: (quiz: any) => void;
};

function StudyCalendarSectionComponent({ incompleteQuizzes, exams, onOpenQuiz }: Props) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jumpDate, setJumpDate] = useState(formatCalendarDateKey(new Date()));

  const calendarEntries = useMemo(() => {
    const quizEntries = incompleteQuizzes
      .map((quiz: any) => {
        const date =
          parseCalendarDate(quiz.startDate) ||
          parseCalendarDate(quiz.scheduledDate) ||
          parseCalendarDate(quiz.deadline);
        if (!date) return null;
        return {
          id: String(quiz._id || quiz.id),
          type: 'quiz' as const,
          title: quiz.title || 'Quiz',
          subject: typeof quiz.subject === 'string' ? quiz.subject : quiz.subject?.name || 'General',
          date,
          source: quiz,
        };
      })
      .filter(Boolean) as CalendarEntry[];
    return [...quizEntries, ...buildExamCalendarEntries(exams)];
  }, [incompleteQuizzes, exams]);

  const entriesByDate = useMemo(() => {
    const acc: Record<string, CalendarEntry[]> = {};
    calendarEntries.forEach((entry) => {
      const key = formatCalendarDateKey(entry.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
    });
    return acc;
  }, [calendarEntries]);

  const selectedDateEntries = useMemo(() => {
    const key = formatCalendarDateKey(selectedDate);
    return (entriesByDate[key] || []).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedDate, entriesByDate]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    return cells;
  }, [calendarMonth]);

  const handleJump = () => {
    const [y, m, d] = jumpDate.split('-').map(Number);
    if (!y || !m || !d) return;
    const target = new Date(y, m - 1, d);
    setSelectedDate(target);
    setCalendarMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  const openEntry = (entry: CalendarEntry) => {
    if (entry.type === 'exam') {
      router.push('/student-exams');
      return;
    }
    if (entry.type === 'quiz' && entry.source) {
      onOpenQuiz(entry.source);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.calendarCard}>
        <View style={styles.calHeader}>
          <View>
            <Text style={styles.calTitle}>Study Calendar</Text>
            <Text style={styles.calSub}>Quizzes by due date; exams on their scheduled dates</Text>
          </View>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <Ionicons name="chevron-back" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.jumpRow}>
          <TextInput
            style={styles.dateInput}
            value={jumpDate}
            onChangeText={setJumpDate}
            placeholder="YYYY-MM-DD"
          />
          <TouchableOpacity style={styles.goBtn} onPress={handleJump}>
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekHead}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <Text key={d} style={styles.weekHeadText}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {calendarDays.map((day, idx) => {
            if (!day) return <View key={`e-${idx}`} style={styles.dayCell} />;
            const dayKey = formatCalendarDateKey(day);
            const count = (entriesByDate[dayKey] || []).length;
            const isSelected = formatCalendarDateKey(selectedDate) === dayKey;
            const isToday = formatCalendarDateKey(new Date()) === dayKey;
            return (
              <TouchableOpacity
                key={dayKey}
                style={[
                  styles.dayCell,
                  isSelected && styles.daySelected,
                  isToday && !isSelected && styles.dayToday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day.getDate()}</Text>
                {count > 0 ? (
                  <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                    <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>{count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.eventsCard}>
        <Text style={styles.eventsTitle}>Study & exams</Text>
        <Text style={styles.eventsSub}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          {' · '}Class timetable is in the table below
        </Text>
        {selectedDateEntries.length === 0 ? (
          <View style={styles.eventsEmpty}>
            <Ionicons name="calendar-outline" size={32} color="#d1d5db" />
            <Text style={styles.eventsEmptyTitle}>No study tasks or exams</Text>
            <Text style={styles.eventsEmptySub}>Class sessions for this day are in the timetable table below.</Text>
          </View>
        ) : (
          selectedDateEntries.map((entry) => {
            const badgeStyle =
              entry.type === 'exam'
                ? styles.badgeExam
                : entry.type === 'quiz'
                  ? styles.badgeQuiz
                  : styles.badgeClass;
            return (
              <TouchableOpacity
                key={`${entry.type}-${entry.id}-${entry.date.getTime()}`}
                style={styles.eventRow}
                onPress={() => openEntry(entry)}
                activeOpacity={0.85}
              >
                <View style={styles.eventTop}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <View style={[styles.typeBadge, badgeStyle]}>
                    <Text style={styles.typeBadgeText}>{entry.type.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.eventSubject}>{entry.subject}</Text>
                <Text style={styles.eventTime}>
                  {entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calHeader: { gap: 10, marginBottom: 10 },
  calTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  calSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: '#374151', minWidth: 140, textAlign: 'center' },
  jumpRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  goBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  weekHead: { flexDirection: 'row', marginBottom: 6 },
  weekHeadText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#6b7280' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  daySelected: { backgroundColor: '#4f46e5' },
  dayToday: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' },
  dayNum: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayNumSelected: { color: '#fff' },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    backgroundColor: '#ffedd5',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeSelected: { backgroundColor: '#fff' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#c2410c' },
  badgeTextSelected: { color: '#4f46e5' },
  eventsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eventsTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  eventsSub: { fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 10 },
  eventsEmpty: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  eventsEmptyTitle: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  eventsEmptySub: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  eventRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeExam: { backgroundColor: '#fee2e2' },
  badgeQuiz: { backgroundColor: '#ffedd5' },
  badgeClass: { backgroundColor: '#e0f2fe' },
  typeBadgeText: { fontSize: 10, fontWeight: '800', color: '#374151' },
  eventSubject: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  eventTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});

export default memo(StudyCalendarSectionComponent);
