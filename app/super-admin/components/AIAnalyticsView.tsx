import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface DetailedAnalytics {
  adminAnalytics?: AdminAnalytics[];
  globalAnalytics?: GlobalAnalytics;
  aiInsights?: any[];
}

interface AdminAnalytics {
  adminId: string;
  adminName: string;
  adminEmail: string;
  totalStudents: number;
  totalExams: number;
  averageScore: number;
  examDifficulty?: {
    overallDifficulty: number;
  };
  topScorers?: any[];
}

interface GlobalAnalytics {
  totalAdmins?: number;
  overallAverageScore?: number;
  totalExams?: number;
  totalExamResults?: number;
  topPerformers?: any[];
  subjectWiseAnalysis?: any[];
  trendsAnalysis?: any;
}

type TabType = 'admin-comparison' | 'top-scorers' | 'difficulty-analysis' | 'performance-distribution' | 'subject-analysis' | 'trends';

export default function AIAnalyticsView() {
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('admin-comparison');

  useEffect(() => {
    fetchDetailedAnalytics();
  }, []);

  const fetchDetailedAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/ai/detailed-analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data || null);
      } else {
        console.error('Failed to fetch detailed analytics:', response.status);
      }
    } catch (error) {
      console.error('Detailed analytics error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    if (score >= 60) return '#f97316';
    return '#ef4444';
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Generating Detailed Analytics...</Text>
          <Text style={styles.loadingSubtext}>Analyzing exam data and performance patterns</Text>
        </View>
      </ScrollView>
    );
  }

  if (!analytics) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No Analytics Data</Text>
          <Text style={styles.emptySubtext}>Click the button below to generate detailed analytics</Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={fetchDetailedAnalytics}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Ionicons name="bar-chart" size={32} color="#8b5cf6" />
            <Text style={styles.headerTitle}>Detailed AI Analytics</Text>
          </View>
          <Text style={styles.headerSubtitle}>Comprehensive exam analysis with performance insights</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchDetailedAnalytics}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#7dd3fc', '#2dd4bf']}
            style={styles.refreshButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.refreshButtonText}>
              {isLoading ? 'Analyzing...' : 'Refresh Analytics'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Summary Statistics Cards */}
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
                <Text style={styles.statCardValue}>
                  {analytics.globalAnalytics?.totalAdmins || 0}
                </Text>
                <Text style={styles.statCardSubtext}>Active administrators</Text>
              </View>
              <Ionicons name="people" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Overall Average */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Overall Average</Text>
                <Text style={styles.statCardValue}>
                  {analytics.globalAnalytics?.overallAverageScore?.toFixed(1) || '0.0'}%
                </Text>
                <Text style={styles.statCardSubtext}>Platform performance</Text>
              </View>
              <Ionicons name="trending-up" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Total Exams */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#2dd4bf', '#14b8a6']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Total Exams</Text>
                <Text style={styles.statCardValue}>
                  {analytics.globalAnalytics?.totalExams || 0}
                </Text>
                <Text style={styles.statCardSubtext}>Conducted</Text>
              </View>
              <Ionicons name="document-text" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Exam Results */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#fdba74', '#fb923c']}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statCardLabel}>Exam Results</Text>
                <Text style={styles.statCardValue}>
                  {analytics.globalAnalytics?.totalExamResults || 0}
                </Text>
                <Text style={styles.statCardSubtext}>Total submissions</Text>
              </View>
              <Ionicons name="trophy" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'admin-comparison' && styles.tabActive]}
            onPress={() => setActiveTab('admin-comparison')}
          >
            <Text style={[styles.tabText, activeTab === 'admin-comparison' && styles.tabTextActive]}>
              Admin Comparison
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'top-scorers' && styles.tabActive]}
            onPress={() => setActiveTab('top-scorers')}
          >
            <Text style={[styles.tabText, activeTab === 'top-scorers' && styles.tabTextActive]}>
              Top Scorers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'difficulty-analysis' && styles.tabActive]}
            onPress={() => setActiveTab('difficulty-analysis')}
          >
            <Text style={[styles.tabText, activeTab === 'difficulty-analysis' && styles.tabTextActive]}>
              Difficulty Analysis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'performance-distribution' && styles.tabActive]}
            onPress={() => setActiveTab('performance-distribution')}
          >
            <Text style={[styles.tabText, activeTab === 'performance-distribution' && styles.tabTextActive]}>
              Performance Distribution
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'subject-analysis' && styles.tabActive]}
            onPress={() => setActiveTab('subject-analysis')}
          >
            <Text style={[styles.tabText, activeTab === 'subject-analysis' && styles.tabTextActive]}>
              Subject Analysis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
            onPress={() => setActiveTab('trends')}
          >
            <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>
              Performance Trends
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'admin-comparison' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={24} color="#111827" />
              <Text style={styles.sectionTitle}>Admin Performance Comparison</Text>
            </View>
            {analytics.adminAnalytics && analytics.adminAnalytics.length > 0 ? (
              <View style={styles.adminList}>
                {analytics.adminAnalytics.map((admin) => (
                  <View key={admin.adminId} style={styles.adminCard}>
                    <LinearGradient
                      colors={['#7dd3fc', '#2dd4bf', '#14b8a6']}
                      style={styles.adminCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.adminCardHeader}>
                        <View style={styles.adminCardHeaderLeft}>
                          <Text style={styles.adminCardName}>{admin.adminName}</Text>
                          <Text style={styles.adminCardEmail}>{admin.adminEmail}</Text>
                        </View>
                        <View style={styles.adminCardScore}>
                          <Text style={[styles.adminCardScoreValue, { color: getScoreColor(admin.averageScore) }]}>
                            {admin.averageScore?.toFixed(1) || '0.0'}%
                          </Text>
                          <Text style={styles.adminCardScoreLabel}>Average Score</Text>
                        </View>
                      </View>
                      <View style={styles.adminCardStats}>
                        <View style={styles.adminStatItem}>
                          <Text style={styles.adminStatValue}>{admin.totalStudents || 0}</Text>
                          <Text style={styles.adminStatLabel}>Students</Text>
                        </View>
                        <View style={styles.adminStatItem}>
                          <Text style={styles.adminStatValue}>{admin.totalExams || 0}</Text>
                          <Text style={styles.adminStatLabel}>Exams</Text>
                        </View>
                        <View style={styles.adminStatItem}>
                          <Text style={styles.adminStatValue}>
                            {admin.examDifficulty?.overallDifficulty?.toFixed(1) || '0.0'}
                          </Text>
                          <Text style={styles.adminStatLabel}>Difficulty</Text>
                        </View>
                        <View style={styles.adminStatItem}>
                          <Text style={styles.adminStatValue}>{admin.topScorers?.length || 0}</Text>
                          <Text style={styles.adminStatLabel}>Top Scorers</Text>
                        </View>
                      </View>
                      <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Performance Progress</Text>
                          <Text style={styles.progressValue}>
                            {admin.averageScore?.toFixed(1) || '0.0'}%
                          </Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(admin.averageScore || 0, 100)}%`,
                                backgroundColor: getScoreColor(admin.averageScore || 0)
                              }
                            ]}
                          />
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No admin analytics available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'top-scorers' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={24} color="#111827" />
              <Text style={styles.sectionTitle}>Top Performers Across All Admins</Text>
            </View>
            {analytics.globalAnalytics?.topPerformers && analytics.globalAnalytics.topPerformers.length > 0 ? (
              <View style={styles.scorersList}>
                {analytics.globalAnalytics.topPerformers.map((scorer: any, index: number) => (
                  <View key={scorer.studentId || index} style={styles.scorerCard}>
                    <View style={styles.scorerRank}>
                      <Text style={styles.scorerRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.scorerInfo}>
                      <Text style={styles.scorerName}>{scorer.studentName || 'Unknown'}</Text>
                      <Text style={styles.scorerEmail}>{scorer.studentEmail || 'No email'}</Text>
                      <Text style={styles.scorerExams}>{scorer.totalExams || 0} exams taken</Text>
                    </View>
                    <View style={styles.scorerScore}>
                      <Text style={[styles.scorerScoreValue, { color: getScoreColor(scorer.averageScore || 0) }]}>
                        {scorer.averageScore?.toFixed(1) || '0.0'}%
                      </Text>
                      <Text style={styles.scorerScoreLabel}>Average Score</Text>
                      <Text style={styles.scorerBest}>Best: {scorer.highestScore?.toFixed(1) || '0.0'}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="trophy" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No top scorers data available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'difficulty-analysis' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calculator" size={24} color="#111827" />
              <Text style={styles.sectionTitle}>Difficulty Analysis</Text>
            </View>
            {analytics.adminAnalytics && analytics.adminAnalytics.length > 0 ? (
              <View style={styles.difficultyList}>
                {analytics.adminAnalytics.map((admin) => (
                  <View key={admin.adminId} style={styles.difficultyCard}>
                    <Text style={styles.difficultyCardTitle}>{admin.adminName} - Exam Difficulty</Text>
                    <View style={styles.difficultyOverall}>
                      <Text style={styles.difficultyOverallValue}>
                        {admin.examDifficulty?.overallDifficulty?.toFixed(1) || '0.0'}
                      </Text>
                      <Text style={styles.difficultyOverallLabel}>Overall Difficulty Score</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calculator" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No difficulty analysis available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'performance-distribution' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={24} color="#111827" />
              <Text style={styles.sectionTitle}>Performance Distribution</Text>
            </View>
            <View style={styles.emptyContainer}>
              <Ionicons name="pie-chart" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>Performance distribution data coming soon</Text>
            </View>
          </View>
        )}

        {activeTab === 'subject-analysis' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={24} color="#111827" />
              <Text style={styles.sectionTitle}>Subject-wise Performance Analysis</Text>
            </View>
            {analytics.globalAnalytics?.subjectWiseAnalysis && analytics.globalAnalytics.subjectWiseAnalysis.length > 0 ? (
              <View style={styles.subjectList}>
                {analytics.globalAnalytics.subjectWiseAnalysis.map((subject: any, index: number) => (
                  <View key={index} style={styles.subjectCard}>
                    <View style={styles.subjectCardHeader}>
                      <Text style={styles.subjectCardTitle}>{subject.subject || 'Unknown'}</Text>
                      <Text style={[styles.subjectCardScore, { color: getScoreColor(subject.averageScore || 0) }]}>
                        {subject.averageScore?.toFixed(1) || '0.0'}%
                      </Text>
                    </View>
                    <View style={styles.subjectCardStats}>
                      <View style={styles.subjectStatItem}>
                        <Text style={styles.subjectStatValue}>{subject.totalExams || 0}</Text>
                        <Text style={styles.subjectStatLabel}>Total Exams</Text>
                      </View>
                      <View style={styles.subjectStatItem}>
                        <Text style={styles.subjectStatValue}>{subject.highestScore?.toFixed(1) || '0.0'}%</Text>
                        <Text style={styles.subjectStatLabel}>Highest Score</Text>
                      </View>
                      <View style={styles.subjectStatItem}>
                        <Text style={styles.subjectStatValue}>{subject.lowestScore?.toFixed(1) || '0.0'}%</Text>
                        <Text style={styles.subjectStatLabel}>Lowest Score</Text>
                      </View>
                      <View style={styles.subjectStatItem}>
                        <Text style={styles.subjectStatValue}>{subject.examCount || 0}</Text>
                        <Text style={styles.subjectStatLabel}>Exam Count</Text>
                      </View>
                    </View>
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Performance Range</Text>
                        <Text style={styles.progressValue}>
                          {subject.lowestScore?.toFixed(1) || '0.0'}% - {subject.highestScore?.toFixed(1) || '0.0'}%
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(subject.averageScore || 0, 100)}%`,
                              backgroundColor: getScoreColor(subject.averageScore || 0)
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="book" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No subject analysis available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'trends' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={24} color="#111827" />
              <Text style={styles.sectionTitle}>Performance Trends Analysis</Text>
            </View>
            <View style={styles.emptyContainer}>
              <Ionicons name="trending-up" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>Performance trends data coming soon</Text>
            </View>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  refreshButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  adminList: {
    gap: 16,
  },
  adminCard: {
    borderRadius: 12,
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
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  adminCardHeaderLeft: {
    flex: 1,
  },
  adminCardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  adminCardEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminCardScore: {
    alignItems: 'flex-end',
  },
  adminCardScoreValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  adminCardScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  adminCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  adminStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  adminStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  adminStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressSection: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scorersList: {
    gap: 16,
  },
  scorerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scorerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scorerRankText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400e',
  },
  scorerInfo: {
    flex: 1,
  },
  scorerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  scorerEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  scorerExams: {
    fontSize: 12,
    color: '#9ca3af',
  },
  scorerScore: {
    alignItems: 'flex-end',
  },
  scorerScoreValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  scorerScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  scorerBest: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  difficultyList: {
    gap: 16,
  },
  difficultyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  difficultyCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  difficultyOverall: {
    alignItems: 'center',
  },
  difficultyOverallValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  difficultyOverallLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  subjectList: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'capitalize',
  },
  subjectCardScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  subjectCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  subjectStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  subjectStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subjectStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
