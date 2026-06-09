import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import {
  ADVANCED_CHART_COLORS,
  AdvancedAnalyticsPayload,
  advancedAnalyticsMockData,
  difficultyLabel,
  formatSeconds,
} from '../../../../src/lib/advanced-analytics';
import DonutChart from '../../../../src/components/ui/charts/DonutChart';
import ChartLegend from '../../../../src/components/ui/charts/ChartLegend';
import GroupedBarChart from '../../../../src/components/ui/charts/GroupedBarChart';
import StackedBarChart from '../../../../src/components/ui/charts/StackedBarChart';
import HorizontalStackedBarChart from '../../../../src/components/ui/charts/HorizontalStackedBarChart';
import BarChart from '../../../../src/components/ui/charts/BarChart';
import AnalysisCard from './AnalysisCard';
import { ANALYSIS } from './exam-analysis-ui';

const difficultyRows = ['easy', 'moderate', 'difficult', 'highly_difficult'] as const;

function DashboardCard({
  title,
  subtitle,
  children,
  icon = 'bar-chart' as const,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}) {
  return (
    <AnalysisCard title={title} icon={icon} accent={ANALYSIS.accent}>
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      {children}
    </AnalysisCard>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function AdvancedPerformanceDashboardMobile({ examId }: { examId: string }) {
  const [data, setData] = useState<AdvancedAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/exam/${examId}/advanced-analytics`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to load advanced analytics');
        }
        if (!cancelled) setData(payload.data || advancedAnalyticsMockData);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Advanced analytics unavailable');
          setData(advancedAnalyticsMockData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examId]);

  const analytics = data || advancedAnalyticsMockData;

  const difficultyMap = useMemo(() => {
    const mapped = new Map(analytics.difficultyTimeIntelligence.map((row) => [row.difficulty, row]));
    return difficultyRows
      .map((row) => mapped.get(row))
      .filter(Boolean) as AdvancedAnalyticsPayload['difficultyTimeIntelligence'];
  }, [analytics]);

  const questionTypeChartData = useMemo(
    () =>
      analytics.questionTypeMatrix.map((row) => ({
        label: row.type,
        correct: row.correct.physics + row.correct.chemistry + row.correct.maths,
        wrong: row.wrong.physics + row.wrong.chemistry + row.wrong.maths,
        notAnswered: row.notAnswered.physics + row.notAnswered.chemistry + row.notAnswered.maths,
      })),
    [analytics.questionTypeMatrix]
  );

  const questionTypeHasData = questionTypeChartData.some(
    (r) => r.correct + r.wrong + r.notAnswered > 0
  );

  const difficultyOutcomeData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        label: difficultyLabel(row.difficulty),
        correct: row.correctAnswered.count,
        wrong: row.wrongAnswered.count,
      })),
    [difficultyMap]
  );

  const correctTimeBucketData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        label: difficultyLabel(row.difficulty),
        inTime: row.correctAnswered.inTime,
        lessTime: row.correctAnswered.lessTime,
        overTime: row.correctAnswered.overTime,
        idealTime: row.idealTimeSec,
        avgTime: row.correctAnswered.avgTime,
      })),
    [difficultyMap]
  );

  const wrongTimeBucketData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        label: difficultyLabel(row.difficulty),
        inTime: row.wrongAnswered.inTime,
        lessTime: row.wrongAnswered.lessTime,
        overTime: row.wrongAnswered.overTime,
        idealTime: row.idealTimeSec,
        avgTime: row.wrongAnswered.avgTime,
      })),
    [difficultyMap]
  );

  const conceptChartData = useMemo(
    () =>
      analytics.conceptVsApplication.map((row) => {
        const attempted = row.correct + row.wrong;
        return {
          label: row.type,
          correct: row.correct,
          wrong: row.wrong,
          notAnswered: row.notAnswered,
          hitRate: attempted > 0 ? Math.round((row.correct / attempted) * 100) : 0,
          totalTime: row.totalTime,
          avgTime: row.avgTimePerQuestion,
        };
      }),
    [analytics.conceptVsApplication]
  );

  const conceptHasData = conceptChartData.some(
    (r) => r.correct + r.wrong + r.notAnswered > 0
  );

  const chapterChartData = useMemo(
    () =>
      analytics.chapterWeakness.map((row) => ({
        label: row.subject.charAt(0).toUpperCase() + row.subject.slice(1),
        sublabel: row.chapter,
        correct: row.correct,
        errors: row.errors,
        notAnswered: row.notAnswered,
        total: row.correct + row.errors + row.notAnswered,
        accuracy: row.accuracy,
      })),
    [analytics.chapterWeakness]
  );

  const chapterHasData = chapterChartData.some((r) => r.total > 0);

  const chapterPieSegments = useMemo(() => {
    const totals = { correct: 0, errors: 0, notAnswered: 0 };
    chapterChartData.forEach((r) => {
      totals.correct += r.correct;
      totals.errors += r.errors;
      totals.notAnswered += r.notAnswered;
    });
    return [
      { value: totals.correct, color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
      { value: totals.errors, color: ADVANCED_CHART_COLORS.wrong, label: 'Errors' },
      { value: totals.notAnswered, color: ADVANCED_CHART_COLORS.notAnswered, label: 'Not Answered' },
    ].filter((s) => s.value > 0);
  }, [chapterChartData]);

  const outcomeSeries = [
    { key: 'correct', color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
    { key: 'wrong', color: ADVANCED_CHART_COLORS.wrong, label: 'Wrong' },
    { key: 'notAnswered', color: ADVANCED_CHART_COLORS.notAnswered, label: 'Not Answered' },
  ];

  const timeBucketSeries = [
    { key: 'inTime', color: ADVANCED_CHART_COLORS.inTime, label: 'In Time' },
    { key: 'lessTime', color: ADVANCED_CHART_COLORS.lessTime, label: 'Less Time' },
    { key: 'overTime', color: ADVANCED_CHART_COLORS.overTime, label: 'Over Time' },
  ];

  const chapterSeries = [
    { key: 'correct', color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
    { key: 'errors', color: ADVANCED_CHART_COLORS.wrong, label: 'Errors' },
    { key: 'notAnswered', color: ADVANCED_CHART_COLORS.notAnswered, label: 'Not Answered' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading advanced intelligence…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Performance Intelligence</Text>
        <Text style={styles.headerSub}>Time × difficulty × question type × chapter</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badgeBlue}>
            <Text style={styles.badgeBlueText}>Risk: {analytics.recommendation?.riskLevel || 'N/A'}</Text>
          </View>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeGreenText}>Trend: {analytics.recommendation?.confidenceTrend || 'Stable'}</Text>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>{error}. Showing sample layout until live analytics loads.</Text>
        </View>
      ) : null}

      <DashboardCard
        title="Question-Type Intelligence Matrix"
        subtitle="Outcome counts by question type (all subjects combined)"
      >
        {!questionTypeHasData ? (
          <ChartEmpty message="No question-type data for this exam yet." />
        ) : (
          <GroupedBarChart data={questionTypeChartData} series={outcomeSeries} height={280} />
        )}
      </DashboardCard>

      <DashboardCard
        title="Difficulty + Time Intelligence"
        subtitle="Correct vs wrong counts and time buckets by difficulty"
      >
        <Text style={styles.sectionLabel}>Correct vs wrong by difficulty</Text>
        {difficultyOutcomeData.length > 0 ? (
          <GroupedBarChart
            data={difficultyOutcomeData}
            series={[
              { key: 'correct', color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
              { key: 'wrong', color: ADVANCED_CHART_COLORS.wrong, label: 'Wrong' },
            ]}
            height={240}
          />
        ) : (
          <ChartEmpty message="No difficulty data for this exam yet." />
        )}

        <View style={styles.bucketBoxGreen}>
          <Text style={styles.bucketTitleGreen}>Correct — time buckets</Text>
          {correctTimeBucketData.length > 0 ? (
            <>
              <StackedBarChart data={correctTimeBucketData} series={timeBucketSeries} height={220} />
              {correctTimeBucketData.map((row) => (
                <Text key={row.label} style={styles.bucketMeta}>
                  {row.label}: ideal {formatSeconds(row.idealTime)} · avg {formatSeconds(row.avgTime)}
                </Text>
              ))}
            </>
          ) : (
            <ChartEmpty message="No correct-answer timing data." />
          )}
        </View>

        <View style={styles.bucketBoxOrange}>
          <Text style={styles.bucketTitleOrange}>Wrong — time buckets</Text>
          {wrongTimeBucketData.length > 0 ? (
            <>
              <StackedBarChart data={wrongTimeBucketData} series={timeBucketSeries} height={220} />
              {wrongTimeBucketData.map((row) => (
                <Text key={row.label} style={styles.bucketMeta}>
                  {row.label}: ideal {formatSeconds(row.idealTime)} · avg {formatSeconds(row.avgTime)}
                </Text>
              ))}
            </>
          ) : (
            <ChartEmpty message="No wrong-answer timing data." />
          )}
        </View>
      </DashboardCard>

      <DashboardCard title="Concept vs Application Analysis">
        {!conceptHasData ? (
          <ChartEmpty message="No concept vs application data for this exam yet." />
        ) : (
          <>
            <GroupedBarChart data={conceptChartData} series={outcomeSeries} height={240} />
            {conceptChartData.map((row) => (
              <View key={row.label} style={styles.conceptRow}>
                <Text style={styles.conceptTitle}>{row.label}</Text>
                <Text style={styles.conceptMeta}>
                  Hit rate: {row.hitRate}% · Total time: {formatSeconds(row.totalTime)} · Avg/Q: {formatSeconds(row.avgTime)}
                </Text>
              </View>
            ))}
          </>
        )}
      </DashboardCard>

      <DashboardCard title="Chapter-wise Weakness Detection">
        {!chapterHasData ? (
          <ChartEmpty message="No chapter weakness data for this exam yet." />
        ) : (
          <>
            <HorizontalStackedBarChart data={chapterChartData.slice(0, 10)} series={chapterSeries} />
            {chapterPieSegments.length > 0 ? (
              <View style={styles.pieWrap}>
                <DonutChart
                  size={150}
                  centerLabel={String(chapterPieSegments.reduce((s, seg) => s + seg.value, 0))}
                  segments={chapterPieSegments}
                />
                <ChartLegend
                  items={chapterPieSegments.map((s) => ({
                    color: s.color,
                    label: s.label,
                    value: s.value,
                  }))}
                />
              </View>
            ) : null}
          </>
        )}
      </DashboardCard>

      <View style={styles.footerGrid}>
        <View style={[styles.footerCard, styles.footerBlue]}>
          <Text style={styles.footerTitleBlue}>Time Efficiency</Text>
          {analytics.timeEfficiency.avgTimePerSubject.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={analytics.timeEfficiency.avgTimePerSubject.map((item) => ({
                  label: item.subject.slice(0, 4),
                  value: item.avgTime,
                  color: ADVANCED_CHART_COLORS.notAnswered,
                }))}
                height={180}
              />
            </ScrollView>
          ) : (
            <Text style={styles.metaText}>No subject timing data.</Text>
          )}
        </View>

        <View style={[styles.footerCard, styles.footerGreen]}>
          <Text style={styles.footerTitleGreen}>Summary</Text>
          <Text style={styles.metaText}>
            Slowest: <Text style={styles.orangeBold}>{analytics.timeEfficiency.slowestSubject || '—'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Fastest: <Text style={styles.greenBold}>{analytics.timeEfficiency.fastestSubject || '—'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Time on wrong: <Text style={styles.orangeBold}>{formatSeconds(analytics.timeEfficiency.timeWastedOnWrongQuestions)}</Text>
          </Text>
          <Text style={styles.metaText}>
            Questions analysed: <Text style={styles.blueBold}>{analytics.metadata.totalQuestionsAnalyzed}</Text>
          </Text>
        </View>
      </View>

      {(analytics.aiObservations || []).map((obs, i) => (
        <View key={i} style={styles.obsBox}>
          <Text style={styles.obsText}>{obs}</Text>
        </View>
      ))}

      {analytics.recommendation?.actionPlan?.thisWeek?.length ? (
        <DashboardCard title="Recommended Action Plan">
          {analytics.recommendation.actionPlan.thisWeek.map((step, i) => (
            <Text key={i} style={styles.bullet}>• {step}</Text>
          ))}
        </DashboardCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  header: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 6,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
  headerSub: { fontSize: 11, color: '#94A3B8' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badgeBlue: { backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  badgeBlueText: { color: '#3B82F6', fontSize: 11, fontWeight: '700' },
  badgeGreen: { backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#A7F3D0' },
  badgeGreenText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  warnBox: { backgroundColor: '#fff7ed', borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', padding: 10 },
  warnText: { color: '#9a3412', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: -4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  empty: {
    height: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  bucketBoxGreen: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    padding: 10,
    gap: 8,
  },
  bucketTitleGreen: { fontSize: 13, fontWeight: '800', color: '#34D399' },
  bucketBoxOrange: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBEB',
    padding: 10,
    gap: 8,
  },
  bucketTitleOrange: { fontSize: 13, fontWeight: '800', color: '#FB923C' },
  bucketMeta: { fontSize: 11, color: '#64748b' },
  conceptRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 4,
  },
  conceptTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  conceptMeta: { fontSize: 11, color: '#64748b' },
  pieWrap: { alignItems: 'center', gap: 10, marginTop: 8 },
  footerGrid: { gap: 10 },
  footerCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  footerBlue: { borderColor: '#BFDBFE', backgroundColor: '#F8FAFC' },
  footerGreen: { borderColor: '#BBF7D0', backgroundColor: '#F8FAFC' },
  footerTitleBlue: { fontSize: 14, fontWeight: '800', color: '#60A5FA' },
  footerTitleGreen: { fontSize: 14, fontWeight: '800', color: '#34D399' },
  metaText: { fontSize: 12, color: '#475569', lineHeight: 18 },
  orangeBold: { fontWeight: '800', color: '#ea580c', textTransform: 'capitalize' },
  greenBold: { fontWeight: '800', color: '#16a34a', textTransform: 'capitalize' },
  blueBold: { fontWeight: '800', color: '#2563eb' },
  obsBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  obsText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  bullet: { fontSize: 13, color: '#475569', lineHeight: 20 },
});
