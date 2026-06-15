import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import authService from '../../../src/services/api/authService';
import {
  CLASS_FILTER_OPTIONS,
  examIncludesClass,
  getExamClassStrings,
  type ExamClassLike,
} from '../../../src/lib/exam-classes';
import {
  AdminExamResult,
  formatCompletedAt,
  shareExamResultsCsv,
  formatTimeTaken,
  getAttemptedCount,
  getPerformerPercentage,
  getQuestionAccuracy,
  getResultPercentage,
  marksBadgeTone,
  enrichExamResultsWithAttempts,
  formatAttemptLabel,
  rankExamResults,
  rankMedalColor,
  rankMedalTextColor,
  subjectWiseEntries,
  normalizeClassNumberForDisplay,
} from '../../../src/lib/admin-exam-helpers';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminScalePressable,
  AdminStatCard,
  AdminFilterChips,
  AdminModalShell,
  useAdminTheme,
  useAdminTabletLayout,
} from '../_ui';

const GRID_GAP = 12;

interface Exam extends ExamClassLike {
  _id: string;
  title: string;
  description?: string;
  examType: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy?: { fullName?: string; email?: string };
  isSchoolSpecific?: boolean;
  isBoardSpecific?: boolean;
  isAllBoards?: boolean;
  targetSchools?: Array<{ _id?: string; schoolName?: string; fullName?: string } | string>;
  createdAt?: string;
  updatedAt?: string;
}

interface AnalyticsData {
  totalStudents?: number;
  attemptedCount?: number;
  notAttemptedCount?: number;
  averageScore?: string;
  topPerformers?: Array<{
    rank: number;
    studentName: string;
    studentEmail?: string;
    classNumber?: string;
    percentage: number;
    marks: string;
  }>;
}

type ResultFilters = {
  classNumber: string;
  subject: string;
  startDate: string;
  endDate: string;
};

const EMPTY_ANALYTICS: AnalyticsData = {
  totalStudents: 0,
  attemptedCount: 0,
  notAttemptedCount: 0,
  averageScore: '0.00',
  topPerformers: [],
};

const LIST_CLASS_CHIPS = [
  { id: 'all', label: 'All classes' },
  ...CLASS_FILTER_OPTIONS.map((c) => ({ id: c, label: `Class ${c}` })),
];

const DETAIL_CLASS_CHIPS = [
  { id: '', label: 'All classes' },
  ...CLASS_FILTER_OPTIONS.map((c) => ({ id: c, label: `Class ${c}` })),
];

function normalizeExam(raw: any): Exam {
  const qLen = Array.isArray(raw?.questions) ? raw.questions.length : undefined;
  return {
    _id: String(raw?._id || raw?.id || ''),
    title: raw?.title || raw?.name || 'Untitled exam',
    description: raw?.description,
    examType: raw?.examType || 'practice',
    classNumber: raw?.classNumber,
    assignedClasses: raw?.assignedClasses,
    duration: Number(raw?.duration) || 0,
    totalQuestions: Number(raw?.totalQuestions ?? qLen) || 0,
    totalMarks: Number(raw?.totalMarks) || 0,
    startDate: raw?.startDate ? String(raw.startDate) : '',
    endDate: raw?.endDate ? String(raw.endDate) : '',
    isActive: raw?.isActive !== false,
    createdBy: raw?.createdBy,
    isSchoolSpecific: !!raw?.isSchoolSpecific,
    isBoardSpecific: !!raw?.isBoardSpecific,
    isAllBoards: !!raw?.isAllBoards,
    targetSchools: Array.isArray(raw?.targetSchools) ? raw.targetSchools : [],
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

function getExamAudienceLabel(exam: Exam): string {
  if (exam.isAllBoards) return 'All schools & boards';
  if (exam.isSchoolSpecific && exam.targetSchools?.length) {
    const names = exam.targetSchools
      .map((school) => {
        if (typeof school === 'string') return school;
        return school.schoolName || school.fullName || '';
      })
      .filter(Boolean);
    return names.length ? names.join(', ') : 'Selected schools';
  }
  if (exam.isBoardSpecific) return 'Schools on your board';
  return 'All schools';
}

function parseExamsResponse(responseData: any): Exam[] {
  const raw = responseData;
  let list: any[] = [];
  if (raw?.success === true && raw?.data != null) {
    list = Array.isArray(raw.data) ? raw.data : [];
  } else if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.data)) {
    list = raw.data;
  } else if (Array.isArray(raw?.exams)) {
    list = raw.exams;
  } else if (raw?.data && typeof raw.data === 'object' && Array.isArray((raw.data as any).exams)) {
    list = (raw.data as any).exams;
  }
  return list.map(normalizeExam).filter((e) => e._id);
}

function mapLikeToRecord(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (raw instanceof Map) return Object.fromEntries(raw);
  if (typeof raw === 'object' && typeof (raw as { get?: unknown }).get === 'function') {
    try {
      return Object.fromEntries(raw as Map<string, unknown>);
    } catch {
      return { ...(raw as Record<string, unknown>) };
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return undefined;
}

function normalizeResultRow(raw: any): AdminExamResult | null {
  if (!raw?._id) return null;
  const userId = raw.userId || {};
  const examIdRaw = raw.examId;
  const examId =
    examIdRaw != null
      ? typeof examIdRaw === 'object' && examIdRaw._id != null
        ? String(examIdRaw._id)
        : String(examIdRaw)
      : undefined;
  const attemptNumber = Number(raw.attemptNumber);
  return {
    _id: String(raw._id),
    examId,
    examTitle: raw.examTitle || examIdRaw?.title,
    userId: {
      _id: userId._id != null ? String(userId._id) : undefined,
      fullName: userId.fullName,
      email: userId.email,
      classNumber: userId.classNumber,
    },
    percentage: Number(raw.percentage) || 0,
    obtainedMarks: Number(raw.obtainedMarks) || 0,
    totalMarks: Number(raw.totalMarks) || 0,
    totalQuestions: Number(raw.totalQuestions) || 0,
    correctAnswers: Number(raw.correctAnswers) || 0,
    wrongAnswers: Number(raw.wrongAnswers) || 0,
    unattempted: Number(raw.unattempted) || 0,
    timeTaken: Number(raw.timeTaken) || 0,
    attemptNumber: attemptNumber >= 1 ? attemptNumber : 1,
    subjectWiseScore: mapLikeToRecord(raw.subjectWiseScore) as AdminExamResult['subjectWiseScore'],
    completedAt: String(raw.completedAt || ''),
  };
}

function parseExamResultsResponse(rdata: any): AdminExamResult[] {
  const rows =
    rdata?.success && Array.isArray(rdata?.data)
      ? rdata.data
      : Array.isArray(rdata)
        ? rdata
        : [];
  return enrichExamResultsWithAttempts(
    rows.map(normalizeResultRow).filter(Boolean) as AdminExamResult[]
  );
}

function getExamSortTime(exam: Exam) {
  for (const value of [exam.updatedAt, exam.createdAt, exam.startDate, exam.endDate]) {
    if (!value) continue;
    const ts = new Date(value).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  return 0;
}

function getExamStatus(exam: Exam) {
  const now = new Date();
  const start = new Date(exam.startDate);
  const end = new Date(exam.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { label: '—', tone: 'unknown' as const };
  }
  if (now < start) return { label: 'Upcoming', tone: 'upcoming' as const };
  if (now > end) return { label: 'Ended', tone: 'ended' as const };
  return { label: 'Active', tone: 'active' as const };
}

const marksToneColors = {
  good: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  mid: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  low: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
};

export default function ExamsView() {
  const { colors, spacing, radius, typo } = useAdminTheme();
  const { isTablet, cardWidth, statWidth, onShellLayout } = useAdminTabletLayout(spacing.md);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [listClassFilter, setListClassFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [results, setResults] = useState<AdminExamResult[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [filters, setFilters] = useState<ResultFilters>({
    classNumber: '',
    subject: '',
    startDate: '',
    endDate: '',
  });
  const [viewerLabel, setViewerLabel] = useState('School Admin');
  const [exportingExamId, setExportingExamId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<AdminExamResult | null>(null);

  useEffect(() => {
    authService
      .me()
      .then((data) => {
        const user = data?.user ?? data;
        const school = user?.schoolName || user?.fullName || user?.email || 'School Admin';
        const board = user?.board ? String(user.board).replace(/_/g, ' ') : '';
        setViewerLabel(board ? `${school} (${board})` : school);
      })
      .catch(() => setViewerLabel('School Admin'));
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/exams/viewable');
      setExams(parseExamsResponse(response?.data));
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      setExams([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const fetchExamResults = useCallback(async (examId: string, activeFilters: ResultFilters) => {
    setResultsLoading(true);
    try {
      const params: Record<string, string> = { examId };
      if (activeFilters.classNumber) params.classNumber = activeFilters.classNumber;
      if (activeFilters.subject.trim()) params.subject = activeFilters.subject.trim();
      if (activeFilters.startDate.trim()) params.startDate = activeFilters.startDate.trim();
      if (activeFilters.endDate.trim()) params.endDate = activeFilters.endDate.trim();

      const response = await api.get('/api/admin/exam-results', { params });
      setResults(parseExamResultsResponse(response?.data));
    } catch (error) {
      console.error('Failed to fetch exam results:', error);
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (examId: string, activeFilters: ResultFilters) => {
    setAnalyticsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeFilters.classNumber) params.classNumber = activeFilters.classNumber;
      const response = await api.get(`/api/admin/exams/${examId}/analytics`, { params });
      const a = response?.data?.data ?? response?.data;
      if (response?.data?.success && a) setAnalytics(a);
      else if (a && typeof a === 'object') setAnalytics(a);
      else {
        setAnalytics(EMPTY_ANALYTICS);
        Alert.alert('Analytics', 'Could not load exam analytics.');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(EMPTY_ANALYTICS);
      Alert.alert('Analytics', 'Could not load exam analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadExamDetail = useCallback(
    async (exam: Exam, activeFilters: ResultFilters) => {
      setDetailLoading(true);
      setAnalytics(null);
      setResults([]);
      try {
        await Promise.all([
          fetchExamResults(exam._id, activeFilters),
          fetchAnalytics(exam._id, activeFilters),
        ]);
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchAnalytics, fetchExamResults]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedExam) {
      void loadExamDetail(selectedExam, filters);
      fetchExams();
    } else {
      fetchExams();
    }
  }, [selectedExam, filters, fetchExams, loadExamDetail]);

  const openExamDetail = (exam: Exam) => {
    setSelectedExam(exam);
    void loadExamDetail(exam, filters);
  };

  const closeExamDetail = () => {
    setSelectedExam(null);
    setSelectedResult(null);
    setAnalytics(null);
    setResults([]);
  };

  const applyFilters = () => {
    if (!selectedExam) return;
    void loadExamDetail(selectedExam, filters);
  };

  const rankedResults = useMemo(() => rankExamResults(results), [results]);

  const exportToCsv = async () => {
    if (!selectedExam) return;
    await shareExamResultsCsv(selectedExam.title, rankedResults);
  };

  const quickExportFromList = async (exam: Exam) => {
    setExportingExamId(exam._id);
    try {
      const response = await api.get('/api/admin/exam-results', { params: { examId: exam._id } });
      const parsed = parseExamResultsResponse(response?.data);
      await shareExamResultsCsv(exam.title, rankExamResults(parsed));
    } catch (error) {
      console.error('Quick export failed:', error);
      Alert.alert('Export', 'Could not export exam results. Try again.');
    } finally {
      setExportingExamId(null);
    }
  };

  const filteredExams = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const byClass =
      listClassFilter === 'all'
        ? exams
        : exams.filter((exam) => examIncludesClass(exam, listClassFilter));
    return byClass
      .filter(
        (exam) =>
          (exam.title || '').toLowerCase().includes(q) ||
          (exam.examType || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const timeDiff = getExamSortTime(b) - getExamSortTime(a);
        if (timeDiff !== 0) return timeDiff;
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [exams, listClassFilter, searchTerm]);

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  };

  const statusColors = {
    ended: colors.danger,
    active: colors.success,
    upcoming: colors.warning,
    unknown: colors.textMuted,
  };

  if (isLoading && !refreshing && !selectedExam) {
    return <AdminSkeletonList count={4} />;
  }

  if (selectedExam) {
    return (
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.innerShell} onLayout={onShellLayout}>
        <AdminScalePressable onPress={closeExamDetail} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back to Exams</Text>
        </AdminScalePressable>

        <View style={styles.detailTitleRow}>
          <Text style={[typo.title, { color: colors.text, flex: 1 }]}>
            {selectedExam.title}
          </Text>
          <AdminScalePressable
            onPress={() => void exportToCsv()}
            disabled={detailLoading || resultsLoading}
            style={[styles.exportBtnPrimary, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.exportBtnPrimaryText}>Export Analysis CSV</Text>
          </AdminScalePressable>
        </View>
        <Text style={[styles.exportHint, { color: colors.textMuted }]}>
          School performance analysis report — exam name, overall snapshot, subject & complexity breakdown, and student ranking.
        </Text>

        <AdminGlassCard noAnimation style={{ marginBottom: spacing.sm }}>
          <AdminSectionHeader icon="filter-outline" title="Filter Results" />
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Class</Text>
          <AdminFilterChips
            chips={DETAIL_CLASS_CHIPS}
            selected={filters.classNumber}
            onSelect={(id) => setFilters((prev) => ({ ...prev, classNumber: id }))}
          />
          <Text style={[styles.filterLabel, { color: colors.textMuted, marginTop: 10 }]}>Subject</Text>
          <TextInput
            value={filters.subject}
            onChangeText={(subject) => setFilters((prev) => ({ ...prev, subject }))}
            placeholder="e.g. Physics"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.filterInput,
              {
                color: colors.text,
                borderColor: colors.surfaceBorder,
                backgroundColor: colors.inputBg,
                borderRadius: radius.sm,
              },
            ]}
          />
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Start date</Text>
              <TextInput
                value={filters.startDate}
                onChangeText={(startDate) => setFilters((prev) => ({ ...prev, startDate }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.filterInput,
                  {
                    color: colors.text,
                    borderColor: colors.surfaceBorder,
                    backgroundColor: colors.inputBg,
                    borderRadius: radius.sm,
                  },
                ]}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.filterLabel, { color: colors.textMuted }]}>End date</Text>
              <TextInput
                value={filters.endDate}
                onChangeText={(endDate) => setFilters((prev) => ({ ...prev, endDate }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.filterInput,
                  {
                    color: colors.text,
                    borderColor: colors.surfaceBorder,
                    backgroundColor: colors.inputBg,
                    borderRadius: radius.sm,
                  },
                ]}
              />
            </View>
          </View>
          <AdminScalePressable
            onPress={applyFilters}
            style={[styles.applyBtn, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </AdminScalePressable>
        </AdminGlassCard>

        {detailLoading && !analytics ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
              <View
                style={[
                  styles.statSlot,
                  isTablet && styles.statSlotTablet,
                  isTablet && statWidth != null && { width: statWidth },
                ]}
              >
                <AdminStatCard
                  label="Total students"
                  value={analytics?.totalStudents ?? 0}
                  icon="people"
                  gradientIndex={0}
                  compact={isTablet}
                />
              </View>
              <View
                style={[
                  styles.statSlot,
                  isTablet && styles.statSlotTablet,
                  isTablet && statWidth != null && { width: statWidth },
                ]}
              >
                <AdminStatCard
                  label="Attempted"
                  value={analytics?.attemptedCount ?? 0}
                  icon="checkmark-circle"
                  gradientIndex={1}
                  compact={isTablet}
                />
              </View>
              <View
                style={[
                  styles.statSlot,
                  isTablet && styles.statSlotTablet,
                  isTablet && statWidth != null && { width: statWidth },
                ]}
              >
                <AdminStatCard
                  label="Not attempted"
                  value={analytics?.notAttemptedCount ?? 0}
                  icon="close-circle"
                  gradientIndex={2}
                  compact={isTablet}
                />
              </View>
              <View
                style={[
                  styles.statSlot,
                  isTablet && styles.statSlotTablet,
                  isTablet && statWidth != null && { width: statWidth },
                ]}
              >
                <AdminStatCard
                  label="Avg score"
                  value={`${analytics?.averageScore ?? '—'}%`}
                  icon="stats-chart"
                  gradientIndex={3}
                  compact={isTablet}
                />
              </View>
            </View>

            {analytics?.topPerformers && analytics.topPerformers.length > 0 ? (
              <AdminGlassCard style={{ marginBottom: spacing.sm }}>
                <AdminSectionHeader icon="trophy-outline" title="Top Performers" />
                {analytics.topPerformers.map((performer, idx) => (
                  <View
                    key={`${performer.rank}-${performer.studentName}-${idx}`}
                    style={[styles.performerRow, { borderBottomColor: colors.surfaceBorder }]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: rankMedalColor(idx) },
                      ]}
                    >
                      <Text style={[styles.rankBadgeText, { color: rankMedalTextColor(idx) }]}>
                        {performer.rank}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultName, { color: colors.text }]}>
                        {performer.studentName}
                      </Text>
                      <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                        {performer.studentEmail || ''}
                        {performer.classNumber
                          ? ` • Class ${normalizeClassNumberForDisplay(performer.classNumber)}`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.resultMarks}>
                      <Text style={[styles.resultPct, { color: colors.success }]}>
                        {getPerformerPercentage(performer)}%
                      </Text>
                      <Text style={[styles.resultFrac, { color: colors.textMuted }]}>
                        {performer.marks}
                      </Text>
                    </View>
                  </View>
                ))}
              </AdminGlassCard>
            ) : null}

            <AdminGlassCard style={{ marginBottom: spacing.sm }}>
              <AdminSectionHeader
                icon="list-outline"
                title={`Student Results (${results.length})`}
                action={
                  <AdminScalePressable
                    onPress={() => void exportToCsv()}
                    style={[styles.exportBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
                  >
                    <Ionicons name="download-outline" size={16} color={colors.primary} />
                    <Text style={[styles.exportBtnText, { color: colors.primary }]}>Export CSV</Text>
                  </AdminScalePressable>
                }
              />

              {resultsLoading || analyticsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
              ) : rankedResults.length === 0 ? (
                <Text style={[styles.noResults, { color: colors.textMuted }]}>
                  No results found for this exam.
                </Text>
              ) : (
                <View style={[styles.listContent, isTablet && styles.listContentGrid]}>
                  {rankedResults.map(({ result, marksPct, questionAcc }, idx) => {
                  const completed = formatCompletedAt(result.completedAt);
                  const subjects = subjectWiseEntries(result);
                  const totalQ =
                    Number(result.totalQuestions) ||
                    Math.max(
                      0,
                      (Number(result.correctAnswers) || 0) +
                        (Number(result.wrongAnswers) || 0) +
                        (Number(result.unattempted) || 0)
                    );
                  const attempted = getAttemptedCount(result);
                  const tone = marksBadgeTone(marksPct);
                  const toneStyle = marksToneColors[tone];

                  return (
                    <View key={result._id} style={isTablet ? { width: cardWidth } : undefined}>
                    <View
                      style={[styles.resultCard, { borderColor: colors.surfaceBorder, backgroundColor: colors.inputBg }]}
                    >
                      <View style={styles.resultCardTop}>
                        <View
                          style={[
                            styles.rankBadge,
                            { backgroundColor: rankMedalColor(idx) },
                          ]}
                        >
                          <Text style={[styles.rankBadgeText, { color: rankMedalTextColor(idx) }]}>
                            {idx + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.nameAttemptRow}>
                            <Text
                              style={[styles.resultName, { color: colors.text, flexShrink: 1 }]}
                              numberOfLines={2}
                            >
                              {result.userId?.fullName || 'Student'}
                            </Text>
                            <View
                              style={[
                                styles.attemptBadge,
                                {
                                  backgroundColor: colors.primaryMuted,
                                  borderColor: colors.primary + '40',
                                },
                              ]}
                            >
                              <Text style={[styles.attemptBadgeText, { color: colors.primary }]}>
                                {formatAttemptLabel(result.attemptNumber)}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                            {result.userId?.email || ''}
                          </Text>
                          <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                            Class {normalizeClassNumberForDisplay(result.userId?.classNumber)}
                          </Text>
                        </View>
                        <View style={styles.resultMarks}>
                          <Text style={[styles.resultPct, { color: colors.text }]}>
                            {result.obtainedMarks}/{result.totalMarks}
                          </Text>
                          <View
                            style={[
                              styles.marksBadge,
                              {
                                backgroundColor: toneStyle.bg,
                                borderColor: toneStyle.border,
                              },
                            ]}
                          >
                            <Text style={[styles.marksBadgeText, { color: toneStyle.text }]}>
                              {marksPct}% marks
                            </Text>
                          </View>
                        </View>
                      </View>

                      {subjects.length > 0 ? (
                        <Text style={[styles.subjectLine, { color: colors.textMuted }]}>
                          {subjects
                            .map((s) => `${s.subject}: ${s.marks}m (${s.correct}/${s.total})`)
                            .join(' · ')}
                        </Text>
                      ) : null}

                      <View style={styles.questionPills}>
                        <View style={[styles.pill, styles.pillGood]}>
                          <Text style={styles.pillText}>✓ {result.correctAnswers ?? 0}</Text>
                        </View>
                        <View style={[styles.pill, styles.pillBad]}>
                          <Text style={styles.pillText}>✗ {result.wrongAnswers ?? 0}</Text>
                        </View>
                        <View style={[styles.pill, styles.pillSkip]}>
                          <Text style={styles.pillText}>○ {result.unattempted ?? 0}</Text>
                        </View>
                      </View>
                      <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                        {totalQ} questions · {attempted} attempted · {questionAcc}% accuracy on attempted
                      </Text>
                      <View style={styles.resultFooter}>
                        <View style={styles.footerItem}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                            {formatTimeTaken(result.timeTaken)}
                          </Text>
                        </View>
                        <View style={styles.footerItem}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                            {completed.date}
                            {completed.time ? ` ${completed.time}` : ''}
                          </Text>
                        </View>
                        <AdminScalePressable
                          onPress={() => setSelectedResult(result)}
                          style={[
                            styles.viewBtn,
                            { backgroundColor: colors.primaryMuted, borderRadius: radius.sm },
                          ]}
                        >
                          <Ionicons name="eye-outline" size={14} color={colors.primary} />
                          <Text style={[styles.viewBtnText, { color: colors.primary }]}>View</Text>
                        </AdminScalePressable>
                      </View>
                    </View>
                    </View>
                  );
                })}
                </View>
              )}
            </AdminGlassCard>
          </>
        )}

        {selectedResult ? (
          <AdminModalShell
            visible
            title={formatAttemptLabel(selectedResult.attemptNumber)}
            onClose={() => setSelectedResult(null)}
          >
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {(() => {
                const result = selectedResult;
                const rankIdx = rankedResults.findIndex((r) => r.result._id === result._id);
                const marksPct =
                  rankIdx >= 0 ? rankedResults[rankIdx].marksPct : getResultPercentage(result);
                const questionAcc =
                  rankIdx >= 0 ? rankedResults[rankIdx].questionAcc : getQuestionAccuracy(result);
                const completed = formatCompletedAt(result.completedAt);
                const subjects = subjectWiseEntries(result);
                const totalQ =
                  Number(result.totalQuestions) ||
                  Math.max(
                    0,
                    (Number(result.correctAnswers) || 0) +
                      (Number(result.wrongAnswers) || 0) +
                      (Number(result.unattempted) || 0)
                  );
                const attempted = getAttemptedCount(result);
                const tone = marksBadgeTone(marksPct);
                const toneStyle = marksToneColors[tone];

                return (
                  <>
                    <Text style={[styles.detailStudentName, { color: colors.text }]}>
                      {result.userId?.fullName || 'Student'}
                    </Text>
                    <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                      {result.userId?.email || '—'}
                    </Text>
                    <Text style={[styles.resultMeta, { color: colors.textMuted, marginBottom: 12 }]}>
                      Class {normalizeClassNumberForDisplay(result.userId?.classNumber)}
                      {rankIdx >= 0 ? ` · Rank #${rankIdx + 1}` : ''}
                    </Text>

                    <View style={[styles.detailStatGrid, { borderColor: colors.surfaceBorder }]}>
                      <View style={styles.detailStat}>
                        <Text style={[styles.detailStatLabel, { color: colors.textMuted }]}>Marks</Text>
                        <Text style={[styles.detailStatValue, { color: colors.text }]}>
                          {result.obtainedMarks}/{result.totalMarks}
                        </Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={[styles.detailStatLabel, { color: colors.textMuted }]}>Marks %</Text>
                        <View
                          style={[
                            styles.marksBadge,
                            { backgroundColor: toneStyle.bg, borderColor: toneStyle.border },
                          ]}
                        >
                          <Text style={[styles.marksBadgeText, { color: toneStyle.text }]}>
                            {marksPct}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={[styles.detailStatLabel, { color: colors.textMuted }]}>Accuracy</Text>
                        <Text style={[styles.detailStatValue, { color: colors.text }]}>
                          {questionAcc}%
                        </Text>
                        <Text style={[styles.detailStatHint, { color: colors.textMuted }]}>
                          {result.correctAnswers ?? 0}/{attempted || '—'} correct
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Questions</Text>
                    <View style={styles.questionPills}>
                      <View style={[styles.pill, styles.pillGood]}>
                        <Text style={styles.pillText}>✓ {result.correctAnswers ?? 0} correct</Text>
                      </View>
                      <View style={[styles.pill, styles.pillBad]}>
                        <Text style={styles.pillText}>✗ {result.wrongAnswers ?? 0} wrong</Text>
                      </View>
                      <View style={[styles.pill, styles.pillSkip]}>
                        <Text style={styles.pillText}>○ {result.unattempted ?? 0} skipped</Text>
                      </View>
                    </View>
                    <Text style={[styles.resultMeta, { color: colors.textMuted, marginBottom: 12 }]}>
                      {totalQ} questions · {attempted} attempted
                    </Text>

                    {subjects.length > 0 ? (
                      <>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                          Subject breakdown
                        </Text>
                        {subjects.map((s) => (
                          <View
                            key={s.subject}
                            style={[styles.subjectRow, { borderColor: colors.surfaceBorder }]}
                          >
                            <Text style={[styles.subjectRowName, { color: colors.text }]}>{s.subject}</Text>
                            <Text style={[styles.subjectRowMeta, { color: colors.textMuted }]}>
                              {s.marks}m · {s.correct}/{s.total} correct
                            </Text>
                          </View>
                        ))}
                      </>
                    ) : null}

                    <View style={[styles.detailMetaRow, { borderTopColor: colors.surfaceBorder }]}>
                      <View style={styles.footerItem}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                          {formatTimeTaken(result.timeTaken)}
                        </Text>
                      </View>
                      <View style={styles.footerItem}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                          {completed.date}
                          {completed.time ? ` · ${completed.time}` : ''}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          </AdminModalShell>
        ) : null}
        </View>
      </AdminScreenShell>
    );
  }

  return (
    <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.innerShell} onLayout={onShellLayout}>
      <AdminGlassCard noAnimation style={{ marginBottom: spacing.sm }}>
        <AdminSectionHeader
          icon="eye-outline"
          title="Exams (View Only)"
          subtitle="Exams created by Super Admin that your school can access. Export ranked results as CSV from any exam."
        />
        <View style={[styles.viewerChip, { backgroundColor: colors.inputBg, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.viewerChipText, { color: colors.primary }]}>
            Viewing as {viewerLabel}
          </Text>
        </View>
      </AdminGlassCard>

      <AdminSearchBar
        placeholder="Search exams..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={{ marginBottom: spacing.sm }}
      />

      <Text style={[styles.filterLabel, { color: colors.textMuted, marginBottom: 6 }]}>Class</Text>
      <View style={{ marginBottom: spacing.sm }}>
        <AdminFilterChips
          chips={LIST_CLASS_CHIPS}
          selected={listClassFilter}
          onSelect={setListClassFilter}
        />
      </View>

      {exams.length === 0 ? (
        <AdminEmptyState
          icon="eye-outline"
          title="No exams available"
          message="Exams are created by Super Admin."
        />
      ) : filteredExams.length === 0 ? (
        <AdminEmptyState
          icon="filter-outline"
          title="No exams for this class"
          message='Choose another class or "All classes".'
        />
      ) : (
        <View style={[styles.listContent, isTablet && styles.listContentGrid]}>
          {filteredExams.map((exam, index) => {
          const status = getExamStatus(exam);
          const classLabels = getExamClassStrings(exam);
          return (
            <View key={exam._id} style={isTablet ? { width: cardWidth } : undefined}>
            <AdminGlassCard delay={index * 60} style={{ marginBottom: isTablet ? 0 : spacing.sm }}>
              <View style={styles.cardTop}>
                <Text style={[typo.section, { color: colors.text }]} numberOfLines={2}>
                  {exam.title}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.typeBadge, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                      {(exam.examType || 'practice').toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[status.tone] + '20' },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusColors[status.tone] }]}>
                      {status.label}
                    </Text>
                  </View>
                  {classLabels.map((cl) => (
                    <View
                      key={cl}
                      style={[styles.classBadge, { backgroundColor: colors.inputBg, borderColor: colors.surfaceBorder }]}
                    >
                      <Text style={[styles.classBadgeText, { color: colors.textSecondary }]}>
                        Class {cl}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              {!!exam.description && (
                <Text style={[styles.examDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {exam.description}
                </Text>
              )}
              <View style={[styles.audienceBanner, { backgroundColor: colors.inputBg, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="people-outline" size={15} color={colors.primary} />
                <View style={styles.audienceTextWrap}>
                  <Text style={[styles.audienceLabel, { color: colors.textMuted }]}>Who can see this exam</Text>
                  <Text style={[styles.audienceValue, { color: colors.text }]}>
                    {getExamAudienceLabel(exam)}
                  </Text>
                </View>
              </View>
              <View style={[styles.metaBlock, { borderTopColor: colors.surfaceBorder }]}>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {exam.duration} minutes
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="book-outline" size={16} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {exam.totalQuestions} questions • {exam.totalMarks} marks
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.metaDate, { color: colors.textMuted }]}>
                    {formatDateShort(exam.startDate)} — {formatDateShort(exam.endDate)}
                  </Text>
                </View>
                <Text style={[styles.createdBy, { color: colors.textMuted }]}>
                  Created by: {exam.createdBy?.fullName || 'Super Admin'}
                </Text>
              </View>
              <View style={styles.ctaRow}>
                <AdminScalePressable
                  onPress={() => openExamDetail(exam)}
                  style={[
                    styles.ctaButton,
                    styles.ctaButtonHalf,
                    { backgroundColor: colors.primaryMuted, borderRadius: radius.sm },
                  ]}
                >
                  <Ionicons name="eye" size={18} color={colors.primary} />
                  <Text style={[styles.ctaText, { color: colors.primary }]}>View Results</Text>
                </AdminScalePressable>
                <AdminScalePressable
                  onPress={() => void quickExportFromList(exam)}
                  disabled={exportingExamId === exam._id}
                  style={[
                    styles.ctaButton,
                    styles.ctaButtonHalf,
                    { backgroundColor: colors.bgElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.surfaceBorder },
                  ]}
                >
                  {exportingExamId === exam._id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={colors.primary} />
                  )}
                  <Text style={[styles.ctaText, { color: colors.primary }]}>Export CSV</Text>
                </AdminScalePressable>
              </View>
            </AdminGlassCard>
            </View>
          );
        })}
        </View>
      )}
      </View>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  innerShell: {
    width: '100%',
    flexDirection: 'column',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    width: '100%',
  },
  statsRowTablet: {
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 12,
  },
  statSlot: {
    flex: 1,
    minWidth: '46%',
  },
  statSlotTablet: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  listContentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: GRID_GAP,
    rowGap: GRID_GAP,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 15, fontWeight: '700' },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  exportHint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  exportBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exportBtnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  filterLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  filterInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loadingBox: { padding: 40, alignItems: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  exportBtnText: { fontSize: 12, fontWeight: '700' },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { fontSize: 13, fontWeight: '800' },
  resultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  resultCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nameAttemptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  attemptBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  attemptBadgeText: { fontSize: 11, fontWeight: '800' },
  resultName: { fontSize: 14, fontWeight: '800' },
  resultMeta: { fontSize: 12, lineHeight: 17 },
  resultMarks: { alignItems: 'flex-end', gap: 4 },
  resultPct: { fontSize: 15, fontWeight: '800' },
  resultFrac: { fontSize: 12 },
  marksBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  marksBadgeText: { fontSize: 11, fontWeight: '700' },
  subjectLine: { fontSize: 11, lineHeight: 16 },
  questionPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  pillGood: { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' },
  pillBad: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  pillSkip: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  resultFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewBtnText: { fontSize: 12, fontWeight: '800' },
  detailScroll: { maxHeight: 480 },
  detailStudentName: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  detailStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  detailStat: { minWidth: '28%', gap: 4 },
  detailStatLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  detailStatValue: { fontSize: 16, fontWeight: '800' },
  detailStatHint: { fontSize: 11 },
  detailSectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  subjectRowName: { fontSize: 13, fontWeight: '700', flex: 1 },
  subjectRowMeta: { fontSize: 12 },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  noResults: { fontSize: 14, paddingVertical: 12 },
  viewerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  viewerChipText: { fontSize: 12, fontWeight: '700' },
  audienceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  audienceTextWrap: { flex: 1, gap: 2 },
  audienceLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  audienceValue: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cardTop: { marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  classBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  classBadgeText: { fontSize: 11, fontWeight: '700' },
  examDescription: { fontSize: 13, marginBottom: 10 },
  metaBlock: { gap: 6, paddingTop: 8, borderTopWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, fontWeight: '600' },
  metaDate: { fontSize: 12, fontWeight: '600' },
  createdBy: { fontSize: 11, marginTop: 4 },
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  ctaButtonHalf: { flex: 1 },
  ctaText: { fontSize: 13, fontWeight: '700' },
});
