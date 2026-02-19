import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import HomeworkSubmissionsView from './HomeworkSubmissionsView';

type StudentsSubTab = 'list' | 'track-progress' | 'submissions';

interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  isActive?: boolean;
  lastLogin?: string;
  assignedClass?: {
    classNumber?: string;
    section?: string;
  };
  performance?: {
    overallProgress?: number;
    learningProgress?: number;
    totalExams?: number;
    averageMarks?: number;
    averagePercentage?: number;
  };
}

export default function StudentsView() {
  const [activeSubTab, setActiveSubTab] = useState<StudentsSubTab>('list');
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

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      console.log('[StudentsView] Fetching students...');
      console.log('[StudentsView] API URL:', `${API_BASE_URL}/api/teacher/students`);
      console.log('[StudentsView] Token present:', token ? 'Yes' : 'No');
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[StudentsView] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[StudentsView] Response data:', JSON.stringify(data, null, 2));
        
        const studentsData = data.data || data.students || data || [];
        console.log('[StudentsView] Students data is array:', Array.isArray(studentsData));
        console.log('[StudentsView] Students count:', Array.isArray(studentsData) ? studentsData.length : 0);
        
        const mappedStudents = (Array.isArray(studentsData) ? studentsData : []).map((student: any) => ({
          id: student._id || student.id,
          name: student.fullName || student.name || 'Unknown Student',
          email: student.email || '',
          classNumber: student.classNumber || 'N/A',
          phone: student.phone || '',
          isActive: student.isActive !== false,
          lastLogin: student.lastLogin || null,
          assignedClass: student.assignedClass || null,
          performance: student.performance || {}
        }));
        
        console.log('[StudentsView] Mapped students:', mappedStudents.length);
        setStudents(mappedStudents);
      } else {
        const errorText = await response.text();
        console.error('[StudentsView] Failed to fetch students:', response.status, errorText);
      }
    } catch (error) {
      console.error('[StudentsView] Failed to fetch students (catch):', error);
    } finally {
      setIsLoading(false);
      console.log('[StudentsView] Loading complete');
    }
  };

  const fetchTeacherSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      console.log('[StudentsView] Fetching teacher subjects...');
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[StudentsView] Subjects response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[StudentsView] Subjects data:', JSON.stringify(data, null, 2));
        
        const subjectsData = data.data || data.subjects || data || [];
        setTeacherSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        console.log('[StudentsView] Subjects set:', Array.isArray(subjectsData) ? subjectsData.length : 0);
      } else {
        const errorText = await response.text();
        console.error('[StudentsView] Failed to fetch subjects:', response.status, errorText);
      }
    } catch (error) {
      console.error('[StudentsView] Failed to fetch subjects (catch):', error);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim() || !selectedStudent) return;

    setIsSubmittingRemark(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/students/${selectedStudent.id}/remarks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            remark: remarkText,
            subject: selectedSubjectForRemark !== 'general' ? selectedSubjectForRemark : null,
            isPositive: isPositiveRemark
          })
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Remark added successfully!');
        setIsRemarkModalVisible(false);
        setRemarkText('');
        setSelectedStudent(null);
        setSelectedSubjectForRemark('general');
        setIsPositiveRemark(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.message || 'Failed to add remark');
      }
    } catch (error) {
      console.error('Failed to add remark:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const searchLower = searchTerm.toLowerCase();
    return students.filter(student =>
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      (student.classNumber && student.classNumber.toLowerCase().includes(searchLower))
    );
  }, [students, searchTerm]);

  const renderStudentItem = useCallback(({ item: student }: { item: Student }) => {
    const classDisplay = student.assignedClass
      ? `${student.assignedClass.classNumber || student.classNumber}${student.assignedClass.section ? ` - ${student.assignedClass.section}` : ''}`
      : student.classNumber;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentCardHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentEmail}>{student.email}</Text>
          </View>
          <View style={[styles.statusBadge, student.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{student.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        <View style={styles.studentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{student.phone || 'No phone'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="school" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Class: {classDisplay}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.remarkButton}
          onPress={() => {
            setSelectedStudent(student);
            setIsRemarkModalVisible(true);
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#10b981" />
          <Text style={styles.remarkButtonText}>Add Remark</Text>
        </TouchableOpacity>
      </View>
    );
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'Never';
    try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Sub-Tabs */}
      <View style={styles.subTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsScroll}>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'list' && styles.subTabActive]}
            onPress={() => setActiveSubTab('list')}
          >
            <Ionicons name="people" size={16} color={activeSubTab === 'list' ? '#10b981' : '#6b7280'} />
            <Text style={[styles.subTabText, activeSubTab === 'list' && styles.subTabTextActive]}>
              Student List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'track-progress' && styles.subTabActive]}
            onPress={() => setActiveSubTab('track-progress')}
          >
            <Ionicons name="bar-chart" size={16} color={activeSubTab === 'track-progress' ? '#10b981' : '#6b7280'} />
            <Text style={[styles.subTabText, activeSubTab === 'track-progress' && styles.subTabTextActive]}>
              Track Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'submissions' && styles.subTabActive]}
            onPress={() => setActiveSubTab('submissions')}
          >
            <Ionicons name="document-text" size={16} color={activeSubTab === 'submissions' ? '#10b981' : '#6b7280'} />
            <Text style={[styles.subTabText, activeSubTab === 'submissions' && styles.subTabTextActive]}>
              Submissions
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Student List Tab */}
      {activeSubTab === 'list' && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students by name, email, or phone..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          ) : filteredStudents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              renderItem={renderStudentItem}
              contentContainerStyle={styles.listContent}
              style={styles.list}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
            />
          )}
        </>
      )}

      {/* Track Progress Tab */}
      {activeSubTab === 'track-progress' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.emptySubtext}>Loading progress data...</Text>
            </View>
          ) : filteredStudents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No Students</Text>
              <Text style={styles.emptySubtext}>No students found to track progress</Text>
            </View>
          ) : (
            <View style={styles.progressList}>
              {filteredStudents.map((student) => {
                const perf = student.performance || {};
                const classDisplay = student.assignedClass
                  ? `${student.assignedClass.classNumber || student.classNumber}${student.assignedClass.section || ''}`
                  : student.classNumber;

                return (
                  <View key={student.id} style={styles.studentCard}>
                    <View style={styles.studentCardHeader}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentEmail}>{student.email}</Text>
                      </View>
                      <View style={[styles.statusBadge, student.isActive ? styles.statusActive : styles.statusInactive]}>
                        <Text style={styles.statusText}>{student.isActive ? 'Active' : 'Inactive'}</Text>
                      </View>
                    </View>

                    <View style={styles.studentDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="call" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>{student.phone || 'No phone'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="school" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>Class: {classDisplay}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>Last Login: {formatDate(student.lastLogin || '')}</Text>
                      </View>
                    </View>

                    {perf.overallProgress !== null && perf.overallProgress !== undefined && perf.overallProgress > 0 && (
                      <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Overall Progress</Text>
                          <Text style={[styles.progressValue, {
                            color: perf.overallProgress >= 70 ? '#10b981' :
                                   perf.overallProgress >= 50 ? '#f59e0b' : '#ef4444'
                          }]}>
                            {perf.overallProgress.toFixed(1)}%
                          </Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(perf.overallProgress, 100)}%`,
                                backgroundColor: perf.overallProgress >= 70 ? '#10b981' :
                                                 perf.overallProgress >= 50 ? '#f59e0b' : '#ef4444'
                              }
                            ]}
                          />
                        </View>
                        {perf.totalExams > 0 && (
                          <Text style={styles.progressSubtext}>
                            {perf.totalExams} exam{perf.totalExams !== 1 ? 's' : ''} completed
                          </Text>
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.addRemarkButton}
                      onPress={() => {
                        setSelectedStudent(student);
                        setIsRemarkModalVisible(true);
                      }}
                    >
                      <LinearGradient
                        colors={['#8b5cf6', '#ec4899']}
                        style={styles.addRemarkButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="chatbubble" size={18} color="#fff" />
                        <Text style={styles.addRemarkButtonText}>Add Remark</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
            </ScrollView>
      )}

      {/* Homework Submissions Tab */}
      {activeSubTab === 'submissions' && (
        <HomeworkSubmissionsView />
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
                <Ionicons name="close" size={28} color="#111827" />
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
                  colors={['#8b5cf6', '#ec4899']}
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
    backgroundColor: '#f9fafb',
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
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 16,
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
    color: '#111827',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
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
    color: '#111827',
    marginBottom: 8,
  },
  remarkTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  remarkTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  remarkTypeButtonActive: {
    backgroundColor: '#d1fae5',
  },
  remarkTypeButtonActiveNegative: {
    backgroundColor: '#fee2e2',
  },
  remarkTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  remarkTypeButtonTextActive: {
    color: '#10b981',
  },
  remarkTypeButtonTextActiveNegative: {
    color: '#ef4444',
  },
  subjectSelector: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subjectSelectorText: {
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 120,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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





