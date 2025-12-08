import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface Assessment {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  type: 'quiz' | 'exam' | 'assignment' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  questions?: number;
  isActive: boolean;
  createdAt: string;
}

export default function AssessmentsView() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    description: '',
    subject: '',
    type: 'quiz' as 'quiz' | 'exam' | 'assignment' | 'project',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 60,
    totalMarks: 100,
    passingMarks: 50,
    questions: 20
  });

  useEffect(() => {
    fetchAssessments();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
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

  const fetchAssessments = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/assessments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.title || !newAssessment.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/assessments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAssessment)
      });

      if (response.ok) {
        Alert.alert('Success', 'Assessment created successfully');
        setIsCreateModalOpen(false);
        setNewAssessment({
          title: '',
          description: '',
          subject: '',
          type: 'quiz',
          difficulty: 'medium',
          duration: 60,
          totalMarks: 100,
          passingMarks: 50,
          questions: 20
        });
        fetchAssessments();
      } else {
        Alert.alert('Error', 'Failed to create assessment');
      }
    } catch (error) {
      console.error('Failed to create assessment:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    Alert.alert(
      'Delete Assessment',
      'Are you sure you want to delete this assessment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/assessments/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                fetchAssessments();
              }
            } catch (error) {
              console.error('Failed to delete assessment:', error);
            }
          }
        }
      ]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return '#ef4444';
      case 'quiz': return '#3b82f6';
      case 'assignment': return '#10b981';
      case 'project': return '#9333ea';
      default: return '#6b7280';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof assessment.subject === 'object' ? assessment.subject?._id : assessment.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    const matchesType = filterType === 'all' || assessment.type === filterType;
    return matchesSearch && matchesSubject && matchesType;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading assessments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assessments..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

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
              style={[styles.filterChip, filterSubject === (subject._id || subject.id) && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id || subject.id)}
            >
              <Text style={[styles.filterChipText, filterSubject === (subject._id || subject.id) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'quiz', 'exam', 'assignment', 'project'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
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
        <Text style={styles.addButtonText}>Create Assessment</Text>
      </TouchableOpacity>

      {/* Assessments List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredAssessments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No assessments found</Text>
            <Text style={styles.emptySubtext}>Create your first assessment to get started</Text>
          </View>
        ) : (
          filteredAssessments.map((assessment) => {
            const subjectName = typeof assessment.subject === 'object' 
              ? assessment.subject?.name 
              : assessment.subject || 'General';
            const typeColor = getTypeColor(assessment.type);
            const difficultyColor = getDifficultyColor(assessment.difficulty);

            return (
              <View key={assessment._id} style={styles.assessmentCard}>
                <View style={styles.assessmentHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                      {assessment.type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.assessmentActions}>
                    <TouchableOpacity
                      onPress={() => handleDeleteAssessment(assessment._id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                {assessment.description && (
                  <Text style={styles.assessmentDescription} numberOfLines={2}>
                    {assessment.description}
                  </Text>
                )}

                <View style={styles.assessmentMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="book" size={16} color="#6b7280" />
                    <Text style={styles.metaText}>{subjectName}</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
                    <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                      {assessment.difficulty}
                    </Text>
                  </View>
                </View>

                <View style={styles.assessmentStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={16} color="#3b82f6" />
                    <Text style={styles.statText}>{assessment.duration} min</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="trophy" size={16} color="#f59e0b" />
                    <Text style={styles.statText}>{assessment.totalMarks} marks</Text>
                  </View>
                  {assessment.questions && (
                    <View style={styles.statItem}>
                      <Ionicons name="help-circle" size={16} color="#9333ea" />
                      <Text style={styles.statText}>{assessment.questions} questions</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={assessment.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={assessment.isActive ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[styles.statusText, { color: assessment.isActive ? '#10b981' : '#ef4444' }]}>
                    {assessment.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            );
          })
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
            <Text style={styles.modalTitle}>Create Assessment</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Assessment title"
                value={newAssessment.title}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Assessment description"
                value={newAssessment.description}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      newAssessment.subject === (subject._id || subject.id) && styles.subjectChipActive
                    ]}
                    onPress={() => setNewAssessment({ ...newAssessment, subject: subject._id || subject.id })}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      newAssessment.subject === (subject._id || subject.id) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['quiz', 'exam', 'assignment', 'project'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      newAssessment.type === type && styles.typeChipActive
                    ]}
                    onPress={() => setNewAssessment({ ...newAssessment, type: type as any })}
                  >
                    <Text style={[
                      styles.typeChipText,
                      newAssessment.type === type && styles.typeChipTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Difficulty</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['easy', 'medium', 'hard'].map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.difficultyChip,
                      newAssessment.difficulty === diff && styles.difficultyChipActive
                    ]}
                    onPress={() => setNewAssessment({ ...newAssessment, difficulty: diff as any })}
                  >
                    <Text style={[
                      styles.difficultyChipText,
                      newAssessment.difficulty === diff && styles.difficultyChipTextActive
                    ]}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  keyboardType="numeric"
                  value={newAssessment.duration.toString()}
                  onChangeText={(text) => setNewAssessment({ ...newAssessment, duration: parseInt(text) || 60 })}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Total Marks</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={newAssessment.totalMarks.toString()}
                  onChangeText={(text) => setNewAssessment({ ...newAssessment, totalMarks: parseInt(text) || 100 })}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Passing Marks</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50"
                  keyboardType="numeric"
                  value={newAssessment.passingMarks.toString()}
                  onChangeText={(text) => setNewAssessment({ ...newAssessment, passingMarks: parseInt(text) || 50 })}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Questions</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  keyboardType="numeric"
                  value={newAssessment.questions?.toString() || '20'}
                  onChangeText={(text) => setNewAssessment({ ...newAssessment, questions: parseInt(text) || 20 })}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateAssessment}
            >
              <Text style={styles.createButtonText}>Create Assessment</Text>
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
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
  assessmentCard: {
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
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assessmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  assessmentDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  assessmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assessmentStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
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
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
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
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: '#3b82f6',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  difficultyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  difficultyChipActive: {
    backgroundColor: '#3b82f6',
  },
  difficultyChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  difficultyChipTextActive: {
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

