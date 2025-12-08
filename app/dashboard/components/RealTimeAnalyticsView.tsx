import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface RealTimeMetric {
  label: string;
  value: number | string;
  change?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function RealTimeAnalyticsView() {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAnalytics();
    
    // Set up polling for real-time updates (every 5 seconds)
    intervalRef.current = setInterval(() => {
      fetchAnalytics();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      // Fetch multiple analytics endpoints
      const [studyTimeRes, progressRes, examsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/study-time`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/learning-progress`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/exam-results`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const newMetrics: RealTimeMetric[] = [];

      // Study Time
      if (studyTimeRes.ok) {
        const studyData = await studyTimeRes.json();
        const todayMinutes = studyData.today || studyData.data?.today || 0;
        newMetrics.push({
          label: 'Study Time Today',
          value: `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`,
          icon: 'time',
          color: '#3b82f6'
        });
      }

      // Overall Progress
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        const overallProgress = progressData.data?.overallProgress || progressData.overallProgress || 0;
        newMetrics.push({
          label: 'Overall Progress',
          value: `${overallProgress}%`,
          icon: 'trending-up',
          color: '#10b981'
        });
      }

      // Recent Exam Score
      if (examsRes.ok) {
        const examsData = await examsRes.json();
        const results = examsData.data || examsData || [];
        if (results.length > 0) {
          const latestScore = results[0].score || results[0].percentage || 0;
          newMetrics.push({
            label: 'Latest Exam Score',
            value: `${latestScore}%`,
            icon: 'trophy',
            color: '#f59e0b'
          });
        }
      }

      // Active Sessions (mock for now)
      newMetrics.push({
        label: 'Active Sessions',
        value: '1',
        icon: 'people',
        color: '#8b5cf6'
      });

      setMetrics(newMetrics);
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Real-Time Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Last updated: {formatTime(lastUpdate)}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <LinearGradient
              colors={[metric.color, `${metric.color}DD`]}
              style={styles.metricGradient}
            >
              <Ionicons name={metric.icon} size={32} color="#fff" />
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              {metric.change !== undefined && (
                <View style={styles.changeIndicator}>
                  <Ionicons
                    name={metric.change >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.changeText}>
                    {Math.abs(metric.change)}%
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Activity Feed */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Completed quiz: Mathematics Basics</Text>
              <Text style={styles.activityTime}>Just now</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="videocam" size={20} color="#3b82f6" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Watched video: Physics Fundamentals</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="document-text" size={20} color="#f59e0b" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Submitted homework: Chemistry Lab</Text>
              <Text style={styles.activityTime}>5 minutes ago</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Performance Trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Trends</Text>
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendLabel}>This Week</Text>
            <Text style={styles.trendValue}>+12%</Text>
          </View>
          <View style={styles.trendBar}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={[styles.trendBarFill, { width: '75%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendLabel}>This Month</Text>
            <Text style={styles.trendValue}>+28%</Text>
          </View>
          <View style={styles.trendBar}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={[styles.trendBarFill, { width: '85%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  metricGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  trendCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  trendValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  trendBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});

