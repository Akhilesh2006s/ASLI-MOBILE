import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addDays, addWeeks, format, parseISO, subWeeks } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../../src/services/api/api';
import WeeklyTimetableGrid from '../../../src/components/teacher/WeeklyTimetableGrid';
import TimetableMatrixGrid from './TimetableMatrixGrid';
import {
  getWeekStart,
  type TimetableEntryLike,
  type WeekdayIndex,
} from '../../../src/lib/timetable-utils';
import {
  bulkDeleteRepeatGroup,
  bulkDeleteTimetable,
  createTimetableEntry,
  deleteTimetableEntry,
  downloadTimetableTemplate,
  exportTimetableCsv,
  fetchTimetableEntries,
  importTimetableCsv,
  updateTimetableEntry,
  type TimetableFilters,
} from '../../../src/services/api/timetableAdminService';
import { exportCsvFile } from '../../../src/utils/csvExport';
import {
  AdminScreenShell,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminScalePressable,
  AdminModalShell,
  useAdminTheme,
} from '../_ui';

type ViewMode = 'week' | 'teacher' | 'class' | 'room';

type ClassOption = { _id: string; label: string; section: string };
type TeacherOption = { _id: string; fullName: string };
type SubjectOption = { _id: string; name: string };

type EntryForm = {
  date: string;
  startTime: string;
  endTime: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  room: string;
  building: string;
  sessionType: string;
  status: string;
};

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'week', label: 'Week Schedule' },
  { id: 'teacher', label: 'Teacher View' },
  { id: 'class', label: 'Class View' },
  { id: 'room', label: 'Room View' },
];

const SESSION_TYPES = ['Lecture', 'Lab', 'Exam', 'Workshop', 'Activity', 'Holiday', 'Special Class'];
const ORANGE = '#EA580C';
const ORANGE_DARK = '#C2410C';

function asArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.classes)) return obj.classes;
    if (Array.isArray(obj.teachers)) return obj.teachers;
    if (Array.isArray(obj.subjects)) return obj.subjects;
  }
  return [];
}

function refId(v: string | { _id?: string } | undefined): string {
  if (!v) return '';
  return typeof v === 'string' ? v : String(v._id || '');
}

function emptyForm(): EntryForm {
  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    room: '',
    building: '',
    sessionType: 'Lecture',
    status: 'Scheduled',
  };
}

function dateForWeekdayIndex(dayIndex: WeekdayIndex): Date {
  return addDays(getWeekStart(), dayIndex);
}

function normalizeClasses(raw: unknown[]): ClassOption[] {
  return raw
    .map((row) => {
      const record = row as Record<string, unknown>;
      const id = String(record._id || record.id || '');
      const classNumber = record.classNumber != null ? String(record.classNumber) : '';
      const section = record.section != null ? String(record.section) : '';
      const label = classNumber ? `${classNumber}${section ? `-${section}` : ''}` : 'Class';
      return { _id: id, label, section };
    })
    .filter((c) => c._id);
}

function normalizeTeachers(raw: unknown[]): TeacherOption[] {
  return raw
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        _id: String(record._id || record.id || ''),
        fullName: String(record.fullName || record.name || 'Teacher'),
      };
    })
    .filter((t) => t._id);
}

function normalizeSubjects(raw: unknown[]): SubjectOption[] {
  return raw
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        _id: String(record._id || record.id || ''),
        name: String(record.name || '').trim(),
      };
    })
    .filter((s) => s._id && s.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function SelectTrigger({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors, radius } = useAdminTheme();
  return (
    <AdminScalePressable
      onPress={onPress}
      style={[
        styles.selectTrigger,
        {
          borderColor: 'rgba(251, 146, 60, 0.45)',
          backgroundColor: colors.surface,
          borderRadius: radius.md,
        },
      ]}
    >
      <Text style={[styles.selectTriggerText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
    </AdminScalePressable>
  );
}

function ViewTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <AdminScalePressable onPress={onPress}>
        <LinearGradient
          colors={['#EA580C', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.viewTabActive}
        >
          <Text style={styles.viewTabActiveText}>{label}</Text>
        </LinearGradient>
      </AdminScalePressable>
    );
  }
  return (
    <AdminScalePressable
      onPress={onPress}
      style={[styles.viewTab, { borderColor: 'rgba(251, 146, 60, 0.45)' }]}
    >
      <Text style={[styles.viewTabText, { color: ORANGE_DARK }]}>{label}</Text>
    </AdminScalePressable>
  );
}

export default function TimetableView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [entries, setEntries] = useState<TimetableEntryLike[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [classFilter, setClassFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false);
  const [formPicker, setFormPicker] = useState<'class' | 'subject' | 'teacher' | 'session' | 'status' | null>(
    null
  );
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimetableEntryLike | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm());

  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);
  const rangeStart = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart]);
  const rangeEnd = useMemo(() => format(addDays(weekStart, 5), 'yyyy-MM-dd'), [weekStart]);
  const weekDates = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const queryFilters = useMemo((): TimetableFilters => {
    const base: TimetableFilters = {
      classId: classFilter !== 'all' ? classFilter : undefined,
      teacherId: teacherFilter !== 'all' ? teacherFilter : undefined,
    };
    if (viewMode === 'week') return base;
    return { ...base, startDate: rangeStart, endDate: rangeEnd };
  }, [classFilter, teacherFilter, viewMode, rangeStart, rangeEnd]);

  const loadMeta = useCallback(async () => {
    try {
      const [classRes, teacherRes, subjectRes] = await Promise.all([
        api.get('/api/admin/classes'),
        api.get('/api/admin/teachers'),
        api.get('/api/admin/subjects'),
      ]);
      setClasses(normalizeClasses(asArray(classRes?.data)));
      setTeachers(normalizeTeachers(asArray(teacherRes?.data)));
      setSubjects(normalizeSubjects(asArray(subjectRes?.data)));
    } catch {
      setClasses([]);
      setTeachers([]);
      setSubjects([]);
    }
  }, []);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchTimetableEntries(queryFilters);
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTimetable();
  }, [loadTimetable]);

  const classFilterLabel =
    classFilter === 'all'
      ? 'All Classes'
      : classes.find((c) => c._id === classFilter)?.label || 'Class';

  const teacherFilterLabel =
    teacherFilter === 'all'
      ? 'All Teachers'
      : teachers.find((t) => t._id === teacherFilter)?.fullName || 'Teacher';

  const openAdd = (date?: Date, hour?: number, dayIndex?: WeekdayIndex) => {
    setEditingEntry(null);
    const d = date ?? (dayIndex != null ? dateForWeekdayIndex(dayIndex) : new Date());
    const startTime = hour != null ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    const endTime = hour != null ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '10:00';
    setForm({ ...emptyForm(), date: format(d, 'yyyy-MM-dd'), startTime, endTime });
    setFormOpen(true);
  };

  const openEdit = (entry: TimetableEntryLike) => {
    setEditingEntry(entry);
    setForm({
      date: (entry.date || '').slice(0, 10) || format(new Date(), 'yyyy-MM-dd'),
      startTime: entry.startTime || '09:00',
      endTime: entry.endTime || '10:00',
      classId: refId(entry.classId as string | { _id?: string }),
      sectionId: entry.sectionId || entry.section || '',
      subjectId: refId(entry.subjectId as string | { _id?: string }),
      teacherId: refId(entry.teacherId as string | { _id?: string }),
      room: entry.room || '',
      building: (entry as { building?: string }).building || '',
      sessionType: entry.sessionType || 'Lecture',
      status: entry.status || 'Scheduled',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.classId || !form.subjectId || !form.teacherId) {
      Alert.alert('Validation', 'Class, subject, and teacher are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        classId: form.classId,
        sectionId: form.sectionId,
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        room: form.room,
        building: form.building,
        sessionType: form.sessionType,
        status: form.status,
        repeatRule: 'none',
        attendanceRequired: true,
      };
      if (editingEntry?._id || editingEntry?.id) {
        await updateTimetableEntry(String(editingEntry._id || editingEntry.id), payload);
        Alert.alert('Updated', 'Timetable entry saved.');
      } else {
        await createTimetableEntry(payload);
        Alert.alert('Created', 'Timetable entry saved.');
      }
      setFormOpen(false);
      setEditingEntry(null);
      loadTimetable();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const id = editingEntry?._id || editingEntry?.id;
    if (!id) return;
    Alert.alert('Delete this entry?', 'This removes only this schedule slot.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTimetableEntry(String(id));
            setFormOpen(false);
            setEditingEntry(null);
            loadTimetable();
            Alert.alert('Deleted', 'Timetable entry removed.');
          } catch {
            Alert.alert('Error', 'Delete failed.');
          }
        },
      },
    ]);
  };

  const handleDeleteRepeatGroup = () => {
    const groupId = (editingEntry as { repeatGroupId?: string })?.repeatGroupId;
    if (!groupId) return;
    Alert.alert('Delete entire repeat series?', 'Removes every entry in this repeating schedule.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete series',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await bulkDeleteRepeatGroup(groupId);
            setFormOpen(false);
            setEditingEntry(null);
            loadTimetable();
            Alert.alert('Deleted', `${result.deleted ?? 0} entries removed.`);
          } catch {
            Alert.alert('Error', 'Delete failed.');
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      const csv = await exportTimetableCsv(queryFilters);
      await exportCsvFile(csv, `timetable_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch {
      Alert.alert('Export', 'Could not export timetable.');
    }
  };

  const handleBulkDelete = () => {
    if (viewMode === 'week') {
      Alert.alert('Not available', 'Bulk delete is available in Teacher, Class, or Room view with a date range.');
      return;
    }
    if (entries.length === 0) return;
    Alert.alert(
      'Delete all visible entries?',
      `This permanently deletes ${entries.length} matching entries.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await bulkDeleteTimetable(queryFilters);
              loadTimetable();
              Alert.alert('Deleted', `${result.deleted ?? 0} entries removed.`);
            } catch {
              Alert.alert('Error', 'Bulk delete failed.');
            }
          },
        },
      ]
    );
  };

  const pickCsvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setCsvFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Upload', 'Could not pick file.');
    }
  };

  const handleUploadCsv = async () => {
    if (!csvFile?.uri) return;
    setSaving(true);
    try {
      const result = await importTimetableCsv(
        csvFile.uri,
        csvFile.name || 'timetable.csv',
        csvFile.mimeType || 'text/csv'
      );
      setUploadOpen(false);
      setCsvFile(null);
      loadTimetable();
      Alert.alert(
        'Import done',
        `Imported: ${result.imported ?? 0}, Skipped: ${result.skipped ?? 0}`
      );
    } catch {
      Alert.alert('Upload failed', 'Could not import CSV.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const csv = await downloadTimetableTemplate();
      await exportCsvFile(csv, 'timetable-template.csv');
    } catch {
      Alert.alert('Download', 'Could not download template.');
    }
  };

  const renderPickerModal = (
    visible: boolean,
    title: string,
    options: { label: string; value: string }[],
    selected: string,
    onSelect: (value: string) => void,
    onClose: () => void
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerSheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.surfaceBorder },
                    isSelected && { backgroundColor: colors.inputBg },
                  ]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: isSelected ? ORANGE : colors.textSecondary },
                      isSelected && styles.pickerItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark" size={18} color={ORANGE} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const formField = (label: string, children: React.ReactNode) => (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );

  if (loading && !refreshing) {
    return <AdminSkeletonList count={3} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh} noPadding>
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={styles.pageHeader}>
            <Ionicons name="calendar" size={28} color={ORANGE} />
            <View style={styles.pageHeaderText}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Timetable Management</Text>
              <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                Manage class schedules, rooms, and teachers
              </Text>
            </View>
          </View>

          <AdminGlassCard noAnimation>
            <View style={styles.toolbar}>
              <View style={styles.filterRow}>
                <View style={styles.filterCol}>
                  <SelectTrigger label={classFilterLabel} onPress={() => setClassPickerOpen(true)} />
                </View>
                <View style={styles.filterCol}>
                  <SelectTrigger
                    label={teacherFilterLabel}
                    onPress={() => setTeacherPickerOpen(true)}
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                <AdminScalePressable
                  onPress={handleExport}
                  style={[styles.outlineBtn, { borderColor: 'rgba(251, 146, 60, 0.45)' }]}
                >
                  <Ionicons name="download-outline" size={16} color={ORANGE_DARK} />
                  <Text style={[styles.outlineBtnText, { color: ORANGE_DARK }]}>Export</Text>
                </AdminScalePressable>
                <AdminScalePressable
                  onPress={handleBulkDelete}
                  disabled={entries.length === 0 || viewMode === 'week'}
                  style={[
                    styles.outlineBtn,
                    {
                      borderColor: 'rgba(248, 113, 113, 0.55)',
                      opacity: entries.length === 0 || viewMode === 'week' ? 0.45 : 1,
                    },
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={[styles.outlineBtnText, { color: '#DC2626' }]}>Delete visible</Text>
                </AdminScalePressable>
              </View>

              <View style={styles.actionRow}>
                <AdminScalePressable
                  onPress={() => setUploadOpen(true)}
                  style={[styles.outlineBtn, { borderColor: 'rgba(251, 146, 60, 0.45)' }]}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={ORANGE_DARK} />
                  <Text style={[styles.outlineBtnText, { color: ORANGE_DARK }]}>Upload CSV</Text>
                </AdminScalePressable>
                <AdminScalePressable onPress={() => openAdd()} style={styles.addBtnWrap}>
                  <LinearGradient
                    colors={['#EA580C', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addBtn}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Add Entry</Text>
                  </LinearGradient>
                </AdminScalePressable>
              </View>
            </View>
          </AdminGlassCard>

          <AdminGlassCard noAnimation>
            <View style={[styles.viewBar, { borderBottomColor: 'rgba(251, 146, 60, 0.2)' }]}>
              <View style={styles.viewTabsWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  contentContainerStyle={styles.viewTabs}
                >
                  {VIEW_MODES.map((mode) => (
                    <ViewTab
                      key={mode.id}
                      label={mode.label}
                      active={viewMode === mode.id}
                      onPress={() => setViewMode(mode.id)}
                    />
                  ))}
                </ScrollView>
              </View>
              {viewMode === 'week' ? (
                <Text style={styles.weekPattern} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  Weekly pattern · Monday – Saturday
                </Text>
              ) : (
                <View style={styles.weekNavRow}>
                  <AdminScalePressable
                    onPress={() => setWeekAnchor((d) => subWeeks(d, 1))}
                    style={[styles.weekNavBtn, { borderColor: colors.surfaceBorder }]}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.text} />
                  </AdminScalePressable>
                  <Text style={[styles.weekRangeText, { color: colors.text }]}>
                    {format(parseISO(rangeStart), 'MMM d')} –{' '}
                    {format(parseISO(rangeEnd), 'MMM d, yyyy')}
                  </Text>
                  <AdminScalePressable
                    onPress={() => setWeekAnchor((d) => addWeeks(d, 1))}
                    style={[styles.weekNavBtn, { borderColor: colors.surfaceBorder }]}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.text} />
                  </AdminScalePressable>
                </View>
              )}
            </View>

            <View style={styles.scheduleBody}>
              {viewMode === 'week' ? (
                entries.length === 0 ? (
                  <AdminEmptyState
                    icon="calendar-outline"
                    title="No timetable entries yet"
                    message="Add your first schedule entry with Add Entry."
                  />
                ) : (
                  <WeeklyTimetableGrid
                    variant="admin"
                    entries={entries}
                    interactive
                    onEntryClick={openEdit}
                    onEmptyClick={(dayIndex, hour) => openAdd(undefined, hour, dayIndex)}
                  />
                )
              ) : entries.length === 0 ? (
                <AdminEmptyState
                  icon="calendar-outline"
                  title="No timetable entries"
                  message="Add schedule entries or adjust filters."
                />
              ) : (
                <TimetableMatrixGrid
                  entries={entries}
                  rowMode={viewMode}
                  weekDates={weekDates}
                  onEntryClick={openEdit}
                />
              )}
            </View>
          </AdminGlassCard>
        </View>
      </AdminScreenShell>

      {renderPickerModal(
        classPickerOpen,
        'Class',
        [{ label: 'All Classes', value: 'all' }, ...classes.map((c) => ({ label: c.label, value: c._id }))],
        classFilter,
        setClassFilter,
        () => setClassPickerOpen(false)
      )}

      {renderPickerModal(
        teacherPickerOpen,
        'Teacher',
        [
          { label: 'All Teachers', value: 'all' },
          ...teachers.map((t) => ({ label: t.fullName, value: t._id })),
        ],
        teacherFilter,
        setTeacherFilter,
        () => setTeacherPickerOpen(false)
      )}

      <AdminModalShell
        visible={uploadOpen}
        title="Upload Timetable CSV"
        onClose={() => {
          setUploadOpen(false);
          setCsvFile(null);
        }}
        footer={
          <View style={styles.formFooter}>
            <AdminScalePressable
              onPress={handleDownloadTemplate}
              style={[styles.outlineBtn, { borderColor: 'rgba(251, 146, 60, 0.45)', flex: 1 }]}
            >
              <Ionicons name="download-outline" size={16} color={ORANGE_DARK} />
              <Text style={[styles.outlineBtnText, { color: ORANGE_DARK }]}>Template</Text>
            </AdminScalePressable>
            <AdminScalePressable
              onPress={handleUploadCsv}
              disabled={!csvFile || saving}
              style={{ flex: 1, opacity: !csvFile || saving ? 0.5 : 1 }}
            >
              <LinearGradient colors={['#EA580C', '#F59E0B']} style={styles.addBtn}>
                <Text style={styles.addBtnText}>{saving ? 'Uploading…' : 'Upload'}</Text>
              </LinearGradient>
            </AdminScalePressable>
          </View>
        }
      >
        <Text style={[styles.uploadHint, { color: colors.textMuted }]}>
          Upload a CSV or Excel file to bulk import schedule entries.
        </Text>
        <AdminScalePressable
          onPress={pickCsvFile}
          style={[styles.uploadPick, { borderColor: 'rgba(251, 146, 60, 0.45)', borderRadius: radius.md }]}
        >
          <Ionicons name="document-text-outline" size={22} color={ORANGE} />
          <Text style={[styles.uploadPickText, { color: colors.text }]}>
            {csvFile?.name || 'Select file'}
          </Text>
        </AdminScalePressable>
      </AdminModalShell>

      <AdminModalShell
        visible={formOpen}
        title={editingEntry ? 'Edit Entry' : 'Add Entry'}
        onClose={() => {
          setFormOpen(false);
          setEditingEntry(null);
        }}
        footer={
          <View style={styles.formFooterCol}>
            {editingEntry ? (
              <View style={styles.formFooter}>
                <AdminScalePressable
                  onPress={handleDelete}
                  style={[styles.outlineBtn, { borderColor: 'rgba(248, 113, 113, 0.55)', flex: 1 }]}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={[styles.outlineBtnText, { color: '#DC2626' }]}>Delete</Text>
                </AdminScalePressable>
                {(editingEntry as { repeatGroupId?: string }).repeatGroupId ? (
                  <AdminScalePressable
                    onPress={handleDeleteRepeatGroup}
                    style={[styles.outlineBtn, { borderColor: 'rgba(248, 113, 113, 0.55)', flex: 1 }]}
                  >
                    <Text style={[styles.outlineBtnText, { color: '#DC2626' }]}>Delete series</Text>
                  </AdminScalePressable>
                ) : null}
              </View>
            ) : null}
            <AdminScalePressable onPress={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
              <LinearGradient colors={['#EA580C', '#F59E0B']} style={styles.addBtn}>
                <Text style={styles.addBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </LinearGradient>
            </AdminScalePressable>
          </View>
        }
      >
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <View style={styles.formGrid}>
            {formField(
              'Date',
              <TextInput
                value={form.date}
                onChangeText={(date) => setForm((f) => ({ ...f, date }))}
                placeholder="YYYY-MM-DD"
                style={[styles.input, { borderColor: colors.surfaceBorder, color: colors.text }]}
              />
            )}
            {formField(
              'Start',
              <TextInput
                value={form.startTime}
                onChangeText={(startTime) => setForm((f) => ({ ...f, startTime }))}
                placeholder="09:00"
                style={[styles.input, { borderColor: colors.surfaceBorder, color: colors.text }]}
              />
            )}
            {formField(
              'End',
              <TextInput
                value={form.endTime}
                onChangeText={(endTime) => setForm((f) => ({ ...f, endTime }))}
                placeholder="10:00"
                style={[styles.input, { borderColor: colors.surfaceBorder, color: colors.text }]}
              />
            )}
            {formField(
              'Class *',
              <SelectTrigger
                label={classes.find((c) => c._id === form.classId)?.label || 'Select class'}
                onPress={() => setFormPicker('class')}
              />
            )}
            {formField(
              'Section',
              <TextInput
                value={form.sectionId}
                onChangeText={(sectionId) => setForm((f) => ({ ...f, sectionId: sectionId.toUpperCase() }))}
                placeholder="e.g. A"
                style={[styles.input, { borderColor: colors.surfaceBorder, color: colors.text }]}
              />
            )}
            {formField(
              'Subject *',
              <SelectTrigger
                label={subjects.find((s) => s._id === form.subjectId)?.name || 'Select subject'}
                onPress={() => setFormPicker('subject')}
              />
            )}
            {formField(
              'Teacher *',
              <SelectTrigger
                label={teachers.find((t) => t._id === form.teacherId)?.fullName || 'Select teacher'}
                onPress={() => setFormPicker('teacher')}
              />
            )}
            {formField(
              'Room',
              <TextInput
                value={form.room}
                onChangeText={(room) => setForm((f) => ({ ...f, room }))}
                style={[styles.input, { borderColor: colors.surfaceBorder, color: colors.text }]}
              />
            )}
            {formField(
              'Building',
              <TextInput
                value={form.building}
                onChangeText={(building) => setForm((f) => ({ ...f, building }))}
                style={[styles.input, { borderColor: colors.surfaceBorder, color: colors.text }]}
              />
            )}
            {formField(
              'Session type',
              <SelectTrigger label={form.sessionType} onPress={() => setFormPicker('session')} />
            )}
            {formField(
              'Status',
              <SelectTrigger label={form.status} onPress={() => setFormPicker('status')} />
            )}
          </View>
        </ScrollView>
      </AdminModalShell>

      {formPicker === 'class'
        ? renderPickerModal(
            true,
            'Select class',
            classes.map((c) => ({ label: c.label, value: c._id })),
            form.classId,
            (classId) => {
              const cls = classes.find((c) => c._id === classId);
              setForm((f) => ({ ...f, classId, sectionId: cls?.section || f.sectionId, subjectId: '' }));
            },
            () => setFormPicker(null)
          )
        : null}

      {formPicker === 'subject'
        ? renderPickerModal(
            true,
            'Select subject',
            subjects.map((s) => ({ label: s.name, value: s._id })),
            form.subjectId,
            (subjectId) => setForm((f) => ({ ...f, subjectId })),
            () => setFormPicker(null)
          )
        : null}

      {formPicker === 'teacher'
        ? renderPickerModal(
            true,
            'Select teacher',
            teachers.map((t) => ({ label: t.fullName, value: t._id })),
            form.teacherId,
            (teacherId) => setForm((f) => ({ ...f, teacherId })),
            () => setFormPicker(null)
          )
        : null}

      {formPicker === 'session'
        ? renderPickerModal(
            true,
            'Session type',
            SESSION_TYPES.map((s) => ({ label: s, value: s })),
            form.sessionType,
            (sessionType) => setForm((f) => ({ ...f, sessionType })),
            () => setFormPicker(null)
          )
        : null}

      {formPicker === 'status'
        ? renderPickerModal(
            true,
            'Status',
            [
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Cancelled', value: 'Cancelled' },
            ],
            form.status,
            (status) => setForm((f) => ({ ...f, status })),
            () => setFormPicker(null)
          )
        : null}
    </>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  pageHeaderText: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  toolbar: { gap: 12 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterCol: { flex: 1 },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  selectTriggerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700' },
  addBtnWrap: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  viewBar: {
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  viewTabsWrap: {
    width: '100%',
  },
  viewTabs: {
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewTab: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewTabText: { fontSize: 12, fontWeight: '700' },
  viewTabActive: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewTabActiveText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  weekPattern: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 4,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRangeText: { fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  scheduleBody: { minHeight: 120, width: '100%' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { padding: 20, paddingBottom: 28, maxHeight: '70%' },
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
  uploadHint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  uploadPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 14,
  },
  uploadPickText: { fontSize: 14, fontWeight: '600', flex: 1 },
  formGrid: { gap: 12 },
  formField: { gap: 6 },
  formLabel: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formFooter: { flexDirection: 'row', gap: 10 },
  formFooterCol: { gap: 10 },
});
