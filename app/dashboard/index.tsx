import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import OverviewView from './components/OverviewView';
import LearningPathsView from './components/LearningPathsView';
import BrowseView from './components/BrowseView';
import ScheduleView from './components/ScheduleView';
import VidyaAIView from './components/VidyaAIView';
import RemarksView from './components/RemarksView';
import EduOTTView from './components/EduOTTView';
import ExamsView from './components/ExamsView';

type DashboardView = 'overview' | 'learning-paths' | 'browse' | 'schedule' | 'vidya-ai' | 'remarks' | 'eduott' | 'exams';

const navigationItems = [
  { view: 'overview' as DashboardView, label: 'Overview', icon: 'home' as keyof typeof Ionicons.glyphMap },
  { view: 'learning-paths' as DashboardView, label: 'Learning Paths', icon: 'book' as keyof typeof Ionicons.glyphMap },
  { view: 'browse' as DashboardView, label: 'Browse', icon: 'library' as keyof typeof Ionicons.glyphMap },
  { view: 'schedule' as DashboardView, label: 'Schedule', icon: 'calendar' as keyof typeof Ionicons.glyphMap },
  { view: 'eduott' as DashboardView, label: 'EduOTT', icon: 'videocam' as keyof typeof Ionicons.glyphMap },
  { view: 'exams' as DashboardView, label: 'Exams', icon: 'document-text' as keyof typeof Ionicons.glyphMap },
  { view: 'vidya-ai' as DashboardView, label: 'Vidya AI', icon: 'sparkles' as keyof typeof Ionicons.glyphMap },
  { view: 'remarks' as DashboardView, label: 'Remarks', icon: 'chatbubble-ellipses' as keyof typeof Ionicons.glyphMap },
];

export default function StudentDashboard() {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userRole = await SecureStore.getItemAsync('userRole');
      console.log('Student Dashboard - Auth check: Token found:', !!token, 'User Role:', userRole);

      if (!token || userRole !== 'student') {
        console.log('Student Dashboard - Auth check failed: No token or incorrect role. Redirecting to login.');
        router.replace('/auth/login');
        return;
      }

      setIsAuthenticated(true);
      setIsLoading(false);

      // Verify token with API in background
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.role === 'student') {
          console.log('Student Dashboard - API verification successful. User is a student.');
          setUser(data.user);
        } else {
          console.log('Student Dashboard - API verification failed: User is not a student. Redirecting to login.');
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('userRole');
          router.replace('/auth/login');
        }
      } else {
        console.log('Student Dashboard - API verification failed: Response not OK. Status:', response.status, '. Redirecting to login.');
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userRole');
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Student Dashboard - Auth check failed:', error);
      if (!isAuthenticated) {
        router.replace('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userRole');
      await SecureStore.deleteItemAsync('userEmail');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView user={user} />;
      case 'learning-paths':
        return <LearningPathsView />;
      case 'browse':
        return <BrowseView />;
      case 'schedule':
        return <ScheduleView />;
      case 'eduott':
        return <EduOTTView />;
      case 'exams':
        return <ExamsView />;
      case 'vidya-ai':
        return <VidyaAIView />;
      case 'remarks':
        return <RemarksView />;
      default:
        return <OverviewView user={user} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
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
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Student Dashboard</Text>
            <Text style={styles.headerTitle}>
              {navigationItems.find(item => item.view === currentView)?.label || 'Overview'}
            </Text>
            <Text style={styles.headerDescription}>
              Welcome back, {user?.email?.split('@')[0] || user?.fullName?.split(' ')[0] || 'Student'}!
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content Area */}
      <ScrollView 
        style={styles.contentArea} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderView()}
      </ScrollView>

      {/* FAB for Navigation */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Navigation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalLogo}>
                  <Ionicons name="school" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Student Dashboard</Text>
                  <Text style={styles.modalSubtitle}>Navigation</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {navigationItems.map((item) => (
                <TouchableOpacity
                  key={item.view}
                  style={[
                    styles.navigationItem,
                    currentView === item.view && styles.navigationItemActive,
                  ]}
                  onPress={() => {
                    setCurrentView(item.view);
                    setModalVisible(false);
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={currentView === item.view ? '#3b82f6' : '#333'}
                  />
                  <Text
                    style={[
                      styles.navigationItemText,
                      currentView === item.view && styles.navigationItemTextActive,
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
    backgroundColor: '#f0f9ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: 'rgba(255, 255, 255, 0.9)',
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  navigationItemActive: {
    backgroundColor: '#eff6ff',
  },
  navigationItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  navigationItemTextActive: {
    color: '#3b82f6',
  },
  modalLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#fef2f2',
  },
  modalLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 12,
  },
});

