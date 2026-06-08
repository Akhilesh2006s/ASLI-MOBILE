import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { addWeeks, subWeeks } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import WeeklyTimetableGrid from '../../../src/components/teacher/WeeklyTimetableGrid';
import {
  buildWeekdayPlacements,
  formatWeekRange,
  getWeekStart,
  refName,
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

type ClassOption = {
  _id: string;
  label: string;
};

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return [];
}

function normalizeClasses(raw: any[]): ClassOption[] {
  return raw
    .map((row) => {
      const id = String(row?._id || row?.id || '');
      const classNumber = row?.classNumber != null ? String(row.classNumber) : '';
      const section = row?.section != null ? String(row.section) : '';
      const label = classNumber ? `${classNumber}${section ? `-${section}` : ''}` : 'Class';
      return { _id: id, label };
    })
    .filter((c) => c._id);
}

export default function TimetableView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [entries, setEntries] = useState<TimetableEntryLike[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableEntryLike | null>(null);

  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);
  const weekRange = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  const loadClasses = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/classes');
      setClasses(normalizeClasses(asArray(response?.data)));
    } catch {
      setClasses([]);
    }
  }, []);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (classFilter !== 'all') params.classId = classFilter;
      const response = await api.get('/api/timetable', { params });
      const data = asArray(response?.data);
      setEntries(data.filter(Boolean));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classFilter]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTimetable();
  }, [loadTimetable]);

  const filteredEntries = useMemo(() => {
    if (classFilter === 'all') return entries;
    return entries.filter((entry) => {
      const classId = entry.classId;
      const id =
        classId != null && typeof classId === 'object'
          ? String(classId._id || '')
          : String(classId || '');
      return id === classFilter;
    });
  }, [entries, classFilter]);

  const sessionCount = useMemo(
    () => buildWeekdayPlacements(filteredEntries).length,
    [filteredEntries]
  );

  const classFilterLabel =
    classFilter === 'all'
      ? 'All classes'
      : classes.find((c) => c._id === classFilter)?.label || 'Selected class';

  if (loading && !refreshing) {
    return <AdminSkeletonList count={3} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh} noPadding>
        <View style={{ padding: spacing.md }}>
          <AdminGlassCard noAnimation style={{ marginBottom: spacing.sm }}>
            <View style={styles.cardHeader}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  <View style={[styles.headerIcon, { backgroundColor: '#EA580C' }]}>
                    <Ionicons name="calendar" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.headerText}>
                    <AdminSectionHeader
                      title="Timetable Management"
                      subtitle="Manage class schedules, rooms, and teachers (view on mobile)"
                    />
                  </View>
                </View>
                <View style={[styles.sessionBadge, { backgroundColor: colors.inputBg, borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.sessionBadgeText, { color: '#C2410C' }]}>
                    {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
              </View>

              <View style={styles.weekNavRow}>
                <AdminScalePressable
                  onPress={() => setWeekAnchor((d) => subWeeks(d, 1))}
                  style={[styles.weekNavBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.inputBg }]}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </AdminScalePressable>
                <View style={[styles.weekRangeChip, { backgroundColor: colors.inputBg, borderColor: colors.surfaceBorder }]}>
                  <Ionicons name="calendar-outline" size={14} color="#EA580C" />
                  <Text style={[styles.weekRangeText, { color: colors.text }]}>{weekRange}</Text>
                </View>
                <AdminScalePressable
                  onPress={() => setWeekAnchor((d) => addWeeks(d, 1))}
                  style={[styles.weekNavBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.inputBg }]}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </AdminScalePressable>
              </View>

              <AdminScalePressable
                onPress={() => setPickerOpen(true)}
                style={[
                  styles.filterTrigger,
                  {
                    borderColor: colors.surfaceBorder,
                    backgroundColor: colors.inputBg,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text style={[styles.filterTriggerText, { color: colors.text }]} numberOfLines={1}>
                  {classFilterLabel}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </AdminScalePressable>

              <Text style={[styles.webHint, { color: colors.textMuted }]}>
                Add, edit, import CSV, and delete entries on the web admin Timetable page.
              </Text>
            </View>

            {sessionCount === 0 ? (
              <AdminEmptyState
                icon="calendar-outline"
                title="No timetable entries yet"
                message="Create schedule entries from the web admin Timetable Management section."
              />
            ) : (
              <View style={styles.gridWrap}>
                <WeeklyTimetableGrid
                  variant="admin"
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
              {['all', ...classes.map((c) => c._id)].map((opt) => {
                const label = opt === 'all' ? 'All classes' : classes.find((c) => c._id === opt)?.label || opt;
                const selected = classFilter === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.surfaceBorder },
                      selected && { backgroundColor: colors.inputBg },
                    ]}
                    onPress={() => {
                      setClassFilter(opt);
                      setPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: selected ? '#EA580C' : colors.textSecondary },
                        selected && styles.pickerItemTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#EA580C" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedSlot} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {refName(selectedSlot?.subjectId) || selectedSlot?.subject || teacherSlotLabel(selectedSlot) || 'Session'}
            </Text>
            <Text style={[styles.modalMeta, { color: colors.textMuted }]}>
              {selectedSlot?.dayOfWeek || selectedSlot?.day} · {selectedSlot?.startTime} – {selectedSlot?.endTime}
            </Text>
            {selectedSlot ? (
              <>
                <Text style={[styles.modalMeta, { color: colors.textSecondary }]}>{teacherSlotLabel(selectedSlot)}</Text>
                {selectedSlot.room ? (
                  <Text style={[styles.modalMeta, { color: colors.textMuted }]}>Room: {selectedSlot.room}</Text>
                ) : null}
                {selectedSlot.sessionType ? (
                  <Text style={[styles.modalMeta, { color: colors.textMuted }]}>Type: {selectedSlot.sessionType}</Text>
                ) : null}
                {selectedSlot.status ? (
                  <Text style={[styles.modalMeta, { color: colors.textMuted }]}>Status: {selectedSlot.status}</Text>
                ) : null}
              </>
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
  cardHeader: { gap: 12 },
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
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRangeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  weekRangeText: { fontSize: 13, fontWeight: '700' },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 320,
  },
  filterTriggerText: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 8 },
  webHint: { fontSize: 11, lineHeight: 16 },
  gridWrap: { marginTop: 4 },
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
