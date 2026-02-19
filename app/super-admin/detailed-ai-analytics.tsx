import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';

export default function DetailedAIAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useBackNavigation('/super-admin/dashboard', false);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      // Fetch detailed AI analytics
      const response = await fetch(`${API_BASE_URL}/api/super-admin/ai-analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data || data);
      }
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading AI analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#14b8a6', '#0d9488']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace('/super-admin/dashboard')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="brain" size={28} color="#fff" />
              <Text style={styles.headerTitle}>AI Analytics</Text>
            </View>
            <Text style={styles.headerSubtitle}>Advanced ML insights and predictions</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          
          {analytics?.aiInsights && Array.isArray(analytics.aiInsights) && analytics.aiInsights.length > 0 ? (
            analytics.aiInsights.map((insight: any, index: number) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Ionicons name="bulb" size={24} color="#14b8a6" />
                  <Text style={styles.insightTitle}>{insight.title || 'AI Insight'}</Text>
                </View>
                <Text style={styles.insightDescription}>
                  {insight.description || insight.message || 'No description available'}
                </Text>
                {insight.recommendation && (
                  <View style={styles.recommendationBox}>
                    <Ionicons name="lightbulb" size={16} color="#f59e0b" />
                    <Text style={styles.recommendationText}>{insight.recommendation}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="analytics-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No AI insights available</Text>
              <Text style={styles.emptySubtext}>AI analytics will appear here as data is collected</Text>
            </View>
          )}
        </View>

        {analytics?.globalAnalytics && (
          <View style={styles.globalContainer}>
            <Text style={styles.sectionTitle}>Global Analytics</Text>
            <View style={styles.globalStats}>
              <View style={styles.globalStatCard}>
                <Ionicons name="trending-up" size={32} color="#14b8a6" />
                <Text style={styles.globalStatValue}>
                  {analytics.globalAnalytics.totalUsers || 0}
                </Text>
                <Text style={styles.globalStatLabel}>Total Users</Text>
              </View>
              <View style={styles.globalStatCard}>
                <Ionicons name="activity" size={32} color="#3b82f6" />
                <Text style={styles.globalStatValue}>
                  {analytics.globalAnalytics.activeUsers || 0}
                </Text>
                <Text style={styles.globalStatLabel}>Active Users</Text>
              </View>
              <View style={styles.globalStatCard}>
                <Ionicons name="bar-chart" size={32} color="#8b5cf6" />
                <Text style={styles.globalStatValue}>
                  {analytics.globalAnalytics.engagementRate || 0}%
                </Text>
                <Text style={styles.globalStatLabel}>Engagement Rate</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
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
  insightsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  insightCard: {
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  globalContainer: {
    padding: 16,
    paddingTop: 0,
  },
  globalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  globalStatCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  globalStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  globalStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});


