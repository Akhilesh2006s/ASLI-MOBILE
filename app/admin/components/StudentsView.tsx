import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  assignedClass?: string;
}

export default function StudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isAdvancedFilterVisible, setIsAdvancedFilterVisible] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    classNumber: '',
    phone: ''
  });
  const [allClasses, setAllClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const classesData = data.data || data || [];
        const uniqueClasses = Array.from(new Set(
          classesData.map((cls: any) => cls.classNumber || cls.name).filter(Boolean)
        ));
        setAllClasses(uniqueClasses);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const studentsData = data.data || data || [];
        const mappedStudents = (Array.isArray(studentsData) ? studentsData : []).map((user: any) => ({
          id: user._id || user.id,
          name: user.fullName || user.name || 'Unknown Student',
          email: user.email || '',
          classNumber: user.classNumber || user.assignedClass?.classNumber || 'N/A',
          phone: user.phone || '',
          status: user.isActive ? 'active' : 'inactive',
          createdAt: user.createdAt || new Date().toISOString(),
          lastLogin: user.lastLogin || null
        }));
        setStudents(mappedStudents);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.classNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: newStudent.name.trim(),
          email: newStudent.email.trim(),
          classNumber: newStudent.classNumber.trim(),
          phone: newStudent.phone.trim(),
          password: 'Password123'
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Student added successfully! Default password: Password123');
        setNewStudent({ name: '', email: '', classNumber: '', phone: '' });
        setIsAddModalVisible(false);
        fetchStudents();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to add student');
      }
    } catch (error) {
      console.error('Failed to add student:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/students/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                Alert.alert('Success', 'Student deleted successfully');
                fetchStudents();
              } else {
                Alert.alert('Error', 'Failed to delete student');
              }
            } catch (error) {
              console.error('Failed to delete student:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm || 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.classNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = selectedClassFilter === 'all' || 
        student.classNumber === selectedClassFilter;
      
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClassFilter]);

  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active').length;
    const uniqueClasses = new Set(students.map(s => s.classNumber)).size;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = students.filter(s => {
      const created = new Date(s.createdAt);
      return created >= thisMonth;
    }).length;

    return {
      total: students.length,
      active: activeStudents,
      classes: uniqueClasses,
      newThisMonth
    };
  }, [students]);

  const renderStudentCard = useCallback(({ item: student }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentCardContent}>
        <View style={styles.studentHeader}>
          <View style={styles.studentAvatarContainer}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.studentAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.studentAvatarText}>
                {(student.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={[
              styles.statusIndicator,
              student.status === 'active' ? styles.statusIndicatorActive : styles.statusIndicatorInactive
            ]}>
              <Ionicons
                name={student.status === 'active' ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color="#fff"
              />
            </View>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name || 'Unknown Student'}</Text>
            <Text style={styles.studentEmail}>{student.email || 'No email'}</Text>
            <View style={styles.classBadge}>
              <Ionicons name="school" size={12} color="#0ea5e9" />
              <Text style={styles.classBadgeText}>Class {student.classNumber || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.studentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="mail" size={16} color="#0ea5e9" />
            <Text style={styles.detailText} numberOfLines={1}>{student.email || 'No email'}</Text>
          </View>
          {student.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call" size={16} color="#0ea5e9" />
              <Text style={styles.detailText}>{student.phone}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#0ea5e9" />
            <Text style={styles.detailText}>
              Last login: {student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}
            </Text>
          </View>
        </View>

        <View style={styles.studentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteStudent(student.id, student.name)}
          >
            <Ionicons name="trash" size={18} color="#ef4444" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.assignButton}>
            <Ionicons name="school" size={16} color="#0ea5e9" />
            <Text style={styles.assignButtonText}>Assign Class</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), []);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#a78bfa', '#8b5cf6']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={24} color="#fff" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statLabel}>Total Students</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statSubtext}>+12% this month</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statLabel}>Active Students</Text>
                <Text style={styles.statValue}>{stats.active}</Text>
                <View style={styles.statSubtextRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statSubtext}>Online now</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#f97316', '#ea580c']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statIcon}>
                <Ionicons name="school" size={24} color="#fff" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statLabel}>Active Classes</Text>
                <Text style={styles.statValue}>{stats.classes}</Text>
                <Text style={styles.statSubtext}>Classes running</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up" size={24} color="#fff" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statLabel}>New This Month</Text>
                <Text style={styles.statValue}>{stats.newThisMonth}</Text>
                <Text style={styles.statSubtext}>+25% growth</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students by name, email, or class..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBarButton, styles.filterButton]}
            onPress={() => setIsAdvancedFilterVisible(true)}
          >
            <Ionicons name="filter" size={16} color="#fff" />
            <Text style={styles.actionBarButtonText}>Filter</Text>
            {selectedClassFilter !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{selectedClassFilter}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBarButton, styles.exportButton]}
            onPress={() => Alert.alert('Export', 'Export functionality coming soon')}
          >
            <Ionicons name="download" size={16} color="#fff" />
            <Text style={styles.actionBarButtonText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBarButton, styles.uploadButton]}
            onPress={() => Alert.alert('Upload CSV', 'CSV upload functionality coming soon')}
          >
            <Ionicons name="cloud-upload" size={16} color="#fff" />
            <Text style={styles.actionBarButtonText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBarButton, styles.addButton]}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.actionBarButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Students Directory */}
      <View style={styles.directoryContainer}>
        <View style={styles.directoryHeader}>
          <View>
            <Text style={styles.directoryTitle}>Students Directory</Text>
            <Text style={styles.directorySubtitle}>{filteredStudents.length} students found</Text>
          </View>
          <TouchableOpacity
            style={styles.exportDataButton}
            onPress={() => Alert.alert('Export Data', 'Export functionality coming soon')}
          >
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={styles.exportDataButtonText}>Export Data</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color="#0ea5e9" />
            </View>
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search criteria or add new students</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add First Student</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {filteredStudents.map((student) => renderStudentCard({ item: student }))}
          </View>
        )}
      </View>

      {/* Advanced Filter Modal */}
      <Modal
        visible={isAdvancedFilterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAdvancedFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filter</Text>
              <TouchableOpacity onPress={() => setIsAdvancedFilterVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Class</Text>
                <ScrollView style={styles.classFilterList}>
                  <TouchableOpacity
                    style={[
                      styles.classFilterItem,
                      selectedClassFilter === 'all' && styles.classFilterItemActive
                    ]}
                    onPress={() => setSelectedClassFilter('all')}
                  >
                    <Text style={[
                      styles.classFilterText,
                      selectedClassFilter === 'all' && styles.classFilterTextActive
                    ]}>All Classes</Text>
                  </TouchableOpacity>
                  {allClasses.map((classNum) => (
                    <TouchableOpacity
                      key={classNum}
                      style={[
                        styles.classFilterItem,
                        selectedClassFilter === classNum && styles.classFilterItemActive
                      ]}
                      onPress={() => setSelectedClassFilter(classNum)}
                    >
                      <Text style={[
                        styles.classFilterText,
                        selectedClassFilter === classNum && styles.classFilterTextActive
                      ]}>{classNum}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedClassFilter('all');
                  setIsAdvancedFilterVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setIsAdvancedFilterVisible(false)}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.applyButtonText}>Apply Filter</Text>
                </LinearGradient>
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
                <Ionicons name="close" size={24} color="#111827" />
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
              <View style={styles.formGroup}>
                <Text style={styles.label}>Class Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10, 11, 12"
                  value={newStudent.classNumber}
                  onChangeText={(text) => setNewStudent({ ...newStudent, classNumber: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={newStudent.phone}
                  onChangeText={(text) => setNewStudent({ ...newStudent, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Default Password</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value="Password123"
                  editable={false}
                />
                <Text style={styles.helperText}>This is the default password for all new students</Text>
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
                onPress={handleAddStudent}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    minHeight: 0,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    padding: 20,
    minHeight: 120,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  statSubtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  actionBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    position: 'relative',
  },
  filterButton: {
    backgroundColor: '#3b82f6',
  },
  exportButton: {
    backgroundColor: '#fb923c',
  },
  uploadButton: {
    backgroundColor: '#10b981',
  },
  addButton: {
    backgroundColor: '#fb923c',
  },
  actionBarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  directoryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  directoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    backgroundColor: '#fff',
  },
  directoryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0c4a6e',
  },
  directorySubtitle: {
    fontSize: 14,
    color: '#075985',
    marginTop: 4,
  },
  exportDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  exportDataButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  studentsList: {
    padding: 16,
    gap: 16,
  },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#bae6fd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  studentCardContent: {
    padding: 16,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  studentAvatarContainer: {
    position: 'relative',
  },
  studentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  studentAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorActive: {
    backgroundColor: '#10b981',
  },
  statusIndicatorInactive: {
    backgroundColor: '#9ca3af',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#075985',
    marginBottom: 8,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
  },
  studentDetails: {
    gap: 12,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#075985',
    flex: 1,
  },
  studentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
  },
  actionButton: {
    padding: 8,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    gap: 6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    backgroundColor: '#e0f2fe',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#075985',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#0c4a6e',
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
    color: '#075985',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0c4a6e',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  disabledInput: {
    backgroundColor: '#e0f2fe',
    color: '#075985',
  },
  helperText: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 4,
  },
  classFilterList: {
    maxHeight: 200,
  },
  classFilterItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  classFilterItemActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0284c7',
  },
  classFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075985',
  },
  classFilterTextActive: {
    color: '#fff',
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
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075985',
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
});