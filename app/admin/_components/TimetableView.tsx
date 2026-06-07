import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import WeeklyTimetableGrid from '../../../src/components/teacher/WeeklyTimetableGrid';
import {
  buildWeekdayPlacements,
  formatWeekRange,
  getWeekStart,
  teacherSlotLabel,
  type TimetableEntryLike,
} from '../../../src/lib/timetable-utils';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function TimetableView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [entries, setEntries] = useState<TimetableEntryLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableEntryLike | null>(null);

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekRange = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/timetable');
      const data = asArray(response?.data);
      setEntries(data.filter(Boolean));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTimetable();
  }, [loadTimetable]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      const label = teacherSlotLabel(entry);
      if (label && label !== '—') map.set(label, label);
    });
    return Array.from(map.values()).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (classFilter === 'all') return entries;
    return entries.filter((entry) => teacherSlotLabel(entry) === classFilter);
  }, [entries, classFilter]);

  const sessionCount = useMemo(
    () => buildWeekdayPlacements(filteredEntries).length,
    [filteredEntries]
  );

  if (loading && !refreshing) {
    return <AdminSkeletonList count={3} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh} noPadding>
        <View style={{ padding: spacing.md }}>
          <AdminGlassCard noAnimation>
            <View style={styles.cardHeader}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
                    <Ionicons name="calendar" size={22} color={colors.textInverse} />
                  </View>
                  <View style={styles.headerText}>
                    <AdminSectionHeader
                      title="Timetable"
                      subtitle={`Monday – Saturday · ${weekRange}`}
                    />
                  </View>
                </View>
                <View style={[styles.sessionBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '40' }]}>
                  <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>
                    {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
              </View>

              {classOptions.length > 0 ? (
                <AdminScalePressable
                  onPress={() => setPickerOpen(true)}
                  style={[
                    styles.filterTrigger,
                    {
                      borderColor: colors.surfaceBorder,
                      backgroundColor: colors.bgElevated,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Text style={[styles.filterTriggerText, { color: colors.text }]} numberOfLines={1}>
                    {classFilter === 'all' ? 'All classes' : classFilter}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </AdminScalePressable>
              ) : null}
            </View>

            {sessionCount === 0 ? (
              <AdminEmptyState
                icon="calendar-outline"
                title="No timetable entries yet"
                message="Add schedule entries from the web admin Timetable section to see them here."
              />
            ) : (
              <View style={styles.gridWrap}>
                <WeeklyTimetableGrid
                  entries={filteredEntries}
                  onEntryClick={(entry) => setSelectedSlot(entry)}
                />
              </View>
            )}
          </AdminGlassCard>
        </View>
      </AdminScreenShell>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]} onPress={() => setPickerOpen(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Filter by class</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {['all', ...classOptions].map((opt) => (
                <Pressable
                  key={opt}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.surfaceBorder },
                    classFilter === opt && { backgroundColor: colors.primaryMuted },
                  ]}
                  onPress={() => {
                    setClassFilter(opt);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: classFilter === opt ? colors.primary : colors.textSecondary },
                      classFilter === opt && styles.pickerItemTextActive,
                    ]}
                  >
                    {opt === 'all' ? 'All classes' : opt}
                  </Text>
                  {classFilter === opt ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedSlot} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedSlot?.subject ||
                (selectedSlot ? teacherSlotLabel(selectedSlot) : '') ||
                'Class Details'}
            </Text>
            <Text style={[styles.modalMeta, { color: colors.textMuted }]}>
              {selectedSlot?.dayOfWeek || selectedSlot?.day} · {selectedSlot?.startTime} –{' '}
              {selectedSlot?.endTime}
            </Text>
            {selectedSlot ? (
              <Text style={[styles.modalMeta, { color: colors.textMuted }]}>
                {teacherSlotLabel(selectedSlot)}
              </Text>
            ) : null}
            <AdminScalePressable onPress={() => setSelectedSlot(null)} style={styles.modalClose}>
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
            </AdminScalePressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardHeader: { padding: 16, gap: 12 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  headerText: { flex: 1 },
  sessionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionBadgeText: { fontSize: 12, fontWeight: '700' },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 280,
  },
  filterTriggerText: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 8 },
  gridWrap: { padding: 12 },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { padding: 20, paddingBottom: 32 },
  pickerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerItemText: { fontSize: 15 },
  pickerItemTextActive: { fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalMeta: { fontSize: 14, marginTop: 6 },
  modalClose: { alignItems: 'center', marginTop: 20, paddingVertical: 12 },
  modalCloseText: { fontWeight: '600' },
});
