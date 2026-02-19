import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import ExamsView from './dashboard/components/ExamsView';

export default function StudentExams() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  // If examId is provided, navigate to quiz page
  useEffect(() => {
    if (examId) {
      router.replace(`/quiz/${examId}`);
    }
  }, [examId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Student Exams</Text>
            <Text style={styles.headerSubtitle}>Take practice exams and track your progress</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <ExamsView />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
});


