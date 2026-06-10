import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import authService from '../../src/services/api/authService';
import teacherService, { type BackendStatus } from '../../src/services/api/teacherService';
import { useTeacherBackendStatus } from '../../src/hooks/useTeacherBackendStatus';
import { useAuth } from '../../src/context/AuthContext';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { TeacherTabBar, TeacherHeader, TeacherShimmer } from '../../src/components/teacher';
import { BottomSheet } from '../../src/components/ui';
import type { TeacherTab } from '../../src/components/teacher';
import { formatSubjectLabel, resolveTeacherDisplayName } from '../../src/lib/teacher-text';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../src/theme/teacher';
import { Ionicons } from '@expo/vector-icons';
import AIClassesView from './_components/AIClassesView';
import StudentsView from './_components/StudentsView';
import EduOTTView from './_components/EduOTTView';
import LearningPathsView from './_components/LearningPathsView';
import VidyaAIView from './_components/VidyaAIView';
import ContentView from './_components/ContentView';
import ProfileView from './_components/ProfileView';

/** Matches web teacher dashboard tabs */
type TabId = 'dashboard' | 'students' | 'eduott' | 'learning-paths' | 'vidya-ai';

const TABS: TeacherTab[] = [
  { id: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { id: 'students', label: 'Students', icon: 'people-outline', activeIcon: 'people' },
  { id: 'eduott', label: 'EduOTT', icon: 'play-circle-outline', activeIcon: 'play-circle' },
  { id: 'learning-paths', label: 'Paths', icon: 'book-outline', activeIcon: 'book' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

const TAB_PAGE_TITLES: Record<TabId, string> = {
  dashboard: 'Home',
  students: 'Students',
  eduott: 'EduOTT',
  'learning-paths': 'Learning Paths',
  'vidya-ai': 'Vidya AI',
};

type NavTarget = {
  tab?: TabId;
  studentsSub?: 'list' | 'track-progress' | 'submissions' | 'daily' | 'remarks';
  dashboardSub?: 'classes' | 'timetable' | 'schedule';
  contentSub?: 'assessments' | 'videos' | 'homework' | 'quizzes';
  progressClassFilter?: string;
  progressStudentId?: string;
};

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const press = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.menuItem, danger && styles.logoutItem, press.style]}>
        <LinearGradient
          colors={[TEACHER.primary + '30', TEACHER.primaryDark + '20']}
          style={styles.menuIconBadge}
        >
          <Ionicons name={icon} size={16} color={danger ? TEACHER.danger : TEACHER.primaryLight} />
        </LinearGradient>
        <Text style={[styles.menuText, danger && { color: TEACHER.danger }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [navTarget, setNavTarget] = useState<NavTarget>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlay, setOverlay] = useState<'content' | 'profile' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [learningPathsRefreshKey, setLearningPathsRefreshKey] = useState(0);
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
  const scrollRef = useRef<ScrollView>(null);

  useBackNavigation('/teacher/dashboard', true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tab === 'eduott') setActiveTab('eduott');
    else if (tab === 'learning-paths') setActiveTab('learning-paths');
    else if (tab === 'vidya-ai') setActiveTab('vidya-ai');
    else if (tab === 'students') setActiveTab('students');
    else if (tab === 'dashboard') setActiveTab('dashboard');
  }, [tab]);

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
        const names = subs
          .map((s: any) => String(s.name || s.title || '').trim())
          .filter(Boolean);
        setSubjects([...new Set(names)]);
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
        label: `${formatSubjectLabel(upcoming.subject || 'Class')} · Class ${upcoming.classNumber || '—'} · ${upcoming.startTime}`,
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
    setLearningPathsRefreshKey((key) => key + 1);
    setRefreshing(false);
  };

  const resolvedBackendStatus: BackendStatus =
    backendStatus === 'online' && stale ? 'cached' : backendStatus;

  const navigate = (target: NavTarget) => {
    if (target.tab) setActiveTab(target.tab);
    setNavTarget(target);
    setOverlay(null);
    setMenuOpen(false);
  };

  const handleLogout = () => {
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
    ]);
  };

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
                progressClassFilter: classNum,
                progressStudentId: studentId,
              })
            }
          />
        );
      case 'students':
        return (
          <StudentsView
            initialSubTab={navTarget.studentsSub}
            progressClassFilter={navTarget.progressClassFilter}
            progressStudentId={navTarget.progressStudentId}
          />
        );
      case 'eduott':
        return <EduOTTView />;
      case 'learning-paths':
        return <LearningPathsView refreshKey={learningPathsRefreshKey} />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <AIClassesView stats={stats} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <TeacherShimmer variant="stats" />
        <TeacherShimmer variant="card" count={2} />
      </SafeAreaView>
    );
  }

  const isFullHeight =
    activeTab === 'vidya-ai' || activeTab === 'students' || !!overlay;

  const showHomeHeader = activeTab === 'dashboard' && !overlay;
  const headerTitle =
    overlay === 'content'
      ? 'Content Manager'
      : overlay === 'profile'
        ? 'Profile'
        : TAB_PAGE_TITLES[activeTab];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={showHomeHeader ? '#7DD3FC' : TEACHER.bg}
      />
      <TeacherHeader
        variant={showHomeHeader ? 'home' : 'compact'}
        title={headerTitle}
        displayName={resolveTeacherDisplayName(user)}
        subjects={showHomeHeader ? subjects : []}
        nextClassLabel={showHomeHeader ? nextClass?.label : undefined}
        countdown={showHomeHeader ? nextClass?.countdown : undefined}
        onLogout={handleLogout}
      />

      {refreshing ? (
        <Animated.Text entering={FadeIn.duration(200)} style={styles.syncingText}>
          Syncing data…
        </Animated.Text>
      ) : null}

      {overlay ? (
        <Pressable style={styles.overlayBar} onPress={() => setOverlay(null)}>
          <Ionicons name="arrow-back" size={18} color={TEACHER.primaryLight} />
          <Text style={styles.overlayText}>{overlay === 'content' ? 'Content Manager' : 'Profile & More'}</Text>
        </Pressable>
      ) : null}

      {resolvedBackendStatus === 'offline' ? (
        <LinearGradient
          colors={['#FEE2E2', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.offlineBanner}
        >
          <Ionicons name="cloud-offline" size={16} color={TEACHER.danger} />
          <Text style={styles.offlineBannerText}>Cannot reach server. Pull down to retry.</Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </LinearGradient>
      ) : null}

      <Animated.View
        key={activeTab + (overlay ?? '')}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={[styles.content, isFullHeight && styles.contentFull]}
      >
        {isFullHeight ? (
          renderTab()
        ) : (
          <ScrollView
            ref={scrollRef}
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
            if (id === activeTab && !['students', 'vidya-ai'].includes(id)) {
              scrollRef.current?.scrollTo({ y: 0, animated: true });
              return;
            }
            setNavTarget({});
            setActiveTab(id as TabId);
          }}
        />
      ) : null}

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <MenuItem
          icon="folder-open-outline"
          label="Content Manager"
          onPress={() => { setOverlay('content'); setMenuOpen(false); }}
        />
        <MenuItem
          icon="checkmark-done-outline"
          label="Attendance"
          onPress={() => { setMenuOpen(false); router.push('/teacher/attendance' as any); }}
        />
        <MenuItem
          icon="calendar-outline"
          label="Timetable"
          onPress={() => navigate({ tab: 'dashboard', dashboardSub: 'timetable' })}
        />
        <MenuItem
          icon="journal-outline"
          label="Work Diary"
          onPress={() => navigate({ tab: 'students', studentsSub: 'daily' })}
        />
        <MenuItem
          icon="log-out-outline"
          label="Logout"
          danger
          onPress={() => {
            setMenuOpen(false);
            Alert.alert('Logout', 'Sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth/login'); } },
            ]);
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TEACHER.bg },
  content: { flex: 1, minHeight: 0 },
  contentFull: { paddingBottom: 80 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120, paddingTop: TEACHER_SPACING.sm },
  syncingText: {
    fontSize: 11,
    color: TEACHER.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
  overlayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: TEACHER_SPACING.lg,
    marginVertical: TEACHER_SPACING.sm,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
  },
  overlayText: { color: TEACHER.text, fontWeight: '800', fontSize: 16 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,77,106,0.35)',
  },
  offlineBannerText: {
    flex: 1,
    color: TEACHER.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  retryText: {
    color: TEACHER.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    paddingVertical: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  menuIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { fontSize: 16, fontWeight: '700', color: TEACHER.text, flex: 1 },
  logoutItem: { borderBottomWidth: 0, borderColor: 'rgba(255,77,106,0.25)' },
});
