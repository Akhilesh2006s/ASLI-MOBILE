import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

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
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const classesData = Array.isArray(data) ? data : (data.data || []);
        const mappedClasses = classesData.map((cls: any) => ({
          id: cls._id || cls.id,
          name: cls.name || `${cls.classNumber}${cls.section ? ` - ${cls.section}` : ''}`,
          classNumber: cls.classNumber || 'N/A',
          section: cls.section || '',
          description: cls.description || '',
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
      }
    } catch (error) {
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
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClass)
      });

      if (response.ok) {
        setNewClass({ classNumber: '', section: '', description: '' });
        setIsAddClassModalVisible(false);
        fetchClasses();
        Alert.alert('Success', 'Class added successfully!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to add class');
      }
    } catch (error) {
      console.error('Failed to add class:', error);
      Alert.alert('Error', 'Failed to add class. Please try again.');
    }
  };

  const renderClassCard = useCallback(({ item: cls }: { item: Class }) => {
    const isExpanded = expandedClassId === cls.id;
    
    return (
      <View style={[styles.classCard, isExpanded && styles.classCardExpanded]}>
        <TouchableOpacity
          onPress={() => setExpandedClassId(isExpanded ? null : cls.id)}
          activeOpacity={0.7}
        >
          <View style={styles.classHeader}>
            <View style={styles.classIconContainer}>
              <LinearGradient
                colors={['#7dd3fc', '#38bdf8']}
                style={styles.classIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="school" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <View style={styles.classInfo}>
              <Text style={styles.className}>{cls.name}</Text>
              {cls.description && (
                <Text style={styles.classDescription}>{cls.description}</Text>
              )}
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
            </View>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#0ea5e9" 
            />
          </View>
        </TouchableOpacity>

        <View style={styles.classStats}>
          <View style={styles.statRow}>
            <Ionicons name="people" size={16} color="#0ea5e9" />
            <Text style={styles.statLabel}>Students:</Text>
            <Text style={styles.statValue}>{cls.studentCount || 0}</Text>
          </View>
          {cls.teachers && cls.teachers.length > 0 && (
            <View style={styles.statRow}>
              <Ionicons name="person-add" size={16} color="#0ea5e9" />
              <Text style={styles.statLabel}>Teachers:</Text>
              <Text style={styles.statValue}>{cls.teachers.length}</Text>
            </View>
          )}
          {cls.assignedSubjects && cls.assignedSubjects.length > 0 && (
            <View style={styles.statRow}>
              <Ionicons name="book" size={16} color="#0ea5e9" />
              <Text style={styles.statLabel}>Subjects:</Text>
              <Text style={styles.statValue}>{cls.assignedSubjects.length}</Text>
            </View>
          )}
        </View>

        {isExpanded && (
          <>
            {/* Teachers List */}
            {cls.teachers && cls.teachers.length > 0 && (
              <View style={styles.teachersList}>
                <Text style={styles.listTitle}>Assigned Teachers:</Text>
                {cls.teachers.map((teacher: any, idx: number) => (
                  <View key={idx} style={styles.teacherItem}>
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

            {/* Students List */}
            <View style={styles.studentsList}>
              <Text style={styles.listTitle}>Students List:</Text>
              {cls.students && cls.students.length > 0 ? (
                <View style={styles.studentsContainer}>
                  {cls.students.map((student: Student) => (
                    <View key={student.id} style={styles.studentItem}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        {student.email && (
                          <Text style={styles.studentEmail}>{student.email}</Text>
                        )}
                      </View>
                      <View style={[
                        styles.studentStatusBadge,
                        student.status === 'active' ? styles.studentStatusActive : styles.studentStatusInactive
                      ]}>
                        <Text style={styles.studentStatusText}>
                          {student.status || 'active'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
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
                  <View key={idx} style={styles.subjectItem}>
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
      showsVerticalScrollIndicator={true}
    >
      {/* Hero Section with Stats */}
      <LinearGradient
        colors={['#e0f2fe', '#f0f9ff', '#f0fdfa']}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
          <View>
              <Text style={styles.heroTitle}>Class Management</Text>
              <Text style={styles.heroSubtitle}>Organize and manage your classes and students</Text>
            </View>
            <View style={styles.heroIcon}>
              <LinearGradient
                colors={['#7dd3fc', '#38bdf8']}
                style={styles.heroIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="school" size={32} color="#fff" />
              </LinearGradient>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#fdba74', '#fb923c']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="school" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Total Classes</Text>
                    <Text style={styles.statCardValue}>{classes.length}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#7dd3fc', '#38bdf8']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="people" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Total Students</Text>
                    <Text style={styles.statCardValue}>{totalStudents}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#2dd4bf', '#14b8a6']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="stats-chart" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Avg. Class Size</Text>
                    <Text style={styles.statCardValue}>{avgClassSize}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#fdba74', '#fb923c']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="book" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Subjects</Text>
                    <Text style={styles.statCardValue}>{classSubjects.length}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
      </View>
      </LinearGradient>

      {/* Action Bar */}
      <View style={styles.actionBar}>
      <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#0ea5e9" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search classes..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddClassModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Class</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : filteredClasses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No classes found</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {filteredClasses.map((cls) => renderClassCard({ item: cls }))}
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
            <LinearGradient
              colors={['#fb923c', '#f97316']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.modalTitle}>Add New Class</Text>
              <TouchableOpacity onPress={() => setIsAddClassModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

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
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.submitButtonText}>Add Class</Text>
                </LinearGradient>
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
    backgroundColor: '#f0f9ff',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  heroSection: {
    padding: 20,
    paddingTop: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    gap: 20,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0ea5e9',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  heroIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGradient: {
    padding: 16,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statCardText: {
    flex: 1,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  classCardExpanded: {
    borderColor: '#0ea5e9',
    borderWidth: 2,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  classIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  classIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0ea5e9',
    marginBottom: 4,
  },
  classDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  classStats: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
    marginBottom: 8,
  },
  teachersList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    marginBottom: 8,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  studentsContainer: {
    gap: 8,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
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
    padding: 16,
    alignItems: 'center',
  },
  noStudentsText: {
    fontSize: 14,
    color: '#0ea5e9',
    textAlign: 'center',
  },
  subjectsList: {
    marginTop: 12,
    paddingTop: 12,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
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
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});