import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  classNumber?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
}

export default function QuizzesView() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    subject: '',
    classNumber: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    totalQuestions: 20
  });

  useEffect(() => {
    fetchQuizzes();
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

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/quizzes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/quizzes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQuiz)
      });

      if (response.ok) {
        Alert.alert('Success', 'Quiz created successfully');
        setIsCreateModalOpen(false);
        setNewQuiz({
          title: '',
          description: '',
          subject: '',
          classNumber: '',
          difficulty: 'medium',
          totalQuestions: 20
        });
        fetchQuizzes();
      } else {
        Alert.alert('Error', 'Failed to create quiz');
      }
    } catch (error) {
      console.error('Failed to create quiz:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof quiz.subject === 'object' ? quiz.subject?._id : quiz.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading quizzes...</Text>
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
            placeholder="Search quizzes..."
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
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsCreateModalOpen(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Create Quiz</Text>
      </TouchableOpacity>

      {/* Quizzes List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredQuizzes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No quizzes found</Text>
            <Text style={styles.emptySubtext}>Create your first quiz to get started</Text>
          </View>
        ) : (
          filteredQuizzes.map((quiz) => {
            const subjectName = typeof quiz.subject === 'object' 
              ? quiz.subject?.name 
              : quiz.subject || 'General';

            return (
              <View key={quiz._id} style={styles.quizCard}>
                <View style={styles.quizHeader}>
                  <View style={styles.quizIcon}>
                    <Ionicons name="help-circle" size={24} color="#9333ea" />
                  </View>
                  <View style={styles.quizInfo}>
                    <Text style={styles.quizTitle} numberOfLines={2}>{quiz.title}</Text>
                    <Text style={styles.quizSubject}>{subjectName}</Text>
                  </View>
                </View>

                {quiz.description && (
                  <Text style={styles.quizDescription} numberOfLines={2}>
                    {quiz.description}
                  </Text>
                )}

                <View style={styles.quizMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="help-circle" size={16} color="#9333ea" />
                    <Text style={styles.metaText}>{quiz.totalQuestions} questions</Text>
                  </View>
                  {quiz.classNumber && (
                    <View style={styles.metaItem}>
                      <Ionicons name="school" size={16} color="#3b82f6" />
                      <Text style={styles.metaText}>Class {quiz.classNumber}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={quiz.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={quiz.isActive ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[styles.statusText, { color: quiz.isActive ? '#10b981' : '#ef4444' }]}>
                    {quiz.isActive ? 'Active' : 'Inactive'}
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
            <Text style={styles.modalTitle}>Create Quiz</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Quiz title"
                value={newQuiz.title}
                onChangeText={(text) => setNewQuiz({ ...newQuiz, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Quiz description"
                value={newQuiz.description}
                onChangeText={(text) => setNewQuiz({ ...newQuiz, description: text })}
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
                      newQuiz.subject === (subject._id || subject.id) && styles.subjectChipActive
                    ]}
                    onPress={() => setNewQuiz({ ...newQuiz, subject: subject._id || subject.id })}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      newQuiz.subject === (subject._id || subject.id) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Class Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  keyboardType="numeric"
                  value={newQuiz.classNumber}
                  onChangeText={(text) => setNewQuiz({ ...newQuiz, classNumber: text })}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Total Questions</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  keyboardType="numeric"
                  value={newQuiz.totalQuestions.toString()}
                  onChangeText={(text) => setNewQuiz({ ...newQuiz, totalQuestions: parseInt(text) || 20 })}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateQuiz}
            >
              <Text style={styles.createButtonText}>Create Quiz</Text>
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
    backgroundColor: '#9333ea',
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
  quizCard: {
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
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  quizIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  quizSubject: {
    fontSize: 14,
    color: '#6b7280',
  },
  quizDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  quizMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
  createButton: {
    backgroundColor: '#9333ea',
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

