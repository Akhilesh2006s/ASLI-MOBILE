import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../../../src/services/api/api';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminAnimatedProgress,
  AdminScalePressable,
  AdminStatCard,
  useAdminTheme,
} from '../ui';

interface Exam {
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
}

interface ExamResultRow {
  _id: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  completedAt: string;
  userId?: { fullName?: string; email?: string; classNumber?: string };
}

interface AnalyticsData {
  totalStudents?: number;
  attemptedCount?: number;
  notAttemptedCount?: number;
  averageScore?: string;
  topPerformers?: Array<{
    rank: number;
    studentName: string;
    percentage: number;
    marks: string;
  }>;
}

function normalizeExam(raw: any): Exam {
  const qLen = Array.isArray(raw?.questions) ? raw.questions.length : undefined;
  return {
    _id: String(raw?._id || raw?.id || ''),
    title: raw?.title || raw?.name || 'Untitled exam',
    description: raw?.description,
    examType: raw?.examType || 'practice',
    duration: Number(raw?.duration) || 0,
    totalQuestions: Number(raw?.totalQuestions ?? qLen) || 0,
    totalMarks: Number(raw?.totalMarks) || 0,
    startDate: raw?.startDate ? String(raw.startDate) : '',
    endDate: raw?.endDate ? String(raw.endDate) : '',
    isActive: raw?.isActive !== false,
    createdBy: raw?.createdBy,
  };
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

export default function ExamsView() {
  const { colors, spacing, radius, typo } = useAdminTheme();
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchExams = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/exams/viewable');
      const list = parseExamsResponse(response?.data);
      setExams(list);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExams();
  }, [fetchExams]);

  const openExamDetail = async (exam: Exam) => {
    setSelectedExam(exam);
    setDetailVisible(true);
    setAnalytics(null);
    setResults([]);
    setDetailLoading(true);
    try {
      const [analyticsRes, resultsRes] = await Promise.all([
        api.get(`/api/admin/exams/${exam._id}/analytics`),
        api.get('/api/admin/exam-results', { params: { examId: exam._id } }),
      ]);
      const a = analyticsRes?.data?.data ?? analyticsRes?.data;
      if (analyticsRes?.data?.success && a) setAnalytics(a);
      else if (a && typeof a === 'object') setAnalytics(a);

      const rdata = resultsRes?.data;
      const rows = rdata?.success && Array.isArray(rdata?.data) ? rdata.data : Array.isArray(rdata) ? rdata : [];
      setResults(rows);
    } catch (e) {
      console.error('Failed to load exam detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const q = searchTerm.toLowerCase();
    return (
      (exam.title || '').toLowerCase().includes(q) ||
      (exam.examType || '').toLowerCase().includes(q)
    );
  });

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

  if (isLoading && !refreshing) {
    return <AdminSkeletonList count={4} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
        <AdminSectionHeader
          icon="eye-outline"
          title="Exams (View Only)"
          subtitle="View exams created by Super Admin for your board."
        />

        <AdminSearchBar
          placeholder="Search exams..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={{ marginBottom: spacing.sm }}
        />

        {filteredExams.length === 0 ? (
          <AdminEmptyState
            icon="eye-outline"
            title="No exams available"
            message="Exams are created by Super Admin."
          />
        ) : (
          filteredExams.map((exam, index) => {
            const status = getExamStatus(exam);
            return (
              <AdminGlassCard key={exam._id} delay={index * 60} style={{ marginBottom: spacing.sm }}>
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
                  </View>
                </View>
                {!!exam.description && (
                  <Text style={[styles.examDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {exam.description}
                  </Text>
                )}
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
                  {exam.createdBy?.fullName ? (
                    <Text style={[styles.createdBy, { color: colors.textMuted }]}>
                      Created by: {exam.createdBy.fullName}
                    </Text>
                  ) : null}
                </View>
                <AdminScalePressable
                  onPress={() => openExamDetail(exam)}
                  style={[
                    styles.ctaButton,
                    { backgroundColor: colors.primaryMuted, borderRadius: radius.sm },
                  ]}
                >
                  <Ionicons name="eye" size={18} color={colors.primary} />
                  <Text style={[styles.ctaText, { color: colors.primary }]}>
                    View Results & Analytics
                  </Text>
                </AdminScalePressable>
              </AdminGlassCard>
            );
          })
        )}
      </AdminScreenShell>

      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Animated.View
            entering={FadeInUp.duration(350).springify()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.surfaceBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                {selectedExam?.title || 'Exam'}
              </Text>
              <AdminScalePressable onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={26} color={colors.textSecondary} />
              </AdminScalePressable>
            </View>
            {detailLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {analytics && (
                  <View style={styles.statsGrid}>
                    <AdminStatCard
                      label="Attempted"
                      value={analytics.attemptedCount ?? 0}
                      icon="checkmark-circle"
                      gradientIndex={0}
                    />
                    <AdminStatCard
                      label="Not attempted"
                      value={analytics.notAttemptedCount ?? 0}
                      icon="close-circle"
                      gradientIndex={1}
                    />
                    <AdminStatCard
                      label="Avg score"
                      value={`${analytics.averageScore ?? '—'}%`}
                      icon="stats-chart"
                      gradientIndex={2}
                    />
                  </View>
                )}
                <Text style={[styles.resultsHeading, { color: colors.text }]}>
                  Student results ({results.length})
                </Text>
                {results.length === 0 ? (
                  <Text style={[styles.noResults, { color: colors.textMuted }]}>
                    No results found for your students yet.
                  </Text>
                ) : (
                  results.slice(0, 50).map((r, i) => (
                    <View
                      key={r._id || `r-${i}`}
                      style={[styles.resultRow, { borderBottomColor: colors.surfaceBorder }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.text }]}>
                          {r.userId?.fullName || 'Student'}
                        </Text>
                        <Text style={[styles.resultEmail, { color: colors.textMuted }]}>
                          {r.userId?.email || ''}
                        </Text>
                        <Text style={[styles.resultClass, { color: colors.textMuted }]}>
                          Class {r.userId?.classNumber || '—'}
                        </Text>
                        <AdminAnimatedProgress
                          label=""
                          value={Number(r.percentage) || 0}
                          showLabel={false}
                          height={6}
                        />
                      </View>
                      <View style={styles.resultMarks}>
                        <Text style={[styles.resultPct, { color: colors.primary }]}>
                          {Number(r.percentage).toFixed(1)}%
                        </Text>
                        <Text style={[styles.resultFrac, { color: colors.textMuted }]}>
                          {r.obtainedMarks}/{r.totalMarks}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardTop: { marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  examDescription: { fontSize: 13, marginBottom: 10 },
  metaBlock: { gap: 6, paddingTop: 8, borderTopWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, fontWeight: '600' },
  metaDate: { fontSize: 12, fontWeight: '600' },
  createdBy: { fontSize: 11, marginTop: 4 },
  ctaButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  ctaText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '88%', paddingBottom: 24 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  modalLoading: { padding: 40, alignItems: 'center' },
  modalScroll: { maxHeight: 520 },
  modalScrollContent: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  resultsHeading: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  noResults: { fontSize: 14 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultEmail: { fontSize: 12 },
  resultClass: { fontSize: 11, marginTop: 2, marginBottom: 4 },
  resultMarks: { alignItems: 'flex-end' },
  resultPct: { fontSize: 15, fontWeight: '800' },
  resultFrac: { fontSize: 12 },
});
