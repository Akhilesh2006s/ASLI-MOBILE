import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import authService from '../../src/services/api/authService';
import teacherService, { type BackendStatus } from '../../src/services/api/teacherService';
import { useTeacherBackendStatus } from '../../src/hooks/useTeacherBackendStatus';
import { useAuth } from '../../src/context/AuthContext';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { TeacherTabBar, TeacherFAB, TeacherHeader, TeacherShimmer } from '../../src/components/teacher';
import { BottomSheet } from '../../src/components/ui';
import type { TeacherTab, FabAction } from '../../src/components/teacher';
import { TEACHER, TEACHER_SPACING, teacherGreeting } from '../../src/theme/teacher';
import { Ionicons } from '@expo/vector-icons';
import AIClassesView from './components/AIClassesView';
import StudentsView from './components/StudentsView';
import EduOTTView from './components/EduOTTView';
import LearningPathsView from './components/LearningPathsView';
import VidyaAIView from './components/VidyaAIView';
import ContentView from './components/ContentView';
import ProfileView from './components/ProfileView';

/** Matches web teacher dashboard tabs */
type TabId = 'dashboard' | 'students' | 'eduott' | 'learning-paths' | 'vidya-ai';

const TABS: TeacherTab[] = [
  { id: 'dashboard', label: 'Home', icon: 'grid-outline', activeIcon: 'grid' },
  { id: 'students', label: 'Students', icon: 'people-outline', activeIcon: 'people' },
  { id: 'eduott', label: 'EduOTT', icon: 'play-circle-outline', activeIcon: 'play-circle' },
  { id: 'learning-paths', label: 'Paths', icon: 'book-outline', activeIcon: 'book' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

type NavTarget = {
  tab?: TabId;
  studentsSub?: 'list' | 'track-progress' | 'submissions' | 'daily' | 'remarks';
  dashboardSub?: 'classes' | 'timetable' | 'schedule';
  contentSub?: 'assessments' | 'videos' | 'homework' | 'quizzes';
};

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [navTarget, setNavTarget] = useState<NavTarget>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlay, setOverlay] = useState<'content' | 'profile' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    pendingGrades: 0,
    totalVideos: 0,
  });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [nextClass, setNextClass] = useState<{ label: string; countdown: string } | null>(null);
  const [stale, setStale] = useState(false);
  const { status: backendStatus, refresh: refreshBackendStatus } = useTeacherBackendStatus(false);

  useBackNavigation('/teacher/dashboard', true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const auth = await authService.getStoredAuth();
      if (!auth.token || auth.role !== 'teacher') {
        router.replace('/auth/login');
        return;
      }

      const [meRes, dashRes, subjectsRes, timetableRes] = await Promise.allSettled([
        teacherService.me(),
        teacherService.dashboard(),
        teacherService.subjects(),
        teacherService.timetable(),
      ]);

      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.data?.user ?? meRes.value.data);
        setStale(meRes.value.stale);
      }

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        const s = d?.stats ?? d;
        setStats({
          totalStudents: s?.totalStudents ?? d?.students?.length ?? 0,
          totalClasses: s?.totalClasses ?? d?.assignedClasses?.length ?? 0,
          pendingGrades: s?.pendingGrades ?? 0,
          totalVideos: s?.totalVideos ?? d?.videos?.length ?? 0,
        });
        setStale((prev) => prev || dashRes.value.stale);
      }

      if (subjectsRes.status === 'fulfilled') {
        const subs = subjectsRes.value.data ?? [];
        setSubjects(subs.map((s: any) => s.name || s.title).filter(Boolean));
      }

      if (timetableRes.status === 'fulfilled') {
        computeNextClass(timetableRes.value.data ?? []);
      }

      await refreshBackendStatus();
    } catch {
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const computeNextClass = (entries: any[]) => {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = dayNames[now.getDay()];
    const todayEntries = entries
      .filter((e) => (e.dayOfWeek || e.day) === today && e.status !== 'Completed')
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    const upcoming = todayEntries.find((e) => {
      const [h, m] = String(e.startTime || '00:00').split(':').map(Number);
      const slot = new Date(now);
      slot.setHours(h, m, 0, 0);
      return slot >= now;
    });
    if (upcoming) {
      setNextClass({
        label: `${upcoming.subject || 'Class'} · ${upcoming.classNumber || ''} · ${upcoming.startTime}`,
        countdown: formatCountdown(upcoming.startTime),
      });
    }
  };

  const formatCountdown = (startTime: string) => {
    const now = new Date();
    const [h, m] = String(startTime).split(':').map(Number);
    const slot = new Date(now);
    slot.setHours(h, m, 0, 0);
    const diff = slot.getTime() - now.getTime();
    if (diff <= 0) return 'Now';
    const mins = Math.floor(diff / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await teacherService.invalidateCache();
    await loadData();
    await refreshBackendStatus();
    setRefreshing(false);
  };

  const resolvedBackendStatus: BackendStatus =
    backendStatus === 'online' && stale ? 'cached' : backendStatus;

  const userName = useMemo(() => {
    const name = user?.fullName || user?.name || 'Teacher';
    return `${teacherGreeting()}, ${name.split(' ')[0]}`;
  }, [user]);

  const navigate = (target: NavTarget) => {
    if (target.tab) setActiveTab(target.tab);
    setNavTarget(target);
    setOverlay(null);
    setMenuOpen(false);
  };

  const fabActions: FabAction[] = [
    { id: 'attendance', label: 'Attendance', icon: 'checkmark-circle-outline', onPress: () => router.push('/teacher/attendance') },
    { id: 'homework', label: 'Homework', icon: 'document-text-outline', onPress: () => navigate({ tab: 'students', studentsSub: 'submissions' }) },
    { id: 'schedule', label: 'Schedule', icon: 'calendar-outline', onPress: () => navigate({ tab: 'dashboard', dashboardSub: 'schedule' }) },
    { id: 'remark', label: 'Remark', icon: 'chatbubble-outline', onPress: () => navigate({ tab: 'students', studentsSub: 'list' }) },
  ];

  const renderTab = () => {
    if (overlay === 'content') {
      return <ContentView initialSubTab={navTarget.contentSub} />;
    }
    if (overlay === 'profile') {
      return (
        <ProfileView
          user={user}
          stats={stats}
          onNavigate={(tab, sub) => {
            if (tab === 'content') {
              setOverlay('content');
              setNavTarget({ contentSub: sub as any });
            } else {
              navigate({ tab: tab as TabId, dashboardSub: sub as any, studentsSub: sub as any });
            }
          }}
          onLogout={() =>
            Alert.alert('Logout', 'Sign out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                  await signOut();
                  router.replace('/auth/login');
                },
              },
            ])
          }
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <AIClassesView
            stats={stats}
            initialSubTab={navTarget.dashboardSub}
            onOpenProgress={(classNum, studentId) =>
              navigate({
                tab: 'students',
                studentsSub: 'track-progress',
              })
            }
          />
        );
      case 'students':
        return (
          <StudentsView
            initialSubTab={navTarget.studentsSub}
            progressClassFilter={undefined}
            progressStudentId={undefined}
          />
        );
      case 'eduott':
        return <EduOTTView />;
      case 'learning-paths':
        return <LearningPathsView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <AIClassesView stats={stats} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <TeacherShimmer variant="stats" />
        <TeacherShimmer variant="card" count={2} />
      </SafeAreaView>
    );
  }

  const isFullHeight =
    activeTab === 'vidya-ai' || activeTab === 'students' || !!overlay;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <TeacherHeader
        userName={userName}
        subjects={subjects}
        nextClassLabel={nextClass?.label}
        countdown={nextClass?.countdown}
        stale={stale}
        backendStatus={resolvedBackendStatus}
        onMenu={() => setMenuOpen(true)}
        onProfile={() => setOverlay(overlay === 'profile' ? null : 'profile')}
      />

      {overlay ? (
        <Pressable style={styles.overlayBar} onPress={() => setOverlay(null)}>
          <Ionicons name="arrow-back" size={18} color={TEACHER.primaryLight} />
          <Text style={styles.overlayText}>{overlay === 'content' ? 'Content Manager' : 'Profile & More'}</Text>
        </Pressable>
      ) : null}

      {resolvedBackendStatus === 'offline' ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color={TEACHER.danger} />
          <Text style={styles.offlineBannerText}>Cannot reach server. Pull down to retry.</Text>
        </View>
      ) : null}

      <Animated.View entering={FadeIn.duration(200)} style={[styles.content, isFullHeight && styles.contentFull]}>
        {isFullHeight ? (
          renderTab()
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEACHER.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {renderTab()}
          </ScrollView>
        )}
      </Animated.View>

      {!overlay ? (
        <TeacherTabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(id) => {
            setNavTarget({});
            setActiveTab(id as TabId);
          }}
        />
      ) : null}

      {!overlay ? <TeacherFAB actions={fabActions} bottomOffset={78} /> : null}

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <Pressable style={styles.menuItem} onPress={() => { setOverlay('content'); setMenuOpen(false); }}>
          <Ionicons name="folder-open-outline" size={20} color={TEACHER.primaryLight} />
          <Text style={styles.menuText}>Content Manager</Text>
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => router.push('/teacher/attendance' as any)}>
          <Ionicons name="checkmark-done-outline" size={20} color={TEACHER.primaryLight} />
          <Text style={styles.menuText}>Attendance</Text>
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => navigate({ tab: 'dashboard', dashboardSub: 'timetable' })}>
          <Ionicons name="calendar-outline" size={20} color={TEACHER.primaryLight} />
          <Text style={styles.menuText}>Timetable</Text>
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => navigate({ tab: 'students', studentsSub: 'daily' })}>
          <Ionicons name="journal-outline" size={20} color={TEACHER.primaryLight} />
          <Text style={styles.menuText}>Work Diary</Text>
        </Pressable>
        <Pressable style={[styles.menuItem, styles.logoutItem]} onPress={() => {
          setMenuOpen(false);
          Alert.alert('Logout', 'Sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth/login'); } },
          ]);
        }}>
          <Ionicons name="log-out-outline" size={20} color={TEACHER.danger} />
          <Text style={[styles.menuText, { color: TEACHER.danger }]}>Logout</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TEACHER.bg },
  content: { flex: 1, minHeight: 0 },
  contentFull: { paddingBottom: 0 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120, paddingTop: TEACHER_SPACING.sm },
  overlayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  overlayText: { color: TEACHER.primaryLight, fontWeight: '700' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingVertical: TEACHER_SPACING.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  offlineBannerText: {
    flex: 1,
    color: TEACHER.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    paddingVertical: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  menuText: { fontSize: 16, fontWeight: '600', color: TEACHER.text },
  logoutItem: { borderBottomWidth: 0 },
});
