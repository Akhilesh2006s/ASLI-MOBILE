import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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
      const response = await api.get('/api/timetable');
      const data = asArray(response?.data);
      setEntries(data.filter(Boolean));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#fb923c" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                  Monday – Saturday · {weekRange}
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
              <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </Pressable>
          ) : null}
        </View>

        {sessionCount === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No timetable entries yet</Text>
            <Text style={styles.emptySub}>
              Add schedule entries from the web admin Timetable section to see them here.
            </Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            <WeeklyTimetableGrid
              entries={filteredEntries}
              onEntryClick={(entry) => setSelectedSlot(entry)}
            />
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
                    <Ionicons name="checkmark" size={18} color="#ea580c" />
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
              {selectedSlot?.subject ||
                (selectedSlot ? teacherSlotLabel(selectedSlot) : '') ||
                'Class Details'}
            </Text>
            <Text style={styles.modalMeta}>
              {selectedSlot?.dayOfWeek || selectedSlot?.day} · {selectedSlot?.startTime} –{' '}
              {selectedSlot?.endTime}
            </Text>
            {selectedSlot ? (
              <Text style={styles.modalMeta}>{teacherSlotLabel(selectedSlot)}</Text>
            ) : null}
            <Pressable style={styles.modalClose} onPress={() => setSelectedSlot(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  loadingWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
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
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  sessionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 280,
  },
  filterTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  gridWrap: {
    padding: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
    borderBottomColor: '#e5e7eb',
  },
  pickerItemActive: {
    backgroundColor: '#fff7ed',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#6b7280',
  },
  pickerItemTextActive: {
    fontWeight: '700',
    color: '#ea580c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  modalClose: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  modalCloseText: {
    color: '#6b7280',
    fontWeight: '600',
  },
});
