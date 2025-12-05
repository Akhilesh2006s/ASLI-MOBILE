import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Subject {
  _id: string;
  id: string;
  name: string;
  description?: string;
  board?: string;
  totalContent?: number;
}

export default function LearningPathsView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
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
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Learning paths subjects API response:', data);
        
        // Handle different response formats
        let subjectsArray = [];
        if (Array.isArray(data)) {
          subjectsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          subjectsArray = data.data;
        } else if (data.subjects && Array.isArray(data.subjects)) {
          subjectsArray = data.subjects;
        }
        
        // Fetch content count for each subject
        const subjectsWithContent = await Promise.all(
          subjectsArray.map(async (subject: any) => {
            try {
              const subjectId = subject._id || subject.id;
              const contentResponse = await fetch(
                `${API_BASE_URL}/api/admin/asli-prep-content?subject=${encodeURIComponent(subjectId)}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              let totalContent = 0;
              if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                const contents = contentData.success ? (contentData.data || []) : (contentData || []);
                totalContent = Array.isArray(contents) ? contents.length : 0;
              }
              
              return {
                _id: subject._id || subject.id,
                id: subject._id || subject.id,
                name: subject.name || 'Unknown Subject',
                description: subject.description || '',
                board: subject.board || '',
                totalContent
              };
            } catch (error) {
              console.error(`Error fetching content for subject ${subject._id}:`, error);
              return {
                _id: subject._id || subject.id,
                id: subject._id || subject.id,
                name: subject.name || 'Unknown Subject',
                description: subject.description || '',
                board: subject.board || '',
                totalContent: 0
              };
            }
          })
        );
        
        setSubjects(subjectsWithContent);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch subjects:', response.status, errorData);
        setSubjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="target" size={32} color="#fb923c" />
          <View>
            <Text style={styles.headerTitle}>Learning Paths</Text>
            <Text style={styles.headerSubtitle}>Manage learning paths for students</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : subjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="target-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No learning paths found</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {subjects.map((subject) => (
            <TouchableOpacity key={subject.id} style={styles.pathCard}>
              <View style={styles.pathHeader}>
                <View style={styles.pathIcon}>
                  <Ionicons name="book" size={24} color="#fb923c" />
                </View>
                <View style={styles.pathInfo}>
                  <Text style={styles.pathName}>{subject.name}</Text>
                  {subject.description && (
                    <Text style={styles.pathDescription}>{subject.description}</Text>
                  )}
                  {subject.board && (
                    <Text style={styles.pathBoard}>Board: {subject.board}</Text>
                  )}
                </View>
              </View>
              <View style={styles.pathFooter}>
                <View style={styles.pathStat}>
                  <Ionicons name="document-text" size={16} color="#6b7280" />
                  <Text style={styles.pathStatText}>
                    {subject.totalContent || 0} content items
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  pathCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pathInfo: {
    flex: 1,
  },
  pathName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pathDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  pathBoard: {
    fontSize: 12,
    color: '#9ca3af',
  },
  pathFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pathStatText: {
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
