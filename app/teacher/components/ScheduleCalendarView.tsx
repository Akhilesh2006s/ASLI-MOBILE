import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isValid, parseISO } from 'date-fns';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import {
  dateKeyForDate,
  hasTimetableOnDate,
  timetableEntriesForDate,
  type TimetableEntryLike,
  type UnifiedScheduleEntry,
} from '../../../src/lib/timetable-utils';
import { TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';

const WEEK_HEADERS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const ORANGE = '#f97316';
const VIOLET = '#7c3aed';

type RemoteEvent = {
  id?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  eventType?: 'exam' | 'admin_event' | string;
  subject?: string;
  classNumber?: string;
  room?: string;
  description?: string;
};

function normalizeTime(rawDate: string | undefined, fallback: string): string {
  if (!rawDate) return fallback;
  const parsed = parseISO(rawDate);
  if (!isValid(parsed)) return fallback;
  return format(parsed, 'HH:mm');
}

function toDateKey(rawDate: string | undefined): string {
  if (!rawDate) return '';
  const parsed = parseISO(rawDate);
  if (!isValid(parsed)) return String(rawDate).slice(0, 10);
  return format(parsed, 'yyyy-MM-dd');
}

function isDateWithinEvent(date: Date, entry: UnifiedScheduleEntry): boolean {
  const current = dateKeyForDate(date);
  const end = entry.endDateKey || entry.date;
  return current >= entry.date && current <= end;
}

function getEventBadgeStyle(eventType: UnifiedScheduleEntry['eventType']) {
  if (eventType === 'exam') return styles.badgeExam;
  if (eventType === 'admin_event') return styles.badgeAdmin;
  return styles.badgeClass;
}

function getEventLabel(eventType: UnifiedScheduleEntry['eventType']) {
  if (eventType === 'exam') return 'Exam';
  if (eventType === 'admin_event') return 'Admin Event';
  return 'Class';
}

export default function ScheduleCalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [timetable, setTimetable] = useState<TimetableEntryLike[]>([]);
  const [externalEvents, setExternalEvents] = useState<UnifiedScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailEntry, setDetailEntry] = useState<UnifiedScheduleEntry | null>(null);

  const monthKey = useMemo(
    () => format(viewMonth, 'yyyy-MM'),
    [viewMonth]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, ttRes] = await Promise.all([
        teacherService.calendarEvents(monthKey),
        teacherService.timetable(),
      ]);
      const rows = Array.isArray(calRes.data) ? calRes.data : [];
      const tt = Array.isArray(ttRes.data) ? ttRes.data : [];
      setTimetable(tt);

      const mapped: UnifiedScheduleEntry[] = rows.map((row: RemoteEvent) => {
        const startDateKey = toDateKey(row.startDate);
        const endDateKey = toDateKey(row.endDate) || startDateKey;
        const eventType: UnifiedScheduleEntry['eventType'] =
          row.eventType === 'exam' ? 'exam' : 'admin_event';

        return {
          id: String(row.id || `remote-${Math.random().toString(36).slice(2, 10)}`),
          date: startDateKey,
          endDateKey,
          startTime: normalizeTime(row.startDate, eventType === 'exam' ? '09:00' : '00:00'),
          endTime: normalizeTime(row.endDate, eventType === 'exam' ? '12:00' : '23:59'),
          title: row.title || 'Untitled event',
          room: row.room || '',
          eventType,
          subject: row.subject || '',
          classNumber: row.classNumber || '',
          description: row.description || '',
          removable: false,
        };
      });
      setExternalEvents(mapped);
    } catch {
      setTimetable([]);
      setExternalEvents([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i += 1) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [viewMonth]);

  const hasScheduleOnDate = useCallback(
    (date: Date) =>
      hasTimetableOnDate(timetable, date) ||
      externalEvents.some((e) => isDateWithinEvent(date, e)),
    [timetable, externalEvents]
  );

  const hasExamOnDate = useCallback(
    (date: Date) =>
      externalEvents.some((e) => e.eventType === 'exam' && isDateWithinEvent(date, e)),
    [externalEvents]
  );

  const dayEntries = useMemo(() => {
    const dateKey = dateKeyForDate(selectedDate);
    const classEntries = timetableEntriesForDate(timetable, selectedDate);
    const remote = externalEvents.filter((e) => isDateWithinEvent(selectedDate, e));
    return [...classEntries, ...remote].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDate, timetable, externalEvents]);

  const dateLabel = format(selectedDate, 'EEEE, MMM d, yyyy');

  const shiftMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === viewMonth.getMonth() && date.getFullYear() === viewMonth.getFullYear();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.outerCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: ORANGE }]}>
              <Ionicons name="calendar" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Schedule & Calendar</Text>
              <Text style={styles.sectionSub}>Pick a date and manage your daily class slots</Text>
            </View>
          </View>
          <TeacherShimmer variant="list" count={4} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.outerCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: ORANGE }]}>
            <Ionicons name="calendar" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Schedule & Calendar</Text>
            <Text style={styles.sectionSub}>Pick a date and manage your daily class slots</Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color="#374151" />
            </Pressable>
            <Text style={styles.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <Pressable style={styles.navBtn} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color="#374151" />
            </Pressable>
          </View>

          <View style={styles.weekHeaderRow}>
            {WEEK_HEADERS.map((d) => (
              <Text key={d} style={styles.weekHeader}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const inMonth = isCurrentMonth(day);
              const hasSchedule = hasScheduleOnDate(day);
              const hasExam = hasExamOnDate(day);

              return (
                <Pressable
                  key={day.toISOString()}
                  style={styles.dayCellWrap}
                  onPress={() => {
                    setSelectedDate(day);
                    if (!isCurrentMonth(day)) {
                      setViewMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                    }
                  }}
                >
                  <View
                    style={[
                      styles.dayCell,
                      !inMonth && styles.dayCellOutside,
                      hasSchedule && !selected && styles.dayCellMarked,
                      selected && styles.dayCellSelected,
                    ]}
                  >
                    {hasExam ? <View style={styles.examDot} /> : null}
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dayTextOutside,
                        hasSchedule && !selected && styles.dayTextMarked,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleIcon}>
              <Ionicons name="time" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>Schedule</Text>
              <Text style={styles.scheduleDate} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
          </View>

          {dayEntries.length === 0 ? (
            <View style={styles.scheduleEmpty}>
              <View style={styles.scheduleEmptyIcon}>
                <Ionicons name="calendar-outline" size={28} color="#9ca3af" />
              </View>
              <Text style={styles.scheduleEmptyTitle}>No schedule for this day</Text>
              <Text style={styles.scheduleEmptySub}>Select another date to view your schedule</Text>
            </View>
          ) : (
            <ScrollView style={styles.entriesList} nestedScrollEnabled>
              {dayEntries.map((entry) => (
                <Pressable
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => setDetailEntry(entry)}
                >
                  <View style={styles.entryTimeRow}>
                    <Ionicons name="time-outline" size={14} color={VIOLET} />
                    <Text style={styles.entryTime}>
                      {entry.startTime} – {entry.endTime}
                    </Text>
                  </View>
                  <View style={styles.entryTitleRow}>
                    <View style={[styles.eventBadge, getEventBadgeStyle(entry.eventType)]}>
                      <Text
                        style={[
                          styles.eventBadgeText,
                          entry.eventType === 'admin_event' && styles.eventBadgeTextAdmin,
                          entry.eventType === 'class' && styles.eventBadgeTextClass,
                        ]}
                      >
                        {getEventLabel(entry.eventType)}
                      </Text>
                    </View>
                    <Text style={styles.entryTitle} numberOfLines={2}>
                      {entry.title}
                    </Text>
                  </View>
                  {entry.subject ? (
                    <Text style={styles.entryMeta}>Subject: {entry.subject}</Text>
                  ) : null}
                  {entry.classNumber ? (
                    <Text style={styles.entryMeta}>Class: {entry.classNumber}</Text>
                  ) : null}
                  {entry.room ? (
                    <View style={styles.roomRow}>
                      <Ionicons name="location-outline" size={14} color="#9ca3af" />
                      <Text style={styles.entryMeta}>{entry.room}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <Modal visible={!!detailEntry} transparent animationType="fade">
        <Pressable style={styles.detailOverlay} onPress={() => setDetailEntry(null)}>
          <Pressable style={styles.detailCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.detailTitle}>{detailEntry?.title || 'Event details'}</Text>
            <Text style={styles.detailType}>
              {detailEntry ? getEventLabel(detailEntry.eventType) : ''} details
            </Text>
            <Text style={styles.detailLine}>
              <Text style={styles.detailLabel}>Time: </Text>
              {detailEntry?.startTime} – {detailEntry?.endTime}
            </Text>
            {detailEntry?.subject ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Subject: </Text>
                {detailEntry.subject}
              </Text>
            ) : null}
            {detailEntry?.classNumber ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Class: </Text>
                {detailEntry.classNumber}
              </Text>
            ) : null}
            {detailEntry?.room ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Room: </Text>
                {detailEntry.room}
              </Text>
            ) : null}
            {detailEntry?.description ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Notes: </Text>
                {detailEntry.description}
              </Text>
            ) : null}
            <Pressable style={styles.detailClose} onPress={() => setDetailEntry(null)}>
              <Text style={styles.detailCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.xxl,
  },
  outerCard: {
    backgroundColor: '#ffffff',
    borderRadius: TEACHER_RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.8)',
    padding: TEACHER_SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    gap: TEACHER_SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  calendarCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
    backgroundColor: '#fff',
    padding: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrap: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellOutside: {
    opacity: 0.45,
  },
  dayCellMarked: {
    backgroundColor: '#eef2ff',
  },
  dayCellSelected: {
    backgroundColor: VIOLET,
  },
  examDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dayTextOutside: {
    color: '#9ca3af',
  },
  dayTextMarked: {
    color: '#4338ca',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  scheduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
    backgroundColor: '#fff',
    padding: 14,
    minHeight: 280,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: VIOLET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  scheduleDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  scheduleEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  scheduleEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scheduleEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  scheduleEmptySub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  entriesList: {
    maxHeight: 360,
  },
  entryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  entryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  entryTime: {
    fontSize: 13,
    fontWeight: '700',
    color: VIOLET,
  },
  entryTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eventBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeExam: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  badgeAdmin: {
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
  },
  badgeClass: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
  },
  eventBadgeTextAdmin: {
    color: '#5b21b6',
  },
  eventBadgeTextClass: {
    color: '#1d4ed8',
  },
  entryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  entryMeta: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  detailType: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
  },
  detailLine: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    lineHeight: 20,
  },
  detailLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  detailClose: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  detailCloseText: {
    fontWeight: '700',
    color: '#374151',
  },
});
