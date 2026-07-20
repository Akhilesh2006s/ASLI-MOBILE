import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useVisitedTabs } from '../../src/hooks/useVisitedTabs';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import { LoadingState, VisitedTabPane } from '../../src/components/ui';
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
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import VideosView from './_components/VideosView';
import TimetableView from './_components/TimetableView';
import CalendarView from './_components/CalendarView';
import VidyaAIView from './_components/VidyaAIView';
import VidyaAIFloatingAssistant from '../../src/components/vidya/VidyaAIFloatingAssistant';
import AdminNavDrawer, { adminNavLabel, type AdminNavView } from './_components/AdminNavDrawer';
import { AdminHeader, AdminTabBar, useAdminTheme } from './_ui';
import { useAdminResponsiveLayout } from './_ui/useAdminResponsiveLayout';

export default function AdminDashboard() {
  const { signOut, user: authUser } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { colors, spacing } = useAdminTheme();
  const { shellPaddingBottom, showBottomTabBar } = useAdminResponsiveLayout();
  const { active: currentView, visited: visitedViews, select: selectView, setActive: setCurrentView } =
    useVisitedTabs<AdminNavView>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [schoolProfile, setSchoolProfile] = useState<{ schoolName?: string; schoolLogo?: string } | null>(null);
  const schoolUser =
    authUser?.role === 'admin'
      ? { schoolName: authUser.schoolName, schoolLogo: authUser.schoolLogo }
      : schoolProfile;

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
        setSchoolProfile({
          schoolName: data.user.schoolName,
          schoolLogo: data.user.schoolLogo,
        });
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
    selectView(view);
    setMenuOpen(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingState variant="stats" style={{ padding: spacing.lg, flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  const isDashboard = currentView === 'overview';

  const mainColumn = (
    <KeyboardAvoidingView
      style={styles.mainColumn}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AdminHeader
        userName={userName}
        schoolUser={schoolUser ?? undefined}
        showSchoolBrand={isDashboard}
        subtitle={isDashboard ? 'Dashboard' : adminNavLabel(currentView)}
        onMenu={() => setMenuOpen(true)}
      />

      <View
        style={[
          // Transparent so the shared app background artwork shows through.
          styles.contentWrap,
          { paddingBottom: shellPaddingBottom },
        ]}
      >
        <View style={styles.content}>
          {visitedViews.has('overview') ? (
            <VisitedTabPane visible={currentView === 'overview'}>
              <OverviewView onNavigate={onSelectView} />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('analytics') ? (
            <VisitedTabPane visible={currentView === 'analytics'}>
              <AnalyticsDashboardView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('students') ? (
            <VisitedTabPane visible={currentView === 'students'}>
              <StudentsView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('classes') ? (
            <VisitedTabPane visible={currentView === 'classes'}>
              <ClassesView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('teachers') ? (
            <VisitedTabPane visible={currentView === 'teachers'}>
              <TeachersView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('subjects') ? (
            <VisitedTabPane visible={currentView === 'subjects'}>
              <SubjectsView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('exams') ? (
            <VisitedTabPane visible={currentView === 'exams'}>
              <ExamsView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('assessments') ? (
            <VisitedTabPane visible={currentView === 'assessments'}>
              <AssessmentsView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('quizzes') ? (
            <VisitedTabPane visible={currentView === 'quizzes'}>
              <QuizzesView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('learning-paths') ? (
            <VisitedTabPane visible={currentView === 'learning-paths'}>
              <LearningPathsView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('eduott') ? (
            <VisitedTabPane visible={currentView === 'eduott'}>
              <EduOTTFilterProvider>
                <EduOTTView username={userName} />
              </EduOTTFilterProvider>
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('videos') ? (
            <VisitedTabPane visible={currentView === 'videos'}>
              <VideosView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('timetable') ? (
            <VisitedTabPane visible={currentView === 'timetable'}>
              <TimetableView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('calendar') ? (
            <VisitedTabPane visible={currentView === 'calendar'}>
              <CalendarView />
            </VisitedTabPane>
          ) : null}
          {visitedViews.has('vidya-ai') ? (
            <VisitedTabPane visible={currentView === 'vidya-ai'}>
              <VidyaAIView />
            </VisitedTabPane>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.shell}>
        {mainColumn}
      </View>

      {showBottomTabBar ? <AdminTabBar activeView={currentView} onTabChange={setCurrentView} /> : null}

      <AdminNavDrawer
        visible={menuOpen}
        activeView={currentView}
        userName={userName}
        onClose={() => setMenuOpen(false)}
        onSelect={onSelectView}
        onLogout={handleLogout}
      />

      <VidyaAIFloatingAssistant
        role="admin"
        hidden={currentView === 'vidya-ai'}
        onPress={() => onSelectView('vidya-ai')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  shell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  contentWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
});
