import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import {
  RoleHeader,
  BottomTabBar,
  LoadingState,
  BottomSheet,
  TabItem,
} from '../../src/components/ui';
import { COLORS, SPACING, getRoleColor } from '../../src/theme';
import OverviewView from './components/OverviewView';
import StudentsView from './components/StudentsView';
import ClassesView from './components/ClassesView';
import TeachersView from './components/TeachersView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import LearningPathsView from './components/LearningPathsView';
import EduOTTView from './components/EduOTTView';
import CalendarView from './components/CalendarView';
import VidyaAIView from './components/VidyaAIView';
import AnalyticsDashboardView from './components/AnalyticsDashboardView';

type AdminView = 'overview' | 'students' | 'teachers' | 'classes' | 'more';

const ADMIN_TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
  { id: 'students', label: 'Students', icon: 'people-outline', activeIcon: 'people' },
  { id: 'teachers', label: 'Teachers', icon: 'person-circle-outline', activeIcon: 'person-circle' },
  { id: 'classes', label: 'Classes', icon: 'school-outline', activeIcon: 'school' },
  { id: 'more', label: 'More', icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
];

const MORE_VIEWS: { id: AdminView | string; label: string; icon: keyof typeof Ionicons.glyphMap; view?: string; route?: string }[] = [
  { id: 'subjects', label: 'Subjects', icon: 'book-outline', view: 'subjects' },
  { id: 'exams', label: 'Exams', icon: 'document-text-outline', view: 'exams' },
  { id: 'learning-paths', label: 'Learning Paths', icon: 'map-outline', view: 'learning-paths' },
  { id: 'eduott', label: 'EduOTT', icon: 'videocam-outline', view: 'eduott' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', view: 'calendar' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', view: 'analytics' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline', view: 'vidya-ai' },
  { id: 'reports', label: 'Reports', icon: 'download-outline', route: '/admin/reports' },
  { id: 'settings', label: 'School Settings', icon: 'settings-outline', route: '/admin/school-settings' },
];

type ContentView = AdminView | 'subjects' | 'exams' | 'learning-paths' | 'eduott' | 'calendar' | 'analytics' | 'vidya-ai';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ContentView>('overview');
  const [moreOpen, setMoreOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');

  useBackNavigation('/admin/dashboard', true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const auth = await authService.getStoredAuth();
      const token = auth.token;
      const userRole = auth.role;

      if (!token) {
        router.replace('/auth/login');
        return;
      }

      if (userRole === 'admin') {
        setIsAuthenticated(true);
        setIsLoading(false);
      }

      const data = await authService.me();
      if (data?.user?.role === 'admin') {
        setIsAuthenticated(true);
        setUserName(data.user.fullName || 'Admin');
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      const message = String((error as any)?.message || '').toLowerCase();
      const isNetworkIssue =
        message.includes('network request failed') ||
        message.includes('network error') ||
        message.includes('timeout');

      if (isNetworkIssue) {
        setIsAuthenticated(true);
      } else {
        await authService.clearAuth();
        router.replace('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setMoreOpen(false);
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

  const onTabChange = (id: string) => {
    if (id === 'more') {
      setMoreOpen(true);
      return;
    }
    setCurrentView(id as ContentView);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView />;
      case 'students':
        return <StudentsView />;
      case 'classes':
        return <ClassesView />;
      case 'teachers':
        return <TeachersView />;
      case 'subjects':
        return <SubjectsView />;
      case 'exams':
        return <ExamsView />;
      case 'learning-paths':
        return <LearningPathsView />;
      case 'eduott':
        return <EduOTTView />;
      case 'calendar':
        return <CalendarView />;
      case 'analytics':
        return <AnalyticsDashboardView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <OverviewView />;
    }
  };

  const activeTab = ['overview', 'students', 'teachers', 'classes'].includes(currentView)
    ? currentView
    : 'more';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingState variant="stats" style={{ padding: SPACING.lg }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RoleHeader
        role="admin"
        userName={userName}
        subtitle="School management"
        onNotification={() => router.push('/notifications')}
        onMenu={() => setMoreOpen(true)}
      />

      <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
        {renderContent()}
      </Animated.View>

      <BottomTabBar tabs={ADMIN_TABS} activeTab={activeTab} onTabChange={onTabChange} roleColor={getRoleColor('admin')} />

      <BottomSheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        {MORE_VIEWS.map((item) => (
          <Pressable
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              setMoreOpen(false);
              if (item.route) router.push(item.route as any);
              else if (item.view) setCurrentView(item.view as ContentView);
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
  content: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: 96, paddingTop: SPACING.sm, minHeight: 0 },
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
