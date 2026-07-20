import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type AdminRecord,
  type DashboardStats,
  type SchoolSummary,
  computeTotalContent,
  fetchDashboardStats,
  fetchPlatformAdmins,
} from '../../../src/lib/super-admin-analytics';

type AnalyticsViewProps = {
  onSelectSchool?: (admin: SchoolSummary) => void;
};

export default function AnalyticsView({ onSelectSchool }: AnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<AdminRecord[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      setError('');
      const [adminsList, stats] = await Promise.all([
        fetchPlatformAdmins(),
        fetchDashboardStats(),
      ]);
      setAnalytics(adminsList);
      setDashboardStats(stats);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch analytics.');
      console.error('Failed to fetch analytics:', err);
      setAnalytics([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const totalAdmins = analytics.length;
  const totalStudents = analytics.reduce((sum, admin) => sum + (admin.stats?.students || 0), 0);
  const totalTeachers = analytics.reduce((sum, admin) => sum + (admin.stats?.teachers || 0), 0);
  const totalContent = computeTotalContent(analytics, dashboardStats);

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
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bar-chart" size={32} color="#3b82f6" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <Text style={styles.headerSubtitle}>Comprehensive platform analytics and insights</Text>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <LinearGradient colors={['#fdba74', '#fb923c']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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

        <View style={styles.statCard}>
          <LinearGradient colors={['#7dd3fc', '#38bdf8']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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

        <View style={styles.statCard}>
          <LinearGradient colors={['#2dd4bf', '#14b8a6']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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

        <View style={styles.statCard}>
          <LinearGradient colors={['#fdba74', '#fb923c']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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

      <View style={styles.performanceSection}>
        <LinearGradient
          colors={['#7dd3fc', '#2dd4bf', '#14b8a6']}
          style={styles.performanceGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.performanceHeader}>
            <Ionicons name="trending-up" size={22} color="#111827" />
            <Text style={styles.performanceTitle}>Admin Performance Overview</Text>
          </View>

          {analytics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart" size={64} color="#5B6779" />
              <Text style={styles.emptyText}>No admin data available</Text>
            </View>
          ) : (
            <View style={styles.adminList}>
              {analytics.map((admin, index) => {
                const schoolId = String(admin.id || admin._id || '');
                const interactive = Boolean(onSelectSchool && schoolId);
                const CardWrapper = interactive ? TouchableOpacity : View;

                return (
                  <CardWrapper
                    key={schoolId || admin.email || String(index)}
                    style={[styles.adminCard, interactive && styles.adminCardInteractive]}
                    onPress={
                      interactive
                        ? () =>
                            onSelectSchool!({
                              id: schoolId,
                              name: admin.name || admin.schoolName || 'School',
                              email: admin.email || '',
                            })
                        : undefined
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.adminCardTop}>
                      <View style={styles.adminCardInfo}>
                        <Text style={styles.adminCardName}>{admin.name || admin.schoolName || 'Unknown Admin'}</Text>
                        <Text style={styles.adminCardEmail}>{admin.email || 'No email'}</Text>
                        {interactive && (
                          <Text style={styles.adminCardHint}>Tap for detailed exam & AI analytics →</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          admin.status === 'Active' ? styles.statusActive : styles.statusInactive,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{admin.status || 'Unknown'}</Text>
                      </View>
                    </View>

                    <View style={styles.adminCardStats}>
                      <View style={styles.adminStatItem}>
                        <Text style={styles.adminStatValue}>{admin.stats?.students || 0}</Text>
                        <Text style={styles.adminStatLabel}>Students</Text>
                      </View>
                      <View style={styles.adminStatItem}>
                        <Text style={styles.adminStatValue}>{admin.stats?.teachers || 0}</Text>
                        <Text style={styles.adminStatLabel}>Teachers</Text>
                      </View>
                      <View style={styles.adminStatItem}>
                        <Text style={styles.adminStatValue}>{admin.stats?.videos || 0}</Text>
                        <Text style={styles.adminStatLabel}>Videos</Text>
                      </View>
                      <View style={styles.adminStatItem}>
                        <Text style={styles.adminStatValue}>{admin.stats?.assessments || 0}</Text>
                        <Text style={styles.adminStatLabel}>Assessments</Text>
                      </View>
                    </View>
                  </CardWrapper>
                );
              })}
            </View>
          )}
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    padding: 14,
    minHeight: 100,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardSubtext: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
  },
  performanceSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  performanceGradient: {
    padding: 16,
    borderRadius: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  adminList: {
    gap: 12,
  },
  adminCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  adminCardInteractive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  adminCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  adminCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  adminCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  adminCardEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  adminCardHint: {
    fontSize: 11,
    color: '#0f766e',
    fontWeight: '600',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
  },
  statusActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0f766e',
  },
  statusInactive: {
    backgroundColor: '#4b5563',
    borderColor: '#374151',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  adminCardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  adminStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  adminStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  adminStatValue: {
    fontSize: 18,
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
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#5B6779',
    marginTop: 16,
    textAlign: 'center',
  },
});
