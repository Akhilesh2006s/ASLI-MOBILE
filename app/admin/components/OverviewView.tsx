import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../../../src/services/api/api';
import type { AdminNavView } from './AdminNavDrawer';
import {
  AdminScalePressable,
  AdminSkeletonStats,
  AdminAnimatedProgress,
  useAdminTheme,
} from '../ui';
import { ADMIN_SHADOW } from '../../../src/theme/admin';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeUsers: number;
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

type Props = {
  onNavigate?: (view: AdminNavView) => void;
};

function StatCard({
  label,
  value,
  icon,
  gradient,
  delay = 0,
  loading,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  delay?: number;
  loading?: boolean;
}) {
  const { radius } = useAdminTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(450).springify()}
      style={[styles.statCard, { borderRadius: radius.lg }, ADMIN_SHADOW.md]}
    >
      <LinearGradient
        colors={[...gradient]}
        style={[styles.statGradient, { borderRadius: radius.lg }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIconWrap}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <View style={styles.statTextWrap}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{loading ? '—' : value}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function AnalysisPanel({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
}) {
  const { colors, radius } = useAdminTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderColor: colors.surfaceBorder,
        },
        ADMIN_SHADOW.sm,
      ]}
    >
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function OverviewView({ onNavigate }: Props) {
  const { colors, spacing, radius } = useAdminTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 680;

  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeUsers: 0,
  });
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics>({
    classDistribution: [],
    performanceMetrics: { averageScore: 0, totalExamsTaken: 0, topPerformers: [] },
    subjectPerformance: [],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminStats = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/dashboard/stats');
      const payload = response?.data?.data || response?.data || {};
      setStats({
        totalStudents: payload.totalStudents || 0,
        totalTeachers: payload.totalTeachers || 0,
        totalClasses: payload.totalClasses || 0,
        activeUsers: payload.activeUsers || 0,
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  }, []);

  const fetchStudentAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const response = await api.get('/api/admin/students/analytics');
      const payload = response?.data?.data || response?.data || {};
      setStudentAnalytics({
        classDistribution: payload.classDistribution || [],
        performanceMetrics: payload.performanceMetrics || {
          averageScore: 0,
          totalExamsTaken: 0,
          topPerformers: [],
        },
        subjectPerformance: payload.subjectPerformance || [],
      });
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoadingStats(true);
    await Promise.all([fetchAdminStats(), fetchStudentAnalytics()]);
    setIsLoadingStats(false);
  }, [fetchAdminStats, fetchStudentAnalytics]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const topClassDistribution = studentAnalytics.classDistribution?.slice(0, 5) || [];
  const topSubjectPerformance = studentAnalytics.subjectPerformance?.slice(0, 4) || [];
  const statGradients = colors.statGradients;

  if (isLoadingStats && !refreshing) {
    return <AdminSkeletonStats />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 32, gap: spacing.md }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Stat cards */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon="people"
          gradient={statGradients[0]}
          delay={0}
        />
        <StatCard
          label="Active Classes"
          value={stats.totalClasses}
          icon="school"
          gradient={statGradients[1]}
          delay={60}
        />
        <StatCard
          label="Active Users"
          value={stats.activeUsers}
          icon="pulse"
          gradient={statGradients[2]}
          delay={120}
        />
        <StatCard
          label="Teachers"
          value={stats.totalTeachers}
          icon="person"
          gradient={statGradients[3]}
          delay={180}
        />
      </View>

      {/* School analysis */}
      <Animated.View entering={FadeInUp.delay(200).duration(500)}>
        <View
          style={[
            styles.analysisWrap,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              borderColor: colors.surfaceBorder,
            },
            ADMIN_SHADOW.md,
          ]}
        >
          <View style={styles.analysisHeader}>
            <LinearGradient
              colors={[...colors.fabGradient]}
              style={[styles.analysisIconBox, { borderRadius: radius.md }]}
            >
              <Ionicons name="bar-chart" size={22} color="#fff" />
            </LinearGradient>
            <View style={styles.analysisHeaderText}>
              <Text style={[styles.analysisTitle, { color: colors.primary }]}>Detailed School Analysis</Text>
              <Text style={[styles.analysisSubtitle, { color: colors.textMuted }]}>
                Comprehensive insights about your students
              </Text>
            </View>
          </View>

          {isLoadingAnalytics ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 24 }} />
          ) : (
            <View style={[styles.panelsRow, isWide && styles.panelsRowWide]}>
              <AnalysisPanel title="Class Distribution" icon="school" iconColor={colors.primary}>
                {topClassDistribution.length > 0 ? (
                  topClassDistribution.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.rowItem,
                        idx < topClassDistribution.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.surfaceBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                        {item.className || item.class || 'Unknown'}
                      </Text>
                      <View style={[styles.countBadge, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.countText, { color: colors.primary }]}>{item.count || 0}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.empty, { color: colors.textMuted }]}>No class data</Text>
                )}
              </AnalysisPanel>

              <AnalysisPanel title="Performance Metrics" icon="trending-up" iconColor={colors.success}>
                <View style={styles.rowItem}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Average Score</Text>
                  <Text style={[styles.metricHighlight, { color: colors.success }]}>
                    {studentAnalytics.performanceMetrics?.averageScore || 0}%
                  </Text>
                </View>
                <View style={styles.rowItem}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Total Exams Taken</Text>
                  <Text style={[styles.metricHighlight, { color: colors.primary }]}>
                    {studentAnalytics.performanceMetrics?.totalExamsTaken || 0}
                  </Text>
                </View>
                {studentAnalytics.performanceMetrics?.topPerformers?.[0] ? (
                  <View style={[styles.topBox, { backgroundColor: colors.bg, borderRadius: radius.sm }]}>
                    <Text style={[styles.topLabel, { color: colors.textMuted }]}>Top Performer</Text>
                    <Text style={[styles.topName, { color: colors.text }]}>
                      {studentAnalytics.performanceMetrics.topPerformers[0].studentName}
                    </Text>
                    <Text style={[styles.topScore, { color: colors.textSecondary }]}>
                      {studentAnalytics.performanceMetrics.topPerformers[0].averageScore}% avg
                    </Text>
                  </View>
                ) : null}
              </AnalysisPanel>

              <AnalysisPanel title="Subject Performance" icon="book" iconColor={colors.primary}>
                {topSubjectPerformance.length > 0 ? (
                  topSubjectPerformance.map((subject, idx) => (
                    <AdminAnimatedProgress
                      key={idx}
                      label={(subject.subject || subject.name || 'Unknown').toUpperCase()}
                      value={subject.averageScore || 0}
                      color={colors.primary}
                      height={6}
                    />
                  ))
                ) : (
                  <Text style={[styles.empty, { color: colors.textMuted }]}>No subject data</Text>
                )}
              </AnalysisPanel>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Assigned cards */}
      <View style={[styles.assignRow, isWide && styles.assignRowWide]}>
        <AdminScalePressable
          onPress={() => onNavigate?.('students')}
          style={[styles.assignCard, ADMIN_SHADOW.lg]}
        >
          <LinearGradient
            colors={[...statGradients[1]]}
            style={[styles.assignGradient, { borderRadius: radius.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.assignIcon}>
              <Ionicons name="people" size={26} color="#fff" />
            </View>
            <Text style={styles.assignHeading}>Your Students</Text>
            <Text style={styles.assignSub}>Total Students Assigned</Text>
            <Text style={styles.assignValue}>{stats.totalStudents}</Text>
            <Text style={styles.assignDesc}>
              Students specifically assigned to your admin account
            </Text>
            <View style={styles.assignCta}>
              <Text style={styles.assignCtaText}>View details</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </LinearGradient>
        </AdminScalePressable>

        <AdminScalePressable
          onPress={() => onNavigate?.('teachers')}
          style={[styles.assignCard, ADMIN_SHADOW.lg]}
        >
          <LinearGradient
            colors={[...statGradients[4]]}
            style={[styles.assignGradient, { borderRadius: radius.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.assignIcon}>
              <Ionicons name="school" size={26} color="#fff" />
            </View>
            <Text style={styles.assignHeading}>Your Teachers</Text>
            <Text style={styles.assignSub}>Total Teachers Assigned</Text>
            <Text style={styles.assignValue}>{stats.totalTeachers}</Text>
            <Text style={styles.assignDesc}>
              Teachers specifically assigned to your admin account
            </Text>
            <View style={styles.assignCta}>
              <Text style={styles.assignCtaText}>View details</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </LinearGradient>
        </AdminScalePressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: { flex: 1 },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  analysisWrap: {
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analysisIconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisHeaderText: { flex: 1 },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  analysisSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  panelsRow: { gap: 10 },
  panelsRowWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panel: {
    flex: 1,
    minWidth: 200,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  panelIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 36,
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricHighlight: {
    fontSize: 16,
    fontWeight: '800',
  },
  topBox: {
    padding: 10,
    marginTop: 4,
    gap: 2,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  topName: {
    fontSize: 14,
    fontWeight: '700',
  },
  topScore: {
    fontSize: 12,
  },
  empty: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  assignRow: { gap: 12 },
  assignRowWide: {
    flexDirection: 'row',
  },
  assignCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 20,
    overflow: 'hidden',
  },
  assignGradient: {
    padding: 20,
  },
  assignIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  assignHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  assignSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  assignValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginVertical: 6,
  },
  assignDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
    marginBottom: 14,
  },
  assignCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  assignCtaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
