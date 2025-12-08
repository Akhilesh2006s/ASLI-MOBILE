import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface Remark {
  _id: string;
  student: {
    _id: string;
    fullName: string;
    email: string;
  };
  subject: string;
  text: string;
  isPositive: boolean;
  createdAt: string;
  createdBy: {
    _id: string;
    fullName: string;
  };
}

export default function TeacherRemarksView() {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('general');
  const [remarkText, setRemarkText] = useState('');
  const [isPositive, setIsPositive] = useState(true);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  useEffect(() => {
    fetchRemarks();
    fetchStudents();
    fetchSubjects();
  }, []);

  const fetchRemarks = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/remarks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRemarks(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch remarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleCreateRemark = async () => {
    if (!selectedStudent || !remarkText.trim()) {
      Alert.alert('Validation Error', 'Please select a student and enter a remark');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/remarks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          subject: selectedSubject,
          text: remarkText.trim(),
          isPositive
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Remark added successfully');
        setIsCreateModalOpen(false);
        setSelectedStudent('');
        setRemarkText('');
        setSelectedSubject('general');
        setIsPositive(true);
        fetchRemarks();
      } else {
        Alert.alert('Error', 'Failed to add remark');
      }
    } catch (error) {
      console.error('Failed to create remark:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const filteredRemarks = remarks.filter(remark => {
    const matchesStudent = filterStudent === 'all' || remark.student._id === filterStudent;
    const matchesSubject = filterSubject === 'all' || remark.subject === filterSubject;
    return matchesStudent && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading remarks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterStudent === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStudent('all')}
          >
            <Text style={[styles.filterChipText, filterStudent === 'all' && styles.filterChipTextActive]}>
              All Students
            </Text>
          </TouchableOpacity>
          {students.map(student => (
            <TouchableOpacity
              key={student._id || student.id}
              style={[styles.filterChip, filterStudent === (student._id || student.id) && styles.filterChipActive]}
              onPress={() => setFilterStudent(student._id || student.id)}
            >
              <Text style={[styles.filterChipText, filterStudent === (student._id || student.id) && styles.filterChipTextActive]}>
                {student.fullName || student.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, filterSubject === (subject._id || subject.id || subject.name) && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id || subject.id || subject.name)}
            >
              <Text style={[styles.filterChipText, filterSubject === (subject._id || subject.id || subject.name) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsCreateModalOpen(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Remark</Text>
      </TouchableOpacity>

      {/* Remarks List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredRemarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No remarks found</Text>
            <Text style={styles.emptySubtext}>Add your first remark to get started</Text>
          </View>
        ) : (
          filteredRemarks.map((remark) => (
            <View key={remark._id} style={styles.remarkCard}>
              <View style={styles.remarkHeader}>
                <View style={styles.studentInfo}>
                  <View style={[styles.remarkIcon, isPositive ? styles.remarkIconPositive : styles.remarkIconNegative]}>
                    <Ionicons
                      name={isPositive ? 'thumbs-up' : 'thumbs-down'}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>{remark.student.fullName}</Text>
                    <Text style={styles.studentEmail}>{remark.student.email}</Text>
                  </View>
                </View>
                <View style={[styles.typeBadge, isPositive ? styles.typeBadgePositive : styles.typeBadgeNegative]}>
                  <Text style={styles.typeBadgeText}>
                    {isPositive ? 'Positive' : 'Needs Improvement'}
                  </Text>
                </View>
              </View>

              <View style={styles.remarkContent}>
                <Text style={styles.subjectLabel}>Subject: {remark.subject}</Text>
                <Text style={styles.remarkText}>{remark.text}</Text>
              </View>

              <View style={styles.remarkFooter}>
                <Text style={styles.createdBy}>
                  By {remark.createdBy?.fullName || 'Teacher'}
                </Text>
                <Text style={styles.createdAt}>
                  {new Date(remark.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Remark</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Student *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {students.map(student => (
                  <TouchableOpacity
                    key={student._id || student.id}
                    style={[
                      styles.studentChip,
                      selectedStudent === (student._id || student.id) && styles.studentChipActive
                    ]}
                    onPress={() => setSelectedStudent(student._id || student.id)}
                  >
                    <Text style={[
                      styles.studentChipText,
                      selectedStudent === (student._id || student.id) && styles.studentChipTextActive
                    ]}>
                      {student.fullName || student.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.subjectChip,
                    selectedSubject === 'general' && styles.subjectChipActive
                  ]}
                  onPress={() => setSelectedSubject('general')}
                >
                  <Text style={[
                    styles.subjectChipText,
                    selectedSubject === 'general' && styles.subjectChipTextActive
                  ]}>
                    General
                  </Text>
                </TouchableOpacity>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      selectedSubject === (subject._id || subject.id || subject.name) && styles.subjectChipActive
                    ]}
                    onPress={() => setSelectedSubject(subject._id || subject.id || subject.name)}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      selectedSubject === (subject._id || subject.id || subject.name) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, isPositive && styles.typeButtonActive]}
                  onPress={() => setIsPositive(true)}
                >
                  <Ionicons name="thumbs-up" size={20} color={isPositive ? '#fff' : '#6b7280'} />
                  <Text style={[styles.typeButtonText, isPositive && styles.typeButtonTextActive]}>
                    Positive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, !isPositive && styles.typeButtonActive]}
                  onPress={() => setIsPositive(false)}
                >
                  <Ionicons name="thumbs-down" size={20} color={!isPositive ? '#fff' : '#6b7280'} />
                  <Text style={[styles.typeButtonText, !isPositive && styles.typeButtonTextActive]}>
                    Needs Improvement
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Remark *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your remark..."
                value={remarkText}
                onChangeText={setRemarkText}
                multiline
                numberOfLines={6}
              />
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateRemark}
            >
              <Text style={styles.createButtonText}>Add Remark</Text>
            </TouchableOpacity>
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
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
  remarkCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  remarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  remarkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remarkIconPositive: {
    backgroundColor: '#10b981',
  },
  remarkIconNegative: {
    backgroundColor: '#ef4444',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgePositive: {
    backgroundColor: '#d1fae5',
  },
  typeBadgeNegative: {
    backgroundColor: '#fee2e2',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  remarkContent: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subjectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  remarkText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  remarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  createdBy: {
    fontSize: 12,
    color: '#6b7280',
  },
  createdAt: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  studentChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  studentChipActive: {
    backgroundColor: '#3b82f6',
  },
  studentChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  studentChipTextActive: {
    color: '#fff',
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  subjectChipActive: {
    backgroundColor: '#3b82f6',
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  subjectChipTextActive: {
    color: '#fff',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

