import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import HomeworkSubmissionsView from './HomeworkSubmissionsView';
import TrackProgressView from './TrackProgressView';
import WorkDiaryView from './WorkDiaryView';
import { SubNavChips, StudentListCard } from '../../../src/components/teacher';
import { mergeStudentsWithPerformance, type StudentRow } from '../../../src/lib/students-ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../../src/theme/teacher';

type StudentsSubTab = 'list' | 'track-progress' | 'submissions' | 'daily' | 'remarks';

const STUDENT_SUB_TABS = [
  { id: 'list', label: 'Student List', icon: 'people' as const },
  { id: 'track-progress', label: 'Track Progress', icon: 'bar-chart' as const },
  { id: 'submissions', label: 'Submissions', icon: 'document-text' as const },
  { id: 'daily', label: 'Daily', icon: 'bookmark' as const },
];

type Props = {
  initialSubTab?: StudentsSubTab;
  progressClassFilter?: string;
  progressStudentId?: string;
};

interface Student extends StudentRow {
  performance?: StudentRow['performance'];
}

export default function StudentsView({ initialSubTab, progressClassFilter, progressStudentId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<StudentsSubTab>(initialSubTab || 'list');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRemarkModalVisible, setIsRemarkModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [isPositiveRemark, setIsPositiveRemark] = useState(true);
  const [selectedSubjectForRemark, setSelectedSubjectForRemark] = useState('general');
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchTeacherSubjects();
  }, []);

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const [studentsRes, perfRes] = await Promise.all([
        teacherService.students(),
        teacherService.studentsPerformance().catch(() => ({ data: [] as any[] })),
      ]);
      const studentsData = studentsRes.data ?? [];
      const perfData = perfRes.data ?? [];
      setStudents(mergeStudentsWithPerformance(
        Array.isArray(studentsData) ? studentsData : [],
        Array.isArray(perfData) ? perfData : []
      ));
    } catch {
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeacherSubjects = async () => {
    try {
      const res = await teacherService.subjects();
      setTeacherSubjects(asArray(res.data));
    } catch (error) {
      console.error('[StudentsView] Failed to fetch subjects:', error);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim() || !selectedStudent) return;

    setIsSubmittingRemark(true);
    try {
      await teacherService.sendRemark(selectedStudent.id, {
        remark: remarkText,
        subject: selectedSubjectForRemark !== 'general' ? selectedSubjectForRemark : null,
        isPositive: isPositiveRemark,
      });
      Alert.alert('Success', 'Remark added successfully!');
      setIsRemarkModalVisible(false);
      setRemarkText('');
      setSelectedStudent(null);
      setSelectedSubjectForRemark('general');
      setIsPositiveRemark(true);
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const searchLower = searchTerm.toLowerCase();
    return students.filter((student) =>
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      (student.phone && student.phone.toLowerCase().includes(searchLower)) ||
      (student.classNumber && student.classNumber.toLowerCase().includes(searchLower))
    );
  }, [students, searchTerm]);

  const renderStudentItem = useCallback(({ item: student, index }: { item: Student; index: number }) => (
    <Animated.View entering={FadeInDown.duration(350).delay(Math.min(index * 50, 400))}>
      <StudentListCard
        student={student}
        onAddRemark={() => {
          setSelectedStudent(student);
          setIsRemarkModalVisible(true);
        }}
      />
    </Animated.View>
  ), []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'Never';
    try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const listHeader = (
    <>
      <SubNavChips
        items={STUDENT_SUB_TABS}
        active={activeSubTab}
        onChange={(id) => setActiveSubTab(id as StudentsSubTab)}
        variant="students"
      />
      <View style={styles.countHeader}>
        <Text style={styles.countTitle}>{filteredStudents.length} Students</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{students.length}</Text>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name, email, or phone..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor={TEACHER.textMuted}
        />
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {activeSubTab === 'list' ? (
        isLoading ? (
          <>
            {listHeader}
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={TEACHER.primary} />
            </View>
          </>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            renderItem={renderStudentItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.emptyIconCircle}>
                  <Ionicons name="people-outline" size={36} color="#fff" />
                </LinearGradient>
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            style={styles.list}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        <>
          <SubNavChips
            items={STUDENT_SUB_TABS}
            active={activeSubTab}
            onChange={(id) => setActiveSubTab(id as StudentsSubTab)}
            variant="students"
          />
          <View style={styles.subTabBody}>
            {activeSubTab === 'track-progress' && (
              <TrackProgressView
                initialClassFilter={progressClassFilter}
                initialStudentId={progressStudentId}
              />
            )}
            {activeSubTab === 'submissions' && <HomeworkSubmissionsView />}
            {activeSubTab === 'daily' && <WorkDiaryView />}
          </View>
        </>
      )}

      {/* Add Remark Modal */}
      <Modal
        visible={isRemarkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRemarkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add Remark for {selectedStudent?.name}
              </Text>
              <TouchableOpacity onPress={() => setIsRemarkModalVisible(false)}>
                <Ionicons name="close" size={28} color={TEACHER.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Remark Type</Text>
                <View style={styles.remarkTypeButtons}>
                  <TouchableOpacity
                    style={[styles.remarkTypeButton, isPositiveRemark && styles.remarkTypeButtonActive]}
                    onPress={() => setIsPositiveRemark(true)}
                  >
                    <Text style={[styles.remarkTypeButtonText, isPositiveRemark && styles.remarkTypeButtonTextActive]}>
                      Positive
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.remarkTypeButton, !isPositiveRemark && styles.remarkTypeButtonActiveNegative]}
                    onPress={() => setIsPositiveRemark(false)}
                  >
                    <Text style={[styles.remarkTypeButtonText, !isPositiveRemark && styles.remarkTypeButtonTextActiveNegative]}>
                      Needs Improvement
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject (Optional)</Text>
                <View style={styles.subjectSelector}>
                  <Text style={styles.subjectSelectorText}>
                    {selectedSubjectForRemark === 'general' 
                      ? 'General Remark' 
                      : teacherSubjects.find(s => (s._id || s.id) === selectedSubjectForRemark)?.name || 'General Remark'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Remark *</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Enter your remark here..."
                  value={remarkText}
                  onChangeText={setRemarkText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsRemarkModalVisible(false);
                  setRemarkText('');
                  setSelectedStudent(null);
                  setSelectedSubjectForRemark('general');
                  setIsPositiveRemark(true);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddRemark}
                disabled={isSubmittingRemark || !remarkText.trim()}
              >
                <LinearGradient
                  colors={[TEACHER.primary, TEACHER.primaryDark]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmittingRemark ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Remark</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TEACHER.bg,
  },
  countHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
  },
  countTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  countBadge: {
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: TEACHER.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subTabsScroll: {
    paddingHorizontal: 20,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  subTabActive: {
    backgroundColor: '#d1fae5',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  subTabTextActive: {
    color: '#10b981',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.pill,
    paddingHorizontal: 16,
    height: 46,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: TEACHER.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
    flexGrow: 1,
  },
  subTabBody: {
    flex: 1,
    minHeight: 0,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  studentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  remarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  remarkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  addRemarkButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addRemarkButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  addRemarkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEACHER.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.40)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  modalTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
    marginBottom: 8,
  },
  remarkTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  remarkTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
  },
  remarkTypeButtonActive: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: TEACHER.success,
  },
  remarkTypeButtonActiveNegative: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: TEACHER.danger,
  },
  remarkTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
  remarkTypeButtonTextActive: {
    color: TEACHER.success,
  },
  remarkTypeButtonTextActiveNegative: {
    color: TEACHER.danger,
  },
  subjectSelector: {
    backgroundColor: TEACHER.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  subjectSelectorText: {
    fontSize: 16,
    color: TEACHER.text,
  },
  textArea: {
    backgroundColor: TEACHER.surface,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: TEACHER.text,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    minHeight: 120,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  progressList: {
    padding: 20,
    gap: 16,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  studentClass: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  progressMetrics: {
    gap: 16,
  },
  metricItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
});





