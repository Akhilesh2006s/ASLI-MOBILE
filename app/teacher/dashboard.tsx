import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import {
  RoleHeader,
  BottomTabBar,
  LoadingState,
  BottomSheet,
  TabItem,
  StatCard,
} from '../../src/components/ui';
import { COLORS, SPACING, getRoleColor } from '../../src/theme';
import AIClassesView from './components/AIClassesView';
import StudentsView from './components/StudentsView';
import TeacherAssessmentsView from './components/AssessmentsView';
import TeacherVideosView from './components/VideosView';
import VidyaAIView from './components/VidyaAIView';

type TeacherView = 'ai-classes' | 'students' | 'assessments' | 'videos' | 'vidya-ai';

const TEACHER_TABS: TabItem[] = [
  { id: 'ai-classes', label: 'Classes', icon: 'school-outline', activeIcon: 'school' },
  { id: 'students', label: 'Students', icon: 'people-outline', activeIcon: 'people' },
  { id: 'assessments', label: 'Tests', icon: 'clipboard-outline', activeIcon: 'clipboard' },
  { id: 'videos', label: 'Videos', icon: 'videocam-outline', activeIcon: 'videocam' },
  { id: 'vidya-ai', label: 'AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

const MORE_ITEMS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; route?: string }[] = [
  { id: 'attendance', label: 'Attendance', icon: 'calendar-outline', route: '/teacher/attendance' },
  { id: 'class-dashboard', label: 'Class Dashboard', icon: 'stats-chart-outline' },
  { id: 'remarks', label: 'Remarks', icon: 'chatbox-outline' },
  { id: 'homework', label: 'Homework', icon: 'document-outline' },
];

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const [currentView, setCurrentView] = useState<TeacherView>('ai-classes');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Teacher');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalVideos: 0,
    averagePerformance: 0,
  });

  useBackNavigation('/teacher/dashboard', true);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userRole = await SecureStore.getItemAsync('userRole');

      if (!token) {
        router.replace('/auth/login');
        return;
      }

      if (userRole === 'teacher') {
        setIsAuthenticated(true);
        setIsLoading(false);
        verifyAuth(token);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user?.role === 'teacher') {
          setIsAuthenticated(true);
          setUserName(data.user.fullName || 'Teacher');
          await SecureStore.setItemAsync('userRole', 'teacher');
        } else {
          router.replace('/auth/login');
        }
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAuth = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user?.role === 'teacher') {
          setUserName(data.user.fullName || 'Teacher');
          await SecureStore.setItemAsync('userRole', 'teacher');
        } else {
          router.replace('/auth/login');
        }
      }
    } catch (error) {
      console.error('Background auth verification failed:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/dashboard`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const statsData = data.data.stats || data.data;
          const students = data.data.students || [];
          const assignedClasses = data.data.assignedClasses || [];
          const videos = data.data.videos || [];
          setStats({
            totalStudents: statsData.totalStudents ?? students.length ?? 0,
            totalClasses: statsData.totalClasses ?? assignedClasses.length ?? 0,
            totalVideos: statsData.totalVideos ?? videos.length ?? 0,
            averagePerformance: statsData.averagePerformance ?? 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setMenuOpen(false);
          try {
            await signOut();
          } catch {
            await authService.clearAuth();
          } finally {
            router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'ai-classes':
        return <AIClassesView stats={stats} />;
      case 'students':
        return <StudentsView />;
      case 'assessments':
        return <TeacherAssessmentsView />;
      case 'videos':
        return <TeacherVideosView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <AIClassesView stats={stats} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingState variant="stats" style={{ padding: SPACING.lg }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  const isFullHeight = currentView === 'vidya-ai';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RoleHeader
        role="teacher"
        userName={userName}
        onNotification={() => router.push('/notifications')}
        onMenu={() => setMenuOpen(true)}
        onProfile={() => router.push('/profile')}
      />

      {currentView === 'ai-classes' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard icon="people" label="Students" value={stats.totalStudents} color={COLORS.teacher} compact />
          <StatCard icon="school" label="Classes" value={stats.totalClasses} color={COLORS.info} compact />
          <StatCard icon="clipboard" label="Pending" value="—" color={COLORS.warning} compact />
          <StatCard icon="trending-up" label="Avg %" value={`${stats.averagePerformance.toFixed(0)}%`} color={COLORS.success} compact />
        </ScrollView>
      )}

      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.content, isFullHeight && styles.contentFull, { paddingHorizontal: SPACING.lg }]}
      >
        {renderContent()}
      </Animated.View>

      <BottomTabBar
        tabs={TEACHER_TABS}
        activeTab={currentView}
        onTabChange={(id) => setCurrentView(id as TeacherView)}
        roleColor={getRoleColor('teacher')}
      />

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="More">
        {MORE_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              if (item.route) router.push(item.route as any);
            }}
          >
            <Ionicons name={item.icon} size={20} color={COLORS.text} />
            <Text style={styles.menuText}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={[styles.menuText, { color: COLORS.danger }]}>Logout</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  statsRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  content: { flex: 1, paddingBottom: 96, paddingTop: SPACING.sm, minHeight: 0 },
  contentFull: { paddingBottom: 88 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  logoutItem: { borderBottomWidth: 0, marginTop: SPACING.sm },
});
