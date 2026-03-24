import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';

interface Student {
  id: string;
  name: string;
  email: string;
  status?: 'active' | 'inactive';
}

interface Class {
  id: string;
  name: string;
  classNumber: string;
  section?: string;
  description?: string;
  schedule?: string;
  room?: string;
  studentCount: number;
  students?: Student[];
  teachers?: any[];
  assignedSubjects?: any[];
  createdAt: string;
}

export default function ClassesView() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [isAddClassModalVisible, setIsAddClassModalVisible] = useState(false);
  const [newClass, setNewClass] = useState({
    classNumber: '',
    section: '',
    description: ''
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = Array.isArray(data) ? data : (data?.data || []);
      const mappedClasses = classesData.map((cls: any) => ({
        id: cls._id || cls.id,
        name: cls.name || `${cls.classNumber}${cls.section ? ` - ${cls.section}` : ''}`,
        classNumber: cls.classNumber || 'N/A',
        section: cls.section || '',
        description: cls.description || '',
        schedule: cls.schedule || 'Mon–Fri 9:00 AM',
        room: cls.room || (cls.classNumber ? `Room ${cls.classNumber}${cls.section || ''}` : '—'),
        studentCount: cls.students?.length || cls.studentCount || 0,
        students: (cls.students || []).map((student: any) => ({
          id: student._id || student.id,
          name: student.fullName || student.name || 'Unknown Student',
          email: student.email || '',
          status: student.isActive !== false ? 'active' : 'inactive'
        })),
        teachers: cls.teachers || [],
        assignedSubjects: cls.assignedSubjects || [],
        createdAt: cls.createdAt || new Date().toISOString()
      }));
      setClasses(mappedClasses);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredClasses = useMemo(() => {
    let filtered = classes;
    
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(cls =>
        cls.name.toLowerCase().includes(query) ||
        cls.classNumber.toLowerCase().includes(query) ||
        cls.section?.toLowerCase().includes(query)
      );
    }
    
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(cls => 
        cls.assignedSubjects?.some((subj: any) => 
          (subj.name || subj.id || subj._id) === selectedSubject
        )
      );
    }
    
    return filtered;
  }, [classes, searchTerm, selectedSubject]);

  const totalStudents = useMemo(() => 
    classes.reduce((sum, cls) => sum + cls.studentCount, 0), 
    [classes]
  );

  const avgClassSize = useMemo(() => 
    classes.length > 0 ? Math.round(totalStudents / classes.length) : 0,
    [classes.length, totalStudents]
  );

  const classSubjects = useMemo(() => 
    Array.from(new Set(
      classes.flatMap(cls => 
        cls.assignedSubjects?.map((subj: any) => subj.name || subj.id || subj._id) || []
      )
    )),
    [classes]
  );

  const handleAddClass = async () => {
    if (!newClass.classNumber.trim()) {
      Alert.alert('Error', 'Please enter a class number');
      return;
    }

    try {
      await api.post('/api/admin/classes', newClass);
      setNewClass({ classNumber: '', section: '', description: '' });
      setIsAddClassModalVisible(false);
      fetchClasses();
      Alert.alert('Success', 'Class added successfully!');
    } catch (error: any) {
      console.error('Failed to add class:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Failed to add class. Please try again.');
    }
  };

  const renderClassCard = useCallback(({ item: cls }: { item: Class }) => {
    const isExpanded = expandedClassId === cls.id;
    const subtitle = cls.description?.trim() || 'Auto-created from CSV upload';

    const teacherSummary =
      cls.teachers && cls.teachers.length > 0
        ? String(cls.teachers.length)
        : 'No teachers assigned';

    /** One line per field: icon + label (left) · value (right) */
    const DetailRow = ({
      icon,
      label,
      value,
      valueMuted,
    }: {
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      value: string;
      valueMuted?: boolean;
    }) => (
      <View style={styles.detailRow}>
        <View style={styles.detailRowLeft}>
          <Ionicons name={icon} size={18} color="#64748b" />
          <Text style={styles.detailLabelInline} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text
          style={[styles.detailValueInline, valueMuted && styles.detailValueMuted]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>
      </View>
    );

    return (
      <View style={[styles.classCard, isExpanded && styles.classCardExpanded]}>
        <TouchableOpacity
          onPress={() => setExpandedClassId(isExpanded ? null : cls.id)}
          activeOpacity={0.7}
        >
          <View style={styles.classHeader}>
            <View style={styles.classIconContainer}>
              <View style={styles.classIcon}>
                <Ionicons name="school" size={20} color="#fff" />
              </View>
            </View>
            <View style={styles.classInfo}>
              <Text style={styles.className} numberOfLines={3}>
                {cls.name}
              </Text>
              <Text style={styles.classDescription} numberOfLines={3}>
                {subtitle}
              </Text>
            </View>
            <View style={styles.classHeaderRight}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#0d9488"
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* One row each: Students | Teachers | Schedule | Room | Section */}
        <View style={styles.detailRows}>
          <DetailRow icon="people-outline" label="Students:" value={String(cls.studentCount ?? 0)} />
          <DetailRow
            icon="person-add-outline"
            label="Teachers:"
            value={teacherSummary}
            valueMuted={!cls.teachers?.length}
          />
          <DetailRow icon="calendar-outline" label="Schedule:" value={cls.schedule || '—'} />
          <DetailRow icon="book-outline" label="Room:" value={cls.room || '—'} />
          <DetailRow
            icon="school-outline"
            label="Section:"
            value={cls.section?.trim() ? cls.section : '—'}
          />
        </View>

        {isExpanded && (
          <>
            {/* Teachers List */}
            {cls.teachers && cls.teachers.length > 0 && (
              <View style={styles.teachersList}>
                <Text style={styles.listTitle}>Assigned Teachers:</Text>
                {cls.teachers.map((teacher: any, idx: number) => (
                  <View
                    key={String(teacher._id || teacher.id || teacher.email || `t-${idx}`)}
                    style={styles.teacherItem}
                  >
                    <View style={styles.teacherAvatar}>
                      <Text style={styles.teacherAvatarText}>
                        {(teacher.name || teacher.fullName || 'T').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.teacherInfo}>
                      <Text style={styles.teacherName}>
                        {teacher.name || teacher.fullName || 'Unknown Teacher'}
                      </Text>
                      {teacher.email && (
                        <Text style={styles.teacherEmail}>{teacher.email}</Text>
                      )}
                    </View>
                    <View style={styles.teacherBadge}>
                      <Text style={styles.teacherBadgeText}>Teacher</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Students List — bounded height so long rosters scroll inside the card */}
            <View style={styles.studentsList}>
              <View style={styles.studentsListHeader}>
                <Text style={styles.listTitle}>Students list</Text>
                <Text style={styles.studentsCountHint}>
                  {cls.students?.length ?? 0} total
                </Text>
              </View>
              {cls.students && cls.students.length > 0 ? (
                <ScrollView
                  style={styles.studentsScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.studentsContainer}>
                    {cls.students.map((student: Student, sIdx: number) => (
                      <View
                        key={String(student.id ?? student.email ?? `s-${sIdx}`)}
                        style={styles.studentItem}
                      >
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName} numberOfLines={2}>
                            {student.name}
                          </Text>
                          {student.email ? (
                            <Text style={styles.studentEmail} numberOfLines={2}>
                              {student.email}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.studentStatusBadge,
                            student.status === 'active'
                              ? styles.studentStatusActive
                              : styles.studentStatusInactive,
                          ]}
                        >
                          <Text style={styles.studentStatusText} numberOfLines={1}>
                            {student.status || 'active'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.noStudentsContainer}>
                  <Text style={styles.noStudentsText}>No students assigned to this class</Text>
                </View>
              )}
            </View>

            {/* Assigned Subjects */}
            {cls.assignedSubjects && cls.assignedSubjects.length > 0 && (
              <View style={styles.subjectsList}>
                <Text style={styles.listTitle}>Assigned Subjects:</Text>
                {cls.assignedSubjects.map((subj: any, idx: number) => (
                  <View
                    key={String(subj._id || subj.id || subj.name || `subj-${idx}`)}
                    style={styles.subjectItem}
                  >
                    <Ionicons name="bookmark" size={14} color="#0ea5e9" />
                    <Text style={styles.subjectName}>
                      {subj.name || subj.id || subj._id || 'Unknown Subject'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  }, [expandedClassId]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {/* Intro + summary tiles (matches Students / admin style) */}
      <View style={styles.pageIntro}>
        <Text style={styles.pageTitle}>Class Management</Text>
        <Text style={styles.pageSubtitle}>Organize and manage your classes and students</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.summaryTile, { borderLeftColor: '#fb923c' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="school" size={18} color="#ea580c" />
          </View>
          <Text style={styles.summaryTileLabel}>Classes</Text>
          <Text style={styles.summaryTileValue}>{classes.length}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#38bdf8' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="people" size={18} color="#0284c7" />
          </View>
          <Text style={styles.summaryTileLabel}>Students</Text>
          <Text style={styles.summaryTileValue}>{totalStudents}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#14b8a6' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f0fdfa' }]}>
            <Ionicons name="stats-chart" size={18} color="#0d9488" />
          </View>
          <Text style={styles.summaryTileLabel}>Avg size</Text>
          <Text style={styles.summaryTileValue}>{avgClassSize}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#a855f7' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f5f3ff' }]}>
            <Ionicons name="book-outline" size={18} color="#7c3aed" />
          </View>
          <Text style={styles.summaryTileLabel}>Subjects</Text>
          <Text style={styles.summaryTileValue}>{classSubjects.length}</Text>
        </View>
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes by name or section…"
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity
          style={styles.addClassBtn}
          onPress={() => setIsAddClassModalVisible(true)}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addClassBtnText}>Add class</Text>
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : filteredClasses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="school-outline" size={48} color="#0d9488" />
          </View>
          <Text style={styles.emptyText}>No classes found</Text>
          <Text style={styles.emptyHint}>Try a different search or add a new class.</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {filteredClasses.map((cls, index) => (
            <Fragment key={String(cls.id ?? cls.classNumber ?? cls.name ?? `class-${index}`)}>
              {renderClassCard({ item: cls })}
            </Fragment>
          ))}
        </View>
      )}

      {/* Add Class Modal */}
      <Modal
        visible={isAddClassModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddClassModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Class</Text>
              <TouchableOpacity onPress={() => setIsAddClassModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Class Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 10, 11, 12"
                  value={newClass.classNumber}
                  onChangeText={(text) => setNewClass({ ...newClass, classNumber: text })}
                  placeholderTextColor="#9ca3af"
                />
                </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Section</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., A, B, C"
                  value={newClass.section}
                  onChangeText={(text) => setNewClass({ ...newClass, section: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Optional description"
                  value={newClass.description}
                  onChangeText={(text) => setNewClass({ ...newClass, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddClassModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddClass}
                activeOpacity={0.88}
              >
                <Text style={styles.submitButtonText}>Add Class</Text>
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
  },
  addClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addClassBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  classCard: {
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
  classCardExpanded: {
    borderColor: '#5eead4',
    borderWidth: 1,
    shadowOpacity: 0.1,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  classIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  classIcon: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
    minWidth: 0,
  },
  classHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  classDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  detailRows: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 4,
    minWidth: 0,
    paddingRight: 6,
  },
  detailLabelInline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    minWidth: 0,
  },
  detailValueInline: {
    flex: 5,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  detailValueMuted: {
    color: '#0d9488',
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 0,
  },
  studentsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  studentsCountHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  studentsScroll: {
    maxHeight: 280,
  },
  teachersList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  teacherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
    marginBottom: 2,
  },
  teacherEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  teacherBadge: {
    backgroundColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teacherBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  studentsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  studentsContainer: {
    gap: 8,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  studentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  studentStatusActive: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  studentStatusInactive: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  studentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  noStudentsContainer: {
    padding: 12,
    alignItems: 'center',
  },
  noStudentsText: {
    fontSize: 14,
    color: '#0ea5e9',
    textAlign: 'center',
  },
  subjectsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  subjectName: {
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0d9488',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
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
    borderRadius: 12,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});