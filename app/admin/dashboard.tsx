import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import { RoleHeader, LoadingState } from '../../src/components/ui';
import { COLORS, SPACING } from '../../src/theme';
import OverviewView from './components/OverviewView';
import StudentsView from './components/StudentsView';
import ClassesView from './components/ClassesView';
import TeachersView from './components/TeachersView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import LearningPathsView from './components/LearningPathsView';
import EduOTTView from './components/EduOTTView';
import TimetableView from './components/TimetableView';
import CalendarView from './components/CalendarView';
import VidyaAIView from './components/VidyaAIView';
import AdminNavDrawer, { adminNavLabel, type AdminNavView } from './components/AdminNavDrawer';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [currentView, setCurrentView] = useState<AdminNavView>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');

  useBackNavigation('/admin/dashboard', true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (tab === 'eduott') setCurrentView('eduott');
    else if (tab === 'learning-paths') setCurrentView('learning-paths');
  }, [tab]);

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

  const onSelectView = (view: AdminNavView) => {
    setCurrentView(view);
    setMenuOpen(false);
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
      case 'timetable':
        return <TimetableView />;
      case 'calendar':
        return <CalendarView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <OverviewView />;
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
        role="admin"
        userName={userName}
        subtitle={adminNavLabel(currentView)}
        onMenu={() => setMenuOpen(true)}
      />

      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.content, isFullHeight && styles.contentFull]}
      >
        {renderContent()}
      </Animated.View>

      <AdminNavDrawer
        visible={menuOpen}
        activeView={currentView}
        userName={userName}
        onClose={() => setMenuOpen(false)}
        onSelect={onSelectView}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
    minHeight: 0,
  },
  contentFull: { paddingBottom: 0 },
});
