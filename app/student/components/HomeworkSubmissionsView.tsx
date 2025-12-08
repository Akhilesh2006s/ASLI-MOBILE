import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
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
  submissionLink: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt: string;
}

export default function StudentHomeworkSubmissionsView() {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/homework-submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {submissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No submissions yet</Text>
            <Text style={styles.emptySubtext}>Your homework submissions will appear here</Text>
          </View>
        ) : (
          submissions.map((submission) => {
            const subjectName = typeof submission.homework.subject === 'object'
              ? submission.homework.subject?.name
              : submission.homework.subject || 'General';

            return (
              <View key={submission._id} style={styles.submissionCard}>
                <View style={styles.submissionHeader}>
                  <View style={styles.homeworkInfo}>
                    <Text style={styles.homeworkTitle}>{submission.homework.title}</Text>
                    <Text style={styles.homeworkSubject}>{subjectName}</Text>
                  </View>
                  <View style={[styles.statusBadge, styles[`statusBadge${submission.status}`]]}>
                    <Text style={[styles.statusText, styles[`statusText${submission.status}`]]}>
                      {submission.status.toUpperCase()}
                    </Text>
                  </View>
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
                    <Text style={styles.description}>{submission.description}</Text>
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
                    <Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
                    <Text style={styles.feedbackText}>{submission.feedback}</Text>
                  </View>
                )}

                <Text style={styles.submittedAt}>
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  homeworkInfo: {
    flex: 1,
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
  submissionDetails: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
    marginBottom: 12,
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
  submittedAt: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
});

