import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Exam {
  _id: string;
  title: string;
  description?: string;
  examType: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function ExamsView() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        console.error('No auth token found');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/exams/viewable`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Exams API response:', data);
        
        // Handle different response formats
        if (data.success && data.data) {
          setExams(Array.isArray(data.data) ? data.data : []);
        } else if (Array.isArray(data)) {
          setExams(data);
        } else if (data.exams && Array.isArray(data.exams)) {
          setExams(data.exams);
        } else {
          setExams([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch exams:', response.status, errorData);
        setExams([]);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.examType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={32} color="#fb923c" />
          <View>
            <Text style={styles.headerTitle}>Exams Management</Text>
            <Text style={styles.headerSubtitle}>View and manage all exams</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exams..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : filteredExams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No exams found</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filteredExams.map((exam) => (
            <View key={exam._id} style={styles.examCard}>
              <View style={styles.examHeader}>
                <Text style={styles.examTitle}>{exam.title}</Text>
                <View style={[styles.statusBadge, exam.isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{exam.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              {exam.description && (
                <Text style={styles.examDescription}>{exam.description}</Text>
              )}
              <View style={styles.examDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{exam.duration} minutes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="help-circle" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{exam.totalQuestions} questions</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="trophy" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{exam.totalMarks} marks</Text>
                </View>
              </View>
              <View style={styles.examDates}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar" size={16} color="#6b7280" />
                  <Text style={styles.dateText}>
                    {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
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
  examDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  examDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  examDates: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
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
});