import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../../../src/services/api/api';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminFAB,
  AdminScalePressable,
  useAdminTheme,
  useAdminListLayout,
  ADMIN_LIST_GRID_GAP,
  AdminGridList,
  AdminCardScrollBox,
  AdminStatsRow,
} from '../_ui';
import {
  SvgCheckbox,
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

const GRID_GAP = ADMIN_LIST_GRID_GAP;

interface ClassOption {
  id: string;
  classNumber: string;
  className: string;
  section?: string;
}

interface SubjectClass {
  id: string;
  classNumber: string;
  className: string;
  section?: string;
}

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
  classes?: SubjectClass[];
  classIds?: string[];
  grade?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

const toggleClassId = (classIds: string[], classId: string, checked: boolean) => {
  if (checked) return classIds.includes(classId) ? classIds : [...classIds, classId];
  return classIds.filter((id) => id !== classId);
};

const getClassItemLabel = (c: SubjectClass) => {
  if (c.className?.trim()) return c.className.trim();
  const base = c.classNumber ? `Class ${c.classNumber}` : 'Class';
  return c.section ? `${base}-${c.section}` : base;
};

const formatClassLabels = (subject: Subject) => {
  if (!subject.classes?.length) return '—';
  return subject.classes.map(getClassItemLabel).join(', ');
};

export default function SubjectsView() {
  const { colors, spacing, radius } = useAdminTheme();
  const { isTablet, gridColumns } = useAdminListLayout();
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
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
    classIds: [] as string[],
  });
  const [editSubject, setEditSubject] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    grade: '',
    classIds: [] as string[],
  });

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = Array.isArray(data) ? data : data?.data || [];
      setClasses(
        (Array.isArray(classesData) ? classesData : []).map((c: any) => ({
          id: String(c._id || c.id || ''),
          classNumber: String(c.classNumber || ''),
          className: c.name || c.className || `Class ${c.classNumber || ''}`,
          section: c.section ? String(c.section) : undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
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
        classes: Array.isArray(subject.classes)
          ? subject.classes.map((c: any) => ({
              id: String(c.id || c._id || ''),
              classNumber: c.classNumber || '',
              className: c.className || c.name || `Class ${c.classNumber || ''}`,
              section: c.section,
            }))
          : [],
        classIds: Array.isArray(subject.classIds)
          ? subject.classIds.map(String)
          : Array.isArray(subject.classes)
            ? subject.classes.map((c: any) => String(c.id || c._id || ''))
            : [],
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSubjects(), fetchClasses()]);
    setRefreshing(false);
  }, [fetchSubjects, fetchClasses]);

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
      await api.post('/api/admin/subjects', {
        ...newSubject,
        classIds: newSubject.classIds,
      });
      setNewSubject({
        name: '',
        code: '',
        description: '',
        department: '',
        grade: '',
        classIds: [],
      });
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
      classIds: subject.classIds || subject.classes?.map((c) => c.id) || [],
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editSubject.name.trim() || !editSubject.code.trim()) {
      Alert.alert('Error', 'Name and code are required');
      return;
    }
    try {
      await api.put(`/api/admin/subjects/${editingSubject.id}`, {
        ...editSubject,
        classIds: editSubject.classIds,
      });
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
      `Assigned Classes: ${formatClassLabels(subject)}`,
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

  const renderClassPicker = (
    selectedIds: string[],
    onChange: (ids: string[]) => void
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Assign to Class(es)</Text>
      {classes.length === 0 ? (
        <Text style={styles.classPickerEmpty}>No classes yet. Add classes first.</Text>
      ) : (
        <ScrollView style={styles.classPickerScroll} nestedScrollEnabled>
          {classes.map((cls) => {
            const checked = selectedIds.includes(cls.id);
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classPickRow, checked && styles.classPickRowActive]}
                onPress={() =>
                  onChange(toggleClassId(selectedIds, cls.id, !checked))
                }
                activeOpacity={0.75}
              >
                <SvgCheckbox checked={checked} size={22} />
                <Text style={styles.classPickLabel}>
                  {cls.className} ({cls.classNumber}
                  {cls.section ? `-${cls.section}` : ''})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

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
    <View style={[styles.kvRow, isTablet && styles.kvRowTablet]}>
      <View style={styles.kvRowLeft}>
        <View style={styles.detailIconWrap}>{icon}</View>
        <Text style={styles.kvLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.kvValue, isTablet && styles.kvValueTablet, valueMuted && styles.kvValueMuted]}
        numberOfLines={isTablet ? 2 : 1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );

  const renderSubjectCard = (subject: Subject, index: number) => (
    <AdminGlassCard
      delay={index * 60}
      style={[styles.subjectCard, isTablet && styles.subjectCardTablet]}
      noAnimation={isTablet}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.subjectAvatar, { backgroundColor: colors.primary }]}>
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

      <View style={[styles.kvBlock, isTablet && styles.kvBlockTablet]}>
        <DetailRow
          icon={<SvgIconBook size={18} color={colors.textMuted} />}
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
          icon={<SvgIconBook size={18} color={colors.textMuted} />}
          label="Grade:"
          value={subject.grade?.trim() ? subject.grade : '—'}
        />
        <DetailRow
          icon={<SvgIconPeople size={18} color={colors.textMuted} />}
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

      <View style={styles.cardFooter}>
      <View style={styles.assignedClassesBlock}>
        <Text style={styles.assignedClassesTitle}>Assigned Classes:</Text>
        {(subject.classes?.length ?? 0) > 0 ? (
          <AdminCardScrollBox style={styles.assignedClassesScroll}>
            {subject.classes!.map((cls) => (
              <View key={cls.id} style={[styles.assignedClassItem, { backgroundColor: colors.primaryMuted, borderColor: colors.surfaceBorder }]}>
                <View style={[styles.assignedClassIconWrap, { backgroundColor: colors.surface }]}>
                  <SvgIconSchool size={16} color={colors.primary} />
                </View>
                <Text style={[styles.assignedClassItemText, { color: colors.text }]}>{getClassItemLabel(cls)}</Text>
              </View>
            ))}
          </AdminCardScrollBox>
        ) : (
          <View style={styles.noClassesAssignedWrap}>
            <Text style={styles.noClassesAssigned}>No classes assigned</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <AdminScalePressable
          style={[styles.squircleBtn, { borderColor: colors.primaryLight }]}
          onPress={() => showSubjectDetail(subject)}
          accessibilityLabel="View subject"
        >
          <SvgIconEye color={colors.primary} size={22} />
        </AdminScalePressable>
        <AdminScalePressable
          style={[styles.squircleBtn, { borderColor: colors.success }]}
          onPress={() => openEditSubject(subject)}
          accessibilityLabel="Edit subject"
        >
          <SvgIconPencil color={colors.success} size={22} />
        </AdminScalePressable>
        <AdminScalePressable
          style={[styles.squircleBtn, { borderColor: colors.danger }]}
          onPress={() => handleDeleteSubject(subject.id, subject.name)}
          accessibilityLabel="Delete subject"
        >
          <SvgIconTrash color={colors.danger} size={22} />
        </AdminScalePressable>
      </View>
      </View>
    </AdminGlassCard>
  );

  return (
    <>
    <AdminScreenShell
      refreshing={refreshing}
      onRefresh={onRefresh}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <View style={styles.innerShell}>
      <AdminSectionHeader
        title="Subject Management"
        subtitle="Manage subjects and their assignments"
        icon="book-outline"
      />

      <AdminStatsRow
        items={[
          { label: 'Total', value: totalSubjects, icon: 'book', gradientIndex: 0 },
          { label: 'Active', value: activeSubjects, icon: 'checkmark-circle', gradientIndex: 2 },
          { label: 'Assigned', value: assignedSubjects, icon: 'people', gradientIndex: 1 },
        ]}
      />

      <AdminGlassCard delay={80} style={{ marginBottom: spacing.md, padding: spacing.md, gap: spacing.sm }}>
        <AdminSearchBar
          placeholder="Search subjects by name, code, teacher…"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </AdminGlassCard>

      {isLoading ? (
        <AdminSkeletonList count={4} />
      ) : filteredSubjects.length === 0 ? (
        <AdminEmptyState
          title="No subjects found"
          message="Try a different search or add a new subject."
          icon="book-outline"
        />
      ) : isTablet ? (
        <AdminGridList
          data={filteredSubjects}
          columns={gridColumns}
          keyExtractor={(item) => String(item.id)}
          renderItem={(item, index) => renderSubjectCard(item, index)}
        />
      ) : (
        <View style={styles.listContent}>
          {filteredSubjects.map((subject, index) => (
            <View key={String(subject.id || subject.code || `subject-${index}`)} style={styles.listCell}>
              {renderSubjectCard(subject, index)}
            </View>
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
              colors={[...colors.fabGradient]}
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
              {renderClassPicker(newSubject.classIds, (classIds) =>
                setNewSubject({ ...newSubject, classIds })
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAddModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButtonSolid, { backgroundColor: colors.primary }]} onPress={handleAddSubject} activeOpacity={0.88}>
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
              colors={[...colors.fabGradient]}
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
              {renderClassPicker(editSubject.classIds, (classIds) =>
                setEditSubject({ ...editSubject, classIds })
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButtonSolid, { backgroundColor: colors.primary }]} onPress={handleUpdateSubject} activeOpacity={0.88}>
                <Text style={styles.submitButtonSolidText}>Save changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </AdminScreenShell>
    <AdminFAB onPress={() => setIsAddModalVisible(true)} />
    </>
  );
}

const styles = StyleSheet.create({
  innerShell: {
    width: '100%',
    flexDirection: 'column',
  },
  listContent: {
    gap: GRID_GAP,
    paddingBottom: 8,
    width: '100%',
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  listCell: {
    width: '100%',
    alignSelf: 'stretch',
  },
  subjectCard: {
    padding: 14,
  },
  subjectCardTablet: {
    width: '100%',
  },
  kvBlockTablet: {
    gap: 6,
  },
  cardFooter: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexDirection: 'column',
    overflow: 'hidden',
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
  kvRowTablet: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
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
  kvValueTablet: {
    flex: 0,
    width: '100%',
    textAlign: 'left',
    paddingLeft: 30,
  },
  kvValueMuted: {
    color: '#4F46E5',
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
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  squircleBtn: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
    borderRadius: 20,
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
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
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonSolidText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  classPickerEmpty: {
    fontSize: 13,
    color: '#4F46E5',
    paddingVertical: 8,
  },
  classPickerScroll: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 8,
  },
  classPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  classPickRowActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  classPickLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  assignedClassesBlock: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
  },
  assignedClassesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  assignedClassesScroll: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    padding: 8,
  },
  assignedClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  assignedClassIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedClassItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  noClassesAssignedWrap: {
    paddingVertical: 4,
  },
  noClassesAssigned: {
    fontSize: 13,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
});
