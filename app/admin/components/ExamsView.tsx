import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';

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

const CARD_SCHEMES = [
  { colors: ['#fdba74', '#fb923c'] as [string, string], badge: 'rgba(0,0,0,0.12)' },
  { colors: ['#7dd3fc', '#38bdf8'] as [string, string], badge: 'rgba(0,0,0,0.12)' },
  { colors: ['#2dd4bf', '#14b8a6'] as [string, string], badge: 'rgba(0,0,0,0.12)' },
];

export default function ExamsView() {
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

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Exams (View Only)</Text>
        <Text style={styles.introSubtitle}>View exams created by Super Admin for your board.</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exams..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fb923c" />
            <Text style={styles.loadingHint}>Loading exams…</Text>
          </View>
        ) : filteredExams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="eye-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyText}>No exams available</Text>
            <Text style={styles.emptySub}>Exams are created by Super Admin.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fb923c" />}
          >
            {filteredExams.map((exam, index) => {
              const status = getExamStatus(exam);
              const scheme = CARD_SCHEMES[index % CARD_SCHEMES.length];
              return (
                <LinearGradient
                  key={exam._id}
                  colors={scheme.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.examCard}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.examTitle} numberOfLines={2}>
                      {exam.title}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: scheme.badge }]}>
                        <Text style={styles.typeBadgeText}>{(exam.examType || 'practice').toUpperCase()}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          status.tone === 'ended' && styles.statusEnded,
                          status.tone === 'active' && styles.statusActive,
                          status.tone === 'upcoming' && styles.statusUpcoming,
                          status.tone === 'unknown' && styles.statusUnknown,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{status.label}</Text>
                      </View>
                    </View>
                  </View>
                  {!!exam.description && (
                    <Text style={styles.examDescription} numberOfLines={2}>
                      {exam.description}
                    </Text>
                  )}
                  <View style={styles.metaBlock}>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={16} color="#111827" />
                      <Text style={styles.metaText}>{exam.duration} minutes</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="book-outline" size={16} color="#111827" />
                      <Text style={styles.metaText}>
                        {exam.totalQuestions} questions • {exam.totalMarks} marks
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={16} color="#111827" />
                      <Text style={styles.metaDate}>
                        {formatDateShort(exam.startDate)} — {formatDateShort(exam.endDate)}
                      </Text>
                    </View>
                    {exam.createdBy?.fullName ? (
                      <Text style={styles.createdBy}>Created by: {exam.createdBy.fullName}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity style={styles.ctaButton} onPress={() => openExamDetail(exam)} activeOpacity={0.85}>
                    <Ionicons name="eye" size={18} color="#111827" />
                    <Text style={styles.ctaText}>View Results & Analytics</Text>
                  </TouchableOpacity>
                </LinearGradient>
              );
            })}
          </ScrollView>
        )}
      </View>

      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedExam?.title || 'Exam'}
              </Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color="#111827" />
              </TouchableOpacity>
            </View>
            {detailLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#fb923c" />
              </View>
            ) : (
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {analytics && (
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Attempted</Text>
                      <Text style={styles.statVal}>{analytics.attemptedCount ?? '—'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Not attempted</Text>
                      <Text style={styles.statVal}>{analytics.notAttemptedCount ?? '—'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Avg score</Text>
                      <Text style={styles.statVal}>{analytics.averageScore ?? '—'}%</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.resultsHeading}>Student results ({results.length})</Text>
                {results.length === 0 ? (
                  <Text style={styles.noResults}>No results found for your students yet.</Text>
                ) : (
                  results.slice(0, 50).map((r, i) => (
                    <View key={r._id || `r-${i}`} style={styles.resultRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{r.userId?.fullName || 'Student'}</Text>
                        <Text style={styles.resultEmail}>{r.userId?.email || ''}</Text>
                        <Text style={styles.resultClass}>Class {r.userId?.classNumber || '—'}</Text>
                      </View>
                      <View style={styles.resultMarks}>
                        <Text style={styles.resultPct}>{Number(r.percentage).toFixed(1)}%</Text>
                        <Text style={styles.resultFrac}>
                          {r.obtainedMarks}/{r.totalMarks}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    minHeight: 0,
  },
  intro: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  introSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#111827',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  examCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTop: {
    marginBottom: 8,
  },
  examTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  statusEnded: {
    backgroundColor: '#dc2626',
  },
  statusActive: {
    backgroundColor: '#0d9488',
  },
  statusUpcoming: {
    backgroundColor: '#ca8a04',
  },
  statusUnknown: {
    backgroundColor: '#6b7280',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  examDescription: {
    fontSize: 13,
    color: 'rgba(17,24,39,0.85)',
    marginBottom: 10,
  },
  metaBlock: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,24,39,0.12)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  metaDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  createdBy: {
    fontSize: 11,
    color: 'rgba(17,24,39,0.75)',
    marginTop: 4,
  },
  ctaButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 520,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  resultsHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  noResults: {
    fontSize: 14,
    color: '#6b7280',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  resultEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  resultClass: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  resultMarks: {
    alignItems: 'flex-end',
  },
  resultPct: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0ea5e9',
  },
  resultFrac: {
    fontSize: 12,
    color: '#6b7280',
  },
});
