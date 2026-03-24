import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import {
  SvgIconBook,
  SvgIconCertificate,
  SvgIconClose,
  SvgIconEye,
  SvgIconMail,
  SvgIconPencil,
  SvgIconPeople,
  SvgIconSchool,
  SvgIconTrash,
} from './TeachersCardIcons';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacher?: {
    id: string;
    fullName: string;
    email: string;
  };
  grade?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SubjectsView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    grade: '',
  });
  const [editSubject, setEditSubject] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    grade: '',
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/subjects');
      const data = response?.data;
      let subjectsData: any[] = [];
      if (Array.isArray(data)) {
        subjectsData = data;
      } else if (data?.data && Array.isArray(data.data)) {
        subjectsData = data.data;
      } else if (data?.subjects && Array.isArray(data.subjects)) {
        subjectsData = data.subjects;
      }

      const mappedSubjects = subjectsData.map((subject: any) => ({
        id: String(subject._id || subject.id || ''),
        name: subject.name || 'Unknown Subject',
        code: subject.code || '',
        description: subject.description || '',
        teacher: subject.teacher,
        grade: subject.grade || '',
        department: subject.department || '',
        isActive: subject.isActive !== false,
        createdAt: subject.createdAt || new Date().toISOString(),
      }));
      setSubjects(mappedSubjects);
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjects;
    const query = searchTerm.toLowerCase();
    return subjects.filter(
      (subject) =>
        subject.name?.toLowerCase().includes(query) ||
        subject.code?.toLowerCase().includes(query) ||
        subject.department?.toLowerCase().includes(query) ||
        subject.teacher?.fullName?.toLowerCase().includes(query) ||
        subject.teacher?.email?.toLowerCase().includes(query),
    );
  }, [subjects, searchTerm]);

  const totalSubjects = subjects.length;
  const activeSubjects = subjects.filter((s) => s.isActive).length;
  const assignedSubjects = subjects.filter((s) => s.teacher).length;

  const handleAddSubject = async () => {
    if (!newSubject.name.trim() || !newSubject.code.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Code)');
      return;
    }

    try {
      await api.post('/api/admin/subjects', newSubject);
      setNewSubject({ name: '', code: '', description: '', department: '', grade: '' });
      setIsAddModalVisible(false);
      fetchSubjects();
      Alert.alert('Success', 'Subject added successfully!');
    } catch (error: any) {
      console.error('Failed to add subject:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Failed to add subject. Please try again.');
    }
  };

  const openEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setEditSubject({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      department: subject.department || '',
      grade: subject.grade || '',
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editSubject.name.trim() || !editSubject.code.trim()) {
      Alert.alert('Error', 'Name and code are required');
      return;
    }
    try {
      await api.put(`/api/admin/subjects/${editingSubject.id}`, editSubject);
      setIsEditModalVisible(false);
      setEditingSubject(null);
      fetchSubjects();
      Alert.alert('Success', 'Subject updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to update subject.');
    }
  };

  const showSubjectDetail = (subject: Subject) => {
    const lines = [
      `Code: ${subject.code || '—'}`,
      `Description: ${subject.description?.trim() ? subject.description : '—'}`,
      `Department: ${subject.department?.trim() ? subject.department : '—'}`,
      `Grade: ${subject.grade?.trim() ? subject.grade : '—'}`,
      `Status: ${subject.isActive ? 'Active' : 'Inactive'}`,
      subject.teacher
        ? `Teacher: ${subject.teacher.fullName}\nEmail: ${subject.teacher.email || '—'}`
        : 'Teacher: Not assigned',
    ];
    Alert.alert(subject.name, lines.join('\n\n'));
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete ${subjectName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/subjects/${subjectId}`);
              fetchSubjects();
              Alert.alert('Success', `${subjectName} has been deleted successfully.`);
            } catch (error: any) {
              console.error('Failed to delete subject:', error);
              Alert.alert('Error', error?.friendlyMessage || 'Failed to delete subject. Please try again.');
            }
          },
        },
      ],
    );
  };

  const DetailRow = ({
    icon,
    label,
    value,
    valueMuted,
  }: {
    icon: ReactNode;
    label: string;
    value: string;
    valueMuted?: boolean;
  }) => (
    <View style={styles.kvRow}>
      <View style={styles.kvRowLeft}>
        <View style={styles.detailIconWrap}>{icon}</View>
        <Text style={styles.kvLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.kvValue, valueMuted && styles.kvValueMuted]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );

  const renderSubjectCard = (subject: Subject) => (
    <View style={styles.subjectCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.subjectAvatar}>
          <Text style={styles.subjectAvatarText}>{(subject.name || 'S').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <TouchableOpacity onPress={() => showSubjectDetail(subject)} activeOpacity={0.75}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {subject.name}
            </Text>
          </TouchableOpacity>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subject.code ? `#${subject.code}` : 'Subject'}
          </Text>
        </View>
        <View style={[styles.activePill, !subject.isActive && styles.activePillOff]}>
          <Text style={[styles.activePillText, !subject.isActive && styles.activePillTextOff]}>
            {subject.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.kvBlock}>
        <DetailRow
          icon={<SvgIconBook size={18} color="#64748b" />}
          label="Code:"
          value={subject.code?.trim() ? subject.code : '—'}
        />
        <DetailRow
          icon={<SvgIconCertificate />}
          label="Description:"
          value={subject.description?.trim() ? subject.description : '—'}
        />
        <DetailRow
          icon={<SvgIconSchool />}
          label="Department:"
          value={subject.department?.trim() ? subject.department : '—'}
        />
        <DetailRow
          icon={<SvgIconBook size={18} color="#64748b" />}
          label="Grade:"
          value={subject.grade?.trim() ? subject.grade : '—'}
        />
        <DetailRow
          icon={<SvgIconPeople size={18} color="#64748b" />}
          label="Teacher:"
          value={subject.teacher?.fullName?.trim() ? subject.teacher.fullName : 'No teacher assigned'}
          valueMuted={!subject.teacher}
        />
        <DetailRow
          icon={<SvgIconMail />}
          label="Email:"
          value={subject.teacher?.email?.trim() ? subject.teacher.email : '—'}
          valueMuted={!subject.teacher?.email}
        />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.squircleBtn, styles.squircleBtnBlue]}
          onPress={() => showSubjectDetail(subject)}
          accessibilityLabel="View subject"
        >
          <SvgIconEye color="#0284c7" size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.squircleBtn, styles.squircleBtnTeal]}
          onPress={() => openEditSubject(subject)}
          accessibilityLabel="Edit subject"
        >
          <SvgIconPencil color="#0d9488" size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.squircleBtn, styles.squircleBtnRed]}
          onPress={() => handleDeleteSubject(subject.id, subject.name)}
          accessibilityLabel="Delete subject"
        >
          <SvgIconTrash color="#b91c1c" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageIntro}>
        <Text style={styles.pageTitle}>Subject Management</Text>
        <Text style={styles.pageSubtitle}>Manage subjects and their assignments</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.summaryTile, { borderLeftColor: '#fb923c' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#fff7ed' }]}>
            <MaterialCommunityIcons name="book-open-variant" size={18} color="#ea580c" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Total</Text>
          <Text style={styles.summaryTileValue}>{totalSubjects}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#38bdf8' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#eff6ff' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#0284c7" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Active</Text>
          <Text style={styles.summaryTileValue}>{activeSubjects}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#14b8a6' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f0fdfa' }]}>
            <MaterialCommunityIcons name="account-group" size={18} color="#0d9488" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Assigned</Text>
          <Text style={styles.summaryTileValue}>{assignedSubjects}</Text>
        </View>
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.searchWrap}>
          <View style={[styles.searchIconSlot, styles.toolbarIconWrap]}>
            <MaterialCommunityIcons name="magnify" size={22} color="#94a3b8" allowFontScaling={false} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects by name, code, teacher…"
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity style={styles.addSubjectBtn} onPress={() => setIsAddModalVisible(true)} activeOpacity={0.88}>
          <MaterialCommunityIcons name="plus" size={22} color="#fff" allowFontScaling={false} />
          <Text style={styles.addSubjectBtnText}>Add subject</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : filteredSubjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <SvgIconBook size={48} color="#0d9488" />
          </View>
          <Text style={styles.emptyText}>No subjects found</Text>
          <Text style={styles.emptyHint}>Try a different search or add a new subject.</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {filteredSubjects.map((subject, index) => (
            <Fragment key={String(subject.id || subject.code || subject.name || `subject-${index}`)}>
              {renderSubjectCard(subject)}
            </Fragment>
          ))}
        </View>
      )}

      {/* Add Subject */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#0d9488', '#0f766e']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.modalTitle}>Add New Subject</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)} hitSlop={12}>
                <SvgIconClose size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Biology"
                  value={newSubject.name}
                  onChangeText={(t) => setNewSubject({ ...newSubject, name: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Code *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. BIO101"
                  value={newSubject.code}
                  onChangeText={(t) => setNewSubject({ ...newSubject, code: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Optional"
                  value={newSubject.description}
                  onChangeText={(t) => setNewSubject({ ...newSubject, description: t })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department</Text>
                <TextInput
                  style={styles.formInput}
                  value={newSubject.department}
                  onChangeText={(t) => setNewSubject({ ...newSubject, department: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Grade</Text>
                <TextInput
                  style={styles.formInput}
                  value={newSubject.grade}
                  onChangeText={(t) => setNewSubject({ ...newSubject, grade: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAddModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButtonSolid} onPress={handleAddSubject} activeOpacity={0.88}>
                <Text style={styles.submitButtonSolidText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Subject */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#0d9488', '#0f766e']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.modalTitle}>Edit Subject</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} hitSlop={12}>
                <SvgIconClose size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editSubject.name}
                  onChangeText={(t) => setEditSubject({ ...editSubject, name: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Code *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editSubject.code}
                  onChangeText={(t) => setEditSubject({ ...editSubject, code: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={editSubject.description}
                  onChangeText={(t) => setEditSubject({ ...editSubject, description: t })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department</Text>
                <TextInput
                  style={styles.formInput}
                  value={editSubject.department}
                  onChangeText={(t) => setEditSubject({ ...editSubject, department: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Grade</Text>
                <TextInput
                  style={styles.formInput}
                  value={editSubject.grade}
                  onChangeText={(t) => setEditSubject({ ...editSubject, grade: t })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButtonSolid} onPress={handleUpdateSubject} activeOpacity={0.88}>
                <Text style={styles.submitButtonSolidText}>Save changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  pageIntro: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  summaryTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryTileValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  toolbarCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIconSlot: {
    marginRight: 8,
  },
  toolbarIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
  },
  addSubjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addSubjectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  subjectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activePillOff: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  activePillTextOff: {
    color: '#b91c1c',
  },
  kvBlock: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kvRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    maxWidth: '42%',
  },
  detailIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kvLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  kvValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  kvValueMuted: {
    color: '#0d9488',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  squircleBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  squircleBtnBlue: {
    borderColor: '#7dd3fc',
  },
  squircleBtnTeal: {
    borderColor: '#99f6e4',
  },
  squircleBtnRed: {
    borderColor: '#fca5a5',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 28,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  modalBody: {
    padding: 14,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#111827',
  },
  formTextArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButtonSolid: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
  },
  submitButtonSolidText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
