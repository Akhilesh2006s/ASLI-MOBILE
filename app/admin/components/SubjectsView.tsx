import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

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
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    grade: ''
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        console.error('No auth token found');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let subjectsData = [];
        if (Array.isArray(data)) {
          subjectsData = data;
        } else if (data.data && Array.isArray(data.data)) {
          subjectsData = data.data;
        } else if (data.subjects && Array.isArray(data.subjects)) {
          subjectsData = data.subjects;
        }
        
        const mappedSubjects = subjectsData.map((subject: any) => ({
          id: subject._id || subject.id,
          name: subject.name || 'Unknown Subject',
          code: subject.code || '',
          description: subject.description || '',
          teacher: subject.teacher,
          grade: subject.grade || '',
          department: subject.department || '',
          isActive: subject.isActive !== false,
          createdAt: subject.createdAt || new Date().toISOString()
        }));
        setSubjects(mappedSubjects);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch subjects:', response.status, errorData);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredSubjects = useMemo(() => {
    let filtered = subjects;
    
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(subject =>
        subject.name?.toLowerCase().includes(query) ||
        subject.code?.toLowerCase().includes(query) ||
        subject.department?.toLowerCase().includes(query) ||
        subject.teacher?.fullName?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [subjects, searchTerm]);

  const totalSubjects = subjects.length;
  const activeSubjects = subjects.filter(s => s.isActive).length;
  const assignedSubjects = subjects.filter(s => s.teacher).length;

  const handleAddSubject = async () => {
    if (!newSubject.name.trim() || !newSubject.code.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Code)');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSubject)
      });

      if (response.ok) {
        setNewSubject({ name: '', code: '', description: '', department: '', grade: '' });
        setIsAddModalVisible(false);
        fetchSubjects();
        Alert.alert('Success', 'Subject added successfully!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to add subject');
      }
    } catch (error) {
      console.error('Failed to add subject:', error);
      Alert.alert('Error', 'Failed to add subject. Please try again.');
    }
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
              const token = await SecureStore.getItemAsync('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/subjects/${subjectId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                fetchSubjects();
                Alert.alert('Success', `${subjectName} has been deleted successfully.`);
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to delete subject');
              }
            } catch (error) {
              console.error('Failed to delete subject:', error);
              Alert.alert('Error', 'Failed to delete subject. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderSubjectCard = useCallback(({ item: subject }: { item: Subject }) => (
    <View key={subject.id || subject._id || `subject-${subject.name}`} style={styles.subjectCard}>
      <View style={styles.subjectHeader}>
        <View style={styles.subjectIconContainer}>
          <LinearGradient
            colors={['#fb923c', '#f97316']}
            style={styles.subjectIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="book" size={24} color="#fff" />
          </LinearGradient>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          {subject.code && (
            <Text style={styles.subjectCode}>Code: {subject.code}</Text>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          subject.isActive ? styles.statusActive : styles.statusInactive
        ]}>
          <Text style={styles.statusText}>
            {subject.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {subject.description && (
        <Text style={styles.subjectDescription}>{subject.description}</Text>
      )}

      <View style={styles.subjectDetails}>
        {subject.department && (
          <View style={styles.detailRow}>
            <Ionicons name="business" size={16} color="#fb923c" />
            <Text style={styles.detailText}>{subject.department}</Text>
          </View>
        )}
        {subject.grade && (
          <View style={styles.detailRow}>
            <Ionicons name="school" size={16} color="#fb923c" />
            <Text style={styles.detailText}>Grade {subject.grade}</Text>
          </View>
        )}
        {subject.teacher ? (
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color="#fb923c" />
            <Text style={styles.detailText}>{subject.teacher.fullName}</Text>
          </View>
        ) : (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#9ca3af" />
            <Text style={[styles.detailText, styles.unassignedText]}>No teacher assigned</Text>
          </View>
        )}
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
              <Text style={styles.heroTitle}>Subject Management</Text>
              <Text style={styles.heroSubtitle}>Manage subjects and their assignments</Text>
            </View>
            <View style={styles.heroIcon}>
              <LinearGradient
                colors={['#fb923c', '#f97316']}
                style={styles.heroIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="book" size={32} color="#fff" />
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
                  <Ionicons name="book" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Total Subjects</Text>
                    <Text style={styles.statCardValue}>{totalSubjects}</Text>
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
                    <Text style={styles.statCardLabel}>Active Subjects</Text>
                    <Text style={styles.statCardValue}>{activeSubjects}</Text>
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
                  <Ionicons name="people" size={24} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardLabel}>Assigned Subjects</Text>
                    <Text style={styles.statCardValue}>{assignedSubjects}</Text>
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
          <Ionicons name="search" size={20} color="#fb923c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Subjects List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : filteredSubjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No subjects found</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {filteredSubjects.map((subject) => renderSubjectCard({ item: subject }))}
        </View>
      )}

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
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 20,
  },
  subjectCard: {
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
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  subjectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  subjectIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 14,
    color: '#64748b',
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
  subjectDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subjectDetails: {
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
    color: '#64748b',
  },
  unassignedText: {
    color: '#9ca3af',
    fontStyle: 'italic',
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