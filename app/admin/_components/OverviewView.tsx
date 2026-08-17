import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService, {
  peekDashboardStats,
  peekStudentAnalytics,
} from '../../../src/services/api/adminService';
import { useIsTablet } from '../../../src/hooks/useIsTablet';
import type { AdminNavView } from './AdminNavDrawer';
import { useAdminTheme } from '../_ui';

/** Admin dashboard overview — keep free of Reanimated for scroll/perf stability. */
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

/** Dashboard-only palette — sky blue + white (does not affect other admin tabs). */
const DASH = {
  sky: '#0EA5E9',
  skyDeep: '#0284C7',
  skyDark: '#0369A1',
  skyInk: '#0C4A6E',
  skyMuted: '#64748B',
  white: '#FFFFFF',
  wash: '#F0F9FF',
  soft: '#E0F2FE',
  chip: '#BAE6FD',
  border: 'rgba(14, 165, 233, 0.22)',
} as const;

const DASHBOARD_STAT_CARDS = [
  { bg: DASH.white, accent: DASH.skyDeep, iconBg: DASH.soft },
  { bg: DASH.wash, accent: DASH.sky, iconBg: DASH.chip },
  { bg: DASH.white, accent: DASH.skyDark, iconBg: DASH.soft },
  { bg: DASH.soft, accent: DASH.skyDeep, iconBg: DASH.chip },
] as const;

/** Border-only card chrome — shadows/elevation over scroll kill FPS. */
const CARD_EDGE = {
  borderWidth: 1,
} as const;

function StatCard({
  label,
  value,
  icon,
  theme,
  loading,
  wide,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  theme: { bg: string; accent: string; iconBg: string };
  loading?: boolean;
  wide?: boolean;
}) {
  const { radius } = useAdminTheme();

  return (
    <View
      style={[
        styles.statCard,
        wide && styles.statCardWide,
        CARD_EDGE,
        {
          borderRadius: radius.lg,
          backgroundColor: theme.bg,
          borderColor: `${theme.accent}33`,
        },
      ]}
    >
      <View style={styles.statInner}>
        <View style={[styles.statIconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={icon} size={22} color={theme.accent} />
        </View>
        <View style={styles.statTextWrap}>
          <Text style={[styles.statLabel, { color: DASH.skyMuted }]}>{label}</Text>
          <Text style={[styles.statValue, { color: theme.accent }]}>{loading ? '—' : value}</Text>
        </View>
      </View>
    </View>
  );
}

const MemoStatCard = memo(StatCard);

const ANALYSIS_ACCENTS = {
  class: {
    accent: DASH.skyDeep,
    muted: 'rgba(14, 165, 233, 0.14)',
    panel: DASH.white,
    border: DASH.border,
  },
  performance: {
    accent: DASH.sky,
    muted: 'rgba(14, 165, 233, 0.14)',
    panel: DASH.wash,
    border: DASH.border,
  },
  subject: {
    accent: DASH.skyDark,
    muted: 'rgba(3, 105, 161, 0.14)',
    panel: DASH.white,
    border: DASH.border,
  },
  shell: {
    accent: DASH.skyDeep,
    muted: 'rgba(14, 165, 233, 0.14)',
    panel: DASH.white,
    border: DASH.border,
  },
} as const;

const CLASS_BADGE_COLORS = [
  { bg: DASH.soft, text: DASH.skyDeep },
  { bg: DASH.chip, text: DASH.skyDark },
  { bg: DASH.wash, text: DASH.sky },
  { bg: DASH.soft, text: DASH.skyInk },
  { bg: DASH.chip, text: DASH.skyDeep },
] as const;

function AnalysisPanel({
  title,
  icon,
  iconColor,
  panelBg,
  borderColor,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  panelBg?: string;
  borderColor?: string;
  children: React.ReactNode;
}) {
  const { radius } = useAdminTheme();

  return (
    <View
      style={[
        styles.panel,
        CARD_EDGE,
        {
          backgroundColor: panelBg || DASH.white,
          borderRadius: radius.md,
          borderColor: borderColor || DASH.border,
        },
      ]}
    >
      <View style={[styles.panelAccent, { backgroundColor: iconColor }]} />
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: `${iconColor}22` }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.panelTitleWrap}>
          <Text style={[styles.panelTitle, { color: DASH.skyInk }]}>{title}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

/** Static bar — no Reanimated (keeps scroll buttery). */
function SubjectBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);

  return (
    <View style={styles.barWrap}>
      <View style={styles.barLabelRow}>
        <View style={styles.barLabelWrap}>
          <Text style={[styles.barLabel, { color: DASH.skyMuted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={[styles.barValue, { color: DASH.skyInk }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: DASH.soft }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default memo(function OverviewView({ onNavigate }: Props) {
  const { spacing, radius } = useAdminTheme();
  const { width } = useWindowDimensions();
  const isTablet = useIsTablet();
  const isWide = isTablet || width >= 680;

  const cachedStats = peekDashboardStats();
  const cachedAnalytics = peekStudentAnalytics();

  const [stats, setStats] = useState<Stats>(
    () =>
      cachedStats || {
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        activeUsers: 0,
      }
  );
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics>(
    () =>
      cachedAnalytics || {
        classDistribution: [],
        performanceMetrics: { averageScore: 0, totalExamsTaken: 0, topPerformers: [] },
        subjectPerformance: [],
      }
  );
  const [isLoadingStats, setIsLoadingStats] = useState(!cachedStats);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(!cachedAnalytics);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminStats = useCallback(async (force = false) => {
    try {
      const normalized = await adminService.getDashboardStats({ force });
      setStats(normalized);
    } catch (error) {
      console.warn('Failed to fetch admin stats:', (error as any)?.friendlyMessage || (error as any)?.message);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchStudentAnalytics = useCallback(async (force = false) => {
    try {
      setIsLoadingAnalytics(true);
      const normalized = await adminService.getStudentAnalytics({ force });
      setStudentAnalytics(normalized);
    } catch (error) {
      console.warn(
        'Failed to fetch student analytics:',
        (error as any)?.friendlyMessage || (error as any)?.message
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoadingStats(true);
    await Promise.all([fetchAdminStats(true), fetchStudentAnalytics(true)]);
  }, [fetchAdminStats, fetchStudentAnalytics]);

  useEffect(() => {
    let cancelled = false;
    let deferTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      // Paint from shared cache immediately; refresh in background when stale/missing.
      await fetchAdminStats(false);
      if (cancelled) return;
      deferTimer = setTimeout(() => {
        if (!cancelled) void fetchStudentAnalytics(false);
      }, 0);
    })();
    return () => {
      cancelled = true;
      if (deferTimer) clearTimeout(deferTimer);
    };
  }, [fetchAdminStats, fetchStudentAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const goStudents = useCallback(() => onNavigate?.('students'), [onNavigate]);
  const goTeachers = useCallback(() => onNavigate?.('teachers'), [onNavigate]);

  const topClassDistribution = studentAnalytics.classDistribution?.slice(0, 5) || [];
  const topSubjectPerformance = studentAnalytics.subjectPerformance?.slice(0, 4) || [];
  const statCards = DASHBOARD_STAT_CARDS;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      // Opaque fill avoids expensive blending over AppBackground artwork while scrolling.
      removeClippedSubviews={Platform.OS === 'android'}
      overScrollMode="never"
      nestedScrollEnabled={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DASH.sky} />
      }
    >
      <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
        <MemoStatCard
          label="Total Students"
          value={stats.totalStudents}
          icon="people"
          theme={statCards[0]}
          wide={isTablet}
          loading={isLoadingStats}
        />
        <MemoStatCard
          label="Active Classes"
          value={stats.totalClasses}
          icon="school"
          theme={statCards[1]}
          wide={isTablet}
          loading={isLoadingStats}
        />
        <MemoStatCard
          label="Active Users"
          value={stats.activeUsers}
          icon="pulse"
          theme={statCards[2]}
          wide={isTablet}
          loading={isLoadingStats}
        />
        <MemoStatCard
          label="Teachers"
          value={stats.totalTeachers}
          icon="person"
          theme={statCards[3]}
          wide={isTablet}
          loading={isLoadingStats}
        />
      </View>

      <View
        style={[
          styles.analysisWrap,
          CARD_EDGE,
          {
            backgroundColor: ANALYSIS_ACCENTS.shell.panel,
            borderRadius: radius.xl,
            borderColor: ANALYSIS_ACCENTS.shell.border,
            marginTop: spacing.md,
          },
        ]}
      >
        <View style={styles.analysisHeader}>
          <View
            style={[
              styles.analysisIconBox,
              { borderRadius: radius.md, backgroundColor: ANALYSIS_ACCENTS.shell.accent },
            ]}
          >
            <Ionicons name="bar-chart" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.analysisHeaderText}>
            <Text style={[styles.analysisTitle, { color: ANALYSIS_ACCENTS.shell.accent }]}>
              Detailed School Analysis
            </Text>
            <Text style={[styles.analysisSubtitle, { color: DASH.skyMuted }]}>
              Comprehensive insights about your students
            </Text>
          </View>
        </View>

        {isLoadingAnalytics ? (
          <ActivityIndicator size="small" color={ANALYSIS_ACCENTS.shell.accent} style={{ padding: 24 }} />
        ) : (
          <View style={[styles.panelsRow, isWide && styles.panelsRowWide]}>
            <AnalysisPanel
              title="Class Distribution"
              icon="school"
              iconColor={ANALYSIS_ACCENTS.class.accent}
              panelBg={ANALYSIS_ACCENTS.class.panel}
              borderColor={ANALYSIS_ACCENTS.class.border}
            >
              {topClassDistribution.length > 0 ? (
                topClassDistribution.map((item, idx) => {
                  const badge = CLASS_BADGE_COLORS[idx % CLASS_BADGE_COLORS.length];
                  return (
                    <View
                      key={`${item.className || item.class || 'c'}-${idx}`}
                      style={[
                        styles.rowItem,
                        idx < topClassDistribution.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.rowLabelWrap}>
                        <Text style={[styles.rowLabel, { color: DASH.skyInk }]}>
                          {item.className || item.class || 'Unknown'}
                        </Text>
                      </View>
                      <View style={[styles.countBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.countText, { color: badge.text }]}>{item.count || 0}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.empty, { color: DASH.skyMuted }]}>No class data</Text>
              )}
            </AnalysisPanel>

            <AnalysisPanel
              title="Performance Metrics"
              icon="trending-up"
              iconColor={ANALYSIS_ACCENTS.performance.accent}
              panelBg={ANALYSIS_ACCENTS.performance.panel}
              borderColor={ANALYSIS_ACCENTS.performance.border}
            >
              <View style={styles.rowItem}>
                <View style={styles.rowLabelWrap}>
                  <Text style={[styles.rowLabel, { color: DASH.skyMuted }]}>Average Score</Text>
                </View>
                <Text style={[styles.metricHighlight, { color: ANALYSIS_ACCENTS.performance.accent }]}>
                  {studentAnalytics.performanceMetrics?.averageScore || 0}%
                </Text>
              </View>
              <View style={styles.rowItem}>
                <View style={styles.rowLabelWrap}>
                  <Text style={[styles.rowLabel, { color: DASH.skyMuted }]}>Total Exams Taken</Text>
                </View>
                <Text style={[styles.metricHighlight, { color: ANALYSIS_ACCENTS.class.accent }]}>
                  {studentAnalytics.performanceMetrics?.totalExamsTaken || 0}
                </Text>
              </View>
              {studentAnalytics.performanceMetrics?.topPerformers?.[0] ? (
                <View
                  style={[
                    styles.topBox,
                    {
                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: 'rgba(14, 165, 233, 0.2)',
                    },
                  ]}
                >
                  <Text style={[styles.topLabel, { color: ANALYSIS_ACCENTS.performance.accent }]}>
                    Top Performer
                  </Text>
                  <Text style={[styles.topName, { color: DASH.skyInk }]}>
                    {studentAnalytics.performanceMetrics.topPerformers[0].studentName}
                  </Text>
                  <Text style={[styles.topScore, { color: DASH.skyMuted }]}>
                    {studentAnalytics.performanceMetrics.topPerformers[0].averageScore}% avg
                  </Text>
                </View>
              ) : null}
            </AnalysisPanel>

            <AnalysisPanel
              title="Subject Performance"
              icon="book"
              iconColor={ANALYSIS_ACCENTS.subject.accent}
              panelBg={ANALYSIS_ACCENTS.subject.panel}
              borderColor={ANALYSIS_ACCENTS.subject.border}
            >
              {topSubjectPerformance.length > 0 ? (
                topSubjectPerformance.map((subject, idx) => (
                  <SubjectBar
                    key={`${subject.subject || subject.name || 's'}-${idx}`}
                    label={(subject.subject || subject.name || 'Unknown').toUpperCase()}
                    value={subject.averageScore || 0}
                    color={ANALYSIS_ACCENTS.subject.accent}
                  />
                ))
              ) : (
                <Text style={[styles.empty, { color: DASH.skyMuted }]}>No subject data</Text>
              )}
            </AnalysisPanel>
          </View>
        )}
      </View>

      <View style={[styles.assignRow, isWide && styles.assignRowWide, { marginTop: spacing.md }]}>
        <Pressable
          onPress={goStudents}
          style={[
            styles.assignCard,
            CARD_EDGE,
            {
              borderRadius: radius.xl,
              backgroundColor: statCards[1].bg,
              borderColor: `${statCards[1].accent}33`,
            },
          ]}
        >
          <View style={[styles.assignIcon, { backgroundColor: statCards[1].iconBg }]}>
            <Ionicons name="people" size={24} color={statCards[1].accent} />
          </View>
          <Text style={[styles.assignHeading, { color: DASH.skyInk }]}>Your Students</Text>
          <Text style={[styles.assignSub, { color: DASH.skyMuted }]}>Total Students Assigned</Text>
          <Text style={[styles.assignValue, { color: statCards[1].accent }]}>{stats.totalStudents}</Text>
          <Text style={[styles.assignDesc, { color: DASH.skyMuted }]}>
            Students specifically assigned to your admin account
          </Text>
          <View style={styles.assignCta}>
            <Text style={[styles.assignCtaText, { color: statCards[1].accent }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color={statCards[1].accent} />
          </View>
        </Pressable>

        <Pressable
          onPress={goTeachers}
          style={[
            styles.assignCard,
            CARD_EDGE,
            {
              borderRadius: radius.xl,
              backgroundColor: statCards[3].bg,
              borderColor: `${statCards[3].accent}33`,
            },
          ]}
        >
          <View style={[styles.assignIcon, { backgroundColor: statCards[3].iconBg }]}>
            <Ionicons name="school" size={24} color={statCards[3].accent} />
          </View>
          <Text style={[styles.assignHeading, { color: DASH.skyInk }]}>Your Teachers</Text>
          <Text style={[styles.assignSub, { color: DASH.skyMuted }]}>Total Teachers Assigned</Text>
          <Text style={[styles.assignValue, { color: statCards[3].accent }]}>{stats.totalTeachers}</Text>
          <Text style={[styles.assignDesc, { color: DASH.skyMuted }]}>
            Teachers specifically assigned to your admin account
          </Text>
          <View style={styles.assignCta}>
            <Text style={[styles.assignCtaText, { color: statCards[3].accent }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color={statCards[3].accent} />
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  // Sky wash — Dashboard tab only.
  container: { flex: 1, minHeight: 0, backgroundColor: DASH.wash },
  content: { padding: 16, paddingBottom: 48 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsGridTablet: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    overflow: 'hidden',
  },
  statCardWide: {
    minWidth: 0,
  },
  statInner: {
    padding: 14,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: { flex: 1 },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  analysisWrap: {
    padding: 18,
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
    paddingTop: 16,
    gap: 8,
  },
  panelAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
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
  panelTitleWrap: { flex: 1, minWidth: 0 },
  panelTitle: { fontSize: 14, fontWeight: '700' },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(14, 116, 144, 0.15)',
  },
  rowLabelWrap: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  countBadge: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
  },
  countText: { fontSize: 13, fontWeight: '800' },
  metricHighlight: { fontSize: 16, fontWeight: '800' },
  topBox: { padding: 10, marginTop: 4, gap: 2 },
  topLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  topName: { fontSize: 14, fontWeight: '700' },
  topScore: { fontSize: 12 },
  empty: { fontSize: 13, paddingVertical: 8 },
  barWrap: { gap: 6, marginBottom: 4 },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  barLabelWrap: { flex: 1, minWidth: 0 },
  barLabel: { fontSize: 12, fontWeight: '600' },
  barValue: { fontSize: 12, fontWeight: '700' },
  barTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  assignRow: { gap: 12 },
  assignRowWide: { flexDirection: 'row' },
  assignCard: {
    flex: 1,
    padding: 18,
    gap: 6,
  },
  assignIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  assignHeading: { fontSize: 16, fontWeight: '800' },
  assignSub: { fontSize: 12, fontWeight: '600' },
  assignValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  assignDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  assignCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  assignCtaText: { fontSize: 13, fontWeight: '700' },
});
