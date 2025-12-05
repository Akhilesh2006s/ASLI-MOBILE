import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Admin {
  stats?: {
    students?: number;
    teachers?: number;
    videos?: number;
    assessments?: number;
    exams?: number;
  };
}

export default function AnalyticsView() {
  const [analytics, setAnalytics] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const adminsList = Array.isArray(data) ? data : (data.data || []);
        setAnalytics(adminsList);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAdmins = analytics.length;
  const totalStudents = analytics.reduce((sum, admin) => sum + (admin.stats?.students || 0), 0);
  const totalTeachers = analytics.reduce((sum, admin) => sum + (admin.stats?.teachers || 0), 0);
  const totalContent = analytics.reduce((sum, admin) =>
    sum + (admin.stats?.videos || 0) + (admin.stats?.assessments || 0) + (admin.stats?.exams || 0), 0);

  if (isLoading) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bar-chart" size={32} color="#3b82f6" />
          <View>
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <Text style={styles.headerSubtitle}>Comprehensive platform analytics and insights</Text>
          </View>
        </View>
      </View>

      {/* Analytics Overview Cards */}
      <View style={styles.statsGrid}>
        {/* Total Admins */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#fdba74', '#fb923c']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Total Admins</Text>
                <Text style={styles.statCardValue}>{totalAdmins}</Text>
                <Text style={styles.statCardSubtext}>Active administrators</Text>
              </View>
              <Ionicons name="shield" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Total Students */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Total Students</Text>
                <Text style={styles.statCardValue}>{totalStudents}</Text>
                <Text style={styles.statCardSubtext}>Across all admins</Text>
              </View>
              <Ionicons name="people" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Total Teachers */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#2dd4bf', '#14b8a6']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Total Teachers</Text>
                <Text style={styles.statCardValue}>{totalTeachers}</Text>
                <Text style={styles.statCardSubtext}>Active educators</Text>
              </View>
              <Ionicons name="school" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Total Content */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#fdba74', '#fb923c']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Total Content</Text>
                <Text style={styles.statCardValue}>{totalContent}</Text>
                <Text style={styles.statCardSubtext}>Videos, assessments, exams</Text>
              </View>
              <Ionicons name="book" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Admin Performance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Performance</Text>
        {analytics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No admin data available</Text>
          </View>
        ) : (
          <View style={styles.adminList}>
            {analytics.map((admin: any, index) => (
              <View key={admin.id || admin._id || index} style={styles.adminCard}>
                <View style={styles.adminCardHeader}>
                  <View style={styles.adminIconContainer}>
                    <Ionicons name="shield" size={24} color="#fb923c" />
                  </View>
                  <View style={styles.adminCardInfo}>
                    <Text style={styles.adminCardName}>{admin.name || 'Unknown Admin'}</Text>
                    <Text style={styles.adminCardEmail}>{admin.email || 'No email'}</Text>
                  </View>
                </View>
                <View style={styles.adminCardStats}>
                  <View style={styles.adminStatItem}>
                    <Text style={styles.adminStatLabel}>Students</Text>
                    <Text style={styles.adminStatValue}>{admin.stats?.students || 0}</Text>
                  </View>
                  <View style={styles.adminStatItem}>
                    <Text style={styles.adminStatLabel}>Teachers</Text>
                    <Text style={styles.adminStatValue}>{admin.stats?.teachers || 0}</Text>
                  </View>
                  <View style={styles.adminStatItem}>
                    <Text style={styles.adminStatLabel}>Content</Text>
                    <Text style={styles.adminStatValue}>
                      {(admin.stats?.videos || 0) + (admin.stats?.assessments || 0) + (admin.stats?.exams || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    padding: 20,
    minHeight: 120,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  adminList: {
    gap: 16,
  },
  adminCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminCardInfo: {
    flex: 1,
  },
  adminCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  adminCardEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminCardStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  adminStatItem: {
    flex: 1,
  },
  adminStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  adminStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
});

