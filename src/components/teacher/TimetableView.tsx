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
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../services/api/teacherService';
import TeacherShimmer from './TeacherShimmer';
import WeeklyTimetableGrid from './WeeklyTimetableGrid';
import {
  buildWeekdayPlacements,
  formatWeekRange,
  getWeekStart,
  teacherSlotLabel,
  type TimetableEntryLike,
} from '../../lib/timetable-utils';
import { TEACHER, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../theme/teacher';

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
              <Ionicons name="chevron-down" size={16} color={TEACHER.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {sessionCount === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={TEACHER.textMuted} />
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
                    <Ionicons name="checkmark" size={18} color={TEACHER.primaryLight} />
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
            <Pressable style={styles.modalBtn} onPress={() => router.push('/teacher/attendance' as any)}>
              <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.modalBtnGrad}>
                <Ionicons name="checkmark-done-outline" size={18} color={TEACHER.textOnPrimary} />
                <Text style={styles.modalBtnText}>Mark Attendance</Text>
              </LinearGradient>
            </Pressable>
            {selectedSlot?.status !== 'Completed' ? (
              <Pressable
                style={styles.modalBtnOutline}
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
    paddingBottom: 120,
  },
  card: {
    ...glassCard,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: TEACHER_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
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
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  subtitle: {
    ...TEACHER_TYPO.caption,
    color: TEACHER.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  sessionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.navActiveBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEACHER.primaryLight,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 280,
  },
  filterTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.text,
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
    color: TEACHER.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: TEACHER.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    lineHeight: 18,
  },
  shimmerTitle: {
    height: 18,
    width: 120,
    borderRadius: 6,
    backgroundColor: 'rgba(123,80,255,0.15)',
    marginBottom: 8,
  },
  shimmerSub: {
    height: 12,
    width: '90%',
    borderRadius: 6,
    backgroundColor: 'rgba(123,80,255,0.1)',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: TEACHER_SPACING.lg,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  pickerTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 16,
    color: TEACHER.text,
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  pickerItemActive: {
    backgroundColor: TEACHER.navActiveBg,
  },
  pickerItemText: {
    fontSize: 15,
    color: TEACHER.textSecondary,
  },
  pickerItemTextActive: {
    fontWeight: '700',
    color: TEACHER.primaryLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TEACHER_SPACING.xxl,
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  modalMeta: {
    fontSize: 14,
    color: TEACHER.textMuted,
    marginTop: 6,
  },
  modalBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: TEACHER_SPACING.lg,
  },
  modalBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  modalBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  modalBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: TEACHER_SPACING.md,
  },
  modalBtnOutlineText: { color: TEACHER.text, fontWeight: '700' },
  modalClose: { alignItems: 'center', marginTop: TEACHER_SPACING.lg },
  modalCloseText: { color: TEACHER.textMuted, fontWeight: '600' },
});
