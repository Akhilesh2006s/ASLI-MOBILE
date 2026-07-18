import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import authService from '../../src/services/api/authService';
import { useAuth } from '../../src/context/AuthContext';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useVisitedTabs } from '../../src/hooks/useVisitedTabs';
import { StudentTabBar, StudentTab } from '../../src/components/student';
import { LoadingState, VisitedTabPane } from '../../src/components/ui';
import { STUDENT } from '../../src/theme/student';
import OverviewView from './_components/OverviewView';
import LearningPathsView from './_components/LearningPathsView';
import EduOTTView from './_components/EduOTTView';
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import ExamsTabView from './_components/ExamsTabView';
import AITabView from './_components/AITabView';
import ProfileTabView from './_components/ProfileTabView';
import VidyaAIFloatingAssistant from '../../src/components/vidya/VidyaAIFloatingAssistant';
import { useVidyaChatAccess } from '../../src/hooks/useVidyaChatAccess';
import { resolveStudentFirstName } from '../../src/lib/student-text';
import { studentFloatingTabBarReserve } from '../../src/lib/responsive-layout';

type TabId = 'home' | 'learning' | 'eduott' | 'exams' | 'vidya' | 'settings';

const ALL_TABS: StudentTab[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { id: 'learning', label: 'Learning', icon: 'book-outline', activeIcon: 'book' },
  { id: 'eduott', label: 'EduOTT', icon: 'videocam-outline', activeIcon: 'videocam' },
  { id: 'exams', label: 'Exams', icon: 'document-outline', activeIcon: 'document' },
  { id: 'vidya', label: 'Vidya', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function StudentDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { active: activeTab, visited: visitedTabs, select: selectTab, setActive: setActiveTab } =
    useVisitedTabs<TabId>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarFocusExamId, setCalendarFocusExamId] = useState<string | null>(null);

  const homeScrollRef = useRef<ScrollView>(null);
  const learningScrollRef = useRef<ScrollView>(null);
  const vidyaScrollRef = useRef<ScrollView>(null);
  const settingsScrollRef = useRef<ScrollView>(null);

  const tabScrollRefs: Partial<Record<TabId, React.RefObject<ScrollView | null>>> = {
    home: homeScrollRef,
    learning: learningScrollRef,
    vidya: vidyaScrollRef,
    settings: settingsScrollRef,
  };

  useBackNavigation('/dashboard', true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (tab === 'home') setActiveTab('home');
    else if (tab === 'learning') setActiveTab('learning');
    else if (tab === 'eduott') setActiveTab('eduott');
    else if (tab === 'exams') setActiveTab('exams');
    else if (tab === 'vidya') setActiveTab('vidya');
    else if (tab === 'settings') setActiveTab('settings');
  }, [tab, user]);

  const firstName = useMemo(() => resolveStudentFirstName(user), [user]);

  const vidyaChatEnabled = useVidyaChatAccess(user);

  const studentTabs = useMemo(
    () =>
      vidyaChatEnabled
        ? ALL_TABS
        : ALL_TABS.map((t) =>
            t.id === 'vidya'
              ? { ...t, label: 'AI Tools', icon: 'sparkles-outline' as const, activeIcon: 'sparkles' as const }
              : t
          ),
    [vidyaChatEnabled]
  );

  const checkAuth = async () => {
    try {
      const auth = await authService.getStoredAuth();
      if (!auth.token || auth.role !== 'student') {
        router.replace('/auth/login');
        return;
      }
      setIsAuthenticated(true);
      const data = await authService.me();
      if (data?.user?.role !== 'student') {
        await authService.clearAuth();
        router.replace('/auth/login');
        return;
      }
      setUser(data.user);
    } catch (error) {
      const message = String((error as any)?.message || '').toLowerCase();
      if (
        message.includes('network request failed') ||
        message.includes('network error') ||
        message.includes('timeout')
      ) {
        setIsAuthenticated(true);
        return;
      }
      await authService.clearAuth();
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = windowWidth >= 768;
  const eduottTabBarGap = studentFloatingTabBarReserve(insets.bottom);
  const pad = { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 140 };
  const homePad = isTablet ? { ...pad, paddingHorizontal: 20 } : pad;

  const handleTabChange = (id: string) => {
    const next = id as TabId;
    if (next === activeTab) {
      tabScrollRefs[next]?.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    selectTab(next);
  };

  const goToTab = (next: TabId) => {
    selectTab(next);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" translucent={false} backgroundColor={STUDENT.bg} />
        <LoadingState variant="stats" style={{ padding: 16 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" translucent={false} backgroundColor={STUDENT.bg} />
      <View style={styles.tabContent}>
        {visitedTabs.has('home') ? (
          <VisitedTabPane visible={activeTab === 'home'}>
            <ScrollView
              ref={homeScrollRef}
              style={styles.scroll}
              contentContainerStyle={homePad}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STUDENT.primary} />
              }
              showsVerticalScrollIndicator={false}
            >
              <OverviewView
                user={user}
                onGoExams={() => goToTab('exams')}
                onOpenExam={(examId) => {
                  setCalendarFocusExamId(examId);
                  goToTab('exams');
                }}
                onGoProfile={() => goToTab('settings')}
                onLogout={handleLogout}
              />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('learning') ? (
          <VisitedTabPane visible={activeTab === 'learning'}>
            <ScrollView
              ref={learningScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
            >
              <LearningPathsView />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('eduott') ? (
          <VisitedTabPane visible={activeTab === 'eduott'}>
            <View style={[styles.scroll, styles.eduottPane, { marginBottom: eduottTabBarGap }]}>
              <EduOTTFilterProvider>
                <EduOTTView username={firstName} />
              </EduOTTFilterProvider>
            </View>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('exams') ? (
          <VisitedTabPane visible={activeTab === 'exams'}>
            <View
              style={[
                styles.scroll,
                styles.examsPane,
                { paddingHorizontal: pad.paddingHorizontal, paddingTop: pad.paddingTop },
              ]}
            >
              <ExamsTabView
                focusExamId={calendarFocusExamId}
                onFocusExamHandled={() => setCalendarFocusExamId(null)}
              />
            </View>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('vidya') ? (
          <VisitedTabPane visible={activeTab === 'vidya'}>
            <ScrollView
              ref={vidyaScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
            >
              <AITabView chatEnabled={vidyaChatEnabled} />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('settings') ? (
          <VisitedTabPane visible={activeTab === 'settings'}>
            <ScrollView
              ref={settingsScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
            >
              <ProfileTabView user={user} onLogout={() => router.replace('/auth/login')} />
            </ScrollView>
          </VisitedTabPane>
        ) : null}
      </View>

      <StudentTabBar tabs={studentTabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {vidyaChatEnabled ? (
        <VidyaAIFloatingAssistant
          role="student"
          hidden={activeTab === 'vidya'}
          onPress={() => {
            router.push('/ai-tutor');
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STUDENT.bg,
  },
  tabContent: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  eduottPane: {
    flex: 1,
  },
  examsPane: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 140,
  },
});
