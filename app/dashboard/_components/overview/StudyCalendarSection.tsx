import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../../../src/components/student/GlassCard';
import {
  buildExamCalendarEntries,
  formatCalendarDateKey,
  parseCalendarDate,
} from '../../../../src/lib/exam-calendar-entries';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';

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
  completedExamIds?: Set<string>;
  onOpenQuiz: (quiz: any) => void;
  onOpenExam: (examId: string) => void;
};

function StudyCalendarSectionComponent({
  incompleteQuizzes,
  exams,
  completedExamIds,
  onOpenQuiz,
  onOpenExam,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const dayCellSize = isTablet
    ? Math.min(48, Math.floor((screenWidth - 80) / 7))
    : undefined;

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
      const examId = String(entry.id || entry.source?._id || entry.source?.id || '');
      if (examId) onOpenExam(examId);
      return;
    }
    if (entry.type === 'quiz' && entry.source) {
      onOpenQuiz(entry.source);
    }
  };

  const renderCalendarCard = () => (
      <GlassCard variant="default" padding={14}>
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
              <Ionicons name="chevron-back" size={20} color={STUDENT.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <Ionicons name="chevron-forward" size={20} color={STUDENT.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.jumpRow}>
          <TextInput
            style={styles.dateInput}
            value={jumpDate}
            onChangeText={setJumpDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={STUDENT.textMuted}
          />
          <TouchableOpacity style={styles.goBtn} onPress={handleJump}>
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.weekHead, isTablet && styles.gridTablet]}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <Text
              key={d}
              style={[
                styles.weekHeadText,
                isTablet && dayCellSize ? { width: dayCellSize, flex: 0 } : null,
              ]}
            >
              {d}
            </Text>
          ))}
        </View>
        <View style={[styles.grid, isTablet && styles.gridTablet]}>
          {calendarDays.map((day, idx) => {
            if (!day) {
              return (
                <View
                  key={`e-${idx}`}
                  style={[styles.dayCell, isTablet && dayCellSize ? { width: dayCellSize, height: dayCellSize } : null]}
                />
              );
            }
            const dayKey = formatCalendarDateKey(day);
            const count = (entriesByDate[dayKey] || []).length;
            const isSelected = formatCalendarDateKey(selectedDate) === dayKey;
            const isToday = formatCalendarDateKey(new Date()) === dayKey;
            return (
              <TouchableOpacity
                key={dayKey}
                style={[
                  styles.dayCell,
                  isTablet && dayCellSize ? { width: dayCellSize, height: dayCellSize } : null,
                  isSelected && styles.daySelected,
                  isToday && !isSelected && styles.dayToday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day.getDate()}</Text>
                {isToday && !isSelected ? <View style={styles.todayDot} /> : null}
                {count > 0 ? (
                  <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                    <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>{count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassCard>
  );

  const renderEventsCard = () => (
      <GlassCard variant="default" padding={14}>
        <Text style={styles.eventsTitle}>Study & exams</Text>
        <Text style={styles.eventsSub}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          {' · '}Class timetable is in the table below
        </Text>
        {selectedDateEntries.length === 0 ? (
          <View style={styles.eventsEmpty}>
            <Ionicons name="calendar-outline" size={32} color={STUDENT.surfaceBorder} />
            <Text style={styles.eventsEmptyTitle}>No study tasks or exams</Text>
            <Text style={styles.eventsEmptySub}>Class sessions for this day are in the timetable table below.</Text>
          </View>
        ) : (
          selectedDateEntries.map((entry) => {
            const examCompleted =
              entry.type === 'exam' && completedExamIds?.has(String(entry.id));
            const badgeStyle =
              entry.type === 'exam'
                ? examCompleted
                  ? styles.badgeExamCompleted
                  : styles.badgeExam
                : entry.type === 'quiz'
                  ? styles.badgeQuiz
                  : styles.badgeClass;
            const badgeLabel =
              entry.type === 'exam'
                ? examCompleted
                  ? 'COMPLETED'
                  : 'EXAM'
                : entry.type.toUpperCase();
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
                    <Text
                      style={[
                        styles.typeBadgeText,
                        examCompleted && styles.typeBadgeTextCompleted,
                      ]}
                    >
                      {badgeLabel}
                    </Text>
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
      </GlassCard>
  );

  return (
    <View style={[styles.wrap, isTablet && styles.wrapTablet]}>
      <View style={isTablet ? styles.tabletCol : undefined}>{renderCalendarCard()}</View>
      <View style={isTablet ? styles.tabletCol : undefined}>{renderEventsCard()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  wrapTablet: { flexDirection: 'row', alignItems: 'flex-start' },
  tabletCol: { flex: 1, minWidth: 0 },
  gridTablet: { justifyContent: 'center' },
  calHeader: { gap: 10, marginBottom: 10 },
  calTitle: { fontSize: 18, fontWeight: '800', color: STUDENT.primary },
  calSub: { fontSize: 12, color: STUDENT.textMuted, marginTop: 2 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: STUDENT.textSecondary, minWidth: 140, textAlign: 'center' },
  jumpRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: STUDENT.text,
  },
  goBtn: { backgroundColor: STUDENT.primary, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  goBtnText: { color: STUDENT.textOnPrimary, fontWeight: '700', fontSize: 13 },
  weekHead: { flexDirection: 'row', marginBottom: 6 },
  weekHeadText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: STUDENT.textMuted },
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
  daySelected: { backgroundColor: STUDENT.primary },
  dayToday: { backgroundColor: STUDENT.bgAccent, borderWidth: 1, borderColor: STUDENT.primaryLight },
  todayDot: {
    position: 'absolute',
    top: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: STUDENT.primaryLight,
  },
  dayNum: { fontSize: 13, fontWeight: '600', color: STUDENT.textSecondary },
  dayNumSelected: { color: STUDENT.textOnPrimary },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    backgroundColor: `${STUDENT.warning}22`,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeSelected: { backgroundColor: STUDENT.textOnPrimary },
  badgeText: { fontSize: 9, fontWeight: '800', color: STUDENT.warning },
  badgeTextSelected: { color: STUDENT.primary },
  eventsTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  eventsSub: { fontSize: 12, color: STUDENT.textMuted, marginTop: 4, marginBottom: 10 },
  eventsEmpty: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  eventsEmptyTitle: { fontSize: 14, fontWeight: '600', color: STUDENT.textSecondary },
  eventsEmptySub: { fontSize: 12, color: STUDENT.textMuted, textAlign: 'center' },
  eventRow: {
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.inner,
    padding: 12,
    marginBottom: 8,
  },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: STUDENT.text },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeExam: { backgroundColor: `${STUDENT.danger}18` },
  badgeExamCompleted: { backgroundColor: '#d1fae5' },
  badgeQuiz: { backgroundColor: `${STUDENT.warning}18` },
  badgeClass: { backgroundColor: STUDENT.accentSoft },
  typeBadgeText: { fontSize: 10, fontWeight: '800', color: STUDENT.textSecondary },
  typeBadgeTextCompleted: { color: '#047857' },
  eventSubject: { fontSize: 12, color: STUDENT.textMuted, marginTop: 4 },
  eventTime: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
});

export default memo(StudyCalendarSectionComponent);
