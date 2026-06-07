import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StudentVidyaChatPanel from '../src/components/vidya/StudentVidyaChatPanel';
import { useAuth } from '../src/context/AuthContext';
import { collectVidyaSubjectLabels } from '../src/lib/vidya-subjects';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import * as SecureStore from 'expo-secure-store';

export default function AITutor() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : data?.data ?? data?.subjects ?? [];
        if (mounted) setSubjects(list);
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoadingSubjects(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const userId = user?._id || user?.id || '';
  const vidyaSubjectNames = useMemo(
    () =>
      collectVidyaSubjectLabels({
        subjects,
        assignedSubjects: user?.assignedSubjects,
        assignedClassSubjects: user?.assignedClass?.assignedSubjects,
      }),
    [subjects, user?.assignedSubjects, user?.assignedClass?.assignedSubjects]
  );

  const chatContext = useMemo(
    () => ({
      studentName: user?.fullName || user?.email?.split('@')[0] || 'Student',
      subjectOptions: vidyaSubjectNames,
      currentSubject: vidyaSubjectNames[0] || 'General Study',
      currentTopic: undefined,
    }),
    [user, vidyaSubjectNames]
  );

  const loading = authLoading || loadingSubjects;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={22} color="#6366f1" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Vidya AI</Text>
            <Text style={styles.headerSub}>Your AI Study Buddy</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {loading || !userId ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <StudentVidyaChatPanel userId={userId} context={chatContext} embedded />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
