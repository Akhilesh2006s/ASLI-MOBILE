import { useState, useEffect } from 'react';
import { Alert, Pressable, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RoleHeader, BottomTabBar, BottomSheet, TabItem } from '../../src/components/ui';
import { COLORS, SPACING, getRoleColor } from '../../src/theme';
import * as SecureStore from 'expo-secure-store';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import api, { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import AdminsView from './components/AdminsView';
import ListView from './components/ListView';
import VidyaAIView from './components/VidyaAIView';
import BoardDashboardView from './components/BoardDashboardView';
import SubjectContentManagementView from './components/SubjectContentManagementView';
import ExamManagementView from './components/ExamManagementView';
import IQRankBoostView from './components/IQRankBoostView';
import AnalyticsView from './components/AnalyticsView';
import AIAnalyticsView from './components/AIAnalyticsView';

type SuperAdminView = 'dashboard' | 'admins' | 'analytics' | 'ai-analytics' | 'subscriptions' | 'settings' | 'board-comparison' | 'content' | 'board' | 'subjects' | 'exams' | 'iq-rank-boost' | 'vidya-ai';

interface MenuItem {
  id: SuperAdminView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SUPER_TABS: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { id: 'admins', label: 'Schools', icon: 'shield-outline', activeIcon: 'shield' },
  { id: 'subjects', label: 'Content', icon: 'document-text-outline', activeIcon: 'document-text' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'more', label: 'More', icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
];

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'stats-chart' },
  { id: 'board', label: 'Board Management', icon: 'people' },
  { id: 'admins', label: 'School Management', icon: 'shield' },
  { id: 'subjects', label: 'Subject & Content', icon: 'document-text' },
  { id: 'exams', label: 'Exam Management', icon: 'document' },
  { id: 'iq-rank-boost', label: 'IQ/Rank Boost', icon: 'trophy' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
  { id: 'ai-analytics', label: 'AI Analytics', icon: 'bulb' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'card' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { token: authToken, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<SuperAdminView>('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
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
    setModalVisible(false);
    // If board view, set the board code
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
          setModalVisible(false);
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

  const onTabChange = (id: string) => {
    if (id === 'more') {
      setModalVisible(true);
      return;
    }
    handleViewChange(id as SuperAdminView);
  };

  const activeTab = ['dashboard', 'admins', 'subjects', 'analytics'].includes(currentView)
    ? currentView
    : 'more';

  const renderDashboardContent = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header - Exact match to web */}
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
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <>
          {statsError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{statsError}</Text>
            </View>
          ) : null}

          {/* Board Management Section - Orange gradient card */}
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

          {/* Content Management & AI Analytics - Two column grid */}
          <View style={styles.twoColumnGrid}>
            {/* Content Management - Sky blue gradient */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => handleViewChange('subjects')}
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

            {/* AI Analytics - Teal gradient (same structure as Content Management for equal height & corners) */}
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

          {/* Stats Widgets Row - White cards with charts */}
          <View style={styles.statsRow}>
            {/* Total Students Widget */}
            <View style={styles.statsWidget}>
              <View style={styles.statsWidgetContent}>
                <View>
                  <Text style={styles.statsWidgetLabel}>Total Students</Text>
                  <Text style={styles.statsWidgetValue}>
                    {isLoading ? '...' : (stats.totalStudents || 5230).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="trending-up" size={32} color="#fb923c" />
                </View>
              </View>
            </View>

            {/* Pass Rate Widget */}
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

          {/* Vidya AI Card - White with orange border */}
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
                <Text style={styles.vidyaCardClick}>Click to access Vidya AI →</Text>
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
      case 'subjects':
        return <SubjectContentManagementView />;
      case 'exams':
        return <ExamManagementView />;
      case 'iq-rank-boost':
        return <IQRankBoostView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'ai-analytics':
        return <AIAnalyticsView />;
      case 'board-comparison':
        return <ListView title="Board Comparison" endpoint="/api/super-admin/boards/analytics/comparison" icon="stats-chart" />;
      case 'subscriptions':
        return <ListView title="Subscriptions" endpoint="/api/super-admin/subscriptions" icon="card" />;
      case 'settings':
        return (
          <ScrollView style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={styles.settingsContainer}>
              <TouchableOpacity style={styles.settingsItem}>
                <Ionicons name="notifications" size={24} color="#f97316" />
                <Text style={styles.settingsText}>Notifications</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Ionicons name="lock-closed" size={24} color="#f97316" />
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RoleHeader
        role="super-admin"
        userName={user.fullName}
        subtitle="Aslilearn AI Platform"
        onNotification={() => router.push('/notifications')}
        onMenu={() => setModalVisible(true)}
      />

      <Animated.View entering={FadeIn.duration(200)} style={styles.mainContent}>
        {renderContent()}
      </Animated.View>

      <BottomTabBar
        tabs={SUPER_TABS}
        activeTab={activeTab}
        onTabChange={onTabChange}
        roleColor={getRoleColor('super-admin')}
      />

      <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} title="More">
        {menuItems
          .filter((item) => !['dashboard', 'admins', 'subjects', 'analytics'].includes(item.id))
          .map((item) => (
            <Pressable
              key={item.id}
              style={styles.sheetItem}
              onPress={() => handleViewChange(item.id)}
            >
              <Ionicons name={item.icon} size={20} color={COLORS.text} />
              <Text style={styles.sheetText}>{item.label}</Text>
            </Pressable>
          ))}
        <Pressable style={[styles.sheetItem, styles.logoutSheet]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={[styles.sheetText, { color: COLORS.danger }]}>Logout</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sheetText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  logoutSheet: { borderBottomWidth: 0, marginTop: SPACING.sm },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  topHeaderSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    paddingBottom: 96,
    minHeight: 0,
  },
  content: {
    flex: 1,
  },
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

