import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
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

const CALENDAR_CELL_MAX_TABLET = 42;
const CALENDAR_TABLET_COLUMN_WIDTH = 328;

const EXAM_MARKER_COLORS = {
  start: '#059669',
  end: '#e11d48',
  middle: '#d97706',
  single: '#2563eb',
  quiz: '#f59e0b',
} as const;

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
  const [calendarGridWidth, setCalendarGridWidth] = useState(0);

  const dayCellSize = useMemo(() => {
    const sourceWidth =
      calendarGridWidth > 0
        ? calendarGridWidth
        : isTablet
          ? CALENDAR_TABLET_COLUMN_WIDTH - 24
          : Math.max(screenWidth - 64, 280);
    const raw = Math.floor(sourceWidth / 7);
    if (isTablet) return Math.min(CALENDAR_CELL_MAX_TABLET, Math.max(30, raw));
    return Math.max(30, raw);
  }, [calendarGridWidth, isTablet, screenWidth]);

  const calendarMatrixWidth = dayCellSize * 7;

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jumpDate, setJumpDate] = useState(formatCalendarDateKey(new Date()));
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

  const showMobileDateNav = !isTablet && layout === 'events-only';

  const shiftSelectedDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      setJumpDate(formatCalendarDateKey(next));
      return next;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setJumpDate(formatCalendarDateKey(today));
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
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
          <View>
            <Text style={styles.calTitleOnGradient}>Study Calendar</Text>
          </View>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <Text style={styles.monthLabelOnGradient}>
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        </View>
        <View
          style={[styles.calInnerBody, isTablet && styles.calInnerBodyTablet]}
          onLayout={(event) => {
            const nextWidth = Math.floor(event.nativeEvent.layout.width);
            if (nextWidth > 0 && nextWidth !== calendarGridWidth) {
              setCalendarGridWidth(nextWidth);
            }
          }}
        >
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
        <View style={[styles.calendarMatrix, { width: calendarMatrixWidth }]}>
        <View style={styles.weekHead}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <View key={d} style={[styles.weekHeadCell, { width: dayCellSize }]}>
              <Text style={styles.weekHeadText}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, rowIndex) => (
            <View key={`week-row-${rowIndex}`} style={styles.gridRow}>
              {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => {
                const idx = rowIndex * 7 + colIndex;
                const cellStyle = { width: dayCellSize, height: dayCellSize };
                if (!day) {
                  return <View key={`e-${idx}`} style={[styles.dayCell, cellStyle]} />;
                }
                const dayKey = formatCalendarDateKey(day);
                const dayMarkers = dayMarkersByDate[dayKey];
                const count = dayMarkers?.totalCount ?? 0;
                const isSelected = formatCalendarDateKey(selectedDate) === dayKey;
                const isToday = formatCalendarDateKey(new Date()) === dayKey;
                const hasExamStart = (dayMarkers?.examStartCount ?? 0) > 0;
                const hasExamEnd = (dayMarkers?.examEndCount ?? 0) > 0;
                const hasExamSingle = (dayMarkers?.examSingleCount ?? 0) > 0;
                const hasExamMiddle = (dayMarkers?.examMiddleCount ?? 0) > 0;
                const examDots: { key: string; color: string }[] = [];
                if (dayMarkers) {
                  for (let i = 0; i < dayMarkers.examStartCount; i += 1) {
                    examDots.push({ key: `start-${i}`, color: EXAM_MARKER_COLORS.start });
                  }
                  for (let i = 0; i < dayMarkers.examEndCount; i += 1) {
                    examDots.push({ key: `end-${i}`, color: EXAM_MARKER_COLORS.end });
                  }
                  for (let i = 0; i < dayMarkers.examMiddleCount; i += 1) {
                    examDots.push({ key: `middle-${i}`, color: EXAM_MARKER_COLORS.middle });
                  }
                  for (let i = 0; i < dayMarkers.examSingleCount; i += 1) {
                    examDots.push({ key: `single-${i}`, color: EXAM_MARKER_COLORS.single });
                  }
                }
                return (
                  <TouchableOpacity
                    key={dayKey}
                    style={[
                      styles.dayCell,
                      cellStyle,
                      hasExamMiddle && !isSelected && !hasExamStart && !hasExamEnd ? styles.dayExamMiddle : null,
                      hasExamSingle && !isSelected ? styles.dayExamSingle : null,
                      hasExamStart && !isSelected && !hasExamSingle ? styles.dayExamStart : null,
                      hasExamEnd && !isSelected && !hasExamSingle ? styles.dayExamEnd : null,
                      isSelected && styles.daySelected,
                      isToday && !isSelected && styles.dayToday,
                    ]}
                    onPress={() => setSelectedDate(day)}
                  >
                    <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day.getDate()}</Text>
                    {isToday && !isSelected ? <View style={styles.todayDot} /> : null}
                    {examDots.length > 0 ? (
                      <View style={styles.examMarkerRow}>
                        {examDots.slice(0, 3).map((dot) => (
                          <View
                            key={dot.key}
                            style={[
                              styles.examMarkerDot,
                              { backgroundColor: isSelected ? STUDENT.textOnPrimary : dot.color },
                            ]}
                          />
                        ))}
                      </View>
                    ) : null}
                    {(dayMarkers?.quizCount ?? 0) > 0 ? (
                      <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                        <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                          {dayMarkers?.quizCount}
                        </Text>
                      </View>
                    ) : count > 0 && examDots.length === 0 ? (
                      <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                        <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>{count}</Text>
                      </View>
                    ) : null}
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
  calendarMatrix: {
    alignSelf: 'center',
    gap: 4,
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
    padding: 12,
    marginTop: 4,
  },
  calInnerBodyTablet: {
    flex: 1,
  },
  calHeader: { gap: 10, marginBottom: 10, zIndex: 1 },
  calTitle: { fontSize: 18, fontWeight: '800', color: STUDENT.primary },
  calTitleOnGradient: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  calSub: { fontSize: 12, color: STUDENT.textMuted, marginTop: 2 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: STUDENT.textSecondary, minWidth: 140, textAlign: 'center' },
  monthLabelOnGradient: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    minWidth: 140,
    textAlign: 'center',
  },
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
  weekHeadCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeadText: { textAlign: 'center', fontSize: 10, fontWeight: '700', color: STUDENT.textMuted },
  grid: { gap: 4 },
  gridRow: { flexDirection: 'row' },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
    flexShrink: 0,
    flexGrow: 0,
  },
  daySelected: { backgroundColor: STUDENT.primary },
  dayToday: { backgroundColor: STUDENT.bgAccent, borderWidth: 1, borderColor: STUDENT.primaryLight },
  dayExamMiddle: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  dayExamStart: { borderTopWidth: 3, borderTopColor: EXAM_MARKER_COLORS.start },
  dayExamEnd: { borderBottomWidth: 3, borderBottomColor: EXAM_MARKER_COLORS.end },
  dayExamSingle: { borderWidth: 2, borderColor: EXAM_MARKER_COLORS.single },
  todayDot: {
    position: 'absolute',
    top: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: STUDENT.primaryLight,
  },
  dayNum: { fontSize: 12, fontWeight: '600', color: STUDENT.textSecondary },
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
  examMarkerRow: {
    position: 'absolute',
    bottom: 3,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  examMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
