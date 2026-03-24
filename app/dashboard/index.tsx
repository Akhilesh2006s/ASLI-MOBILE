import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import authService from '../../src/services/api/authService';
import { useAuth } from '../../src/context/AuthContext';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import OverviewView from './components/OverviewView';
import LearningPathsView from './components/LearningPathsView';
import VidyaAIView from './components/VidyaAIView';
import EduOTTView from './components/EduOTTView';
import ExamsView from './components/ExamsView';

/** Same four links as website header (Navigation.tsx): Learning Paths, EduOTT, Exams, Vidya AI */
type DashboardView = 'overview' | 'learning-paths' | 'eduott' | 'exams' | 'vidya-ai';

const navItems: { view: Exclude<DashboardView, 'overview'>; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { view: 'learning-paths', label: 'Learning Paths', icon: 'book-outline' },
  { view: 'eduott', label: 'EduOTT', icon: 'videocam-outline' },
  { view: 'exams', label: 'Exams', icon: 'document-outline' },
  { view: 'vidya-ai', label: 'Vidya AI', icon: 'chatbubble-ellipses-outline' },
];

const THEME = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  teal: '#14b8a6',
  text: '#111827',
  muted: '#6b7280',
  card: '#ffffff',
  bg: '#f0f9ff',
  border: '#e5e7eb',
};

export default function StudentDashboard() {
  const { signOut } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  const compact = width < 380;
  const isTablet = width >= 768;
  const sidePadding = compact ? 12 : 16;
  const ui = useMemo(
    () => ({
      headerPadTop: isTablet ? 14 : compact ? 10 : 12,
      headerPadBottom: isTablet ? 22 : compact ? 16 : 18,
      headerRadius: isTablet ? 32 : compact ? 22 : 28,
      brandTitle: isTablet ? 19 : compact ? 14 : 16,
      brandTagline: isTablet ? 13 : compact ? 10 : 11,
      title: isTablet ? 34 : compact ? 25 : 30,
      subtitle: isTablet ? 14 : compact ? 11 : 13,
      desc: isTablet ? 15 : compact ? 12 : 14,
      navText: isTablet ? 14 : compact ? 11 : 12,
      navPadX: isTablet ? 16 : compact ? 10 : 13,
      navPadY: isTablet ? 11 : compact ? 7 : 9,
      statusText: isTablet ? 13 : compact ? 11 : 12,
      logoutText: compact ? 0 : isTablet ? 14 : 13,
      cardPad: isTablet ? 18 : compact ? 12 : 14,
      fabSize: isTablet ? 58 : compact ? 48 : 54,
      avatarSize: isTablet ? 42 : compact ? 34 : 38,
    }),
    [compact, isTablet]
  );

  useBackNavigation('/dashboard', true);

  useEffect(() => {
    checkAuth();
  }, []);

  const screenTitle = useMemo(() => {
    if (currentView === 'overview') return 'Dashboard';
    return navItems.find((item) => item.view === currentView)?.label ?? 'Dashboard';
  }, [currentView]);
  const firstName = useMemo(
    () => user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student',
    [user]
  );

  const checkAuth = async () => {
    try {
      const auth = await authService.getStoredAuth();
      const token = auth.token;
      const userRole = auth.role;

      if (!token || userRole !== 'student') {
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
      console.error('Auth check failed:', error);
      const message = String((error as any)?.message || '').toLowerCase();
      const isNetworkIssue =
        message.includes('network request failed') ||
        message.includes('network error') ||
        message.includes('timeout');

      if (isNetworkIssue) {
        setIsAuthenticated(true);
        return;
      }

      await authService.clearAuth();
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      await authService.clearAuth();
    } finally {
      router.replace('/auth/login');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);
  };

  const goToOverview = () => setCurrentView('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView user={user} />;
      case 'learning-paths':
        return <LearningPathsView />;
      case 'eduott':
        return <EduOTTView username={user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'} />;
      case 'exams':
        return <ExamsView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <OverviewView user={user} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#1d4ed8', '#2563eb', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          {
            paddingHorizontal: sidePadding,
            paddingTop: ui.headerPadTop,
            paddingBottom: ui.headerPadBottom,
            borderBottomLeftRadius: ui.headerRadius,
            borderBottomRightRadius: ui.headerRadius,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.brandBlock}
            onPress={goToOverview}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go to dashboard home"
          >
            <View style={[styles.avatarBubble, { width: ui.avatarSize, height: ui.avatarSize, borderRadius: ui.avatarSize / 2 }]}>
              <Text style={[styles.avatarText, { fontSize: compact ? 14 : 16 }]}>{firstName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={[styles.brandTitle, { fontSize: ui.brandTitle }]}>ASLILEARN AI</Text>
              <Text style={[styles.brandTagline, { fontSize: ui.brandTagline }]}>AI-Powered Learning</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.logoutButton, compact && { paddingHorizontal: 10 }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              {!compact && <Text style={[styles.logoutText, { fontSize: ui.logoutText }]}>Logout</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.headerSubtitle, { fontSize: ui.subtitle }]}>Student Dashboard</Text>
        <Text style={[styles.headerTitle, { fontSize: ui.title }]}>{screenTitle}</Text>
        <Text style={[styles.headerDescription, { fontSize: ui.desc }]}>
          Welcome back, {firstName}.
        </Text>
      </LinearGradient>

      <View style={[styles.quickSection, { paddingHorizontal: sidePadding }]}>
        <View style={styles.navPillWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContainer}
          >
            {navItems.map((item) => {
              const active = item.view === currentView;
              return (
                <TouchableOpacity
                  key={item.view}
                  onPress={() => setCurrentView(item.view)}
                  style={[
                    styles.quickAction,
                    { paddingHorizontal: ui.navPadX, paddingVertical: ui.navPadY },
                    active && styles.quickActionActive,
                  ]}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={active ? THEME.primary : THEME.muted}
                    style={styles.quickActionIcon}
                  />
                  <Text style={[styles.quickActionText, { fontSize: ui.navText }, active && styles.quickActionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {currentView === 'eduott' ? (
        <View
          style={[
            styles.contentArea,
            styles.contentContainerEduott,
            { paddingHorizontal: sidePadding, minHeight: 0 },
          ]}
        >
        <View style={[styles.contentCard, styles.contentCardFlat, { flex: 1, minHeight: 0, padding: 0 }]}>{renderView()}</View>
        </View>
      ) : (
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={[styles.contentContainer, { paddingHorizontal: sidePadding }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={[styles.contentCard, { padding: ui.cardPad }]}>{renderView()}</View>
        </ScrollView>
      )}

      {currentView !== 'eduott' && (
        <TouchableOpacity
          style={[styles.profileFab, { width: ui.fabSize, height: ui.fabSize, borderRadius: ui.fabSize / 2 }]}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontSize: 15,
  },
  header: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  brandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  avatarBubble: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  logoutText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 13,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '800',
    marginBottom: 3,
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
  },
  quickSection: {
    paddingTop: 12,
    paddingBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  navPillWrap: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  quickActionsContainer: {
    paddingRight: 4,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    marginRight: 6,
  },
  quickActionActive: {
    backgroundColor: '#dbeafe',
  },
  quickActionIcon: {
    marginRight: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.muted,
  },
  quickActionTextActive: {
    color: THEME.primary,
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 88,
  },
  contentContainerEduott: {
    paddingTop: 6,
    paddingBottom: 0,
  },
  contentCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  contentCardFlat: {
    borderRadius: 14,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    padding: 0,
  },
  profileFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },
});
