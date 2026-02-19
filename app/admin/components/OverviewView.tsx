import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalVideos: number;
  totalQuizzes: number;
  totalAssessments: number;
  activeUsers: number;
  totalContent: number;
}

interface StudentAnalytics {
  classDistribution: Array<{ className?: string; class?: string; count: number }>;
  performanceMetrics: {
    averageScore: number;
    totalExamsTaken: number;
    topPerformers: Array<{ studentName: string; averageScore: number }>;
  };
  subjectPerformance: Array<{ subject?: string; name?: string; averageScore: number }>;
}

export default function OverviewView() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    totalAssessments: 0,
    activeUsers: 0,
    totalContent: 0,
  });
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics>({
    classDistribution: [],
    performanceMetrics: {
      averageScore: 0,
      totalExamsTaken: 0,
      topPerformers: [],
    },
    subjectPerformance: [],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    fetchAdminStats();
    fetchStudentAnalytics();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setIsLoadingStats(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setIsLoadingStats(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStats({
            totalStudents: data.data.totalStudents || 0,
            totalTeachers: data.data.totalTeachers || 0,
            totalClasses: data.data.totalClasses || 0,
            totalVideos: data.data.totalVideos || 0,
            totalQuizzes: data.data.totalQuizzes || 0,
            totalAssessments: data.data.totalAssessments || 0,
            activeUsers: data.data.activeUsers || 0,
            totalContent: data.data.totalContent || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchStudentAnalytics = async () => {
    try {
      setIsLoadingAnalytics(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setIsLoadingAnalytics(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/students/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStudentAnalytics(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const topClassDistribution = studentAnalytics.classDistribution?.slice(0, 5) || [];
  const topSubjectPerformance = studentAnalytics.subjectPerformance?.slice(0, 4) || [];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {/* Total Students */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#fdba74', '#fb923c']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statCardIcon}>
                <Ionicons name="people" size={32} color="#fff" />
              </View>
              <View style={styles.statCardText}>
                <Text style={styles.statCardLabel}>Total Students</Text>
                <Text style={styles.statCardValue}>
                  {isLoadingStats ? '...' : stats.totalStudents}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Active Classes */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statCardIcon}>
                <Ionicons name="school" size={32} color="#fff" />
              </View>
              <View style={styles.statCardText}>
                <Text style={styles.statCardLabel}>Active Classes</Text>
                <Text style={styles.statCardValue}>
                  {isLoadingStats ? '...' : stats.totalClasses}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Active Users */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#2dd4bf', '#14b8a6']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statCardIcon}>
                <Ionicons name="pulse" size={32} color="#fff" />
              </View>
              <View style={styles.statCardText}>
                <Text style={styles.statCardLabel}>Active Users</Text>
                <Text style={styles.statCardValue}>
                  {isLoadingStats ? '...' : stats.activeUsers}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Teachers */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#fdba74', '#fb923c']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statCardIcon}>
                <Ionicons name="people" size={32} color="#fff" />
              </View>
              <View style={styles.statCardText}>
                <Text style={styles.statCardLabel}>Teachers</Text>
                <Text style={styles.statCardValue}>
                  {isLoadingStats ? '...' : (stats.totalTeachers || 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Videos */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statCardIcon}>
                <Ionicons name="play" size={32} color="#fff" />
              </View>
              <View style={styles.statCardText}>
                <Text style={styles.statCardLabel}>Videos</Text>
                <Text style={styles.statCardValue}>
                  {isLoadingStats ? '...' : (stats.totalVideos || 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Assessments */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#2dd4bf', '#14b8a6']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View style={styles.statCardIcon}>
                <Ionicons name="locate" size={32} color="#fff" />
              </View>
              <View style={styles.statCardText}>
                <Text style={styles.statCardLabel}>Assessments</Text>
                <Text style={styles.statCardValue}>
                  {isLoadingStats ? '...' : (stats.totalAssessments || 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Detailed School Analysis */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.analysisCard}
      >
        <View style={styles.analysisHeader}>
          <LinearGradient
            colors={['#fb923c', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.analysisIcon}
          >
            <Ionicons name="bar-chart" size={32} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.analysisTitle}>Detailed School Analysis</Text>
            <Text style={styles.analysisSubtitle}>Comprehensive insights about your students</Text>
          </View>
        </View>

        {isLoadingAnalytics ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fb923c" />
          </View>
        ) : (
          <View style={styles.analysisContent}>
            {/* Class Distribution */}
            <View style={styles.analysisSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="school" size={20} color="#fb923c" />
                <Text style={styles.sectionTitle}>Class Distribution</Text>
              </View>
              <View style={styles.sectionContent}>
                {topClassDistribution.length > 0 ? (
                  topClassDistribution.map((item, idx) => (
                    <View key={idx} style={styles.distributionItem}>
                      <Text style={styles.distributionLabel}>
                        {item.className || item.class || 'Unknown'}
                      </Text>
                      <Text style={styles.distributionValue}>{item.count || 0} students</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No class data available</Text>
                )}
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.analysisSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Performance Metrics</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Average Score</Text>
                  <Text style={styles.metricValue}>
                    {studentAnalytics.performanceMetrics?.averageScore || 0}%
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Total Exams Taken</Text>
                  <Text style={styles.metricValue}>
                    {studentAnalytics.performanceMetrics?.totalExamsTaken || 0}
                  </Text>
                </View>
                {studentAnalytics.performanceMetrics?.topPerformers &&
                  studentAnalytics.performanceMetrics.topPerformers.length > 0 && (
                    <View style={styles.topPerformer}>
                      <Text style={styles.topPerformerLabel}>Top Performer</Text>
                      <Text style={styles.topPerformerName}>
                        {studentAnalytics.performanceMetrics.topPerformers[0]?.studentName || 'N/A'}
                      </Text>
                      <Text style={styles.topPerformerScore}>
                        {studentAnalytics.performanceMetrics.topPerformers[0]?.averageScore || 0}% avg
                      </Text>
                    </View>
                  )}
              </View>
            </View>

            {/* Subject Performance */}
            <View style={styles.analysisSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book" size={20} color="#fb923c" />
                <Text style={styles.sectionTitle}>Subject Performance</Text>
              </View>
              <View style={styles.sectionContent}>
                {topSubjectPerformance.length > 0 ? (
                  topSubjectPerformance.map((subject, idx) => (
                    <View key={idx} style={styles.subjectItem}>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>
                          {(subject.subject || subject.name || 'Unknown').toUpperCase()}
                        </Text>
                        <Text style={styles.subjectScore}>
                          {subject.averageScore || 0}%
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(subject.averageScore || 0, 100)}%`,
                            }
                          ]}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No subject data available</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Admin-Specific Data */}
      <View style={styles.adminCards}>
        <View style={styles.adminCard}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
            style={styles.adminCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.adminCardContent}>
              <View style={styles.adminCardIcon}>
                <Ionicons name="people" size={32} color="#fff" />
              </View>
              <View>
                <Text style={styles.adminCardLabel}>Total Students Assigned</Text>
                <Text style={styles.adminCardValue}>
                  {isLoadingStats ? '...' : stats.totalStudents}
                </Text>
                <Text style={styles.adminCardSubtext}>
                  These are the students specifically assigned to your admin account
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.adminCard}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.adminCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.adminCardContent}>
              <View style={styles.adminCardIcon}>
                <Ionicons name="school" size={32} color="#fff" />
              </View>
              <View>
                <Text style={styles.adminCardLabel}>Total Teachers Assigned</Text>
                <Text style={styles.adminCardValue}>
                  {isLoadingStats ? '...' : (stats.totalTeachers || 0)}
                </Text>
                <Text style={styles.adminCardSubtext}>
                  These are the teachers specifically assigned to your admin account
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  analysisCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  analysisIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fb923c',
  },
  analysisSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  analysisContent: {
    gap: 20,
  },
  analysisSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionContent: {
    gap: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionLabel: {
    fontSize: 14,
    color: '#374151',
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fb923c',
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  topPerformer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  topPerformerLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  topPerformerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  topPerformerScore: {
    fontSize: 12,
    color: '#64748b',
  },
  subjectItem: {
    marginBottom: 12,
  },
  subjectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  subjectScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fb923c',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fb923c',
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
  adminCards: {
    gap: 16,
  },
  adminCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  adminCardGradient: {
    padding: 20,
  },
  adminCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adminCardIcon: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminCardLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  adminCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  adminCardSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
});




