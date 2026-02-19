import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  qualifications?: string;
  subjects?: any[];
  isActive: boolean;
  createdAt: string;
}

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

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const teachersData = Array.isArray(data) ? data : (data.data || data.teachers || []);
        const mappedTeachers = teachersData.map((teacher: any) => ({
          id: teacher._id || teacher.id,
          fullName: teacher.fullName || 'Unknown Teacher',
          email: teacher.email || '',
          phone: teacher.phone || '',
          department: teacher.department || '',
          qualifications: teacher.qualifications || '',
          subjects: teacher.subjects || [],
          isActive: teacher.isActive !== false,
          createdAt: teacher.createdAt || new Date().toISOString()
        }));
        setTeachers(mappedTeachers);
      }
    } catch (error) {
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
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeacher)
      });

      if (response.ok) {
        setNewTeacher({ fullName: '', email: '', phone: '', department: '', qualifications: '' });
        setIsAddModalVisible(false);
        fetchTeachers();
        Alert.alert('Success', 'Teacher added successfully!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to add teacher');
      }
    } catch (error) {
      console.error('Failed to add teacher:', error);
      Alert.alert('Error', 'Failed to add teacher. Please try again.');
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
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editTeacher)
      });

      if (response.ok) {
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
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update teacher');
      }
    } catch (error) {
      console.error('Failed to update teacher:', error);
      Alert.alert('Error', 'Failed to update teacher. Please try again.');
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
              const token = await SecureStore.getItemAsync('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${teacherId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                fetchTeachers();
                Alert.alert('Success', `${teacherName} has been deleted successfully.`);
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to delete teacher');
              }
            } catch (error) {
              console.error('Failed to delete teacher:', error);
              Alert.alert('Error', 'Failed to delete teacher. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderTeacherCard = useCallback(({ item: teacher }: { item: Teacher }) => (
    <View style={styles.teacherCard}>
      <View style={styles.teacherHeader}>
        <View style={styles.teacherAvatarContainer}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.teacherAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.teacherAvatarText}>
              {(teacher.fullName || 'T').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={[
            styles.statusIndicator,
            teacher.isActive ? styles.statusIndicatorActive : styles.statusIndicatorInactive
          ]}>
            <Ionicons
              name={teacher.isActive ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color="#fff"
            />
          </View>
        </View>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{teacher.fullName}</Text>
          <Text style={styles.teacherEmail}>{teacher.email}</Text>
          {teacher.department && (
            <View style={styles.departmentBadge}>
              <Ionicons name="business" size={12} color="#0ea5e9" />
              <Text style={styles.departmentText}>{teacher.department}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.teacherDetails}>
        {teacher.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color="#0ea5e9" />
            <Text style={styles.detailText}>{teacher.phone}</Text>
          </View>
        )}
        {teacher.qualifications && (
          <View style={styles.detailRow}>
            <Ionicons name="school" size={16} color="#0ea5e9" />
            <Text style={styles.detailText}>{teacher.qualifications}</Text>
          </View>
        )}
        {teacher.subjects && teacher.subjects.length > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="book" size={16} color="#0ea5e9" />
            <Text style={styles.detailText}>
              {teacher.subjects.length} subject{teacher.subjects.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.teacherActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditTeacher(teacher)}
        >
          <Ionicons name="create" size={16} color="#0ea5e9" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTeacher(teacher.id, teacher.fullName)}
        >
          <Ionicons name="trash" size={16} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Hero Section with Stats */}
      <LinearGradient
        colors={['#fff7ed', '#ffedd5', '#f0fdfa']}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
          <View>
              <Text style={styles.heroTitle}>Teacher Management</Text>
              <Text style={styles.heroSubtitle}>Manage teachers and their assignments</Text>
            </View>
            <View style={styles.heroIcon}>
              <LinearGradient
                colors={['#fb923c', '#f97316']}
                style={styles.heroIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="people" size={32} color="#fff" />
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
                  <Ionicons name="people" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Total Teachers</Text>
                    <Text style={styles.statCardValue}>{totalTeachers}</Text>
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
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Active Teachers</Text>
                    <Text style={styles.statCardValue}>{activeTeachers}</Text>
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
                  <Ionicons name="business" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Departments</Text>
                    <Text style={styles.statCardValue}>{departments.length}</Text>
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
                    <Text style={styles.statCardValue}>{totalSubjects}</Text>
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
          placeholder="Search teachers..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#fb923c', '#f97316']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Teacher</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Teachers List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : filteredTeachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No teachers found</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {filteredTeachers.map((teacher) => renderTeacherCard({ item: teacher }))}
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
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
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
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
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
        </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ed',
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
    color: '#fb923c',
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
  teacherCard: {
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
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  teacherAvatarContainer: {
    position: 'relative',
  },
  teacherAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
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
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  teacherEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  departmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  departmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  teacherDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
  },
  teacherActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
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