import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import OverviewView from './components/OverviewView';
import StudentsView from './components/StudentsView';
import ClassesView from './components/ClassesView';
import TeachersView from './components/TeachersView';
import SubjectsView from './components/SubjectsView';
import ExamsView from './components/ExamsView';
import LearningPathsView from './components/LearningPathsView';
import EduOTTView from './components/EduOTTView';

type AdminView = 'overview' | 'students' | 'classes' | 'teachers' | 'subjects' | 'exams' | 'learning-paths' | 'eduott';

export default function AdminDashboard() {
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        router.replace('/auth/login');
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
        if (data.user && data.user.role === 'admin') {
          setIsAuthenticated(true);
        } else {
          router.replace('/auth/login');
        }
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
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

  const navigationItems: { view: AdminView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { view: 'overview', label: 'Dashboard', icon: 'bar-chart' },
    { view: 'students', label: 'Students', icon: 'people' },
    { view: 'classes', label: 'Classes', icon: 'school' },
    { view: 'teachers', label: 'Teachers', icon: 'people' },
    { view: 'subjects', label: 'Subjects', icon: 'book' },
    { view: 'exams', label: 'Exams', icon: 'document-text' },
    { view: 'learning-paths', label: 'Learning Paths', icon: 'target' },
    { view: 'eduott', label: 'EduOTT', icon: 'play' },
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
      default:
        return <OverviewView />;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fb923c" />
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.loadingSubtext}>Preparing your admin dashboard</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#7dd3fc', '#38bdf8', '#2dd4bf']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Admin Control Center</Text>
            <Text style={styles.headerTitle}>
              {navigationItems.find(item => item.view === currentView)?.label || 'Dashboard'}
            </Text>
            <Text style={styles.headerDescription}>Manage your learning platform with style</Text>
          </View>
        </View>
      </LinearGradient>

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
          colors={['#fb923c', '#f97316']}
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
                  <Text style={styles.modalLogoText}>AS</Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>ASLILEARN AI</Text>
                  <Text style={styles.modalSubtitle}>Admin Panel</Text>
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
                <Ionicons name="log-out" size={20} color="#ef4444" />
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
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
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
    color: '#0ea5e9',
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
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
    backgroundColor: '#fb923c',
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
  modalLogoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
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
    color: '#f97316',
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

