import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SvgIconBookMarked, SvgIconClose } from './TeachersCardIcons';
import api from '../../../src/services/api/api';

export type AssignedClassOption = {
  id: string;
  label: string;
};

type ClassRef = {
  _id?: string;
  classNumber?: string;
  section?: string;
  name?: string;
};

type DiaryEntry = {
  _id: string;
  forDate: string;
  title?: string;
  content: string;
  classDisplay?: string;
  classId?: string | ClassRef;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  teacherId: string | null;
  teacherName: string;
  assignedClasses?: AssignedClassOption[];
};

function formatClassSectionLabel(ref: ClassRef) {
  if (ref.classNumber) {
    const section = ref.section?.trim();
    return section ? `Class ${ref.classNumber} - ${section}` : `Class ${ref.classNumber}`;
  }
  return ref.name || null;
}

function normalizeClassKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

function getEntryClassId(entry: DiaryEntry): string | null {
  const ref = entry.classId;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && ref._id) return String(ref._id);
  return null;
}

function resolveEntryClassLabel(entry: DiaryEntry, classById: Map<string, string>): string | null {
  if (entry.classDisplay?.trim()) return entry.classDisplay.trim();
  const ref = entry.classId;
  if (ref && typeof ref === 'object') return formatClassSectionLabel(ref);
  if (typeof ref === 'string') return classById.get(ref) ?? null;
  return null;
}

function entryMatchesClassFilter(
  entry: DiaryEntry,
  selectedClassId: string,
  classById: Map<string, string>
): boolean {
  const entryClassId = getEntryClassId(entry);
  if (entryClassId && entryClassId === selectedClassId) return true;

  const entryLabel = resolveEntryClassLabel(entry, classById);
  const selectedLabel = classById.get(selectedClassId);
  if (entryLabel && selectedLabel) {
    return normalizeClassKey(entryLabel) === normalizeClassKey(selectedLabel);
  }
  return false;
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AdminTeacherDailyModal({
  visible,
  onClose,
  teacherId,
  teacherName,
  assignedClasses = [],
}: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const classById = useMemo(() => {
    const map = new Map<string, string>();
    assignedClasses.forEach((c) => {
      if (c.id && c.label) map.set(c.id, c.label);
    });
    return map;
  }, [assignedClasses]);

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const response = await api.get('/api/admin/teacher-work-diary', {
        params: { teacherId, limit: 40 },
      });
      const data = response?.data;
      if (data?.success && Array.isArray(data.data)) {
        setEntries(data.data);
      } else if (Array.isArray(data)) {
        setEntries(data);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const filteredEntries = useMemo(() => {
    if (!selectedClassId) return entries;
    return entries.filter((e) => entryMatchesClassFilter(e, selectedClassId, classById));
  }, [entries, selectedClassId, classById]);

  useEffect(() => {
    if (visible && teacherId) {
      load();
      setSelectedClassId(null);
    } else if (!visible) {
      setEntries([]);
      setSelectedClassId(null);
    }
  }, [visible, teacherId, load]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <SvgIconBookMarked size={18} color="#fff" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  Daily — {teacherName}
                </Text>
                <Text style={styles.subtitle}>Class updates logged by this teacher (newest first).</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <SvgIconClose size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {assignedClasses.length > 0 ? (
            <View style={styles.filterSection}>
              <MaterialCommunityIcons name="school-outline" size={16} color="#4338ca" />
              <Text style={styles.filterLabel}>Assigned:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  <Pressable
                    style={[styles.chip, selectedClassId === null && styles.chipActive]}
                    onPress={() => setSelectedClassId(null)}
                  >
                    <Text style={[styles.chipText, selectedClassId === null && styles.chipTextActive]}>
                      All
                    </Text>
                  </Pressable>
                  {assignedClasses.map((c) => {
                    const isActive = selectedClassId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.chip, isActive && styles.chipActive]}
                        onPress={() => setSelectedClassId(isActive ? null : c.id)}
                      >
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <ScrollView style={styles.entriesScroll} showsVerticalScrollIndicator>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4338ca" />
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No daily entries yet for this teacher.</Text>
              </View>
            ) : filteredEntries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No daily entries for{' '}
                  {selectedClassId ? classById.get(selectedClassId) ?? 'this class' : 'this class'} yet.
                </Text>
              </View>
            ) : (
              filteredEntries.map((entry) => {
                const classLabel = resolveEntryClassLabel(entry, classById);
                return (
                  <View key={entry._id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryDate}>{formatDay(entry.forDate)}</Text>
                      {classLabel ? (
                        <View style={styles.classBadge}>
                          <Text style={styles.classBadgeText}>{classLabel}</Text>
                        </View>
                      ) : (
                        <View style={styles.classBadgeMuted}>
                          <Text style={styles.classBadgeMutedText}>Class not specified</Text>
                        </View>
                      )}
                    </View>
                    {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
                    <Text style={styles.entryContent}>{entry.content}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#4338ca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  chipActive: {
    backgroundColor: '#4338ca',
    borderColor: '#4338ca',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  chipTextActive: {
    color: '#fff',
  },
  entriesScroll: {
    padding: 16,
    maxHeight: 420,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  entryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 14,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classBadge: {
    backgroundColor: '#4338ca',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  classBadgeMuted: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeMutedText: {
    fontSize: 11,
    color: '#6b7280',
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  entryContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
