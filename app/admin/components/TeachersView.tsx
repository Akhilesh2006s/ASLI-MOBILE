import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import type { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  SvgCheckbox,
  SvgIconBook,
  SvgIconBookMarked,
  SvgIconCertificate,
  SvgIconClose,
  SvgIconPeople,
  SvgIconPhone,
  SvgIconSchool,
  SvgIconTrash,
} from './TeachersCardIcons';
import AdminTeacherDailyModal from './AdminTeacherDailyModal';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  qualifications?: string;
  subjects?: any[];
  assignedClassIds?: string[];
  isActive: boolean;
  createdAt: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface ClassOption {
  id: string;
  name: string;
  classNumber?: string;
  section?: string;
  subjectLabel: string;
  assignedSubjects?: any[];
  schedule: string;
  room: string;
  studentCount: number;
}

const resolveAssignedClass = (classId: string, classList: ClassOption[]) => {
  const id = String(classId);
  return classList.find(
    (c) =>
      c.id === id ||
      c.classNumber === id ||
      `${c.classNumber ?? ''}${c.section ?? ''}` === id
  );
};

const getClassSubjectLine = (classItem: ClassOption | undefined, teacherSubjects: any[] = []) => {
  if (!classItem) return '';
  const teacherIdSet = new Set(
    teacherSubjects.map((s) => String(s?._id || s?.id || '')).filter(Boolean)
  );
  const fromClass = (classItem.assignedSubjects ?? []).filter((sub) => {
    if (!sub) return false;
    const sid = String(sub.id || sub._id || '');
    return teacherIdSet.size === 0 || !sid || teacherIdSet.has(sid);
  });
  const labels = (
    fromClass.length > 0
      ? fromClass.map((s) => s.name || s.code || '').filter(Boolean)
      : teacherSubjects.map((s) => s?.name || s?.title || '').filter(Boolean)
  );
  const unique = Array.from(new Set(labels));
  if (unique.length > 0) return unique.join(', ');
  if (classItem.subjectLabel && classItem.subjectLabel !== 'General') {
    return classItem.subjectLabel;
  }
  return '';
};

export default function TeachersView() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    qualifications: ''
  });
  const [editTeacher, setEditTeacher] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    qualifications: '',
    isActive: true
  });

  const [subjectsList, setSubjectsList] = useState<SubjectOption[]>([]);
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [assignSubjectsModal, setAssignSubjectsModal] = useState(false);
  const [assignClassesModal, setAssignClassesModal] = useState(false);
  const [assigningForTeacher, setAssigningForTeacher] = useState<Teacher | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [dailyDialogTeacher, setDailyDialogTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    fetchTeachers();
    fetchSubjectsList();
    fetchClassesList();
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/teachers');
      const data = response?.data;
      const teachersData = Array.isArray(data) ? data : (data?.data || data?.teachers || []);
      const mappedTeachers = (Array.isArray(teachersData) ? teachersData : []).map((teacher: any) => ({
        id: String(teacher._id || teacher.id || ''),
        fullName: teacher.fullName || 'Unknown Teacher',
        email: teacher.email || '',
        phone: teacher.phone || '',
        department: teacher.department || '',
        qualifications: teacher.qualifications || '',
        subjects: teacher.subjects || [],
        assignedClassIds: (teacher.assignedClassIds || []).map((id: any) => String(id)),
        isActive: teacher.isActive !== false,
        createdAt: teacher.createdAt || new Date().toISOString()
      }));
      setTeachers(mappedTeachers);
    } catch (error: any) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher =>
      teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teachers, searchTerm]);

  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.isActive).length;
  const departments = useMemo(() => 
    Array.from(new Set(teachers.map(t => t.department).filter(Boolean))),
    [teachers]
  );
  const totalSubjects = useMemo(() => 
    new Set(teachers.flatMap(t => t.subjects?.map((s: any) => s.id || s._id) || [])).size,
    [teachers]
  );

  const handleAddTeacher = async () => {
    if (!newTeacher.fullName.trim() || !newTeacher.email.trim() || !newTeacher.department.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Department)');
      return;
    }

    try {
      await api.post('/api/admin/teachers', newTeacher);
      setNewTeacher({ fullName: '', email: '', phone: '', department: '', qualifications: '' });
      setIsAddModalVisible(false);
      fetchTeachers();
      Alert.alert('Success', 'Teacher added successfully!');
    } catch (error: any) {
      console.error('Failed to add teacher:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Failed to add teacher. Please try again.');
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditTeacher({
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone || '',
      department: teacher.department || '',
      qualifications: teacher.qualifications || '',
      isActive: teacher.isActive
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher || !editTeacher.fullName.trim() || !editTeacher.email.trim() || !editTeacher.department.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Department)');
      return;
    }

    try {
      await api.put(`/api/admin/teachers/${editingTeacher.id}`, editTeacher);
      setEditingTeacher(null);
      setIsEditModalVisible(false);
      setEditTeacher({
        fullName: '',
        email: '',
        phone: '',
        department: '',
        qualifications: '',
        isActive: true
      });
      fetchTeachers();
      Alert.alert('Success', 'Teacher updated successfully!');
    } catch (error: any) {
      console.error('Failed to update teacher:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Failed to update teacher. Please try again.');
    }
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to delete ${teacherName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/teachers/${teacherId}`);
              fetchTeachers();
              Alert.alert('Success', `${teacherName} has been deleted successfully.`);
            } catch (error: any) {
              console.error('Failed to delete teacher:', error);
              Alert.alert('Error', error?.friendlyMessage || 'Failed to delete teacher. Please try again.');
            }
          }
        }
      ]
    );
  };

  const fetchSubjectsList = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/subjects');
      const data = response?.data;
      let subjectsData: any[] = [];
      if (Array.isArray(data)) subjectsData = data;
      else if (data?.data && Array.isArray(data.data)) subjectsData = data.data;
      else if (data?.subjects && Array.isArray(data.subjects)) subjectsData = data.subjects;
      setSubjectsList(
        subjectsData.map((s: any) => ({
          id: String(s._id || s.id || ''),
          name: s.name || 'Subject',
          code: s.code || '',
          description: s.description || '',
        })),
      );
    } catch (e) {
      console.error('Failed to fetch subjects list:', e);
    }
  }, []);

  const fetchClassesList = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = Array.isArray(data) ? data : (data?.data || []);
      setClassesList(
        (Array.isArray(classesData) ? classesData : []).map((cls: any) => ({
          id: String(cls._id || cls.id || ''),
          name:
            cls.name ||
            (cls.classNumber
              ? `Class ${cls.classNumber}${cls.section ? `-${cls.section}` : ''}`
              : 'Class'),
          classNumber: cls.classNumber ? String(cls.classNumber) : undefined,
          section: cls.section ? String(cls.section) : undefined,
          subjectLabel:
            typeof cls.subject === 'object' && cls.subject !== null
              ? String((cls.subject as { name?: string }).name ?? '')
              : String(cls.subject ?? 'General'),
          assignedSubjects: cls.assignedSubjects || [],
          schedule: cls.schedule || 'Mon-Fri 9:00 AM',
          room: cls.room || (cls.classNumber ? `Room ${cls.classNumber}${cls.section || ''}` : '—'),
          studentCount: cls.students?.length || cls.studentCount || 0,
        })),
      );
    } catch (e) {
      console.error('Failed to fetch classes list:', e);
    }
  }, []);

  const openAssignSubjectsModal = useCallback((teacher: Teacher) => {
    setAssigningForTeacher(teacher);
    const ids = (teacher.subjects || [])
      .map((s: any) => String(s._id || s.id))
      .filter(Boolean);
    setSelectedSubjectIds(ids);
    setAssignSubjectsModal(true);
  }, []);

  const openAssignClassesModal = useCallback((teacher: Teacher) => {
    setAssigningForTeacher(teacher);
    setSelectedClassIds((teacher.assignedClassIds || []).map(String));
    setAssignClassesModal(true);
  }, []);

  const toggleSubjectId = useCallback((id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleClassId = useCallback((id: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleAssignSubjectsSubmit = async () => {
    if (!assigningForTeacher) return;
    setAssignSubmitting(true);
    try {
      await api.post(`/api/admin/teachers/${assigningForTeacher.id}/assign-subjects`, {
        subjectIds: selectedSubjectIds,
      });
      setAssignSubjectsModal(false);
      setAssigningForTeacher(null);
      fetchTeachers();
      Alert.alert('Success', 'Subjects assigned successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to assign subjects.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const getAssignedClassOptions = useCallback(
    (teacher: Teacher) =>
      (teacher.assignedClassIds || []).map((classId) => {
        const classItem = resolveAssignedClass(classId, classesList);
        const label = classItem?.name
          ? classItem.name
          : classItem?.classNumber
            ? `Class ${classItem.classNumber}${classItem.section ? ` - ${classItem.section}` : ''}`
            : `Class ${classId}`;
        return { id: String(classItem?.id ?? classId), label };
      }),
    [classesList]
  );

  const handleAssignClassesSubmit = async () => {
    if (!assigningForTeacher) return;
    setAssignSubmitting(true);
    try {
      await api.post(`/api/admin/teachers/${assigningForTeacher.id}/assign-classes`, {
        classIds: selectedClassIds,
      });
      setAssignClassesModal(false);
      setAssigningForTeacher(null);
      fetchTeachers();
      Alert.alert('Success', 'Classes assigned successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.friendlyMessage || 'Failed to assign classes.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const renderTeacherCard = (teacher: Teacher) => {
    const subjectNames = (teacher.subjects || [])
      .map((s: any) => s?.name || s?.title || '')
      .filter(Boolean);
    const subjectsValue =
      subjectNames.length > 0
        ? subjectNames.slice(0, 3).join(', ') + (subjectNames.length > 3 ? ` (+${subjectNames.length - 3})` : '')
        : 'No subjects assigned';

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

    return (
      <View style={styles.teacherCard}>
        <View style={styles.teacherTopRow}>
          <View style={styles.teacherAvatarContainer}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherAvatarText}>
                {(teacher.fullName || 'T').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                teacher.isActive ? styles.statusIndicatorActive : styles.statusIndicatorInactive,
              ]}
            >
              <MaterialCommunityIcons
                name={teacher.isActive ? 'check' : 'close'}
                size={11}
                color="#fff"
                allowFontScaling={false}
              />
            </View>
          </View>
          <View style={styles.teacherTitleBlock}>
            <TouchableOpacity onPress={() => handleEditTeacher(teacher)} activeOpacity={0.7}>
              <Text style={styles.teacherName} numberOfLines={1}>
                {teacher.fullName}
              </Text>
            </TouchableOpacity>
            <Text style={styles.teacherEmailHint} numberOfLines={1}>
              {teacher.email || 'No email'}
            </Text>
          </View>
          <View style={[styles.activePill, !teacher.isActive && styles.activePillOff]}>
            <Text style={[styles.activePillText, !teacher.isActive && styles.activePillTextOff]}>
              {teacher.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.kvBlock}>
          <DetailRow icon={<SvgIconPhone />} label="Phone:" value={teacher.phone?.trim() ? teacher.phone : '—'} />
          <DetailRow
            icon={<SvgIconSchool />}
            label="Department:"
            value={teacher.department?.trim() ? teacher.department : '—'}
          />
          <DetailRow
            icon={<SvgIconBook size={18} color="#64748b" />}
            label="Subjects:"
            value={subjectsValue}
            valueMuted={subjectNames.length === 0}
          />
          <DetailRow
            icon={<SvgIconCertificate />}
            label="Qualifications:"
            value={teacher.qualifications?.trim() ? teacher.qualifications : '—'}
          />
        </View>

        <View style={styles.assignedClassesBlock}>
          <Text style={styles.assignedClassesTitle}>Assigned Classes:</Text>
          <ScrollView
            style={styles.assignedClassesScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {(teacher.assignedClassIds || []).length > 0 ? (
              (teacher.assignedClassIds || []).map((classId) => {
                const classItem = resolveAssignedClass(classId, classesList);
                if (!classItem) {
                  return (
                    <View key={classId} style={styles.assignedClassCardMissing}>
                      <Text style={styles.assignedClassMissingText}>
                        Assigned (class not found — re-assign from Class Management)
                      </Text>
                      <Text style={styles.assignedClassMeta}>ID: {classId}</Text>
                    </View>
                  );
                }
                const subjectLine = getClassSubjectLine(classItem, teacher.subjects || []);
                return (
                  <View key={classId} style={styles.assignedClassCard}>
                    <Text style={styles.assignedClassName}>
                      {classItem.name}
                      {subjectLine ? (
                        <Text style={styles.assignedClassSubject}> - {subjectLine}</Text>
                      ) : null}
                    </Text>
                    <View style={styles.assignedClassMetaRow}>
                      <MaterialCommunityIcons
                        name="calendar-month-outline"
                        size={14}
                        color="#7c3aed"
                        allowFontScaling={false}
                      />
                      <Text style={styles.assignedClassMeta}>{classItem.schedule}</Text>
                    </View>
                    <View style={styles.assignedClassMetaRow}>
                      <MaterialCommunityIcons
                        name="office-building-outline"
                        size={14}
                        color="#64748b"
                        allowFontScaling={false}
                      />
                      <Text style={styles.assignedClassMeta}>{classItem.room}</Text>
                      <Text style={styles.assignedClassMetaDot}> • </Text>
                      <MaterialCommunityIcons
                        name="account-group-outline"
                        size={14}
                        color="#7c3aed"
                        allowFontScaling={false}
                      />
                      <Text style={styles.assignedClassMeta}>
                        {classItem.studentCount}{' '}
                        {classItem.studentCount === 1 ? 'student' : 'students'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.noClassesAssignedWrap}>
                <Text style={styles.noClassesAssigned}>No classes assigned</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.teacherActions}>
          <TouchableOpacity
            style={[styles.squircleBtn, styles.squircleBtnOrange]}
            onPress={() => openAssignClassesModal(teacher)}
            activeOpacity={0.85}
            accessibilityLabel="Assign classes"
          >
            <SvgIconPeople color="#c2410c" size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.squircleBtn, styles.squircleBtnGreen]}
            onPress={() => openAssignSubjectsModal(teacher)}
            activeOpacity={0.85}
            accessibilityLabel="Assign subjects"
          >
            <SvgIconBook color="#047857" size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.squircleBtn, styles.squircleBtnPurple]}
            onPress={() => setDailyDialogTeacher(teacher)}
            activeOpacity={0.85}
            accessibilityLabel="View daily diary"
          >
            <SvgIconBookMarked color="#4338ca" size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.squircleBtn, styles.squircleBtnRed]}
            onPress={() => handleDeleteTeacher(teacher.id, teacher.fullName)}
            activeOpacity={0.85}
            accessibilityLabel="Delete teacher"
          >
            <SvgIconTrash color="#b91c1c" size={22} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageIntro}>
        <Text style={styles.pageTitle}>Teacher Management</Text>
        <Text style={styles.pageSubtitle}>Manage teachers and their assignments</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.summaryTile, { borderLeftColor: '#fb923c' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#fff7ed' }]}>
            <MaterialCommunityIcons name="account-group" size={18} color="#ea580c" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Total</Text>
          <Text style={styles.summaryTileValue}>{totalTeachers}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#38bdf8' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#eff6ff' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#0284c7" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Active</Text>
          <Text style={styles.summaryTileValue}>{activeTeachers}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#14b8a6' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f0fdfa' }]}>
            <MaterialCommunityIcons name="domain" size={18} color="#0d9488" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Depts</Text>
          <Text style={styles.summaryTileValue}>{departments.length}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#a855f7' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f5f3ff' }]}>
            <MaterialCommunityIcons name="book-open-variant" size={18} color="#7c3aed" allowFontScaling={false} />
          </View>
          <Text style={styles.summaryTileLabel}>Subjects</Text>
          <Text style={styles.summaryTileValue}>{totalSubjects}</Text>
        </View>
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.searchWrap}>
          <View style={[styles.searchIcon, styles.toolbarIconWrap]}>
            <MaterialCommunityIcons name="magnify" size={22} color="#94a3b8" allowFontScaling={false} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers by name, email, or department…"
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity
          style={styles.addTeacherBtn}
          onPress={() => setIsAddModalVisible(true)}
          activeOpacity={0.88}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#fff" allowFontScaling={false} />
          <Text style={styles.addTeacherBtnText}>Add teacher</Text>
        </TouchableOpacity>
      </View>

      {/* Teachers List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : filteredTeachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color="#0d9488" allowFontScaling={false} />
          </View>
          <Text style={styles.emptyText}>No teachers found</Text>
          <Text style={styles.emptyHint}>Try a different search or add a new teacher.</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {filteredTeachers.map((teacher, index) => (
            <Fragment key={String(teacher.id || teacher.email || `teacher-${index}`)}>
              {renderTeacherCard(teacher)}
            </Fragment>
          ))}
        </View>
      )}

      {/* Add Teacher Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#fb923c', '#f97316']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.modalTitle}>Add New Teacher</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)} hitSlop={12}>
                <SvgIconClose size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter teacher's full name"
                  value={newTeacher.fullName}
                  onChangeText={(text) => setNewTeacher({ ...newTeacher, fullName: text })}
                  placeholderTextColor="#9ca3af"
                />
                  </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter email address"
                  value={newTeacher.email}
                  onChangeText={(text) => setNewTeacher({ ...newTeacher, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
                </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter phone number"
                  value={newTeacher.phone}
                  onChangeText={(text) => setNewTeacher({ ...newTeacher, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
                  </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter department"
                  value={newTeacher.department}
                  onChangeText={(text) => setNewTeacher({ ...newTeacher, department: text })}
                  placeholderTextColor="#9ca3af"
                />
                    </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Qualifications</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Enter qualifications"
                  value={newTeacher.qualifications}
                  onChangeText={(text) => setNewTeacher({ ...newTeacher, qualifications: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddTeacher}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#fb923c', '#f97316']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.submitButtonText}>Add Teacher</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#fb923c', '#f97316']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.modalTitle}>Edit Teacher</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} hitSlop={12}>
                <SvgIconClose size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter teacher's full name"
                  value={editTeacher.fullName}
                  onChangeText={(text) => setEditTeacher({ ...editTeacher, fullName: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter email address"
                  value={editTeacher.email}
                  onChangeText={(text) => setEditTeacher({ ...editTeacher, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter phone number"
                  value={editTeacher.phone}
                  onChangeText={(text) => setEditTeacher({ ...editTeacher, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter department"
                  value={editTeacher.department}
                  onChangeText={(text) => setEditTeacher({ ...editTeacher, department: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Qualifications</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Enter qualifications"
                  value={editTeacher.qualifications}
                  onChangeText={(text) => setEditTeacher({ ...editTeacher, qualifications: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleUpdateTeacher}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#fb923c', '#f97316']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.submitButtonText}>Update Teacher</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Subjects — checkboxes use SVG (same as web) */}
      <Modal
        visible={assignSubjectsModal}
        animationType="fade"
        transparent
        onRequestClose={() => !assignSubmitting && setAssignSubjectsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.assignModalCard}>
            <View style={styles.assignModalHeader}>
              <View style={styles.assignModalTitleBlock}>
                <Text style={styles.assignModalTitle}>
                  Assign Subjects to {assigningForTeacher?.fullName ?? ''}
                </Text>
                <Text style={styles.assignModalDesc}>Select the subjects this teacher will teach.</Text>
              </View>
              <TouchableOpacity
                onPress={() => !assignSubmitting && setAssignSubjectsModal(false)}
                hitSlop={12}
                style={styles.assignModalClose}
              >
                <SvgIconClose size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.assignSectionLabel}>Available Subjects</Text>
            <ScrollView
              style={styles.assignScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {subjectsList.length === 0 ? (
                <Text style={styles.assignEmpty}>No subjects available. Create subjects first.</Text>
              ) : (
                subjectsList.map((subject) => {
                  const checked = selectedSubjectIds.includes(subject.id);
                  return (
                    <TouchableOpacity
                      key={subject.id}
                      style={styles.assignRow}
                      onPress={() => toggleSubjectId(subject.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.assignCheckWrap}>
                        <SvgCheckbox checked={checked} size={22} />
                      </View>
                      <View style={styles.assignRowText}>
                        <Text style={styles.assignRowTitle}>{subject.name}</Text>
                        <Text style={styles.assignRowSub} numberOfLines={2}>
                          {subject.code ? `${subject.code}` : ''}
                          {subject.code && subject.description ? ' — ' : ''}
                          {subject.description || (subject.code ? '' : '—')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.assignModalFooter}>
              <TouchableOpacity
                style={styles.assignCancelBtn}
                onPress={() => !assignSubmitting && setAssignSubjectsModal(false)}
                disabled={assignSubmitting}
              >
                <Text style={styles.assignCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignPrimaryBtn, assignSubmitting && styles.assignPrimaryBtnDisabled]}
                onPress={handleAssignSubjectsSubmit}
                disabled={assignSubmitting}
              >
                <Text style={styles.assignPrimaryBtnText}>
                  {assignSubmitting ? 'Saving…' : 'Assign Subjects'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Classes */}
      <Modal
        visible={assignClassesModal}
        animationType="fade"
        transparent
        onRequestClose={() => !assignSubmitting && setAssignClassesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.assignModalCard}>
            <View style={styles.assignModalHeader}>
              <View style={styles.assignModalTitleBlock}>
                <Text style={styles.assignModalTitle}>
                  Assign Classes to {assigningForTeacher?.fullName ?? ''}
                </Text>
                <Text style={styles.assignModalDesc}>
                  Select classes to assign to this teacher from the existing classes.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !assignSubmitting && setAssignClassesModal(false)}
                hitSlop={12}
                style={styles.assignModalClose}
              >
                <SvgIconClose size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.assignSectionLabel}>Assign Classes</Text>
            <ScrollView
              style={[styles.assignScroll, styles.assignClassListBorder]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {classesList.length === 0 ? (
                <Text style={styles.assignEmpty}>No classes available. Create classes first.</Text>
              ) : (
                classesList.map((cls) => {
                  const checked = selectedClassIds.includes(cls.id);
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      style={[styles.assignRow, styles.assignRowInList]}
                      onPress={() => toggleClassId(cls.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.assignCheckWrap}>
                        <SvgCheckbox checked={checked} size={22} />
                      </View>
                      <View style={styles.assignRowText}>
                        <Text style={styles.assignRowTitle}>{cls.name}</Text>
                        <Text style={styles.assignRowMeta} numberOfLines={2}>
                          {cls.subjectLabel} • {cls.schedule} • {cls.room}
                        </Text>
                        <Text style={styles.assignRowSub}>{cls.studentCount} students</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.assignModalFooter}>
              <TouchableOpacity
                style={styles.assignCancelBtn}
                onPress={() => !assignSubmitting && setAssignClassesModal(false)}
                disabled={assignSubmitting}
              >
                <Text style={styles.assignCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignPrimaryBtn, assignSubmitting && styles.assignPrimaryBtnDisabled]}
                onPress={handleAssignClassesSubmit}
                disabled={assignSubmitting}
              >
                <Text style={styles.assignPrimaryBtnText}>
                  {assignSubmitting ? 'Saving…' : 'Assign Classes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminTeacherDailyModal
        visible={!!dailyDialogTeacher}
        onClose={() => setDailyDialogTeacher(null)}
        teacherId={dailyDialogTeacher?.id ?? null}
        teacherName={dailyDialogTeacher?.fullName ?? 'Teacher'}
        assignedClasses={
          dailyDialogTeacher ? getAssignedClassOptions(dailyDialogTeacher) : []
        }
      />
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
  },
  addTeacherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addTeacherBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  teacherCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  teacherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  teacherAvatarContainer: {
    position: 'relative',
  },
  teacherAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d9488',
  },
  teacherAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorActive: {
    backgroundColor: '#10b981',
  },
  statusIndicatorInactive: {
    backgroundColor: '#ef4444',
  },
  teacherTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  teacherName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  teacherEmailHint: {
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
  /** Prevents icon font from collapsing to 0×0 in some Android flex layouts */
  detailIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIconWrap: {
    width: 24,
    height: 24,
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
  assignedClassesBlock: {
    marginBottom: 12,
    minHeight: 120,
  },
  assignedClassesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  assignedClassesScroll: {
    maxHeight: 192,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    padding: 8,
  },
  assignedClassCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    minHeight: 72,
  },
  assignedClassCardMissing: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginBottom: 8,
    minHeight: 72,
  },
  assignedClassMissingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  assignedClassName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 20,
  },
  assignedClassSubject: {
    fontWeight: '500',
    color: '#64748b',
  },
  assignedClassMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  assignedClassMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  assignedClassMetaDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noClassesAssignedWrap: {
    paddingVertical: 8,
  },
  noClassesAssigned: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  teacherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  /** Icon-only actions — SVG icons (no font) so glyphs always show on device */
  squircleBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  squircleBtnOrange: {
    borderColor: '#fdba74',
  },
  squircleBtnGreen: {
    borderColor: '#6ee7b7',
  },
  squircleBtnPurple: {
    borderColor: '#a5b4fc',
  },
  squircleBtnRed: {
    borderColor: '#fca5a5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    maxHeight: '78%',
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
  },
  modalBody: {
    padding: 14,
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
  submitButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
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
  assignModalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    padding: 16,
    overflow: 'hidden',
  },
  assignModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  assignModalTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  assignModalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  assignModalDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  assignModalClose: {
    padding: 4,
  },
  assignSectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 4,
  },
  assignScroll: {
    maxHeight: 320,
    marginBottom: 12,
  },
  assignClassListBorder: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
    maxHeight: 280,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    marginBottom: 8,
  },
  assignRowInList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  assignCheckWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  assignRowText: {
    flex: 1,
    minWidth: 0,
  },
  assignRowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  assignRowMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  assignRowSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
  assignEmpty: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 24,
  },
  assignModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  assignCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  assignCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  assignPrimaryBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  assignPrimaryBtnDisabled: {
    opacity: 0.65,
  },
  assignPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});