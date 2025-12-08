import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface HomeworkSubmission {
  _id: string;
  homework: {
    _id: string;
    title: string;
    subject?: {
      _id: string;
      name: string;
    } | string;
    deadline?: string;
  };
  student: {
    _id: string;
    fullName: string;
    email: string;
  };
  submissionLink: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt: string;
}

export default function HomeworkSubmissionsView() {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'graded'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/homework-submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const submissionsData = data.data || data || [];
        setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !grade) return;

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/homework-submissions/${selectedSubmission._id}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grade: parseFloat(grade),
          feedback: feedback.trim()
        })
      });

      if (response.ok) {
        setIsGradeModalOpen(false);
        setGrade('');
        setFeedback('');
        setSelectedSubmission(null);
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Failed to grade submission:', error);
    }
  };

  const filteredSubmissions = (Array.isArray(submissions) ? submissions : []).filter(submission => {
    const matchesSearch = 
      submission.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.homework?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading submissions...</Text>
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
            placeholder="Search submissions..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'reviewed', 'graded'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Submissions List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredSubmissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No submissions found</Text>
          </View>
        ) : (
          filteredSubmissions.map((submission) => {
            const subjectName = typeof submission.homework.subject === 'object'
              ? submission.homework.subject?.name
              : submission.homework.subject || 'General';

            return (
              <View key={submission._id} style={styles.submissionCard}>
                <View style={styles.submissionHeader}>
                  <View style={styles.studentInfo}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {submission.student.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{submission.student.fullName}</Text>
                      <Text style={styles.studentEmail}>{submission.student.email}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, styles[`statusBadge${submission.status}`]]}>
                    <Text style={[styles.statusText, styles[`statusText${submission.status}`]]}>
                      {submission.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.homeworkInfo}>
                  <Text style={styles.homeworkTitle}>{submission.homework.title}</Text>
                  <Text style={styles.homeworkSubject}>{subjectName}</Text>
                  {submission.homework.deadline && (
                    <Text style={styles.deadline}>
                      Deadline: {new Date(submission.homework.deadline).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <View style={styles.submissionDetails}>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => Linking.openURL(submission.submissionLink)}
                  >
                    <Ionicons name="link" size={16} color="#3b82f6" />
                    <Text style={styles.linkText}>View Submission</Text>
                  </TouchableOpacity>
                  {submission.description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {submission.description}
                    </Text>
                  )}
                </View>

                {submission.grade !== undefined && (
                  <View style={styles.gradeContainer}>
                    <Text style={styles.gradeLabel}>Grade:</Text>
                    <Text style={styles.gradeValue}>{submission.grade}/100</Text>
                  </View>
                )}

                {submission.feedback && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>Feedback:</Text>
                    <Text style={styles.feedbackText}>{submission.feedback}</Text>
                  </View>
                )}

                {submission.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.gradeButton}
                    onPress={() => {
                      setSelectedSubmission(submission);
                      setIsGradeModalOpen(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.gradeButtonText}>Grade Submission</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.submittedAt}>
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Grade Modal */}
      <Modal
        visible={isGradeModalOpen}
        animationType="slide"
        onRequestClose={() => setIsGradeModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Grade Submission</Text>
            <TouchableOpacity onPress={() => setIsGradeModalOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {selectedSubmission && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalStudentInfo}>
                <Text style={styles.modalStudentName}>{selectedSubmission.student.fullName}</Text>
                <Text style={styles.modalHomeworkTitle}>{selectedSubmission.homework.title}</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Grade (0-100) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter grade"
                  keyboardType="numeric"
                  value={grade}
                  onChangeText={setGrade}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Feedback (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add feedback..."
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={6}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleGradeSubmission}
              >
                <Text style={styles.submitButtonText}>Submit Grade</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
  },
  submissionCard: {
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
  submissionHeader: {
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
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgepending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgereviewed: {
    backgroundColor: '#dbeafe',
  },
  statusBadgegraded: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextpending: {
    color: '#92400e',
  },
  statusTextreviewed: {
    color: '#1e40af',
  },
  statusTextgraded: {
    color: '#065f46',
  },
  homeworkInfo: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  homeworkSubject: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  deadline: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  submissionDetails: {
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  gradeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  gradeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  feedbackContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#111827',
  },
  gradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  submittedAt: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
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
  modalStudentInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalStudentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalHomeworkTitle: {
    fontSize: 14,
    color: '#6b7280',
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
  submitButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

