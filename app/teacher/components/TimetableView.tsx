import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer, WeeklyTimetableGrid } from '../../../src/components/teacher';
import {
  buildWeekdayPlacements,
  formatWeekRange,
  getWeekStart,
  teacherSlotLabel,
  type TimetableEntryLike,
} from '../../../src/lib/timetable-utils';
import { TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';

const ORANGE = '#D3723E';
const WARM_HEADER = '#FFF9F2';

export default function TimetableView() {
  const [entries, setEntries] = useState<TimetableEntryLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableEntryLike | null>(null);

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekRange = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await teacherService.timetable();
      const data = res.data ?? [];
      setEntries(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      const label = teacherSlotLabel(e);
      if (label && label !== '—') map.set(label, label);
    });
    return Array.from(map.values()).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (classFilter === 'all') return entries;
    return entries.filter((e) => teacherSlotLabel(e) === classFilter);
  }, [entries, classFilter]);

  const sessionCount = useMemo(
    () => buildWeekdayPlacements(filteredEntries).length,
    [filteredEntries]
  );

  const markComplete = async (entry: TimetableEntryLike) => {
    if (entry.status !== 'Scheduled' && entry.status !== undefined && entry.status !== 'Pending') {
      setSelectedSlot(entry);
      return;
    }
    const id = entry._id || entry.id;
    if (!id) return;
    try {
      await teacherService.updateTimetableStatus(String(id), 'Completed');
      setEntries((prev) =>
        prev.map((e) =>
          (e._id || e.id) === id ? { ...e, status: 'Completed' } : e
        )
      );
      setSelectedSlot(null);
      Alert.alert('Done', 'Marked as completed.');
    } catch {
      Alert.alert('Error', 'Could not update timetable entry.');
    }
  };

  const handleEntryClick = (entry: TimetableEntryLike) => {
    if (entry.status === 'Completed') {
      setSelectedSlot(entry);
      return;
    }
    Alert.alert('Mark completed?', teacherSlotLabel(entry), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark completed', onPress: () => markComplete(entry) },
      { text: 'Details', onPress: () => setSelectedSlot(entry) },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}>
              <Ionicons name="calendar" size={22} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <View style={styles.shimmerTitle} />
              <View style={styles.shimmerSub} />
            </View>
          </View>
          <TeacherShimmer variant="list" count={6} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar" size={22} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Timetable</Text>
                <Text style={styles.subtitle}>
                  Monday – Saturday · same weekly pattern · {weekRange}
                </Text>
              </View>
            </View>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>
                {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
          </View>

          {classOptions.length > 0 ? (
            <Pressable style={styles.filterTrigger} onPress={() => setPickerOpen(true)}>
              <Text style={styles.filterTriggerText} numberOfLines={1}>
                {classFilter === 'all' ? 'All classes' : classFilter}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#4A3121" />
            </Pressable>
          ) : null}
        </View>

        {sessionCount === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color="#fed7aa" />
            <Text style={styles.emptyTitle}>No schedule entries this week</Text>
            <Text style={styles.emptySub}>
              Schedules assigned by your admin will appear here once they add entries in Timetable
              Management.
            </Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            <WeeklyTimetableGrid entries={filteredEntries} onEntryClick={handleEntryClick} />
          </View>
        )}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Filter by class</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {['all', ...classOptions].map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.pickerItem, classFilter === opt && styles.pickerItemActive]}
                  onPress={() => {
                    setClassFilter(opt);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      classFilter === opt && styles.pickerItemTextActive,
                    ]}
                  >
                    {opt === 'all' ? 'All classes' : opt}
                  </Text>
                  {classFilter === opt ? (
                    <Ionicons name="checkmark" size={18} color={ORANGE} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedSlot} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedSlot?.subject || (selectedSlot ? teacherSlotLabel(selectedSlot) : '') || 'Class Details'}
            </Text>
            <Text style={styles.modalMeta}>
              {selectedSlot?.dayOfWeek || selectedSlot?.day} · {selectedSlot?.startTime} –{' '}
              {selectedSlot?.endTime}
            </Text>
            {selectedSlot ? (
              <Text style={styles.modalMeta}>{teacherSlotLabel(selectedSlot)}</Text>
            ) : null}
            <Pressable
              style={styles.modalBtn}
              onPress={() => router.push('/teacher/attendance' as any)}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <Text style={styles.modalBtnText}>Mark Attendance</Text>
            </Pressable>
            {selectedSlot?.status !== 'Completed' ? (
              <Pressable
                style={[styles.modalBtn, styles.modalBtnOutline]}
                onPress={() => selectedSlot && markComplete(selectedSlot)}
              >
                <Text style={styles.modalBtnOutlineText}>Mark Completed</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.modalClose} onPress={() => setSelectedSlot(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.xxl,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: TEACHER_RADIUS.card,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    padding: TEACHER_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: WARM_HEADER,
    gap: TEACHER_SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4A3121',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 18,
  },
  sessionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: 'rgba(240,235,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 280,
  },
  filterTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#4A3121',
    marginRight: 8,
  },
  gridWrap: {
    padding: TEACHER_SPACING.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: TEACHER_SPACING.lg,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    lineHeight: 18,
  },
  shimmerTitle: {
    height: 18,
    width: 120,
    borderRadius: 6,
    backgroundColor: 'rgba(211,114,62,0.15)',
    marginBottom: 8,
  },
  shimmerSub: {
    height: 12,
    width: '90%',
    borderRadius: 6,
    backgroundColor: 'rgba(211,114,62,0.1)',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: TEACHER_SPACING.lg,
    paddingBottom: 32,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemActive: {
    backgroundColor: '#FFF9F2',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerItemTextActive: {
    fontWeight: '700',
    color: ORANGE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TEACHER_SPACING.xxl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    padding: 14,
    borderRadius: 12,
    marginTop: TEACHER_SPACING.lg,
  },
  modalBtnText: { color: '#fff', fontWeight: '700' },
  modalBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalBtnOutlineText: { color: '#111827', fontWeight: '700' },
  modalClose: { alignItems: 'center', marginTop: TEACHER_SPACING.lg },
  modalCloseText: { color: '#6b7280', fontWeight: '600' },
});
