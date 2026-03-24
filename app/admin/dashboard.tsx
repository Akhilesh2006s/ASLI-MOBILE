import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import OverviewView from './components/OverviewView';
import StudentsView from './components/StudentsView';
import ClassesView from './components/ClassesView';
import TeachersView from './components/TeachersView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import LearningPathsView from './components/LearningPathsView';
import EduOTTView from './components/EduOTTView';
import CalendarView from './components/CalendarView';
import VidyaAIView from './components/VidyaAIView';

type AdminView =
  | 'overview'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'subjects'
  | 'exams'
  | 'learning-paths'
  | 'eduott'
  | 'calendar'
  | 'vidya-ai';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Prevent back navigation from dashboard - user should stay in dashboard until logout
  useBackNavigation('/admin/dashboard', true);

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

  const handleLogout = async () => {
    setModalVisible(false);
    try {
      // Must clear AuthContext + storage — otherwise AuthGate thinks user is still
      // logged in and redirects /auth/login → admin dashboard (infinite loading loop).
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      await authService.clearAuth();
    } finally {
      router.replace('/auth/login');
    }
  };

  const navigationItems: { view: AdminView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { view: 'overview', label: 'Dashboard', icon: 'bar-chart' },
    { view: 'students', label: 'Students', icon: 'people' },
    { view: 'classes', label: 'Classes', icon: 'school' },
    { view: 'teachers', label: 'Teachers', icon: 'people' },
    { view: 'subjects', label: 'Subjects', icon: 'book' },
    { view: 'exams', label: 'Exams', icon: 'document-text' },
    { view: 'learning-paths', label: 'Learning Paths', icon: 'map' },
    { view: 'eduott', label: 'EduOTT', icon: 'play' },
    { view: 'calendar', label: 'Calendar', icon: 'calendar' },
    { view: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles' },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView />;
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
      case 'learning-paths':
        return <LearningPathsView />;
      case 'eduott':
        return <EduOTTView />;
      case 'calendar':
        return <CalendarView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <OverviewView />;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fb923c" />
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.loadingSubtext}>Preparing your admin dashboard</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentLabel = navigationItems.find((item) => item.view === currentView)?.label || 'Dashboard';

  return (
    <View style={styles.container}>
      {/* Navbar + page context */}
      <LinearGradient
        colors={['#0d9488', '#0891b2', '#0284c7']}
        style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Navbar: (1) current section (2) Admin Control Center (3) tagline — + logout */}
        <View style={styles.navBar}>
          <View style={styles.navTextStack} accessibilityRole="header">
            <Text style={styles.navLine1}>{currentLabel}</Text>
            <Text style={styles.navLine2}>Admin Control Center</Text>
            <Text style={styles.navLine3}>Manage your learning platform with style.</Text>
          </View>
          <TouchableOpacity
            style={styles.navIconButton}
            onPress={handleLogout}
            accessibilityLabel="Log out"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content} pointerEvents="box-none">
        {renderContent()}
      </View>

      {/* Navigation FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient
          colors={['#fb923c', '#f97316']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="menu" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Navigation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop only — avoids parent Touchable swallowing nav item presses */}
          <Pressable
            style={[StyleSheet.absoluteFill, styles.modalBackdrop]}
            onPress={() => setModalVisible(false)}
          />
          {/* Sheet (must close with </View> — not </TouchableOpacity>) */}
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalLogo}>
                  <Text style={styles.modalLogoText}>AS</Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>ASLILEARN AI</Text>
                  <Text style={styles.modalSubtitle}>Admin Panel</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalNav}>
              {navigationItems.map((item) => (
                <TouchableOpacity
                  key={item.view}
                  style={[
                    styles.modalNavItem,
                    currentView === item.view && styles.modalNavItemActive
                  ]}
                  onPress={() => {
                    setCurrentView(item.view);
                    setModalVisible(false);
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={currentView === item.view ? '#f97316' : '#fff'}
                  />
                  <Text
                    style={[
                      styles.modalNavItemText,
                      currentView === item.view && styles.modalNavItemTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.modalLogout}
                onPress={handleLogout}
              >
                <Ionicons name="log-out" size={18} color="#ef4444" />
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0ea5e9',
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 11,
    color: '#64748b',
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navTextStack: {
    flex: 1,
    minWidth: 0,
  },
  navLine1: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'capitalize',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  navLine2: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  navLine3: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 16,
  },
  navIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    zIndex: 1,
    backgroundColor: '#fb923c',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '68%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalLogo: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLogoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.9,
  },
  modalNav: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },
  modalNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  modalNavItemActive: {
    backgroundColor: '#fff',
  },
  modalNavItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  modalNavItemTextActive: {
    color: '#f97316',
  },
  modalLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 8,
  },
  modalLogoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
});


