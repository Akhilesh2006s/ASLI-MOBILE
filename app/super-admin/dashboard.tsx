import { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import api, { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import { BottomTabBar, type TabItem } from '../../src/components/ui';
import AdminsView from './components/AdminsView';
import ListView from './components/ListView';
import VidyaAIView from './components/VidyaAIView';
import BoardDashboardView from './components/BoardDashboardView';
import SubjectContentManagementView from './components/SubjectContentManagementView';
import ExamManagementView from './components/ExamManagementView';
import IQRankBoostView from './components/IQRankBoostView';
import SuperAdminCalendarView from './components/SuperAdminCalendarView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXAM_CALENDAR_PREFILL_KEY, type ExamCalendarPrefill } from '../../src/lib/super-admin-calendar';
import AnalyticsView from './components/AnalyticsView';
import AIAnalyticsView from './components/AIAnalyticsView';
import QuestionGeneratorView from './components/QuestionGeneratorView';
import ContentManagementView from './components/ContentManagementView';
import AiToolTopicsView from './components/AiToolTopicsView';
import SuperAdminNavDrawer, {
  superAdminNavLabel,
  SUPER_ADMIN_BOTTOM_TABS,
  type SuperAdminView,
} from './components/SuperAdminNavDrawer';
import { SuperAdminHeader, SuperAdminGridBackground, useSuperAdminTheme } from './ui';

const SUPER_TABS: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'board', label: 'Board', icon: 'people-outline', activeIcon: 'people' },
  { id: 'admins', label: 'School', icon: 'shield-outline', activeIcon: 'shield' },
  { id: 'subjects-and-content', label: 'Content', icon: 'list-outline', activeIcon: 'list' },
  { id: 'exams', label: 'Exams', icon: 'document-text-outline', activeIcon: 'document-text' },
];

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { token: authToken, signOut } = useAuth();
  const { colors } = useSuperAdminTheme();
  const [currentView, setCurrentView] = useState<SuperAdminView>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    courses: 0,
    assessments: 0,
    exams: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState({ fullName: 'Super Admin', email: '' });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    fetchUserInfo();
    fetchDashboardStats();
  }, []);

  // Prevent back navigation from dashboard - user should stay in dashboard until logout
  useBackNavigation('/super-admin-dashboard', true);

  const fetchUserInfo = async () => {
    try {
      const email = await SecureStore.getItemAsync('userEmail');
      if (email) {
        setUser(prev => ({ ...prev, email }));
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setStatsError('');
      const token =
        authToken ||
        (await SecureStore.getItemAsync('authToken')) ||
        (await SecureStore.getItemAsync('token')) ||
        (await SecureStore.getItemAsync('accessToken')) ||
        (await SecureStore.getItemAsync('jwtToken'));

      let payload: any = null;
      try {
        const response = await api.get(
          '/api/super-admin/dashboard/stats',
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        payload = response?.data;
      } catch (primaryErr: any) {
        // Some backend variants expose /stats instead of /dashboard/stats.
        if (primaryErr?.response?.status === 404) {
          const fallbackResponse = await api.get(
            '/api/super-admin/stats',
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
          );
          payload = fallbackResponse?.data;
        } else {
          throw primaryErr;
        }
      }

      const normalized = payload?.data || payload?.stats || payload || {};
      setStats({
        totalUsers: normalized.totalUsers || normalized.users || 0,
        totalStudents: normalized.totalStudents || normalized.students || 0,
        totalTeachers: normalized.totalTeachers || normalized.teachers || 0,
        totalAdmins: normalized.totalAdmins || normalized.admins || 0,
        courses: normalized.courses || 0,
        assessments: normalized.assessments || 0,
        exams: normalized.exams || 0,
      });
    } catch (error: any) {
      const fallback = `Unable to fetch dashboard stats from ${API_BASE_URL}`;
      setStatsError(error?.friendlyMessage || error?.message || fallback);
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleViewChange = (view: SuperAdminView) => {
    setCurrentView(view);
    setMenuOpen(false);
    if (view === 'board') {
      setSelectedBoard('ASLI_EXCLUSIVE_SCHOOLS');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of super admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setMenuOpen(false);
          try {
            await signOut();
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('jwtToken');
          } catch (error) {
            console.error('Logout failed:', error);
          } finally {
            router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  const onSelectView = (view: SuperAdminView) => {
    handleViewChange(view);
  };

  const renderDashboardContent = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeTitle}>Welcome back, Super Admin</Text>
          <Text style={styles.welcomeSubtitle}>
            Manage boards, schools, exams, and AI analytics — all in one place.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {statsError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{statsError}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Board Management</Text>
            <TouchableOpacity
              style={styles.boardCard}
              onPress={() => {
                setSelectedBoard('ASLI_EXCLUSIVE_SCHOOLS');
                handleViewChange('board');
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#fdba74', '#fb923c']}
                style={styles.boardCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.boardCardContent}>
                  <View>
                    <Text style={styles.boardCardTitle}>Asli Exclusive Schools</Text>
                    <Text style={styles.boardCardSubtitle}>All Boards Content - Unified Platform</Text>
                  </View>
                  <Ionicons name="people" size={64} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.twoColumnGrid}>
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => handleViewChange('subjects-and-content')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#7dd3fc', '#38bdf8']}
                style={styles.featureCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.featureCardContent}>
                  <View style={styles.featureCardTextContainer}>
                    <Text style={styles.featureCardTitle}>Content{'\n'}Management</Text>
                    <Text style={styles.featureCardSubtitle}>Manage videos and notes</Text>
                  </View>
                  <View style={styles.featureCardIconContainer}>
                    <Ionicons name="cloud-upload" size={38} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => handleViewChange('ai-analytics')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#2dd4bf', '#14b8a6']}
                style={styles.featureCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.featureCardContent}>
                  <View style={styles.featureCardTextContainer}>
                    <Text style={styles.featureCardTitle}>AI{'\n'}Analytics</Text>
                    <Text style={styles.featureCardSubtitle}>Smart performance insights</Text>
                  </View>
                  <View style={styles.featureCardIconContainer}>
                    <Ionicons name="analytics-outline" size={38} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsWidget}>
              <View style={styles.statsWidgetContent}>
                <View>
                  <Text style={styles.statsWidgetLabel}>Total Students</Text>
                  <Text style={styles.statsWidgetValue}>
                    {(stats.totalStudents || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="trending-up" size={32} color="#fb923c" />
                </View>
              </View>
            </View>

            <View style={styles.statsWidget}>
              <View style={styles.statsWidgetContent}>
                <View>
                  <Text style={styles.statsWidgetValue}>80%</Text>
                  <Text style={styles.statsWidgetLabel}>Pass rate data</Text>
                </View>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.vidyaCard}
            onPress={() => handleViewChange('vidya-ai')}
            activeOpacity={0.9}
          >
            <View style={styles.vidyaCardOverlay} />
            <View style={styles.vidyaCardContent}>
              <View style={styles.vidyaCardText}>
                <Text style={styles.vidyaCardTitle}>Vidya AI</Text>
                <Text style={styles.vidyaCardSubtitle}>24/7 AI Tutor Support</Text>
                <Text style={styles.vidyaCardClick}>Tap to access Vidya AI →</Text>
              </View>
              <View style={styles.vidyaCardImage}>
                <Ionicons name="sparkles" size={64} color="#f97316" />
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardContent();
      case 'admins':
        return <AdminsView />;
      case 'board':
        return (
          <BoardDashboardView
            boardCode={selectedBoard || 'ASLI_EXCLUSIVE_SCHOOLS'}
            onBack={() => {
              setSelectedBoard(null);
              setCurrentView('dashboard');
            }}
          />
        );
      case 'subjects-and-content':
      case 'content':
      case 'subjects':
        return <SubjectContentManagementView />;
      case 'exams':
        return <ExamManagementView />;
      case 'iq-rank-boost':
        return <IQRankBoostView />;
      case 'calendar':
        return (
          <SuperAdminCalendarView
            onNavigateToExams={async (prefill: ExamCalendarPrefill) => {
              await AsyncStorage.setItem(EXAM_CALENDAR_PREFILL_KEY, JSON.stringify(prefill));
              handleViewChange('exams');
            }}
          />
        );
      case 'vidya-ai':
        return (
          <VidyaAIView
            onOpenAnalytics={() => handleViewChange('analytics')}
            onOpenSettings={() => handleViewChange('settings')}
          />
        );
      case 'analytics':
        return <AnalyticsView />;
      case 'ai-analytics':
        return <AIAnalyticsView />;
      case 'board-comparison':
        return (
          <ListView
            title="Board Comparison"
            endpoint="/api/super-admin/boards/analytics/comparison"
            icon="stats-chart-outline"
          />
        );
      case 'ai-tool-generations':
        return (
          <ListView
            title="AI Tool Data"
            endpoint="/api/super-admin/ai-tool-generations/records"
            icon="folder-outline"
          />
        );
      case 'ai-tool-topics':
        return <AiToolTopicsView />;
      case 'ai-content-engine':
        return <ContentManagementView />;
      case 'ai-generator':
        return <QuestionGeneratorView />;
      case 'subscriptions':
        return (
          <ListView
            title="Subscriptions"
            endpoint="/api/super-admin/subscriptions"
            icon="card-outline"
          />
        );
      case 'settings':
        return (
          <ScrollView style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={styles.settingsContainer}>
              <TouchableOpacity style={styles.settingsItem}>
                <Ionicons name="lock-closed" size={24} color={colors.primary} />
                <Text style={styles.settingsText}>Security</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
                <Ionicons name="log-out" size={24} color="#ef4444" />
                <Text style={[styles.settingsText, { color: '#ef4444' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      default:
        return renderDashboardContent();
    }
  };

  const isDashboard = currentView === 'dashboard';

  const bottomTabActive = SUPER_ADMIN_BOTTOM_TABS.some((t) => t.id === currentView)
    ? currentView
    : '__none__';

  const onBottomTabChange = (id: string) => {
    handleViewChange(id as SuperAdminView);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <SuperAdminHeader
        userName={user.fullName}
        subtitle={isDashboard ? 'Aslilearn AI Platform' : superAdminNavLabel(currentView)}
        onMenu={() => setMenuOpen(true)}
      />

      <View style={styles.contentWrap}>
        <SuperAdminGridBackground />
        <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.mainContent}>
          {renderContent()}
        </Animated.View>
      </View>

      <BottomTabBar
        tabs={SUPER_TABS}
        activeTab={bottomTabActive}
        onTabChange={onBottomTabChange}
        roleColor={colors.primary}
      />

      <SuperAdminNavDrawer
        visible={menuOpen}
        activeView={currentView}
        userName={user.fullName}
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
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
    paddingBottom: 88,
  },
  content: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#111827' },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  boardCard: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  boardCardGradient: {
    padding: 16,
  },
  boardCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  boardCardSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featureCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  featureCardGradient: {
    flex: 1,
    alignSelf: 'stretch',
    padding: 14,
    minHeight: 118,
    justifyContent: 'center',
  },
  featureCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    minHeight: 90,
  },
  featureCardTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  featureCardIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    lineHeight: 18,
  },
  featureCardSubtitle: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsWidget: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsWidgetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsWidgetLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statsWidgetValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  chartPlaceholder: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vidyaCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#93c5fd',
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  vidyaCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },
  vidyaCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  vidyaCardText: {
    flex: 1,
  },
  vidyaCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  vidyaCardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  vidyaCardClick: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  vidyaCardImage: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f97316',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  menuList: {
    maxHeight: 500,
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  menuItemActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: '#fff7ed',
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemTextActive: {
    color: '#f97316',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 11,
    color: '#6b7280',
  },
  settingsContainer: {
    padding: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
});

