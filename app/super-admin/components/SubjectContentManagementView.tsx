import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';

type SubjectItem = {
  _id: string;
  name: string;
  classNumber?: string;
  description?: string;
  code?: string;
};

type ContentItem = {
  _id: string;
  title: string;
  type?: string;
  date?: string;
  fileUrl?: string;
  classNumber?: string;
  subject?: {
    _id?: string;
    name?: string;
  };
};

const BOARD_CODE = 'ASLI_EXCLUSIVE_SCHOOLS';

function extractClassFromName(name?: string) {
  if (!name) return null;
  const parts = name.split('_');
  const maybe = parts[parts.length - 1];
  return /^\d+$/.test(maybe) ? maybe : null;
}

function plainSubjectName(name?: string) {
  if (!name) return '';
  const parts = name.split('_');
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    return parts.slice(0, -1).join('_');
  }
  return name;
}

export default function SubjectContentManagementView() {
  const { width } = useWindowDimensions();
  const compact = width < 390;

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [error, setError] = useState('');

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [contentForm, setContentForm] = useState({
    title: '',
    type: 'Video',
    fileUrl: '',
    topic: '',
    date: '',
    description: '',
  });

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      setError('');
      const res = await api.get(`/api/super-admin/boards/${BOARD_CODE}/subjects`);
      const data = res?.data;
      const list = data?.data || data?.subjects || [];
      setSubjects(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch subjects.');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const fetchContents = async () => {
    setIsLoadingContents(true);
    try {
      setError('');
      const res = await api.get(`/api/super-admin/boards/${BOARD_CODE}/content`);
      const data = res?.data;
      const list = Array.isArray(data) ? data : data?.data || [];
      setContents(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch content.');
    } finally {
      setIsLoadingContents(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchContents();
  }, []);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => {
      if (s.classNumber) set.add(s.classNumber);
      else {
        const fromName = extractClassFromName(s.name);
        if (fromName) set.add(fromName);
      }
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [subjects]);

  useEffect(() => {
    if (!selectedClass && classOptions.length > 0) {
      setSelectedClass(classOptions[0]);
    }
  }, [classOptions, selectedClass]);

  const subjectsUnderClass = useMemo(() => {
    if (!selectedClass) return [];
    return subjects.filter((s) => {
      if (s.classNumber) return s.classNumber === selectedClass;
      return extractClassFromName(s.name) === selectedClass;
    });
  }, [subjects, selectedClass]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s._id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const contentUnderSubject = useMemo(() => {
    if (!selectedSubjectId) return [];
    const subjectName = plainSubjectName(selectedSubject?.name).toLowerCase();
    return contents.filter((c) => {
      if (c.subject?._id === selectedSubjectId) return true;
      const cName = plainSubjectName(c.subject?.name).toLowerCase();
      return Boolean(subjectName) && cName.includes(subjectName);
    });
  }, [contents, selectedSubjectId, selectedSubject?.name]);

  const handleAddSubject = async () => {
    if (!selectedClass || !newSubjectName.trim()) return;
    try {
      const payload = {
        name: `${newSubjectName.trim()}_${selectedClass}`,
        board: BOARD_CODE,
      };
      await api.post('/api/super-admin/subjects', payload);
      setNewSubjectName('');
      setIsAddSubjectOpen(false);
      await fetchSubjects();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to create subject.');
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      await api.delete(`/api/super-admin/subjects/${subjectId}`);
      if (selectedSubjectId === subjectId) {
        setSelectedSubjectId(null);
      }
      await fetchSubjects();
      await fetchContents();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to delete subject.');
    }
  };

  const handleAddContent = async () => {
    if (!selectedSubjectId || !selectedClass || !contentForm.title || !contentForm.fileUrl || !contentForm.date) return;
    try {
      await api.post('/api/super-admin/content', {
        title: contentForm.title.trim(),
        description: contentForm.description.trim() || undefined,
        type: contentForm.type,
        board: BOARD_CODE,
        subject: selectedSubjectId,
        classNumber: selectedClass,
        topic: contentForm.topic.trim() || undefined,
        date: contentForm.date,
        fileUrl: contentForm.fileUrl.trim(),
      });
      setContentForm({
        title: '',
        type: 'Video',
        fileUrl: '',
        topic: '',
        date: '',
        description: '',
      });
      setIsAddContentOpen(false);
      await fetchContents();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to add content.');
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      await api.delete(`/api/super-admin/content/${contentId}`);
      await fetchContents();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to delete content.');
    }
  };

  const handleOpenContent = async (item: ContentItem) => {
    const url = item.fileUrl;
    if (!url) {
      Alert.alert('Missing URL', 'This content item does not have a valid file URL.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot open content', 'This URL is not supported on your device.');
        return;
      }
      await Linking.openURL(url);
    } catch (_) {
      Alert.alert('Open failed', 'Unable to open this content right now.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      <View style={styles.header}>
        <Text style={[styles.title, compact && { fontSize: 22 }]}>Subject & Content Management</Text>
        <Text style={[styles.subtitle, compact && { fontSize: 12 }]}>Manage subjects and learning content by class in one place.</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={[styles.panel, compact && { padding: 10 }]}>
        <Text style={[styles.panelTitle, compact && { fontSize: 17 }]}>Classes</Text>
        <View style={styles.classList}>
          {classOptions.map((cls) => (
            <TouchableOpacity
              key={cls}
              style={[styles.classItem, selectedClass === cls && styles.classItemActive]}
              onPress={() => {
                setSelectedClass(cls);
                setSelectedSubjectId(null);
              }}
            >
              <Text style={[styles.classText, selectedClass === cls && styles.classTextActive]}>{`Class ${cls}`}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.panel, compact && { padding: 10 }]}>
        <View style={styles.panelRow}>
          <View>
            <Text style={[styles.panelTitle, compact && { fontSize: 17 }]}>Subjects under Class</Text>
            <Text style={styles.panelHint}>{selectedClass ? `Showing subjects for Class ${selectedClass}` : 'Select class'}</Text>
          </View>
          <TouchableOpacity style={[styles.smallBtn, compact && { paddingHorizontal: 8, paddingVertical: 6 }]} onPress={() => setIsAddSubjectOpen(true)} disabled={!selectedClass}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={[styles.smallBtnText, compact && { fontSize: 11 }]}>Add Subject</Text>
          </TouchableOpacity>
        </View>

        {(isLoadingSubjects ? [] : subjectsUnderClass).map((subj) => {
          const active = selectedSubjectId === subj._id;
          return (
            <View key={subj._id} style={[styles.subjectRow, active && styles.subjectRowActive]}>
              <TouchableOpacity style={styles.subjectMain} onPress={() => setSelectedSubjectId(subj._id)}>
                <Ionicons name="book-outline" size={16} color="#64748b" />
                <Text style={styles.subjectName}>{plainSubjectName(subj.name)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteSubject(subj._id)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        })}
        {isLoadingSubjects ? <ActivityIndicator color="#2563eb" style={{ marginTop: 10 }} /> : null}
      </View>

      <View style={[styles.panel, compact && { padding: 10 }]}>
        <View style={styles.panelRow}>
          <View>
            <Text style={[styles.panelTitle, compact && { fontSize: 17 }]}>Content under Subject</Text>
            <Text style={styles.panelHint}>{selectedSubjectId ? 'Showing linked content' : 'Select a subject to view content'}</Text>
          </View>
          <TouchableOpacity style={[styles.smallBtnAlt, compact && { paddingHorizontal: 8, paddingVertical: 6 }]} onPress={() => setIsAddContentOpen(true)} disabled={!selectedSubjectId}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={[styles.smallBtnText, compact && { fontSize: 11 }]}>Add Content</Text>
          </TouchableOpacity>
        </View>

        {contentUnderSubject.map((item) => (
          <TouchableOpacity key={item._id} style={styles.contentRow} onPress={() => handleOpenContent(item)} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contentTitle}>{item.title}</Text>
              <Text style={styles.contentMeta}>{item.type || 'Material'} {item.date ? `| ${new Date(item.date).toLocaleDateString()}` : ''}</Text>
            </View>
            <TouchableOpacity style={styles.openBtn} onPress={() => handleOpenContent(item)}>
              <Ionicons name="open-outline" size={16} color="#2563eb" />
              <Text style={styles.openBtnText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteContent(item._id)}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {isLoadingContents ? <ActivityIndicator color="#2563eb" style={{ marginTop: 10 }} /> : null}
      </View>

      <Modal visible={isAddSubjectOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, compact && { fontSize: 16 }]}>Add Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Subject name (e.g. Chemistry)"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsAddSubjectOpen(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddSubject}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isAddContentOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, compact && { fontSize: 16 }]}>Add Content</Text>
            <TextInput style={styles.input} placeholder="Title" value={contentForm.title} onChangeText={(v) => setContentForm((p) => ({ ...p, title: v }))} />
            <TextInput style={styles.input} placeholder="Type (Video/TextBook/...)" value={contentForm.type} onChangeText={(v) => setContentForm((p) => ({ ...p, type: v }))} />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={contentForm.date} onChangeText={(v) => setContentForm((p) => ({ ...p, date: v }))} />
            <TextInput style={styles.input} placeholder="File URL" value={contentForm.fileUrl} onChangeText={(v) => setContentForm((p) => ({ ...p, fileUrl: v }))} />
            <TextInput style={styles.input} placeholder="Topic (optional)" value={contentForm.topic} onChangeText={(v) => setContentForm((p) => ({ ...p, topic: v }))} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsAddContentOpen(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddContent}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrap: { padding: 12, paddingBottom: 20, gap: 10 },
  header: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  errorText: { color: '#dc2626', fontSize: 12 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  panelHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  classList: { gap: 8, marginTop: 8 },
  classItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  classItemActive: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  classText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  classTextActive: { color: '#1d4ed8' },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  subjectRowActive: { borderColor: '#93c5fd', backgroundColor: '#f8fbff' },
  subjectMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  subjectName: { color: '#111827', fontWeight: '600', fontSize: 13 },
  contentRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentTitle: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  contentMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  openBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  openBtnText: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginLeft: 3 },
  smallBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallBtnAlt: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#fff',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  modalCancel: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f3f4f6' },
  modalSave: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563eb' },
});
