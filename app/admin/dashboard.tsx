import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import { LoadingState } from '../../src/components/ui';
import OverviewView from './_components/OverviewView';
import AnalyticsDashboardView from './_components/AnalyticsDashboardView';
import StudentsView from './_components/StudentsView';
import ClassesView from './_components/ClassesView';
import TeachersView from './_components/TeachersView';
import SubjectsView from './_components/SubjectsView';
import ExamsView from './_components/ExamsView';
import AssessmentsView from './_components/AssessmentsView';
import QuizzesView from './_components/QuizzesView';
import LearningPathsView from './_components/LearningPathsView';
import EduOTTView from './_components/EduOTTView';
import VideosView from './_components/VideosView';
import TimetableView from './_components/TimetableView';
import CalendarView from './_components/CalendarView';
import SchoolManagementView from './_components/SchoolManagementView';
import VidyaAIView from './_components/VidyaAIView';
import AdminNavDrawer, { adminNavLabel, type AdminNavView } from './_components/AdminNavDrawer';
import { AdminHeader, AdminTabBar, useAdminTheme } from './_ui';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { colors, spacing } = useAdminTheme();
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
    if (tab === 'overview') setCurrentView('overview');
    else if (tab === 'students') setCurrentView('students');
    else if (tab === 'classes') setCurrentView('classes');
    else if (tab === 'teachers') setCurrentView('teachers');
    else if (tab === 'vidya-ai') setCurrentView('vidya-ai');
    else if (tab === 'eduott') setCurrentView('eduott');
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
        return <OverviewView onNavigate={onSelectView} />;
      case 'analytics':
        return <AnalyticsDashboardView />;
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
      case 'assessments':
        return <AssessmentsView />;
      case 'quizzes':
        return <QuizzesView />;
      case 'learning-paths':
        return <LearningPathsView />;
      case 'eduott':
        return <EduOTTView />;
      case 'videos':
        return <VideosView />;
      case 'timetable':
        return <TimetableView />;
      case 'calendar':
        return <CalendarView />;
      case 'school-management':
        return <SchoolManagementView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <OverviewView onNavigate={onSelectView} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
        <LoadingState variant="stats" style={{ padding: spacing.lg, flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  const isDashboard = currentView === 'overview';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <AdminHeader
          userName={userName}
          subtitle={isDashboard ? 'Dashboard' : adminNavLabel(currentView)}
          onMenu={() => setMenuOpen(true)}
        />

        <View style={[styles.contentWrap, { backgroundColor: colors.bg }]}>
          <Animated.View key={currentView} entering={FadeIn.duration(200)} style={styles.content}>
            {renderContent()}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <AdminTabBar activeView={currentView} onTabChange={setCurrentView} />

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
  container: { flex: 1 },
  contentWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
});
