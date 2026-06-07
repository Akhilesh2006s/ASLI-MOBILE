import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
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

type HomeworkGroup = {
  homework: any;
  submissions: any[];
};

export default function HomeworkSubmissionsView() {
  const [groups, setGroups] = useState<HomeworkGroup[]>([]);
  const [studentRows, setStudentRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHw, setExpandedHw] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<any | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({
    title: '',
    classNumber: '',
    subject: '',
    topic: '',
    deadline: '',
    description: '',
    fileUrl: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [hwRes, classRes, subRes] = await Promise.all([
        teacherService.homeworkSubmissionsGrouped(),
        teacherService.classes(),
        teacherService.subjects(),
      ]);
      const raw = hwRes.data?.homeworks ?? [];
      setGroups(
        (Array.isArray(raw) ? raw : []).map((item: any) => ({
          homework: item.homework || item,
          submissions: item.submissions || [],
        }))
      );
      setStudentRows(Array.isArray(hwRes.data?.students) ? hwRes.data.students : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    } catch {
      setGroups([]);
      setStudentRows([]);
    } finally {
      setLoading(false);
    }
  };

  const classList = useMemo(() => {
    const set = new Set<string>();
    studentRows.forEach((row) => {
      const cn = row.student?.classNumber || row.classNumber;
      if (cn) set.add(String(cn));
    });
    classes.forEach((c) => {
      if (c.classNumber) set.add(String(c.classNumber));
    });
    return Array.from(set).sort();
  }, [studentRows, classes]);

  const toggleHw = (id: string) => {
    setExpandedHw((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClass = (cn: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cn)) next.delete(cn);
      else next.add(cn);
      return next;
    });
  };

  const submitHomework = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Title is required.');
      return;
    }
    try {
      await teacherService.createHomework({
        title: form.title,
        classNumber: form.classNumber,
        subject: form.subject,
        topic: form.topic,
        deadline: form.deadline,
        description: form.description,
        fileUrl: form.fileUrl,
      });
      setShowCreate(false);
      setForm({ title: '', classNumber: '', subject: '', topic: '', deadline: '', description: '', fileUrl: '' });
      load();
      Alert.alert('Created', 'Homework assignment created.');
    } catch {
      Alert.alert('Error', 'Could not create homework.');
    }
  };

  const submitGrade = async () => {
    if (!gradeTarget || !grade) return;
    try {
      await teacherService.gradeHomework(gradeTarget._id, {
        grade: parseFloat(grade),
        feedback: feedback.trim(),
      });
      setGradeTarget(null);
      setGrade('');
      setFeedback('');
      load();
    } catch {
      Alert.alert('Error', 'Could not save grade.');
    }
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={['#9333ea', '#2563eb']} style={styles.headerIcon}>
            <Ionicons name="document-text" size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Homework Submissions</Text>
            <Text style={styles.headerSub}>View and manage student homework submissions</Text>
          </View>
        </View>
        <Pressable onPress={() => setShowCreate(true)}>
          <LinearGradient colors={['#9333ea', '#2563eb']} style={styles.createBtn}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Create Homework</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={18} color={STUDENTS_UI.purple} />
          <Text style={styles.sectionTitle}>Homework Submissions</Text>
        </View>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No homework assignments found for your assigned subjects</Text>
          </View>
        ) : (
          groups.map((group) => {
            const hw = group.homework;
            const id = String(hw._id || hw.id);
            const isOpen = expandedHw.has(id);
            const deadline = hw.deadline ? new Date(hw.deadline) : null;
            const overdue = deadline && deadline < new Date() && group.submissions.length === 0;

            return (
              <View key={id} style={styles.hwCard}>
                <Pressable
                  style={[styles.hwHeader, overdue && styles.hwOverdue]}
                  onPress={() => toggleHw(id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.hwTitleRow}>
                      <Text style={styles.hwTitle}>{hw.title || 'Untitled Homework'}</Text>
                      {overdue ? (
                        <View style={styles.badgeRed}><Text style={styles.badgeRedText}>Overdue</Text></View>
                      ) : deadline && deadline >= new Date() ? (
                        <View style={styles.badgeYellow}><Text style={styles.badgeYellowText}>Active</Text></View>
                      ) : null}
                    </View>
                    <Text style={styles.hwMeta}>
                      Subject: {hw.subject?.name || hw.subject || 'N/A'}
                      {hw.classNumber ? ` · Class: ${hw.classNumber}` : ''}
                    </Text>
                    {deadline ? (
                      <Text style={[styles.deadline, overdue && { color: '#dc2626' }]}>
                        Deadline: {deadline.toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={STUDENTS_UI.textMuted} />
                </Pressable>
                {isOpen ? (
                  <View style={styles.subs}>
                    {group.submissions.length === 0 ? (
                      <Text style={styles.noSubs}>No submissions yet</Text>
                    ) : (
                      group.submissions.map((sub: any) => {
                        const student = sub.student || sub.studentId || {};
                        return (
                          <View key={sub._id} style={styles.subRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.subName}>{student.fullName || student.name || 'Student'}</Text>
                              <Text style={styles.subMeta}>{student.email || ''}</Text>
                              {sub.submittedAt ? (
                                <Text style={styles.subMeta}>Submitted {new Date(sub.submittedAt).toLocaleString()}</Text>
                              ) : null}
                            </View>
                            <Pressable style={styles.gradeBtn} onPress={() => {
                              setGradeTarget(sub);
                              setGrade(sub.grade != null ? String(sub.grade) : '');
                              setFeedback(sub.feedback || '');
                            }}>
                              <Text style={styles.gradeBtnText}>Grade</Text>
                            </Pressable>
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={18} color={STUDENTS_UI.purple} />
          <Text style={styles.sectionTitle}>Submissions by Students</Text>
        </View>
        {classList.length === 0 ? (
          <Text style={styles.emptyText}>No classes assigned yet.</Text>
        ) : (
          classList.map((classNum) => {
            const open = expandedClasses.has(classNum);
            const rows = studentRows.filter((row) => {
              const cn = row.student?.classNumber || row.classNumber;
              return String(cn) === classNum;
            });
            return (
              <View key={classNum} style={styles.classBlock}>
                <Pressable style={styles.classHeader} onPress={() => toggleClass(classNum)}>
                  <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color="#312e81" />
                  <Text style={styles.classTitle}>{classNum}</Text>
                  <Text style={styles.classCount}>{rows.length} student{rows.length !== 1 ? 's' : ''}</Text>
                </Pressable>
                {open ? (
                  rows.map((row) => {
                    const student = row.student || {};
                    const subs = row.submissions || [];
                    return (
                      <View key={student._id || student.id || classNum} style={styles.studentSubBlock}>
                        <Text style={styles.subName}>{student.fullName || student.name || 'Student'}</Text>
                        <Text style={styles.subMeta}>{subs.length} submission{subs.length !== 1 ? 's' : ''}</Text>
                        {subs.slice(0, 3).map((sub: any, i: number) => (
                          <Text key={i} style={styles.subMeta}>
                            {sub.homeworkId?.title || sub.title || 'Homework'}
                            {sub.grade != null ? ` · Grade: ${sub.grade}%` : ''}
                          </Text>
                        ))}
                      </View>
                    );
                  })
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Homework</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} placeholderTextColor={STUDENTS_UI.textLight} />
            <Text style={styles.label}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {classes.map((c) => {
                const num = String(c.classNumber || c.name);
                const sel = form.classNumber === num;
                return (
                  <Pressable key={c._id || c.id} style={[styles.chip, sel && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, classNumber: num }))}>
                    <Text style={[styles.chipText, sel && styles.chipTextActive]}>{num}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.label}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {subjects.map((s) => {
                const name = s.name;
                const sel = form.subject === name;
                return (
                  <Pressable key={s._id || s.id} style={[styles.chip, sel && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, subject: name }))}>
                    <Text style={[styles.chipText, sel && styles.chipTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.label}>Topic</Text>
            <TextInput style={styles.input} value={form.topic} onChangeText={(t) => setForm((f) => ({ ...f, topic: t }))} placeholderTextColor={STUDENTS_UI.textLight} />
            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.deadline} onChangeText={(t) => setForm((f) => ({ ...f, deadline: t }))} placeholderTextColor={STUDENTS_UI.textLight} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.area]} value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline placeholderTextColor={STUDENTS_UI.textLight} />
            <Pressable onPress={submitHomework}>
              <LinearGradient colors={['#9333ea', '#2563eb']} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Create</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!gradeTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Grade Submission</Text>
            <TextInput style={styles.input} value={grade} onChangeText={setGrade} keyboardType="numeric" placeholder="Marks" placeholderTextColor={STUDENTS_UI.textLight} />
            <TextInput style={[styles.input, styles.area]} value={feedback} onChangeText={setFeedback} placeholder="Feedback" placeholderTextColor={STUDENTS_UI.textLight} multiline />
            <Pressable onPress={submitGrade}>
              <LinearGradient colors={['#9333ea', '#2563eb']} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Grade</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setGradeTarget(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 14 },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: STUDENTS_UI.cardBorder,
    gap: 14,
  },
  headerLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: STUDENTS_UI.purple },
  headerSub: { fontSize: 13, color: STUDENTS_UI.textMuted, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12 },
  createBtnText: { color: '#fff', fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: STUDENTS_UI.cardBorder,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: STUDENTS_UI.text },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: STUDENTS_UI.textMuted, textAlign: 'center', marginTop: 8 },
  hwCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  hwHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#faf5ff' },
  hwOverdue: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  hwTitleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  hwTitle: { fontSize: 15, fontWeight: '700', color: STUDENTS_UI.text },
  hwMeta: { fontSize: 12, color: STUDENTS_UI.textMuted, marginTop: 4 },
  deadline: { fontSize: 12, color: STUDENTS_UI.textMuted, marginTop: 2 },
  badgeRed: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeRedText: { fontSize: 10, fontWeight: '700', color: '#991b1b' },
  badgeYellow: { backgroundColor: '#fef9c3', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeYellowText: { fontSize: 10, fontWeight: '700', color: '#854d0e' },
  subs: { padding: 12, backgroundColor: '#fff' },
  noSubs: { fontSize: 13, color: STUDENTS_UI.textLight, fontStyle: 'italic' },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  subName: { fontSize: 14, fontWeight: '700', color: STUDENTS_UI.text },
  subMeta: { fontSize: 11, color: STUDENTS_UI.textMuted, marginTop: 2 },
  gradeBtn: { borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  gradeBtnText: { fontSize: 12, fontWeight: '700', color: STUDENTS_UI.indigo },
  classBlock: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  classHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  classTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#312e81' },
  classCount: { fontSize: 11, color: STUDENTS_UI.textMuted },
  studentSubBlock: { marginLeft: 24, paddingBottom: 10, borderLeftWidth: 2, borderLeftColor: '#e0e7ff', paddingLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: STUDENTS_UI.text, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: STUDENTS_UI.textMuted, marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, color: STUDENTS_UI.text },
  area: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { borderColor: STUDENTS_UI.purple, backgroundColor: '#f5f3ff' },
  chipText: { fontSize: 12, color: STUDENTS_UI.textMuted, fontWeight: '600' },
  chipTextActive: { color: STUDENTS_UI.purple, fontWeight: '700' },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelText: { color: STUDENTS_UI.textMuted, fontWeight: '600' },
});
