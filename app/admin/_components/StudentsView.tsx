import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../../src/services/api/api';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminStatCard,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminFilterChips,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  section?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  assignedClass?: string;
}

type ViewMode = 'all' | 'class-wise' | 'section-wise';

const normalizeClassNumberForDisplay = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return 'N/A';
  return raw
    .replace(/^class\s*-\s*(\d+)/i, 'Class $1')
    .replace(/^-([0-9]+)([A-Za-z]?)$/, '$1$2');
};

const formatSectionLabel = (sectionRaw: string) => {
  const s = String(sectionRaw || '')
    .trim()
    .toUpperCase()
    .replace(/^SECTION\s*/i, '');
  if (!s) return '';
  const letter = s.match(/^[A-Z]$/) ? s : s.charAt(0);
  return letter ? `Section ${letter}` : '';
};

const getClassSectionMeta = (student: Pick<Student, 'classNumber' | 'section'>) => {
  const raw = (student.classNumber || '').trim();
  const sectionLabel = formatSectionLabel(student.section || '');

  if (!raw || raw === 'N/A') {
    return { classKey: 'Unassigned', sectionKey: sectionLabel || 'Unassigned' };
  }

  if (sectionLabel) {
    const numOnly = raw.match(/^(\d+)$/)?.[1];
    if (numOnly) return { classKey: numOnly, sectionKey: sectionLabel };
    const labeledNum = raw.match(/class[-\s]*(\d+)/i)?.[1];
    if (labeledNum) return { classKey: labeledNum, sectionKey: sectionLabel };
    return { classKey: raw, sectionKey: sectionLabel };
  }

  const compact = raw.replace(/\s+/g, '');
  const compactMatch = compact.match(/^(\d+)([A-Za-z])$/);
  if (compactMatch) {
    return {
      classKey: compactMatch[1],
      sectionKey: `Section ${compactMatch[2].toUpperCase()}`,
    };
  }

  const labeledMatch = raw.match(/class[-\s]*(\d+)\s*([A-Za-z])?/i);
  if (labeledMatch) {
    return {
      classKey: labeledMatch[1],
      sectionKey: labeledMatch[2]
        ? `Section ${labeledMatch[2].toUpperCase()}`
        : 'Section A',
    };
  }

  const digitsOnly = raw.match(/^(\d+)$/)?.[1];
  if (digitsOnly) return { classKey: digitsOnly, sectionKey: 'Section A' };

  return { classKey: raw, sectionKey: 'Section A' };
};

const getClassSortValue = (label: string) => {
  const match = label.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

const sortByClassLabel = (a: string, b: string) => {
  const numDiff = getClassSortValue(a) - getClassSortValue(b);
  if (numDiff !== 0) return numDiff;
  return a.localeCompare(b);
};

export default function StudentsView() {
  const { colors, spacing } = useAdminTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isDeleteAllModalVisible, setIsDeleteAllModalVisible] = useState(false);
  const [deleteAllConfirmStep, setDeleteAllConfirmStep] = useState(1);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [studentViewMode, setStudentViewMode] = useState<ViewMode>('class-wise');
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [isAssignClassModalVisible, setIsAssignClassModalVisible] = useState(false);
  const [selectedStudentForClass, setSelectedStudentForClass] = useState<Student | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState({
    name: '',
    email: '',
    classNumber: '',
    phone: '',
    isActive: true,
  });
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    classNumber: '',
    section: 'A',
    phone: '',
    password: '',
  });
  const [showNewStudentPassword, setShowNewStudentPassword] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  useEffect(() => {
    setSelectedSectionFilter('all');
  }, [selectedClassFilter]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = data?.data || data || [];
      setAvailableClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/students');
      const data = response?.data;
      const studentsData = data?.data || data || [];
      const mappedStudents = (Array.isArray(studentsData) ? studentsData : []).map((user: any) => ({
        id: user._id || user.id,
        name: user.fullName || user.name || 'Unknown Student',
        email: user.email || '',
        classNumber: normalizeClassNumberForDisplay(user.classNumber),
        section:
          user.assignedClass?.section ||
          (typeof user.assignedClass === 'object' ? user.assignedClass?.section : '') ||
          '',
        phone: user.phone || '',
        status: user.isActive ? ('active' as const) : ('inactive' as const),
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || null,
        assignedClass: user.assignedClass?._id || user.assignedClass || null,
      }));
      setStudents(mappedStudents);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStudents(), fetchClasses()]);
    setRefreshing(false);
  }, []);

  const allClasses = useMemo(
    () =>
      Array.from(new Set(students.map((s) => getClassSectionMeta(s).classKey))).sort(
        sortByClassLabel
      ),
    [students]
  );

  const sectionsByClass = useMemo(() => {
    return allClasses.reduce<Record<string, string[]>>((acc, classKey) => {
      const sections = Array.from(
        new Set(
          students
            .filter((s) => getClassSectionMeta(s).classKey === classKey)
            .map((s) => getClassSectionMeta(s).sectionKey)
        )
      ).sort();
      acc[classKey] = sections;
      return acc;
    }, {});
  }, [allClasses, students]);

  const availableSectionsForClass =
    selectedClassFilter === 'all' ? [] : sectionsByClass[selectedClassFilter] || [];

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.classNumber || '').includes(searchTerm);

      const { classKey, sectionKey } = getClassSectionMeta(student);
      const matchesClass = selectedClassFilter === 'all' || classKey === selectedClassFilter;
      const matchesSection =
        selectedSectionFilter === 'all' || sectionKey === selectedSectionFilter;

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchTerm, selectedClassFilter, selectedSectionFilter]);

  const classSectionGroups = useMemo(() => {
    return filteredStudents.reduce<Record<string, Record<string, Student[]>>>((acc, student) => {
      const { classKey, sectionKey } = getClassSectionMeta(student);
      if (!acc[classKey]) acc[classKey] = {};
      if (!acc[classKey][sectionKey]) acc[classKey][sectionKey] = [];
      acc[classKey][sectionKey].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const sectionClassGroups = useMemo(() => {
    return filteredStudents.reduce<Record<string, Record<string, Student[]>>>((acc, student) => {
      const { classKey, sectionKey } = getClassSectionMeta(student);
      if (!acc[sectionKey]) acc[sectionKey] = {};
      if (!acc[sectionKey][classKey]) acc[sectionKey][classKey] = [];
      acc[sectionKey][classKey].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const stats = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === 'active').length;
    const uniqueClasses = new Set(students.map((s) => s.classNumber)).size;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = students.filter((s) => {
      const created = new Date(s.createdAt);
      return created >= thisMonth;
    }).length;

    return {
      total: students.length,
      active: activeStudents,
      classes: uniqueClasses,
      newThisMonth,
    };
  }, [students]);

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.classNumber || !newStudent.section) {
      Alert.alert('Error', 'Please fill in Full Name, Email, Class Number, and Section.');
      return;
    }
    if (!newStudent.password.trim() || newStudent.password.trim().length < 6) {
      Alert.alert('Error', 'Password is required and must be at least 6 characters.');
      return;
    }

    try {
      await api.post('/api/admin/students', {
        fullName: newStudent.name.trim(),
        email: newStudent.email.trim(),
        classNumber: newStudent.classNumber.trim(),
        section: newStudent.section.trim(),
        phone: newStudent.phone.trim(),
        password: newStudent.password.trim(),
      });
      Alert.alert('Success', 'Student added successfully!');
      setNewStudent({ name: '', email: '', classNumber: '', section: 'A', phone: '', password: '' });
      setShowNewStudentPassword(false);
      setIsAddModalVisible(false);
      fetchStudents();
      fetchClasses();
    } catch (error: any) {
      console.error('Failed to add student:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Network error. Please try again.');
    }
  };

  const handleCSVUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name || 'students.csv',
      type: selectedFile.mimeType || 'text/csv',
    } as any);

    try {
      const response = await api.post('/api/admin/students/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response?.data;
      setIsUploadModalVisible(false);
      setSelectedFile(null);
      fetchStudents();
      fetchClasses();

      let message =
        result?.message ||
        `Created ${result?.createdUsers?.length || 0} student(s) with the passwords from your CSV.`;
      if (result?.classesCreated && result.classesCreated > 0) {
        message += ` Linked ${result.classesCreated} class section(s).`;
      }
      if (result?.errors?.length > 0) {
        message += `\n\nSome errors occurred:\n${result.errors.slice(0, 3).join('\n')}`;
      }
      Alert.alert('CSV Upload Successful', message);
    } catch (error: any) {
      console.error('Failed to upload CSV:', error);
      Alert.alert(
        'CSV Upload Failed',
        error?.response?.data?.message || error?.friendlyMessage || 'Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    Alert.alert('Delete Student', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/admin/students/${id}`);
            Alert.alert('Success', 'Student deleted successfully');
            fetchStudents();
          } catch (error: any) {
            console.error('Failed to delete student:', error);
            Alert.alert('Error', error?.friendlyMessage || 'Network error. Please try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteAllStudents = async () => {
    try {
      await api.delete('/api/admin/users/delete-all');
      setStudents([]);
      setIsDeleteAllModalVisible(false);
      setDeleteAllConfirmStep(1);
      Alert.alert('Success', 'All students have been deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete all students:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.friendlyMessage || 'Please try again.'
      );
    }
  };

  const handleExportStudents = async () => {
    const rows = filteredStudents.map((student) => ({
      name: student.name || '',
      email: student.email || '',
      classNumber: student.classNumber || '',
      phone: student.phone || '',
      status: student.status || '',
      lastLogin: student.lastLogin ? new Date(student.lastLogin).toISOString() : '',
      createdAt: student.createdAt ? new Date(student.createdAt).toISOString() : '',
    }));

    const headers = ['name', 'email', 'classNumber', 'phone', 'status', 'lastLogin', 'createdAt'];
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => `"${String((row as any)[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    try {
      await Share.share({
        message: csv,
        title: `students_export_${new Date().toISOString().slice(0, 10)}.csv`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export', 'Could not share export file.');
    }
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudentForEdit(student);
    setEditStudent({
      name: student.name || '',
      email: student.email || '',
      classNumber: student.classNumber || '',
      phone: student.phone || '',
      isActive: student.status === 'active',
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudentForEdit) return;
    if (!editStudent.name || !editStudent.email) {
      Alert.alert('Error', 'Please fill in Full Name and Email.');
      return;
    }

    try {
      const response = await api.put(`/api/admin/students/${selectedStudentForEdit.id}`, {
        fullName: editStudent.name.trim(),
        classNumber: editStudent.classNumber.trim(),
        phone: editStudent.phone.trim(),
        isActive: editStudent.isActive,
      });
      if (response?.data?.success !== false) {
        setIsEditModalVisible(false);
        setSelectedStudentForEdit(null);
        fetchStudents();
        Alert.alert('Success', 'Student details updated successfully!');
      } else {
        Alert.alert('Error', response?.data?.message || 'Failed to update student');
      }
    } catch (error: any) {
      console.error('Failed to update student:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Please try again.');
    }
  };

  const handleAssignClass = async (classItem: any) => {
    if (!selectedStudentForClass) return;
    try {
      const response = await api.post(
        `/api/admin/students/${selectedStudentForClass.id}/assign-class`,
        { classId: classItem._id || classItem.id }
      );
      if (response?.data?.success !== false) {
        setIsAssignClassModalVisible(false);
        setSelectedStudentForClass(null);
        fetchStudents();
        Alert.alert('Success', 'Class assigned successfully!');
      } else {
        Alert.alert('Error', response?.data?.message || 'Failed to assign class');
      }
    } catch (error: any) {
      console.error('Failed to assign class:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Please try again.');
    }
  };

  const toggleClassCollapse = (classKey: string) => {
    setCollapsedClasses((prev) => ({ ...prev, [classKey]: !(prev[classKey] ?? true) }));
  };

  const toggleSectionCollapse = (scopeKey: string) => {
    setCollapsedSections((prev) => ({ ...prev, [scopeKey]: !(prev[scopeKey] ?? true) }));
  };

  const pickCsvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const renderStudentCard = useCallback(
    (student: Student, index: number) => (
      <AdminGlassCard key={String(student.id ?? student.email)} delay={index * 40} style={styles.studentCard}>
        <View style={styles.studentCardContent}>
          <View style={styles.studentHeader}>
            <View style={styles.studentAvatarContainer}>
              <LinearGradient
                colors={[...colors.fabGradient]}
                style={styles.studentAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.studentAvatarText}>
                  {(student.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View
                style={[
                  styles.statusIndicator,
                  student.status === 'active'
                    ? styles.statusIndicatorActive
                    : styles.statusIndicatorInactive,
                ]}
              >
                <Ionicons
                  name={student.status === 'active' ? 'checkmark' : 'remove'}
                  size={10}
                  color="#fff"
                />
              </View>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName} numberOfLines={1}>
                {student.name || 'Unknown Student'}
              </Text>
              <Text style={styles.studentEmail} numberOfLines={1}>
                {student.email || 'No email'}
              </Text>
            </View>
            <View style={[styles.classBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.classBadgeText, { color: colors.primary }]}>{student.classNumber || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.studentMeta}>
            {student.phone ? (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={14} color={colors.primary} />
                <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>{student.phone}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>
                Last login:{' '}
                {student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}
              </Text>
            </View>
          </View>

          <View style={styles.studentActions}>
            <AdminScalePressable
              style={[styles.iconActionBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={() => handleEditStudent(student)}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.iconActionBtn, { backgroundColor: colors.dangerMuted }]}
              onPress={() => handleDeleteStudent(student.id, student.name)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.assignClassBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.primaryMuted }]}
              onPress={() => {
                setSelectedStudentForClass(student);
                setIsAssignClassModalVisible(true);
              }}
            >
              <Ionicons name="school-outline" size={16} color={colors.primary} />
              <Text style={[styles.assignClassBtnText, { color: colors.primary }]}>Assign Class</Text>
            </AdminScalePressable>
          </View>
        </View>
      </AdminGlassCard>
    ),
    [colors]
  );

  const renderPickerModal = (
    visible: boolean,
    title: string,
    options: { label: string; value: string }[],
    selected: string,
    onSelect: (value: string) => void,
    onClose: () => void
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={styles.pickerList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerItem, selected === opt.value && styles.pickerItemActive]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selected === opt.value && styles.pickerItemTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {selected === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderDirectoryContent = () => {
    if (isLoading) {
      return <AdminSkeletonList count={5} />;
    }

    if (filteredStudents.length === 0) {
      return (
        <AdminEmptyState
          title="No students found"
          message="Try adjusting your search criteria or add new students"
          icon="people-outline"
          action={
            <AdminScalePressable
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add First Student</Text>
            </AdminScalePressable>
          }
        />
      );
    }

    if (studentViewMode === 'all') {
      return (
        <View style={styles.studentsList}>
          {filteredStudents.map((student, index) => renderStudentCard(student, index))}
        </View>
      );
    }

    if (studentViewMode === 'class-wise') {
      return (
        <View style={styles.accordionList}>
          {Object.keys(classSectionGroups)
            .sort(sortByClassLabel)
            .map((classKey) => {
              const isClassCollapsed = collapsedClasses[classKey] ?? true;
              const classCount = Object.values(classSectionGroups[classKey]).flat().length;
              return (
                <View key={classKey} style={styles.accordionCard}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => toggleClassCollapse(classKey)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <Ionicons
                        name={isClassCollapsed ? 'chevron-forward' : 'chevron-down'}
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.accordionTitle}>{classKey}</Text>
                    </View>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {classCount} {classCount === 1 ? 'student' : 'students'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {!isClassCollapsed && (
                    <View style={styles.accordionBody}>
                      {Object.keys(classSectionGroups[classKey])
                        .sort()
                        .map((sectionKey) => {
                          const sectionScopeKey = `${classKey}::${sectionKey}`;
                          const isSectionCollapsed = collapsedSections[sectionScopeKey] ?? true;
                          const sectionStudents = classSectionGroups[classKey][sectionKey];
                          return (
                            <View key={sectionScopeKey} style={styles.sectionCard}>
                              <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => toggleSectionCollapse(sectionScopeKey)}
                              >
                                <View style={styles.accordionHeaderLeft}>
                                  <Ionicons
                                    name={isSectionCollapsed ? 'chevron-forward' : 'chevron-down'}
                                    size={16}
                                    color={colors.success}
                                  />
                                  <Text style={styles.sectionTitle}>{sectionKey}</Text>
                                </View>
                                <View style={styles.sectionCountBadge}>
                                  <Text style={styles.sectionCountBadgeText}>
                                    {sectionStudents.length}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                              {!isSectionCollapsed && (
                                <View style={styles.sectionStudents}>
                                  {sectionStudents.map((student, idx) => renderStudentCard(student, idx))}
                                </View>
                              )}
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      );
    }

    return (
      <View style={styles.accordionList}>
        {Object.keys(sectionClassGroups)
          .sort()
          .map((sectionKey) => {
            const isSectionCollapsed = collapsedSections[sectionKey] ?? true;
            const sectionCount = Object.values(sectionClassGroups[sectionKey]).flat().length;
            return (
              <View key={sectionKey} style={[styles.accordionCard, styles.sectionAccordionCard]}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  onPress={() => toggleSectionCollapse(sectionKey)}
                  activeOpacity={0.85}
                >
                  <View style={styles.accordionHeaderLeft}>
                    <Ionicons
                      name={isSectionCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={18}
                      color={colors.success}
                    />
                    <Text style={[styles.accordionTitle, styles.sectionAccordionTitle]}>
                      {sectionKey}
                    </Text>
                  </View>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountBadgeText}>
                      {sectionCount} {sectionCount === 1 ? 'student' : 'students'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {!isSectionCollapsed && (
                  <View style={styles.accordionBody}>
                    {Object.keys(sectionClassGroups[sectionKey])
                      .sort(sortByClassLabel)
                      .map((classKey) => {
                        const classStudents = sectionClassGroups[sectionKey][classKey];
                        return (
                          <View key={`${sectionKey}::${classKey}`} style={styles.sectionCard}>
                            <View style={styles.sectionClassHeader}>
                              <Text style={styles.sectionTitle}>{classKey}</Text>
                              <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{classStudents.length}</Text>
                              </View>
                            </View>
                            <View style={styles.sectionStudents}>
                              {classStudents.map((student, idx) => renderStudentCard(student, idx))}
                            </View>
                          </View>
                        );
                      })}
                  </View>
                )}
              </View>
            );
          })}
      </View>
    );
  };

  return (
    <>
    <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh} showsVerticalScrollIndicator>
      <AdminSectionHeader
        title="Students Directory"
        subtitle={`${filteredStudents.length} students found`}
        icon="people-outline"
      />

      <View style={styles.statsRow}>
        <AdminStatCard label="Total" value={stats.total} icon="people" gradientIndex={0} delay={0} />
        <AdminStatCard label="Active" value={stats.active} icon="checkmark-circle" gradientIndex={2} delay={50} />
        <AdminStatCard label="Classes" value={stats.classes} icon="school-outline" gradientIndex={4} delay={100} />
        <AdminStatCard label="New" value={stats.newThisMonth} icon="person-add-outline" gradientIndex={1} delay={150} />
      </View>

      <AdminGlassCard delay={80} style={{ marginBottom: spacing.md, padding: spacing.md, gap: spacing.sm }}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.selectTrigger, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
            onPress={() => setClassPickerOpen(true)}
          >
            <Text style={[styles.selectTriggerText, { color: colors.text }]} numberOfLines={1}>
              {selectedClassFilter === 'all' ? 'Select Class' : selectedClassFilter}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.selectTrigger,
              { borderColor: colors.surfaceBorder, backgroundColor: colors.surface },
              selectedClassFilter === 'all' && styles.selectDisabled,
            ]}
            onPress={() => selectedClassFilter !== 'all' && setSectionPickerOpen(true)}
            disabled={selectedClassFilter === 'all'}
          >
            <Text
              style={[
                styles.selectTriggerText,
                { color: colors.text },
                selectedClassFilter === 'all' && styles.selectDisabledText,
              ]}
              numberOfLines={1}
            >
              {selectedSectionFilter === 'all' ? 'Select Section' : selectedSectionFilter}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={selectedClassFilter === 'all' ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
        </View>

        <AdminSearchBar
          placeholder="Search students by name, email, or class..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <AdminFilterChips
          chips={[
            { id: 'all', label: 'All Students' },
            { id: 'class-wise', label: 'Class-wise' },
            { id: 'section-wise', label: 'Section-wise' },
          ]}
          selected={studentViewMode}
          onSelect={(id) => setStudentViewMode(id as ViewMode)}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.actionButtonsRow}>
            <AdminScalePressable style={[styles.exportBtn, { backgroundColor: colors.warning }]} onPress={handleExportStudents}>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Export</Text>
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.uploadBtn, { backgroundColor: colors.success }]}
              onPress={() => setIsUploadModalVisible(true)}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Upload CSV</Text>
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Add Student</Text>
            </AdminScalePressable>
            <AdminScalePressable
              style={[styles.deleteAllBtn, { backgroundColor: colors.danger }]}
              onPress={() => {
                setDeleteAllConfirmStep(1);
                setIsDeleteAllModalVisible(true);
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Delete All</Text>
            </AdminScalePressable>
          </View>
        </ScrollView>
      </AdminGlassCard>

      <AdminGlassCard delay={120} style={styles.directoryContainer}>
        <View style={[styles.directoryHeader, { borderBottomColor: colors.surfaceBorder, backgroundColor: colors.bg }]}>
          <View style={styles.directoryHeaderLeft}>
            <Text style={[styles.directoryTitle, { color: colors.text }]}>Students Directory</Text>
            <Text style={[styles.directorySubtitle, { color: colors.primary }]}>
              {filteredStudents.length} students found
            </Text>
          </View>
          <AdminScalePressable style={styles.exportDataBtn} onPress={handleExportStudents}>
            <LinearGradient
              colors={[...colors.fabGradient]}
              style={styles.exportDataGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.exportDataText}>Export Data</Text>
            </LinearGradient>
          </AdminScalePressable>
        </View>
        {renderDirectoryContent()}
      </AdminGlassCard>

      {/* Class picker */}
      {renderPickerModal(
        classPickerOpen,
        'Select Class',
        [{ label: 'All Classes', value: 'all' }, ...allClasses.map((c) => ({ label: c, value: c }))],
        selectedClassFilter,
        setSelectedClassFilter,
        () => setClassPickerOpen(false)
      )}

      {/* Section picker */}
      {renderPickerModal(
        sectionPickerOpen,
        'Select Section',
        [
          { label: 'All Sections', value: 'all' },
          ...availableSectionsForClass.map((s) => ({ label: s, value: s })),
        ],
        selectedSectionFilter,
        setSelectedSectionFilter,
        () => setSectionPickerOpen(false)
      )}

      {/* Upload CSV Modal */}
      <Modal
        visible={isUploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Students CSV</Text>
              <TouchableOpacity onPress={() => setIsUploadModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.uploadHint}>
                CSV columns: name, email, classnumber, section, phone, password
              </Text>
              <TouchableOpacity style={styles.filePickArea} onPress={pickCsvFile}>
                <Ionicons name="document-text-outline" size={40} color={colors.primary} />
                <Text style={styles.filePickTitle}>Tap to select CSV file</Text>
                {selectedFile ? (
                  <Text style={styles.filePickName}>{selectedFile.name}</Text>
                ) : null}
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsUploadModalVisible(false);
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!selectedFile || isUploading) && styles.btnDisabled]}
                onPress={handleCSVUpload}
                disabled={!selectedFile || isUploading}
              >
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isUploading ? (
                    <Text style={styles.submitButtonText}>Uploading…</Text>
                  ) : (
                    <Text style={styles.submitButtonText}>Upload Students</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete All Modal */}
      <Modal
        visible={isDeleteAllModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsDeleteAllModalVisible(false);
          setDeleteAllConfirmStep(1);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#991b1b' }]}>
                {deleteAllConfirmStep === 1 ? 'Delete All Students' : 'Final Confirmation'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsDeleteAllModalVisible(false);
                  setDeleteAllConfirmStep(1);
                }}
              >
                <Ionicons name="close" size={24} color="#991b1b" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={24} color="#dc2626" />
                <Text style={styles.warningText}>
                  {deleteAllConfirmStep === 1
                    ? `This will permanently delete ALL ${students.length} students. This cannot be undone.`
                    : `FINAL WARNING: You are about to delete ALL ${students.length} students.`}
                </Text>
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (deleteAllConfirmStep === 2) setDeleteAllConfirmStep(1);
                  else {
                    setIsDeleteAllModalVisible(false);
                    setDeleteAllConfirmStep(1);
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {deleteAllConfirmStep === 2 ? 'Go Back' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerSubmitButton}
                onPress={() => {
                  if (deleteAllConfirmStep === 1) setDeleteAllConfirmStep(2);
                  else handleDeleteAllStudents();
                }}
              >
                <Text style={styles.dangerSubmitText}>
                  {deleteAllConfirmStep === 2 ? 'DELETE ALL STUDENTS' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Student Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={newStudent.name}
                  onChangeText={(text) => setNewStudent({ ...newStudent, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  value={newStudent.email}
                  onChangeText={(text) => setNewStudent({ ...newStudent, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formHalf]}>
                  <Text style={styles.label}>Class Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 7, 8, 10"
                    value={newStudent.classNumber}
                    onChangeText={(text) => setNewStudent({ ...newStudent, classNumber: text })}
                  />
                </View>
                <View style={[styles.formGroup, styles.formHalf]}>
                  <Text style={styles.label}>Section *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="A, B, or C"
                    value={newStudent.section}
                    onChangeText={(text) =>
                      setNewStudent({
                        ...newStudent,
                        section: text.toUpperCase().slice(0, 1),
                      })
                    }
                    maxLength={1}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile"
                  value={newStudent.phone}
                  onChangeText={(text) =>
                    setNewStudent({
                      ...newStudent,
                      phone: text.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Min 6 characters"
                    value={newStudent.password}
                    onChangeText={(text) => setNewStudent({ ...newStudent, password: text })}
                    secureTextEntry={!showNewStudentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowNewStudentPassword((p) => !p)}
                  >
                    <Ionicons
                      name={showNewStudentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleAddStudent}>
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Add Student</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student Details</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editStudent.name}
                  onChangeText={(text) => setEditStudent({ ...editStudent, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={editStudent.email}
                  editable={false}
                />
                <Text style={styles.helperText}>Email cannot be changed</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Class Number</Text>
                <TextInput
                  style={styles.input}
                  value={editStudent.classNumber}
                  onChangeText={(text) => setEditStudent({ ...editStudent, classNumber: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editStudent.phone}
                  onChangeText={(text) => setEditStudent({ ...editStudent, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setEditStudent({ ...editStudent, isActive: !editStudent.isActive })}
              >
                <Ionicons
                  name={editStudent.isActive ? 'checkbox' : 'square-outline'}
                  size={22}
                      color={colors.primary}
                />
                <Text style={styles.checkboxLabel}>Active Account</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateStudent}>
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Update Student</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Class Modal */}
      <Modal
        visible={isAssignClassModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAssignClassModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Class to Student</Text>
              <TouchableOpacity onPress={() => setIsAssignClassModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedStudentForClass ? (
                <Text style={styles.assignHint}>
                  Assign a class to {selectedStudentForClass.name}
                </Text>
              ) : null}
              {availableClasses.length === 0 ? (
                <Text style={styles.emptySubtitle}>No classes available. Create a class first.</Text>
              ) : (
                availableClasses.map((classItem) => {
                  const classId = classItem._id || classItem.id;
                  const isSelected = selectedStudentForClass?.assignedClass === classId;
                  return (
                    <TouchableOpacity
                      key={String(classId)}
                      style={[styles.classPickItem, isSelected && styles.classPickItemActive]}
                      onPress={() => handleAssignClass(classItem)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.classPickName}>
                          {classItem.name ||
                            `Class ${classItem.classNumber}${classItem.section ? ` ${classItem.section}` : ''}`}
                        </Text>
                        <Text style={styles.classPickMeta}>
                          {classItem.studentCount || 0} students
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AdminScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  summaryTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
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
    color: '#0F172A',
  },
  toolbarCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectDisabled: {
    opacity: 0.55,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 8,
  },
  selectDisabledText: {
    color: '#94a3b8',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
  },
  viewModeScroll: {
    marginHorizontal: -4,
  },
  viewModeGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    padding: 4,
    gap: 4,
  },
  viewModeBtn: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewModeBtnActive: {},
  viewModeBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewModeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewModeBtnTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  directoryContainer: {
    marginBottom: 16,
    overflow: 'hidden',
    padding: 0,
  },
  directoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 70, 229, 0.12)',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  directoryHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  directoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  directorySubtitle: {
    fontSize: 13,
    color: '#4F46E5',
    marginTop: 4,
    fontWeight: '500',
  },
  exportDataBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exportDataGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exportDataText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  accordionList: {
    padding: 14,
    gap: 12,
  },
  accordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  sectionAccordionCard: {
    borderColor: '#99f6e4',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionAccordionTitle: {
    color: '#0f766e',
  },
  countBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.12)',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionCountBadge: {
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sectionCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  sectionStudents: {
    padding: 10,
    gap: 10,
  },
  studentsList: {
    padding: 14,
    gap: 12,
  },
  studentCard: {
    borderRadius: 14,
  },
  studentCardContent: {
    padding: 14,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  studentAvatarContainer: {
    position: 'relative',
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorActive: {
    backgroundColor: '#10b981',
  },
  statusIndicatorInactive: {
    backgroundColor: '#94a3b8',
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  classBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  studentMeta: {
    marginTop: 10,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItemText: {
    fontSize: 12,
    color: '#4338CA',
    flex: 1,
  },
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 70, 229, 0.12)',
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  assignClassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  assignClassBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F1F5F9',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4338CA',
  },
  pickerItemTextActive: {
    color: '#4F46E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 70, 229, 0.12)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    padding: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formHalf: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disabledInput: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
  helperText: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  eyeBtn: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    padding: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  uploadHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  filePickArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  filePickTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338CA',
  },
  filePickName: {
    fontSize: 13,
    color: '#4F46E5',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  assignHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  classPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  classPickItemActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  classPickName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  classPickMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 70, 229, 0.12)',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338CA',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    padding: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dangerSubmitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  dangerSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
