import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import AdminsView from './components/AdminsView';
import ListView from './components/ListView';
import VidyaAIView from './components/VidyaAIView';
import BoardDashboardView from './components/BoardDashboardView';
import SubjectManagementView from './components/SubjectManagementView';
import ContentManagementView from './components/ContentManagementView';
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

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'stats-chart' },
  { id: 'board', label: 'Board Management', icon: 'people' },
  { id: 'admins', label: 'School Management', icon: 'shield' },
  { id: 'subjects', label: 'Subject Management', icon: 'document-text' },
  { id: 'content', label: 'Content Management', icon: 'cloud-upload' },
  { id: 'exams', label: 'Exam Management', icon: 'document' },
  { id: 'iq-rank-boost', label: 'IQ/Rank Boost', icon: 'trophy' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
  { id: 'ai-analytics', label: 'AI Analytics', icon: 'brain' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'card' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function SuperAdminDashboard() {
  const router = useRouter();
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

  useEffect(() => {
    fetchUserInfo();
    fetchDashboardStats();
  }, []);

  // Prevent back navigation from dashboard - user should stay in dashboard until logout
  useBackNavigation('/super-admin/dashboard', true);

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
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data);
      }
    } catch (error) {
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

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('userEmail');
    router.replace('/auth/login');
  };

  const renderDashboardContent = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header - Exact match to web */}
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeTitle}>Welcome back, Super Admin</Text>
          <Text style={styles.welcomeSubtitle}>Manage boards, schools, exams and AI analytic tau at one place.</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <>
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
              onPress={() => handleViewChange('content')}
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
                    <Text style={styles.featureCardTitle}>Content Management</Text>
                    <Text style={styles.featureCardSubtitle}>Manage videos, notes & materials</Text>
                  </View>
                  <View style={styles.featureCardIconContainer}>
                    <Ionicons name="cloud-upload" size={40} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* AI Analytics - Teal gradient */}
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
                    <Text style={styles.featureCardTitle}>AI Analytics</Text>
                    <Text style={styles.featureCardSubtitle}>Advanced ML insights</Text>
                  </View>
                  <View style={styles.featureCardIconContainer}>
                    <Ionicons name="brain" size={40} color="#fff" />
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
        return <SubjectManagementView />;
      case 'content':
        return <ContentManagementView />;
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
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#fb923c', '#f97316']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.topHeaderTitle}>Aslilearn AI</Text>
          <Text style={styles.topHeaderSubtitle}>Super Admin</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {renderContent()}
      </View>

      {/* Bottom Right Navigation Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Navigation Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Navigation</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleViewChange(item.id)}
                  >
                    <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                      <Ionicons name={item.icon} size={24} color={isActive ? '#f97316' : '#fff'} />
                    </View>
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color="#f97316" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person-circle" size={32} color="#f97316" />
                </View>
                <View>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email || 'Super Administrator'}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
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
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  boardCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  boardCardGradient: {
    padding: 24,
  },
  boardCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  boardCardSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  featureCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  featureCardGradient: {
    padding: 20,
    minHeight: 120,
  },
  featureCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  featureCardTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  featureCardIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  featureCardSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsWidget: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  statsWidgetValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  chartPlaceholder: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vidyaCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
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
    padding: 24,
  },
  vidyaCardText: {
    flex: 1,
  },
  vidyaCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  vidyaCardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  vidyaCardClick: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  vidyaCardImage: {
    width: 96,
    height: 96,
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
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    padding: 20,
    backgroundColor: '#f97316',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  menuList: {
    maxHeight: 500,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemTextActive: {
    color: '#f97316',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  settingsContainer: {
    padding: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
});

