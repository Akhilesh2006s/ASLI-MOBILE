import React, {
  Suspense,
  lazy,
  useEffect,
  useState,
  startTransition,
  useCallback,
  useMemo,
} from 'react';
import { Alert, InteractionManager, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useVisitedTabs } from '../../src/hooks/useVisitedTabs';
import { consumeAdminDashboardTabIntent } from '../../src/lib/dashboard-tab-intent';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import { LoadingState, VisitedTabPane } from '../../src/components/ui';
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import VidyaAIFloatingAssistant from '../../src/components/vidya/VidyaAIFloatingAssistant';
import AdminNavDrawer, { adminNavLabel, type AdminNavView } from './_components/AdminNavDrawer';
import { AdminHeader, AdminTabBar, useAdminTheme } from './_ui';
import { useAdminResponsiveLayout } from './_ui/useAdminResponsiveLayout';

const OverviewView = lazy(() => import('./_components/OverviewView'));
const AnalyticsDashboardView = lazy(() => import('./_components/AnalyticsDashboardView'));
const StudentsView = lazy(() => import('./_components/StudentsView'));
const ClassesView = lazy(() => import('./_components/ClassesView'));
const TeachersView = lazy(() => import('./_components/TeachersView'));
const SubjectsView = lazy(() => import('./_components/SubjectsView'));
const ExamsView = lazy(() => import('./_components/ExamsView'));
const OmrResultsView = lazy(() => import('./_components/OmrResultsView'));
const AssessmentsView = lazy(() => import('./_components/AssessmentsView'));
const QuizzesView = lazy(() => import('./_components/QuizzesView'));
const LearningPathsView = lazy(() => import('./_components/LearningPathsView'));
const EduOTTView = lazy(() => import('./_components/EduOTTView'));
const VideosView = lazy(() => import('./_components/VideosView'));
const TimetableView = lazy(() => import('./_components/TimetableView'));
const CalendarView = lazy(() => import('./_components/CalendarView'));
const VidyaAIView = lazy(() => import('./_components/VidyaAIView'));

/** Keep overview + a couple recent tabs mounted; unmount older ones to cut lag. */
const MAX_VISITED_TABS = 3;

const ADMIN_VIEWS: AdminNavView[] = [
  'overview',
  'analytics',
  'students',
  'classes',
  'teachers',
  'subjects',
  'exams',
  'omr-results',
  'assessments',
  'quizzes',
  'learning-paths',
  'eduott',
  'videos',
  'timetable',
  'calendar',
  'vidya-ai',
];

function renderAdminView(
  view: AdminNavView,
  opts: { userName: string; adminId?: string | null; onNavigate: (v: AdminNavView) => void }
) {
  switch (view) {
    case 'overview':
      return <OverviewView onNavigate={opts.onNavigate} />;
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
    case 'omr-results':
      return <OmrResultsView />;
    case 'assessments':
      return <AssessmentsView />;
    case 'quizzes':
      return <QuizzesView />;
    case 'learning-paths':
      return <LearningPathsView />;
    case 'eduott':
      return (
        <EduOTTFilterProvider>
          <EduOTTView username={opts.userName} />
        </EduOTTFilterProvider>
      );
    case 'videos':
      return <VideosView />;
    case 'timetable':
      return <TimetableView />;
    case 'calendar':
      return <CalendarView />;
    case 'vidya-ai':
      return <VidyaAIView adminId={opts.adminId} adminName={opts.userName} />;
    default:
      return null;
  }
}

function TabFallback() {
  const { spacing } = useAdminTheme();
  return <LoadingState variant="stats" style={{ padding: spacing.lg, flex: 1 }} />;
}

export default function AdminDashboard() {
  const { signOut, user: authUser } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { spacing } = useAdminTheme();
  const { shellPaddingBottom, showBottomTabBar } = useAdminResponsiveLayout();
  const {
    active: currentView,
    visited: visitedViews,
    select: selectView,
    setActive: setActiveView,
  } = useVisitedTabs<AdminNavView>('overview', { maxVisited: MAX_VISITED_TABS });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [adminId, setAdminId] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<{ schoolName?: string; schoolLogo?: string } | null>(
    null
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const schoolUser =
    authUser?.role === 'admin'
      ? { schoolName: authUser.schoolName, schoolLogo: authUser.schoolLogo }
      : schoolProfile;

  useBackNavigation('/admin/dashboard', true);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const goToView = useCallback(
    (view: AdminNavView) => {
      startTransition(() => {
        selectView(view);
      });
    },
    [selectView],
  );

  /** Close drawer first, then switch after interactions — avoids animation + mount fighting. */
  const onSelectFromDrawer = useCallback(
    (view: AdminNavView) => {
      setMenuOpen(false);
      InteractionManager.runAfterInteractions(() => {
        goToView(view);
      });
    },
    [goToView],
  );

  useEffect(() => {
    checkAuth();
  }, []);

  // One-shot tab intent. Never persist ?tab= across reload.
  useEffect(() => {
    const intent = consumeAdminDashboardTabIntent();
    if (intent) {
      setActiveView(intent);
    }
    // Clear legacy sticky ?tab= from the URL without reopening that tab on reload.
    const raw = typeof tab === 'string' ? tab : Array.isArray(tab) ? tab[0] : undefined;
    if (raw) {
      router.replace('/admin/dashboard');
    }
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const subHide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      subShow.remove();
      subHide.remove();
    };
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
        setUserName(data.user.fullName || data.user.schoolName || 'Admin');
        setAdminId(String(data.user._id || data.user.id || ''));
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

  const resolvedAdminId =
    adminId || (authUser?._id || authUser?.id ? String(authUser._id || authUser.id) : null);

  const viewOpts = useMemo(
    () => ({
      userName,
      adminId: resolvedAdminId,
      onNavigate: goToView,
    }),
    [userName, resolvedAdminId, goToView],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LoadingState variant="stats" style={{ padding: spacing.lg, flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  const isDashboard = currentView === 'overview';
  const isVidya = currentView === 'vidya-ai';
  // Tab bar is in layout flow (not overlay) — content only needs light bottom pad.
  const contentBottomPad = isVidya ? 0 : shellPaddingBottom;
  const showTabs = showBottomTabBar && !(isVidya && keyboardOpen);


  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.shell}>
        <View style={styles.mainColumn}>
          <AdminHeader
            userName={userName}
            schoolUser={schoolUser ?? undefined}
            showSchoolBrand={isDashboard}
            subtitle={isDashboard ? 'Dashboard' : adminNavLabel(currentView)}
            onMenu={openMenu}
          />

          <View style={[styles.contentWrap, { paddingBottom: contentBottomPad }]}>
            <View style={styles.content}>
              {ADMIN_VIEWS.map((view) =>
                visitedViews.has(view) ? (
                  <VisitedTabPane key={view} visible={currentView === view}>
                    <Suspense fallback={<TabFallback />}>
                      {renderAdminView(view, viewOpts)}
                    </Suspense>
                  </VisitedTabPane>
                ) : null,
              )}
            </View>
          </View>

          {/* In-flow footer — never scrolls with tab content. */}
          {showTabs ? <AdminTabBar activeView={currentView} onTabChange={goToView} /> : null}
        </View>
      </View>

      <AdminNavDrawer
        visible={menuOpen}
        activeView={currentView}
        userName={userName}
        onClose={closeMenu}
        onSelect={onSelectFromDrawer}
        onLogout={handleLogout}
      />

      <VidyaAIFloatingAssistant
        role="admin"
        hidden={isVidya || keyboardOpen}
        onPress={() => goToView('vidya-ai')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2E3' },
  shell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    backgroundColor: '#EEF2E3',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: '#EEF2E3',
  },
  contentWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#EEF2E3',
  },
  content: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#EEF2E3',
  },
});
