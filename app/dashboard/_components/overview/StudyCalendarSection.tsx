import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import GlassCard from '../../../../src/components/student/GlassCard';
import StudentCardDecor from '../../../../src/components/student/StudentCardDecor';
import StudentExamPreviewCard from '../../../../src/components/student/StudentExamPreviewCard';
import {
  buildExamCalendarEntries,
  buildSchoolEventCalendarEntries,
  buildDayExamMarkers,
  formatCalendarDateKey,
  parseCalendarDate,
  type ExamCalendarEntry,
  type ExamDayRole,
} from '../../../../src/lib/exam-calendar-entries';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';

type CalendarEntry = {
  id: string;
  type: 'quiz' | 'exam' | 'timetable' | 'event';
  title: string;
  subject: string;
  date: Date;
  source?: any;
  startTime?: string;
  endTime?: string;
  teacher?: string;
  room?: string;
  examDayRole?: ExamDayRole;
  windowStart?: Date;
  windowEnd?: Date;
};

const EXAM_MARKER_COLORS = {
  start: '#059669',
  end: '#e11d48',
  middle: '#d97706',
  single: '#2563eb',
  quiz: '#f59e0b',
  event: '#7c3aed',
} as const;

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function getPrimaryMarkerColor(
  dayMarkers: ReturnType<typeof buildDayExamMarkers> | undefined,
  entries: CalendarEntry[] | undefined
): string | null {
  if (!dayMarkers?.totalCount && !entries?.length) return null;
  if (dayMarkers?.examStartCount) return EXAM_MARKER_COLORS.start;
  if (dayMarkers?.examEndCount) return EXAM_MARKER_COLORS.end;
  if (dayMarkers?.examMiddleCount) return EXAM_MARKER_COLORS.middle;
  if (dayMarkers?.examSingleCount) return EXAM_MARKER_COLORS.single;
  if (dayMarkers?.quizCount) return EXAM_MARKER_COLORS.quiz;
  if (entries?.some((e) => e.type === 'event')) return EXAM_MARKER_COLORS.event;
  return STUDENT.primary;
}

function dayHasExamSpan(dayKey: string, entriesByDate: Record<string, CalendarEntry[]>): boolean {
  return (entriesByDate[dayKey] || []).some((entry) => entry.type === 'exam');
}

function getDayRangeConnectors(
  dayKey: string,
  rowIndex: number,
  colIndex: number,
  calendarDays: (Date | null)[],
  entriesByDate: Record<string, CalendarEntry[]>
): { connectLeft: boolean; connectRight: boolean } {
  if (!dayHasExamSpan(dayKey, entriesByDate)) {
    return { connectLeft: false, connectRight: false };
  }
  const prev = colIndex > 0 ? calendarDays[rowIndex * 7 + colIndex - 1] : null;
  const next = colIndex < 6 ? calendarDays[rowIndex * 7 + colIndex + 1] : null;
  const prevKey = prev ? formatCalendarDateKey(prev) : '';
  const nextKey = next ? formatCalendarDateKey(next) : '';
  return {
    connectLeft: Boolean(prev && dayHasExamSpan(prevKey, entriesByDate)),
    connectRight: Boolean(next && dayHasExamSpan(nextKey, entriesByDate)),
  };
}

type StudyCalendarLayout = 'auto' | 'calendar-only' | 'events-only';

type Props = {
  incompleteQuizzes: any[];
  exams: any[];
  examAttemptCounts?: Record<string, number>;
  studentClassNumber?: string | number | null;
  onOpenQuiz: (quiz: any) => void;
  onOpenExam: (examId: string) => void;
  layout?: StudyCalendarLayout;
};

function StudyCalendarSectionComponent({
  incompleteQuizzes,
  exams,
  examAttemptCounts = {},
  studentClassNumber,
  onOpenQuiz,
  onOpenExam,
  layout = 'auto',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schoolCalendarEvents, setSchoolCalendarEvents] = useState<any[]>([]);

  const calendarMonthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/calendar/events?month=${calendarMonthKey}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json();
        if (!cancelled) {
          setSchoolCalendarEvents(Array.isArray(payload?.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) setSchoolCalendarEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarMonthKey]);

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
    return [
      ...quizEntries,
      ...buildExamCalendarEntries(exams),
      ...buildSchoolEventCalendarEntries(schoolCalendarEvents),
    ];
  }, [incompleteQuizzes, exams, schoolCalendarEvents]);

  const entriesByDate = useMemo(() => {
    const acc: Record<string, CalendarEntry[]> = {};
    calendarEntries.forEach((entry) => {
      const key = formatCalendarDateKey(entry.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
    });
    return acc;
  }, [calendarEntries]);

  const dayMarkersByDate = useMemo(() => {
    const acc: Record<string, ReturnType<typeof buildDayExamMarkers>> = {};
    Object.entries(entriesByDate).forEach(([key, entries]) => {
      acc[key] = buildDayExamMarkers(entries);
    });
    return acc;
  }, [entriesByDate]);

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
    // Keep a fixed 6x7 matrix to avoid row-wrapping glitches on some device widths.
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
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

  const showMobileDateNav = !isTablet && layout === 'events-only';

  const shiftSelectedDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
  };

  const renderCalendarCard = () => (
      <LinearGradient
        colors={[...STUDENT.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.calGradientShell, isTablet && styles.calGradientShellTablet]}
      >
        <StudentCardDecor variant="calendar" />
        <View style={styles.calHeader}>
          <Text style={styles.calTitleOnGradient}>Study Calendar</Text>
        </View>
        <View style={[styles.calInnerBody, isTablet && styles.calInnerBodyTablet]}>
          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={STUDENT.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabelInner}>
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={STUDENT.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayChip} onPress={goToToday}>
              <Text style={styles.todayChipText}>Today</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekHead}>
            {WEEKDAY_LABELS.map((label, index) => (
              <View key={`${label}-${index}`} style={styles.weekHeadCell}>
                <Text style={styles.weekHeadText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <View key={`week-row-${rowIndex}`} style={styles.gridRow}>
                {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => {
                  const idx = rowIndex * 7 + colIndex;
                  if (!day) {
                    return <View key={`e-${idx}`} style={styles.dayCell} />;
                  }
                  const dayKey = formatCalendarDateKey(day);
                  const dayMarkers = dayMarkersByDate[dayKey];
                  const dayEntries = entriesByDate[dayKey];
                  const isSelected = formatCalendarDateKey(selectedDate) === dayKey;
                  const isToday = formatCalendarDateKey(new Date()) === dayKey;
                  const accentColor = getPrimaryMarkerColor(dayMarkers, dayEntries);
                  const { connectLeft, connectRight } = getDayRangeConnectors(
                    dayKey,
                    rowIndex,
                    colIndex,
                    calendarDays,
                    entriesByDate
                  );
                  const showAccent = Boolean(accentColor) && !isSelected;

                  return (
                    <TouchableOpacity
                      key={dayKey}
                      style={styles.dayCell}
                      onPress={() => setSelectedDate(day)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dayCellInner,
                          showAccent && {
                            backgroundColor: `${accentColor}18`,
                          },
                          isToday && !isSelected && styles.dayCellInnerToday,
                          isSelected && styles.dayCellInnerSelected,
                        ]}
                      >
                        {showAccent && connectLeft ? (
                          <View
                            style={[
                              styles.dayRangeLine,
                              styles.dayRangeLineLeft,
                              { backgroundColor: accentColor! },
                            ]}
                          />
                        ) : null}
                        {showAccent && connectRight ? (
                          <View
                            style={[
                              styles.dayRangeLine,
                              styles.dayRangeLineRight,
                              { backgroundColor: accentColor! },
                            ]}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.dayNum,
                            isToday && !isSelected && styles.dayNumToday,
                            isSelected && styles.dayNumSelected,
                            showAccent && !isToday && { color: accentColor!, fontWeight: '700' },
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                        {showAccent ? (
                          <View style={[styles.dayAccentBar, { backgroundColor: accentColor! }]} />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: EXAM_MARKER_COLORS.start }]} />
              <Text style={styles.legendText}>Opens</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: EXAM_MARKER_COLORS.middle }]} />
              <Text style={styles.legendText}>Active</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: EXAM_MARKER_COLORS.end }]} />
              <Text style={styles.legendText}>Closes</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: EXAM_MARKER_COLORS.quiz }]} />
              <Text style={styles.legendText}>Quiz</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
  );

  const renderEventsCard = () => (
      <GlassCard
        variant="default"
        padding={14}
        style={isTablet ? styles.cardFillTablet : styles.cardFill}
      >
        <Text style={styles.eventsTitle}>Study & exams</Text>
        {showMobileDateNav ? (
          <View style={styles.mobileDateNav}>
            <TouchableOpacity onPress={() => shiftSelectedDate(-1)} hitSlop={8} accessibilityLabel="Previous day">
              <Ionicons name="chevron-back" size={22} color={STUDENT.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} style={styles.mobileDateCenter} accessibilityLabel="Go to today">
              <Text style={styles.mobileDateLabel}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              {formatCalendarDateKey(selectedDate) !== formatCalendarDateKey(new Date()) ? (
                <Text style={styles.mobileDateTodayHint}>Tap For Today</Text>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => shiftSelectedDate(1)} hitSlop={8} accessibilityLabel="Next day">
              <Ionicons name="chevron-forward" size={22} color={STUDENT.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.eventsSub}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            {' · '}Class timetable is in the table below
          </Text>
        )}
        {showMobileDateNav ? (
          <Text style={styles.eventsSubMobile}>Class Timetable Is In The Table Below</Text>
        ) : null}
        {selectedDateEntries.length === 0 ? (
          <View style={styles.eventsEmpty}>
            <Ionicons name="calendar-outline" size={32} color={STUDENT.surfaceBorder} />
            <Text style={styles.eventsEmptyTitle}>No Study Tasks Or Exams</Text>
            <Text style={styles.eventsEmptySub}>
              Class Sessions For This Day Are In The Timetable Table Below.
            </Text>
          </View>
        ) : (
          <View style={isTablet ? styles.eventsListTablet : undefined}>
            {selectedDateEntries.map((entry, entryIndex) => {
            if (entry.type === 'exam') {
              const examEntry = entry as ExamCalendarEntry;
              const examId = String(examEntry.id || examEntry.source?._id || examEntry.source?.id || '');
              const usedAttempts = examAttemptCounts[examId] || 0;
              return (
                <StudentExamPreviewCard
                  key={`${entry.type}-${entry.id}-${entry.date.getTime()}-${entry.examDayRole || 'exam'}`}
                  exam={examEntry.source || examEntry}
                  examDayRole={examEntry.examDayRole}
                  usedAttempts={usedAttempts}
                  studentClassNumber={studentClassNumber}
                  hasAttempted={usedAttempts > 0}
                  colorIndex={entryIndex}
                  style={
                    isTablet
                      ? { width: '100%', maxWidth: '100%', alignSelf: 'stretch' as const }
                      : undefined
                  }
                  onViewInExams={() => onOpenExam(examId)}
                  onStartPress={() => router.push(`/exam/${examId}`)}
                />
              );
            }

            if (entry.type === 'event') {
              return (
                <View
                  key={`${entry.type}-${entry.id}-${entry.date.getTime()}`}
                  style={styles.eventRow}
                >
                  <View style={styles.eventTop}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {entry.title}
                    </Text>
                    <View style={[styles.typeBadge, styles.badgeEvent]}>
                      <Text style={styles.typeBadgeText}>EVENT</Text>
                    </View>
                  </View>
                  <Text style={styles.eventSubject}>{entry.subject}</Text>
                  {entry.source?.description ? (
                    <Text style={styles.eventTime} numberOfLines={3}>
                      {entry.source.description}
                    </Text>
                  ) : null}
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={`${entry.type}-${entry.id}-${entry.date.getTime()}-quiz`}
                style={styles.eventRow}
                onPress={() => openEntry(entry)}
                activeOpacity={0.85}
              >
                <View style={styles.eventTop}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <View style={[styles.typeBadge, styles.badgeQuiz]}>
                    <Text style={styles.typeBadgeText}>QUIZ</Text>
                  </View>
                </View>
                <Text style={styles.eventSubject}>{entry.subject}</Text>
                <Text style={styles.eventTime}>
                  {entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            );
          })}
          </View>
        )}
      </GlassCard>
  );

  if (layout === 'calendar-only') {
    return <View style={styles.wrap}>{renderCalendarCard()}</View>;
  }

  if (layout === 'events-only') {
    return <View style={styles.wrap}>{renderEventsCard()}</View>;
  }

  return (
    <View style={[styles.wrap, isTablet && styles.wrapTablet]}>
      {isTablet ? (
        <>
          <View style={[styles.tabletCol, styles.tabletColCalendar]}>
            <View style={styles.tabletPanel}>{renderCalendarCard()}</View>
          </View>
          <View style={[styles.tabletCol, styles.tabletColEvents]}>
            <View style={styles.tabletPanel}>{renderEventsCard()}</View>
          </View>
        </>
      ) : (
        <>
          {renderCalendarCard()}
          {renderEventsCard()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%' },
  wrapTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    width: '100%',
  },
  tabletCol: {
    minWidth: 0,
    alignSelf: 'stretch',
  },
  tabletPanel: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  tabletColCalendar: {
    flex: 1,
    minWidth: 0,
  },
  tabletColEvents: {
    flex: 1,
    minWidth: 0,
  },
  cardFill: { width: '100%', alignSelf: 'stretch' },
  cardFillTablet: {
    flex: 1,
    height: '100%',
    alignSelf: 'stretch',
  },
  calGradientShell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 28,
    padding: 14,
    overflow: 'hidden',
    ...STUDENT.shadow.md,
  },
  calGradientShellTablet: {
    flex: 1,
    height: '100%',
  },
  calInnerBody: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  calInnerBodyTablet: {
    flex: 1,
  },
  calHeader: { marginBottom: 8, zIndex: 1 },
  calTitleOnGradient: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  navIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STUDENT.bgAccent,
  },
  monthLabelInner: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
    textAlign: 'center',
  },
  todayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: STUDENT.primary,
  },
  todayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.textOnPrimary,
  },
  weekHead: { flexDirection: 'row', marginBottom: 4 },
  weekHeadCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekHeadText: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: STUDENT.textMuted },
  grid: { gap: 2 },
  gridRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCellInner: {
    width: 36,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  dayCellInnerToday: {
    borderWidth: 2,
    borderColor: STUDENT.primaryLight,
  },
  dayCellInnerSelected: {
    backgroundColor: STUDENT.primary,
  },
  dayNum: { fontSize: 13, fontWeight: '600', color: STUDENT.textSecondary },
  dayNumToday: { color: STUDENT.primaryDark, fontWeight: '700' },
  dayNumSelected: { color: STUDENT.textOnPrimary, fontWeight: '700' },
  dayAccentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  dayRangeLine: {
    position: 'absolute',
    bottom: 0,
    height: 3,
  },
  dayRangeLineLeft: {
    left: -4,
    right: '50%',
  },
  dayRangeLineRight: {
    left: '50%',
    right: -4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: STUDENT.surfaceBorder,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: STUDENT.textMuted, fontWeight: '600' },
  eventsTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  eventsListTablet: {
    flex: 1,
    width: '100%',
    gap: 8,
  },
  mobileDateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: STUDENT_RADIUS.inner,
    backgroundColor: STUDENT.bgAccent,
  },
  mobileDateCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  mobileDateLabel: { fontSize: 14, fontWeight: '700', color: STUDENT.text },
  mobileDateTodayHint: { fontSize: 10, color: STUDENT.primary, fontWeight: '600', marginTop: 2 },
  eventsSub: { fontSize: 12, color: STUDENT.textMuted, marginTop: 4, marginBottom: 10 },
  eventsSubMobile: { fontSize: 12, color: STUDENT.textMuted, marginBottom: 10 },
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
  badgeQuiz: { backgroundColor: `${STUDENT.warning}18` },
  badgeEvent: { backgroundColor: '#FEF3C7' },
  typeBadgeText: { fontSize: 10, fontWeight: '800', color: STUDENT.textSecondary },
  eventSubject: { fontSize: 12, color: STUDENT.textMuted, marginTop: 4 },
  eventTime: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
});

export default memo(StudyCalendarSectionComponent);
