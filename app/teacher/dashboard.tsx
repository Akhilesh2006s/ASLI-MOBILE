import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import AIClassesView from './components/AIClassesView';
import StudentsView from './components/StudentsView';
import AssessmentsView from './components/AssessmentsView';
import RemarksView from './components/RemarksView';
import ClassDashboardView from './components/ClassDashboardView';
import EduOTTView from './components/EduOTTView';
import VidyaAIView from './components/VidyaAIView';

type TeacherView = 'ai-classes' | 'students' | 'assessments' | 'remarks' | 'class-dashboard' | 'eduott' | 'vidya-ai';

export default function TeacherDashboard() {
  const [currentView, setCurrentView] = useState<TeacherView>('ai-classes');
  const [modalVisible, setModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalVideos: 0,
    averagePerformance: 0,
  });

  useEffect(() => {
    console.log('Teacher Dashboard: Component mounted');
    checkAuth();
    fetchStats();
  }, []);

  // Prevent back navigation from dashboard - user should stay in dashboard until logout
  useBackNavigation('/teacher/dashboard', true);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userRole = await SecureStore.getItemAsync('userRole');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        router.replace('/auth/login');
        return;
      }

      // Quick check with stored role first
      if (userRole === 'teacher') {
        setIsAuthenticated(true);
        setIsLoading(false);
        // Still verify with API in background
        verifyAuth(token);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Teacher Dashboard: Auth response:', data.user?.role);
        if (data.user && data.user.role === 'teacher') {
          console.log('Teacher Dashboard: Authentication successful');
          setIsAuthenticated(true);
          await SecureStore.setItemAsync('userRole', 'teacher');
        } else {
          console.log('Teacher Dashboard: User role is not teacher:', data.user?.role);
          router.replace('/auth/login');
        }
      } else {
        const errorText = await response.text();
        console.log('Teacher Dashboard: Auth check failed with status:', response.status, errorText);
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAuth = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.role === 'teacher') {
          await SecureStore.setItemAsync('userRole', 'teacher');
        } else {
          router.replace('/auth/login');
        }
      }
    } catch (error) {
      console.error('Background auth verification failed:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      console.log('[Mobile Debug] Fetching teacher stats...');
      console.log('[Mobile Debug] API URL:', `${API_BASE_URL}/api/teacher/dashboard`);
      console.log('[Mobile Debug] Token present:', token ? 'Yes' : 'No');
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[Mobile Debug] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Mobile Debug] Response data:', JSON.stringify(data, null, 2));
        
        if (data.success && data.data) {
          // Stats are nested inside data.data.stats
          const statsData = data.data.stats || data.data;
          const students = data.data.students || [];
          const assignedClasses = data.data.assignedClasses || [];
          const videos = data.data.videos || [];
          
          // Calculate stats from actual data if not provided in stats object
          const calculatedStats = {
            totalStudents: statsData.totalStudents ?? students.length ?? 0,
            totalClasses: statsData.totalClasses ?? assignedClasses.length ?? 0,
            totalVideos: statsData.totalVideos ?? videos.length ?? 0,
            averagePerformance: statsData.averagePerformance ?? 0,
          };
          
          console.log('[Mobile Debug] Setting stats:', calculatedStats);
          setStats(calculatedStats);
        } else {
          console.log('[Mobile Debug] API returned success: false or no data');
        }
      } else {
        const errorText = await response.text();
        console.error('[Mobile Debug] Failed to fetch stats:', response.status, errorText);
      }
    } catch (error) {
      console.error('[Mobile Debug] Failed to fetch stats (catch):', error);
    }
  };

  const handleLogout = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Logout API error:', error);
        }
      }
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('user');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      router.replace('/auth/login');
    }
  };

  const navigationItems: { view: TeacherView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { view: 'ai-classes', label: 'AI Classes', icon: 'school' },
    { view: 'students', label: 'Students', icon: 'people' },
    { view: 'assessments', label: 'Assessments', icon: 'clipboard' },
    { view: 'remarks', label: 'Remarks', icon: 'chatbubble-ellipses' },
    { view: 'class-dashboard', label: 'Class Dashboard', icon: 'stats-chart' },
    { view: 'eduott', label: 'EduOTT', icon: 'play' },
    { view: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles' },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'ai-classes':
        return <AIClassesView stats={stats} />;
      case 'students':
        return <StudentsView />;
      case 'assessments':
        return <AssessmentsView />;
      case 'remarks':
        return <RemarksView />;
      case 'class-dashboard':
        return <ClassDashboardView />;
      case 'eduott':
        return <EduOTTView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      default:
        return <AIClassesView stats={stats} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.loadingSubtext}>Preparing your teacher dashboard</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Verifying authentication...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#059669', '#047857']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Teacher Dashboard</Text>
            <Text style={styles.headerTitle}>
              {navigationItems.find(item => item.view === currentView)?.label || 'AI Classes'}
            </Text>
            <Text style={styles.headerDescription}>Manage your classes and students</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Cards - Only show on AI Classes view */}
      {currentView === 'ai-classes' && (
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="people" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>{stats.totalStudents}</Text>
                    <Text style={styles.statCardLabel}>Students</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="school" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>{stats.totalClasses}</Text>
                    <Text style={styles.statCardLabel}>Classes</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="play" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>{stats.totalVideos}</Text>
                    <Text style={styles.statCardLabel}>Videos</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="trending-up" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>{stats.averagePerformance.toFixed(0)}%</Text>
                    <Text style={styles.statCardLabel}>Performance</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderContent()}
      </ScrollView>

      {/* Navigation FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Navigation Modal */}
      <Modal
        visible={modalVisible}
        transparent
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
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalLogo}>
                  <Ionicons name="school" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Teacher Dashboard</Text>
                  <Text style={styles.modalSubtitle}>Manage your classes</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
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
                    size={20}
                    color={currentView === item.view ? '#10b981' : '#fff'}
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
                <Ionicons name="log-out" size={20} color="#ef4444" />
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    padding: 16,
    minHeight: 100,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statCardText: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#10b981',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalLogo: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  modalNav: {
    padding: 16,
  },
  modalNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  modalNavItemActive: {
    backgroundColor: '#fff',
  },
  modalNavItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalNavItemTextActive: {
    color: '#10b981',
  },
  modalLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 12,
  },
  modalLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});

