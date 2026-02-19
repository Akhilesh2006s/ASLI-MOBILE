import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';

export default function SuperAdminAnalytics() {
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
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
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
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#fb923c', '#f97316']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace('/super-admin/dashboard')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Super Admin Analytics</Text>
            <Text style={styles.headerSubtitle}>Platform insights and statistics</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fb923c' }]}>
              <Ionicons name="school" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{analytics?.length || 0}</Text>
            <Text style={styles.statLabel}>Total Schools</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>
              {analytics?.reduce((sum: number, admin: any) => sum + (admin?.stats?.students || 0), 0) || 0}
            </Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>
              {analytics?.reduce((sum: number, admin: any) => sum + (admin?.stats?.teachers || 0), 0) || 0}
            </Text>
            <Text style={styles.statLabel}>Total Teachers</Text>
          </View>
        </View>

        {analytics && Array.isArray(analytics) && analytics.length > 0 && (
          <View style={styles.adminsList}>
            <Text style={styles.sectionTitle}>School Analytics</Text>
            {analytics.map((admin: any, index: number) => (
              <View key={admin.id || index} style={styles.adminCard}>
                <View style={styles.adminHeader}>
                  <View style={styles.adminIcon}>
                    <Ionicons name="school" size={24} color="#f97316" />
                  </View>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminName}>{admin.schoolName || admin.name || 'School'}</Text>
                    <Text style={styles.adminEmail}>{admin.email}</Text>
                  </View>
                </View>

                {admin.stats && (
                  <View style={styles.adminStats}>
                    <View style={styles.adminStatItem}>
                      <Ionicons name="people" size={16} color="#3b82f6" />
                      <Text style={styles.adminStatText}>{admin.stats.students || 0} Students</Text>
                    </View>
                    <View style={styles.adminStatItem}>
                      <Ionicons name="person" size={16} color="#10b981" />
                      <Text style={styles.adminStatText}>{admin.stats.teachers || 0} Teachers</Text>
                    </View>
                    <View style={styles.adminStatItem}>
                      <Ionicons name="videocam" size={16} color="#ef4444" />
                      <Text style={styles.adminStatText}>{admin.stats.videos || 0} Videos</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  adminsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  adminCard: {
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
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  adminEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  adminStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminStatText: {
    fontSize: 14,
    color: '#6b7280',
  },
});


