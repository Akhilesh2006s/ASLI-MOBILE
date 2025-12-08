import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  board: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const EXAM_TYPES = [
  { value: 'mains', label: 'Mains' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'practice', label: 'Practice' }
];

export default function ExamManagementView() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    examType: 'mains' as 'mains' | 'advanced' | 'weekend' | 'practice',
    board: 'ASLI_EXCLUSIVE_SCHOOLS',
    duration: '',
    totalQuestions: '',
    totalMarks: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExams(data.data || []);
        } else if (Array.isArray(data)) {
          setExams(data);
        } else if (data.data && Array.isArray(data.data)) {
          setExams(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return exams;
    const query = searchQuery.toLowerCase();
    return exams.filter(exam =>
      exam.title.toLowerCase().includes(query) ||
      (exam.description && exam.description.toLowerCase().includes(query)) ||
      exam.examType.toLowerCase().includes(query)
    );
  }, [exams, searchQuery]);

  const handleCreate = async () => {
    if (!formData.title || !formData.duration || !formData.totalQuestions || !formData.totalMarks) return;

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration),
          totalQuestions: parseInt(formData.totalQuestions),
          totalMarks: parseInt(formData.totalMarks)
        })
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setFormData({
          title: '',
          description: '',
          examType: 'mains',
          board: 'ASLI_EXCLUSIVE_SCHOOLS',
          duration: '',
          totalQuestions: '',
          totalMarks: '',
          startDate: '',
          endDate: ''
        });
        fetchExams();
      }
    } catch (error) {
      console.error('Failed to create exam:', error);
    }
  };

  const handleDelete = async (examId: string) => {
    setIsDeleting(examId);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        fetchExams();
      }
    } catch (error) {
      console.error('Failed to delete exam:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'mains': return ['#3b82f6', '#2563eb'];
      case 'advanced': return ['#8b5cf6', '#7c3aed'];
      case 'weekend': return ['#10b981', '#059669'];
      case 'practice': return ['#f59e0b', '#d97706'];
      default: return ['#6b7280', '#4b5563'];
    }
  };

  const colorSchemes = [
    { bg: ['#fdba74', '#fb923c'] },
    { bg: ['#7dd3fc', '#38bdf8'] },
    { bg: ['#2dd4bf', '#14b8a6'] }
  ];

  return (
    <ScrollView style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Exam Management</Text>
          <Text style={styles.headerSubtitle}>Create and manage exams</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalOpen(true)}
        >
          <LinearGradient
            colors={['#7dd3fc', '#2dd4bf']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Create Exam</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exams by title, description, or type..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Exams List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading exams...</Text>
        </View>
      ) : filteredExams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No exams found matching your search' : 'No exams yet'}
          </Text>
        </View>
      ) : (
        <View style={styles.examsList}>
          {filteredExams.map((exam, index) => {
            const colorScheme = colorSchemes[index % 3];
            const typeColors = getExamTypeColor(exam.examType);
            return (
              <View key={exam._id} style={styles.examCard}>
                <LinearGradient
                  colors={colorScheme.bg}
                  style={styles.examCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.examCardHeader}>
                    <View style={styles.examCardHeaderLeft}>
                      <Text style={styles.examCardTitle}>{exam.title}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, { backgroundColor: typeColors[0] }]}>
                          <Text style={styles.typeBadgeText}>
                            {EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType}
                          </Text>
                        </View>
                        <View style={styles.boardBadge}>
                          <Text style={styles.boardBadgeText}>ASLI EXCLUSIVE SCHOOLS</Text>
                        </View>
                        <View style={[styles.statusBadge, exam.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                          <Text style={styles.statusBadgeText}>
                            {exam.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(exam._id)}
                      disabled={isDeleting === exam._id}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {exam.description && (
                    <Text style={styles.examCardDescription} numberOfLines={2}>
                      {exam.description}
                    </Text>
                  )}
                  <View style={styles.examCardDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color="#fff" />
                      <Text style={styles.detailText}>{exam.duration} minutes</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="help-circle-outline" size={16} color="#fff" />
                      <Text style={styles.detailText}>{exam.totalQuestions} questions</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="trophy-outline" size={16} color="#fff" />
                      <Text style={styles.detailText}>{exam.totalMarks} marks</Text>
                    </View>
                  </View>
                  {exam.startDate && (
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={14} color="#fff" />
                      <Text style={styles.dateText}>
                        {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Exam Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Exam</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Exam Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., JEE Mains Mock Test 2024"
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Brief description of the exam"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Exam Type *</Text>
                <View style={styles.typeSelector}>
                  {EXAM_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.examType === type.value && styles.typeOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, examType: type.value as any })}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        formData.examType === type.value && styles.typeOptionTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Duration (minutes) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 180"
                  keyboardType="numeric"
                  value={formData.duration}
                  onChangeText={(text) => setFormData({ ...formData, duration: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Questions *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 90"
                  keyboardType="numeric"
                  value={formData.totalQuestions}
                  onChangeText={(text) => setFormData({ ...formData, totalQuestions: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Marks *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 360"
                  keyboardType="numeric"
                  value={formData.totalMarks}
                  onChangeText={(text) => setFormData({ ...formData, totalMarks: text })}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreate}
              >
                <Text style={styles.submitButtonText}>Create Exam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  examsList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  examCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  examCardGradient: {
    padding: 20,
  },
  examCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examCardHeaderLeft: {
    flex: 1,
  },
  examCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  boardBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#10b981',
  },
  statusBadgeInactive: {
    backgroundColor: '#6b7280',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
  },
  examCardDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  examCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeOptionTextActive: {
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
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});


