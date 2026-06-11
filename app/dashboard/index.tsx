import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import authService from '../../src/services/api/authService';
import { useAuth } from '../../src/context/AuthContext';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { StudentTabBar, StudentTab } from '../../src/components/student';
import { LoadingState } from '../../src/components/ui';
import { STUDENT, STUDENT_ANIMATION } from '../../src/theme/student';
import OverviewView from './_components/OverviewView';
import LearningPathsView from './_components/LearningPathsView';
import EduOTTView from './_components/EduOTTView';
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import ExamsTabView from './_components/ExamsTabView';
import AITabView from './_components/AITabView';
import ProfileTabView from './_components/ProfileTabView';
import VidyaAIFloatingAssistant from '../../src/components/vidya/VidyaAIFloatingAssistant';

type TabId = 'home' | 'learning' | 'eduott' | 'exams' | 'vidya' | 'settings';

const TABS: StudentTab[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { id: 'learning', label: 'Learning', icon: 'book-outline', activeIcon: 'book' },
  { id: 'eduott', label: 'EduOTT', icon: 'videocam-outline', activeIcon: 'videocam' },
  { id: 'exams', label: 'Exams', icon: 'document-text-outline', activeIcon: 'document-text' },
  { id: 'vidya', label: 'Vidya', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function StudentDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('home');
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
  }, [tab]);

  const firstName = useMemo(
    () => user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student',
    [user]
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

  const pad = { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 120 };

  const handleTabChange = (id: string) => {
    const next = id as TabId;
    if (next === activeTab) {
      tabScrollRefs[next]?.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setActiveTab(next);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView
            ref={homeScrollRef}
            style={styles.scroll}
            contentContainerStyle={pad}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STUDENT.primary} />
            }
            showsVerticalScrollIndicator={false}
          >
            <OverviewView
              user={user}
              onGoExams={() => setActiveTab('exams')}
              onOpenExam={(examId) => {
                setCalendarFocusExamId(examId);
                setActiveTab('exams');
              }}
              onGoProfile={() => setActiveTab('settings')}
              onLogout={handleLogout}
            />
          </ScrollView>
        );
      case 'learning':
        return (
          <ScrollView
            ref={learningScrollRef}
            style={styles.scroll}
            contentContainerStyle={pad}
            showsVerticalScrollIndicator={false}
          >
            <LearningPathsView />
          </ScrollView>
        );
      case 'eduott':
        return (
          <View style={[styles.scroll, styles.eduottPane]}>
            <EduOTTFilterProvider>
              <EduOTTView username={firstName} />
            </EduOTTFilterProvider>
          </View>
        );
      case 'exams':
        return (
          <View style={[styles.scroll, styles.examsPane, { paddingHorizontal: pad.paddingHorizontal, paddingTop: pad.paddingTop }]}>
            <ExamsTabView
              focusExamId={calendarFocusExamId}
              onFocusExamHandled={() => setCalendarFocusExamId(null)}
            />
          </View>
        );
      case 'vidya':
        return (
          <ScrollView
            ref={vidyaScrollRef}
            style={styles.scroll}
            contentContainerStyle={pad}
            showsVerticalScrollIndicator={false}
          >
            <AITabView />
          </ScrollView>
        );
      case 'settings':
        return (
          <ScrollView
            ref={settingsScrollRef}
            style={styles.scroll}
            contentContainerStyle={pad}
            showsVerticalScrollIndicator={false}
          >
            <ProfileTabView user={user} onLogout={() => router.replace('/auth/login')} />
          </ScrollView>
        );
      default:
        return null;
    }
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
      <Animated.View
        key={activeTab}
        entering={SlideInRight.duration(220).easing(Easing.inOut(Easing.ease))}
        exiting={SlideOutLeft.duration(220).easing(Easing.inOut(Easing.ease))}
        style={styles.tabContent}
      >
        {renderTabContent()}
      </Animated.View>

      <StudentTabBar tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <VidyaAIFloatingAssistant
        role="student"
        hidden={activeTab === 'vidya'}
        onPress={() => {
          if (activeTab === 'vidya') return;
          router.push('/ai-tutor');
        }}
      />
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
    paddingBottom: 120,
  },
  examsPane: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 120,
  },
});
