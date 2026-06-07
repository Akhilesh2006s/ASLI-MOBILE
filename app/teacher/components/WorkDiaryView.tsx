import { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { STUDENTS_UI } from '../../../src/lib/students-ui';
import { TEACHER_SPACING } from '../../../src/theme/teacher';

function formatClassLabel(c: any): string {
  if (c.classNumber) {
    const sec = c.section?.trim();
    return sec ? `Class ${c.classNumber} - ${sec}` : `Class ${c.classNumber}`;
  }
  return c.name || c.className || 'Class';
}

export default function WorkDiaryView() {
  const [entries, setEntries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [form, setForm] = useState({
    classId: '',
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [diaryRes, classRes] = await Promise.all([
        teacherService.workDiary(),
        teacherService.classes(),
      ]);
      setEntries(Array.isArray(diaryRes.data) ? diaryRes.data : []);
      const cls = Array.isArray(classRes.data) ? classRes.data : [];
      setClasses(cls);
      if (cls.length === 1 && !form.classId) {
        setForm((f) => ({ ...f, classId: String(cls[0]._id || cls[0].id) }));
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => String(c._id || c.id) === form.classId);

  const submit = async () => {
    if (!form.content.trim() || !form.classId) {
      Alert.alert('Required', 'Select a class and enter today\'s work.');
      return;
    }
    setSaving(true);
    try {
      await teacherService.createDiaryEntry({
        date: form.date,
        classId: form.classId,
        title: form.title.trim() || undefined,
        content: form.content.trim(),
      });
      setForm({ classId: form.classId, title: '', content: '', date: new Date().toISOString().slice(0, 10) });
      load();
      Alert.alert('Saved', 'Daily entry saved.');
    } catch {
      Alert.alert('Error', 'Could not save diary entry.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    Alert.alert('Delete', 'Remove this diary entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await teacherService.deleteDiaryEntry(id);
            setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
          } catch {
            Alert.alert('Error', 'Could not delete entry.');
          }
        },
      },
    ]);
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="bookmark" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Daily</Text>
            <Text style={styles.headerSub}>
              Log what you covered today — visible to your students and school admin.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Class & section</Text>
        {classes.length === 0 ? (
          <Text style={styles.warnBox}>No classes assigned yet. Contact your administrator.</Text>
        ) : (
          <Pressable style={styles.selectTrigger} onPress={() => setClassPickerOpen(true)}>
            <Text style={selectedClass ? styles.selectValue : styles.selectPlaceholder}>
              {selectedClass ? formatClassLabel(selectedClass) : 'Select class and section'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={STUDENTS_UI.textMuted} />
          </Pressable>
        )}

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={form.date}
          onChangeText={(t) => setForm((f) => ({ ...f, date: t }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={STUDENTS_UI.textLight}
        />

        <Text style={styles.label}>Title (optional)</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          placeholder="e.g. Algebra — quadratic equations"
          placeholderTextColor={STUDENTS_UI.textLight}
        />

        <Text style={styles.label}>Today&apos;s work</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.content}
          onChangeText={(t) => setForm((f) => ({ ...f, content: t }))}
          placeholder="Topics taught, activities, homework given, notes for parents..."
          placeholderTextColor={STUDENTS_UI.textLight}
          multiline
          numberOfLines={5}
        />

        <Pressable onPress={submit} disabled={saving || !form.classId}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={[styles.saveBtn, (!form.classId || saving) && { opacity: 0.5 }]}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save entry'}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Text style={styles.recentTitle}>RECENT ENTRIES</Text>
      {entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No diary entries yet. Add one above — it will show for students linked to your classes and for your school administrator.
          </Text>
        </View>
      ) : (
        entries.map((entry) => (
          <View key={entry._id || entry.id} style={styles.entry}>
            <View style={styles.entryHeader}>
              <View>
                <Text style={styles.entryDate}>
                  {entry.forDate || entry.date
                    ? new Date(entry.forDate || entry.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </Text>
                {entry.classDisplay || entry.classNumber ? (
                  <Text style={styles.entryClass}>
                    {entry.classDisplay ||
                      `Class ${entry.classNumber}${entry.section ? ` - ${entry.section}` : ''}`}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => remove(entry._id || entry.id)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
            {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
            <Text style={styles.entryContent}>{entry.content}</Text>
          </View>
        ))
      )}

      <Modal visible={classPickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setClassPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select class and section</Text>
            {classes.map((c) => {
              const id = String(c._id || c.id);
              const selected = form.classId === id;
              return (
                <Pressable
                  key={id}
                  style={[styles.pickerItem, selected && styles.pickerItemActive]}
                  onPress={() => {
                    setForm((f) => ({ ...f, classId: id }));
                    setClassPickerOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, selected && styles.pickerItemTextActive]}>
                    {formatClassLabel(c)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 14 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: STUDENTS_UI.text },
  headerSub: { fontSize: 12, color: STUDENTS_UI.textMuted, marginTop: 4, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700', color: STUDENTS_UI.text, marginBottom: 6, marginTop: 10 },
  warnBox: {
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#92400e',
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
  },
  selectValue: { fontSize: 15, color: STUDENTS_UI.text, fontWeight: '600' },
  selectPlaceholder: { fontSize: 15, color: STUDENTS_UI.textLight },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    color: STUDENTS_UI.text,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  recentTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: STUDENTS_UI.textLight,
    letterSpacing: 1,
    marginTop: 4,
  },
  emptyBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  emptyText: { fontSize: 13, color: STUDENTS_UI.textMuted, textAlign: 'center', lineHeight: 20 },
  entry: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: STUDENTS_UI.cardBorder,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  entryDate: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  entryClass: { fontSize: 12, color: STUDENTS_UI.textMuted, marginTop: 2 },
  entryTitle: { fontSize: 16, fontWeight: '800', color: STUDENTS_UI.text, marginBottom: 6 },
  entryContent: { fontSize: 14, color: STUDENTS_UI.textMuted, lineHeight: 20 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  pickerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: STUDENTS_UI.text },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemActive: { backgroundColor: '#eef2ff' },
  pickerItemText: { fontSize: 15, color: STUDENTS_UI.text },
  pickerItemTextActive: { fontWeight: '700', color: '#4f46e5' },
});
