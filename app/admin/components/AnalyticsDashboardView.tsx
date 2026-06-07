import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../../src/services/api/adminService';

interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  totalClasses: number;
  totalVideos: number;
  totalQuizzes: number;
  totalAssessments: number;
  averageScore: number;
  completionRate: number;
  recentActivity: Array<{ id: string; action: string; user: string; time: string; type: string }>;
  classPerformance: Array<{ classNumber: string; students: number; averageScore: number; completionRate: number }>;
  topPerformers: Array<{ name: string; class: string; score: number; rank: number }>;
}

const initialData: AnalyticsData = {
  totalStudents: 0,
  activeStudents: 0,
  totalClasses: 0,
  totalVideos: 0,
  totalQuizzes: 0,
  totalAssessments: 0,
  averageScore: 0,
  completionRate: 0,
  recentActivity: [],
  classPerformance: [],
  topPerformers: [],
};

export default function AnalyticsDashboardView() {
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, studentRes] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getStudentAnalytics(),
      ]);

      const overview = analyticsRes?.data?.overview || analyticsRes?.overview || {};
      const engagement = analyticsRes?.data?.engagement || analyticsRes?.engagement || {};
      const recent = analyticsRes?.data?.recentActivity || analyticsRes?.recentActivity || {};
      const studentPayload = studentRes?.data || studentRes || {};
      const performance = studentPayload.performanceMetrics || {};
      const classDistribution = studentPayload.classDistribution || [];
      const topPerformersRaw = performance.topPerformers || [];

      const recentActivity = [
        ...(recent.videos || []).map((video: any, idx: number) => ({
          id: `video-${idx}`,
          action: `Video: ${video.title || 'Untitled'}`,
          user: 'Content',
          time: video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '',
          type: 'video',
        })),
        ...(recent.assessments || []).map((item: any, idx: number) => ({
          id: `assessment-${idx}`,
          action: `Assessment: ${item.title || 'Untitled'}`,
          user: 'Assessment',
          time: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
          type: 'assessment',
        })),
      ];

      setAnalytics({
        totalStudents: overview.totalStudents || 0,
        activeStudents: overview.activeStudents || 0,
        totalClasses: classDistribution.length,
        totalVideos: overview.totalVideos || 0,
        totalQuizzes: overview.totalAssessments || 0,
        totalAssessments: overview.totalAssessments || 0,
        averageScore: Math.round(Number(performance.averageScore) || 0),
        completionRate: engagement.studentEngagement || 0,
        recentActivity,
        classPerformance: classDistribution.map((item: any) => ({
          classNumber: item.className || item.class || '—',
          students: item.count || 0,
          averageScore: Math.round(Number(performance.averageScore) || 0),
          completionRate: engagement.studentEngagement || 0,
        })),
        topPerformers: topPerformersRaw.map((item: any, idx: number) => ({
          name: item.studentName || item.name || 'Student',
          class: item.classNumber || item.class || '—',
          score: Math.round(Number(item.averageScore || item.score) || 0),
          rank: idx + 1,
        })),
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <Text style={styles.subtitle}>Web analytics adapted for mobile</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchAnalytics}>
          <Ionicons name="refresh" size={16} color="#1f2937" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: '#dbeafe' }]}>
          <Text style={styles.metricLabel}>Total Students</Text>
          <Text style={styles.metricValue}>{analytics.totalStudents}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={styles.metricLabel}>Active Students</Text>
          <Text style={styles.metricValue}>{analytics.activeStudents}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#f3e8ff' }]}>
          <Text style={styles.metricLabel}>Average Score</Text>
          <Text style={styles.metricValue}>{analytics.averageScore}%</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#ffedd5' }]}>
          <Text style={styles.metricLabel}>Completion Rate</Text>
          <Text style={styles.metricValue}>{analytics.completionRate}%</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Class Performance</Text>
        {analytics.classPerformance.map((item, idx) => (
          <View key={`${item.classNumber}-${idx}`} style={styles.rowCard}>
            <View>
              <Text style={styles.rowTitle}>Class {item.classNumber}</Text>
              <Text style={styles.rowSub}>{item.students} students</Text>
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.score}>{item.averageScore}%</Text>
              <Text style={styles.rowSub}>completion {item.completionRate}%</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performers</Text>
        {analytics.topPerformers.map((item, idx) => (
          <View key={`${item.name}-${idx}`} style={styles.rowCard}>
            <View style={styles.rankPill}><Text style={styles.rankText}>{item.rank}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>Class {item.class}</Text>
            </View>
            <Text style={styles.score}>{item.score}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {analytics.recentActivity.map((item, idx) => (
          <View key={item.id || `${idx}`} style={styles.rowCard}>
            <View style={styles.activityIcon}>
              <Ionicons name="pulse" size={14} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.action}</Text>
              <Text style={styles.rowSub}>by {item.user}</Text>
            </View>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 30, gap: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  refreshText: { color: '#1f2937', fontWeight: '700', fontSize: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', borderRadius: 12, padding: 12 },
  metricLabel: { fontSize: 12, color: '#374151' },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  rowCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6b7280' },
  rightCol: { alignItems: 'flex-end' },
  score: { fontSize: 16, fontWeight: '800', color: '#111827' },
  rankPill: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  activityIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  timeText: { fontSize: 11, color: '#6b7280' },
});

