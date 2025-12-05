import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

export default function LearningPaths() {
  const router = useRouter();
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  const fetchLearningPaths = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setLearningPaths(data.subjects || data.data || []);
      }
    } catch (error) {
      console.error('Error fetching learning paths:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading learning paths...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Learning Paths</Text>
        <Text style={styles.headerSubtitle}>Choose your learning journey</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {learningPaths.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No learning paths available</Text>
          </View>
        ) : (
          learningPaths.map((path, index) => (
            <TouchableOpacity
              key={path._id || index}
              style={styles.pathCard}
              onPress={() => router.push(`/subject/${path._id}`)}
            >
              <View style={styles.pathHeader}>
                <View style={[styles.pathIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="book" size={24} color="#3b82f6" />
                </View>
                <View style={styles.pathInfo}>
                  <Text style={styles.pathTitle}>{path.name || 'Subject'}</Text>
                  <Text style={styles.pathDescription} numberOfLines={2}>
                    {path.description || 'Start your learning journey'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
              <View style={styles.pathStats}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={16} color="#6b7280" />
                  <Text style={styles.statText}>{path.students || 0} students</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text style={styles.statText}>{path.rating || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="trending-up" size={16} color="#10b981" />
                  <Text style={styles.statText}>{path.progress || 0}% complete</Text>
                </View>
              </View>
              {path.progress > 0 && (
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, { width: `${path.progress}%` }]} 
                  />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  pathCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pathIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pathInfo: {
    flex: 1,
  },
  pathTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pathDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  pathStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

