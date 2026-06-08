import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import {
  formatClassBadge,
  performerCounts,
  progressStatusLabel,
  progressTier,
  STUDENTS_UI,
  type StudentRow,
} from '../../../src/lib/students-ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, PERFORMANCE_COLORS, glassCard } from '../../../src/theme/teacher';

type Props = {
  initialClassFilter?: string;
  initialStudentId?: string;
};

type ProgressPanel = 'overview' | 'exams' | 'usage' | 'insights' | 'report';

const PANEL_TABS: { id: ProgressPanel; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'exams', label: 'Exams', icon: 'locate-outline' },
  { id: 'usage', label: 'Usage', icon: 'trending-up-outline' },
  { id: 'insights', label: 'Insights', icon: 'bulb-outline' },
  { id: 'report', label: 'Report', icon: 'document-text-outline' },
];

const AI_SUMMARY_GRADIENT = ['#EEF2FF', '#F5F3FF', '#FAF5FF'] as const;

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  variant = 'default',
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: ReactNode;
  variant?: 'default' | 'ai';
}) {
  const header = (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (variant === 'ai') {
    return (
      <LinearGradient colors={[...AI_SUMMARY_GRADIENT]} style={styles.aiSummaryCard}>
        {header}
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={styles.sectionCard}>
      {header}
      {children}
    </View>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function tierBarColor(tier: 'good' | 'avg' | 'low') {
  if (tier === 'good') return PERFORMANCE_COLORS.good;
  if (tier === 'avg') return PERFORMANCE_COLORS.average;
  return PERFORMANCE_COLORS['at-risk'];
}

function tierPillStyle(tier: 'good' | 'avg' | 'low') {
  const color = tierBarColor(tier);
  return { bg: `${color}22`, text: color };
}

export default function TrackProgressView({ initialClassFilter, initialStudentId }: Props) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [detailStudent, setDetailStudent] = useState<StudentRow | null>(null);
  const [remarksStudent, setRemarksStudent] = useState<StudentRow | null>(null);
  const [studentAiInsight, setStudentAiInsight] = useState('');
  const [studentAiLoading, setStudentAiLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<ProgressPanel>('overview');

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (initialStudentId && students.length) {
      const s = students.find((st) => st.id === initialStudentId);
      if (s) {
        setDetailStudent(s);
        setActivePanel('report');
      }
    }
  }, [initialStudentId, students]);

  const load = async () => {
    setLoading(true);
    try {
      const [perfRes, remarksRes] = await Promise.all([
        teacherService.studentsPerformance(),
        teacherService.trackProgressRemarks(),
      ]);
      const data = perfRes.data ?? [];
      setStudents(
        (Array.isArray(data) ? data : []).map((s: any) => ({
          id: String(s._id || s.id),
          name: s.fullName || s.name || 'Student',
          email: s.email || '',
          classNumber: s.classNumber || 'N/A',
          assignedClass: s.assignedClass,
          performance: s.performance || {},
        }))
      );
      setRemarks(Array.isArray(remarksRes.data) ? remarksRes.data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!initialClassFilter || initialClassFilter === 'all') return students;
    return students.filter((s) => {
      const cls = s.assignedClass?.classNumber || s.classNumber;
      return String(cls) === initialClassFilter;
    });
  }, [students, initialClassFilter]);

  const withExams = filtered.filter((s) => (s.performance?.totalExams ?? 0) > 0);
  const examScores = withExams
    .map((s) => s.performance?.averagePercentage ?? 0)
    .filter((p) => p > 0);
  const avgExam = examScores.length ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0;
  const avgOverall =
    filtered.length > 0
      ? filtered.reduce((sum, s) => sum + (s.performance?.overallProgress ?? 0), 0) / filtered.length
      : 0;
  const withUsage = filtered.filter((s) => (s.performance?.dailyAverageWatchTime ?? 0) > 0);
  const avgWatch = withUsage.length
    ? withUsage.reduce((sum, s) => sum + (s.performance?.dailyAverageWatchTime ?? 0), 0) / withUsage.length
    : 0;

  const performers = performerCounts(filtered);

  const remarksForStudent = useCallback(
    (studentId: string) =>
      remarks.filter((r) => {
        const sid = r.studentId?._id || r.studentId || r.student?._id;
        return String(sid) === studentId;
      }),
    [remarks]
  );

  const refreshClassAi = async () => {
    setAiLoading(true);
    try {
      const res = await teacherService.progressAiInsights({
        classNumber: initialClassFilter && initialClassFilter !== 'all' ? initialClassFilter : undefined,
        studentIds: filtered.map((s) => s.id),
      });
      setAiSummary(res?.summary || res?.data?.summary || res?.insights || 'No insights available.');
    } catch {
      setAiSummary('Could not load AI insights. Try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  const loadStudentAi = async (student: StudentRow) => {
    setStudentAiLoading(true);
    try {
      const res = await teacherService.progressAiInsights({ studentId: student.id });
      setStudentAiInsight(res?.summary || res?.data?.summary || res?.insights || 'No analysis available.');
    } catch {
      setStudentAiInsight('Could not generate analysis.');
    } finally {
      setStudentAiLoading(false);
    }
  };

  if (loading) return <TeacherShimmer variant="list" count={4} />;

  const renderPanelTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.panelTabsScroll}
      contentContainerStyle={styles.panelTabsRow}
    >
      {PANEL_TABS.map((tab) => {
        const selected = activePanel === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={[styles.panelTab, selected && styles.panelTabActive]}
            onPress={() => setActivePanel(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={selected ? TEACHER.textOnPrimary : TEACHER.primaryLight}
            />
            <Text style={[styles.panelTabText, selected && styles.panelTabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiHorizontal}>
        <View style={[styles.kpiCard, styles.kpiCardWide]}>
          <View style={[styles.kpiIcon, { backgroundColor: TEACHER.primary }]}>
            <Ionicons name="locate" size={18} color="#fff" />
          </View>
          <Text style={styles.kpiVal}>{avgExam.toFixed(1)}%</Text>
          <Text style={styles.kpiLbl}>Avg exam score</Text>
          <Text style={styles.kpiSub}>{withExams.length} of {filtered.length} with exam data</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardWide]}>
          <View style={[styles.kpiIcon, { backgroundColor: TEACHER.primaryLight }]}>
            <Ionicons name="trending-up" size={18} color="#fff" />
          </View>
          <Text style={styles.kpiVal}>{avgOverall.toFixed(1)}%</Text>
          <Text style={styles.kpiLbl}>Avg overall progress</Text>
          <Text style={styles.kpiSub}>Content + exam combined</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardWide]}>
          <View style={[styles.kpiIcon, { backgroundColor: '#a855f7' }]}>
            <Ionicons name="time" size={18} color="#fff" />
          </View>
          <Text style={styles.kpiVal}>{avgWatch.toFixed(1)} min</Text>
          <Text style={styles.kpiLbl}>Avg daily usage</Text>
          <Text style={styles.kpiSub}>{withUsage.length} with session data</Text>
        </View>
      </ScrollView>

      <View style={styles.performerRow}>
        <View style={[styles.performerCard, { borderColor: `${PERFORMANCE_COLORS.good}55` }]}>
          <Ionicons name="trending-up" size={20} color={PERFORMANCE_COLORS.good} />
          <Text style={styles.performerVal}>{performers.high}</Text>
          <Text style={styles.performerLbl}>High</Text>
        </View>
        <View style={[styles.performerCard, { borderColor: `${PERFORMANCE_COLORS.average}55` }]}>
          <Ionicons name="locate" size={20} color={PERFORMANCE_COLORS.average} />
          <Text style={styles.performerVal}>{performers.average}</Text>
          <Text style={styles.performerLbl}>Average</Text>
        </View>
        <View style={[styles.performerCard, { borderColor: `${PERFORMANCE_COLORS['at-risk']}55` }]}>
          <Ionicons name="alert-circle" size={20} color={PERFORMANCE_COLORS['at-risk']} />
          <Text style={styles.performerVal}>{performers.needAttention}</Text>
          <Text style={styles.performerLbl}>At Risk</Text>
        </View>
      </View>

      <SectionCard title="Class AI Summary" icon="sparkles" iconColor={TEACHER.primary} variant="ai">
        <View style={styles.aiHeader}>
          <Text style={styles.sectionHint}>Quick class-wide improvement overview</Text>
          <Pressable style={styles.refreshBtn} onPress={refreshClassAi} disabled={aiLoading}>
            <Ionicons name="refresh" size={14} color={TEACHER.warning} />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
        {aiLoading ? (
          <ActivityIndicator color={TEACHER.primary} />
        ) : (
          <Text style={styles.aiText}>{aiSummary || 'Tap Refresh for AI class summary.'}</Text>
        )}
      </SectionCard>

      <View style={styles.quickJumpRow}>
        <Text style={styles.quickJumpTitle}>Jump to section</Text>
        {PANEL_TABS.filter((t) => t.id !== 'overview').map((tab) => (
          <Pressable key={tab.id} style={styles.quickJumpBtn} onPress={() => setActivePanel(tab.id)}>
            <Ionicons name={tab.icon} size={16} color={TEACHER.primaryLight} />
            <Text style={styles.quickJumpText}>{tab.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={STUDENTS_UI.textLight} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  const renderExamItem = ({ item: s }: { item: StudentRow }) => {
    const pct = s.performance?.averagePercentage ?? 0;
    const tier = progressTier(pct);
    const colors = tierPillStyle(tier);
    return (
      <View style={styles.listItem}>
        <View style={styles.listItemTop}>
          <Text style={styles.listName} numberOfLines={1}>{s.name}</Text>
          <View style={[styles.pill, { backgroundColor: colors.bg }]}>
            <Text style={[styles.pillText, { color: colors.text }]}>{pct.toFixed(1)}% avg</Text>
          </View>
        </View>
        <Text style={styles.listSub}>
          {s.performance?.totalExams} exam{(s.performance?.totalExams ?? 0) !== 1 ? 's' : ''}
          {s.performance?.recentExamTitle
            ? ` · Recent: ${s.performance.recentExamTitle} (${(s.performance.recentPercentage ?? 0).toFixed(0)}%)`
            : ''}
        </Text>
      </View>
    );
  };

  const renderUsageItem = ({ item: s }: { item: StudentRow }) => {
    const overall = s.performance?.overallProgress ?? 0;
    const watch = s.performance?.dailyAverageWatchTime ?? 0;
    return (
      <View style={styles.listItem}>
        <Text style={styles.listName}>{s.name}</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLbl}>Overall progress</Text>
          <Text style={styles.progressPct}>{overall.toFixed(1)}%</Text>
        </View>
        <ProgressBar value={overall} color={TEACHER.primary} />
        <Text style={styles.listSub}>
          {watch > 0 ? `${watch.toFixed(1)} min/day avg on platform` : 'No usage data yet'}
        </Text>
      </View>
    );
  };

  const renderInsightItem = ({ item: s }: { item: StudentRow }) => {
    const count = remarksForStudent(s.id).length;
    return (
      <View style={styles.insightCard}>
        <Text style={styles.listName}>{s.name}</Text>
        <Text style={styles.listSub}>
          {count > 0 ? `${count} remark${count !== 1 ? 's' : ''}` : 'No remarks yet'}
        </Text>
        <View style={styles.insightActions}>
          <Pressable style={styles.viewBtn} onPress={() => setRemarksStudent(s)}>
            <Ionicons name="chatbubbles-outline" size={14} color={TEACHER.primaryLight} />
            <Text style={styles.viewBtnText}>Remarks</Text>
          </Pressable>
          <Pressable
            style={styles.viewBtn}
            onPress={() => {
              setDetailStudent(s);
              loadStudentAi(s);
            }}
          >
            <Ionicons name="bulb-outline" size={14} color={TEACHER.primaryLight} />
            <Text style={styles.viewBtnText}>AI Tips</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderReportItem = ({ item: s }: { item: StudentRow }) => {
    const overall = s.performance?.overallProgress ?? 0;
    const tier = progressTier(overall);
    const colors = tierPillStyle(tier);
    return (
      <Pressable style={styles.reportRow} onPress={() => setDetailStudent(s)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listName}>{s.name}</Text>
          <Text style={styles.listSub}>{s.email}</Text>
          <View style={styles.reportMeta}>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{formatClassBadge(s)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.bg }]}>
              <Text style={[styles.pillText, { color: colors.text }]}>{progressStatusLabel(overall)}</Text>
            </View>
          </View>
          <ProgressBar value={overall} color={tierBarColor(tier)} />
        </View>
        <View style={styles.viewBtn}>
          <Ionicons name="eye-outline" size={14} color={TEACHER.primaryLight} />
          <Text style={styles.viewBtnText}>View</Text>
        </View>
      </Pressable>
    );
  };

  const listEmpty = (message: string) => (
    <View style={styles.listEmpty}>
      <Text style={styles.emptyLine}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBlock}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="bar-chart" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Track Student Progress</Text>
            <Text style={styles.headerSub}>
              Use tabs below — no long scrolling needed
            </Text>
          </View>
        </View>
        {renderPanelTabs()}
      </View>

      <View style={styles.panelBody}>
        {activePanel === 'overview' && renderOverview()}
        {activePanel === 'exams' && (
          <FlatList
            data={withExams}
            keyExtractor={(s) => s.id}
            renderItem={renderExamItem}
            contentContainerStyle={styles.panelListContent}
            ListEmptyComponent={listEmpty('No exam attempts yet for students in this view.')}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activePanel === 'usage' && (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            renderItem={renderUsageItem}
            contentContainerStyle={styles.panelListContent}
            ListEmptyComponent={listEmpty('No students match the current filters.')}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activePanel === 'insights' && (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            renderItem={renderInsightItem}
            ListHeaderComponent={
              <View style={styles.insightsHeader}>
                <Text style={styles.sectionHint}>Remarks and AI improvement tips per student</Text>
                <Pressable style={styles.refreshBtn} onPress={refreshClassAi} disabled={aiLoading}>
                  <Ionicons name="refresh" size={14} color={TEACHER.warning} />
                  <Text style={styles.refreshText}>Refresh class AI</Text>
                </Pressable>
                {aiSummary ? <Text style={styles.aiText}>{aiSummary}</Text> : null}
              </View>
            }
            contentContainerStyle={styles.panelListContent}
            ListEmptyComponent={listEmpty('No students match the current filters.')}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activePanel === 'report' && (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            renderItem={renderReportItem}
            ListHeaderComponent={
              <Text style={[styles.sectionHint, { marginBottom: 10 }]}>
                Detailed progress report — tap a student for full metrics
              </Text>
            }
            contentContainerStyle={styles.panelListContent}
            ListEmptyComponent={listEmpty('No students match the current filters.')}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={!!remarksStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remarks — {remarksStudent?.name}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {remarksForStudent(remarksStudent?.id || '').length === 0 ? (
                <Text style={styles.emptyLine}>No remarks yet.</Text>
              ) : (
                remarksForStudent(remarksStudent?.id || '').map((r) => (
                  <View key={r._id} style={styles.remarkItem}>
                    <Text style={styles.remarkText}>{r.remark}</Text>
                    <Text style={styles.remarkMeta}>
                      {r.isPositive ? 'Positive' : 'Needs improvement'}
                      {r.subject?.name ? ` · ${r.subject.name}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setRemarksStudent(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{detailStudent?.name}</Text>
              <Text style={styles.listSub}>{detailStudent?.email}</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricVal}>{(detailStudent?.performance?.overallProgress ?? 0).toFixed(0)}%</Text>
                  <Text style={styles.metricLbl}>Overall</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricVal}>{(detailStudent?.performance?.averagePercentage ?? 0).toFixed(0)}%</Text>
                  <Text style={styles.metricLbl}>Exam avg</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricVal}>{detailStudent?.performance?.totalExams ?? 0}</Text>
                  <Text style={styles.metricLbl}>Exams</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricVal}>{(detailStudent?.performance?.dailyAverageWatchTime ?? 0).toFixed(0)}m</Text>
                  <Text style={styles.metricLbl}>Daily watch</Text>
                </View>
              </View>
              {studentAiInsight ? <Text style={styles.aiText}>{studentAiInsight}</Text> : null}
              {!studentAiInsight && !studentAiLoading ? (
                <Pressable style={styles.primaryBtn} onPress={() => detailStudent && loadStudentAi(detailStudent)}>
                  <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.primaryBtnGrad}>
                    <Text style={styles.primaryBtnText}>AI Improvement Analysis</Text>
                  </LinearGradient>
                </Pressable>
              ) : null}
              {studentAiLoading ? <ActivityIndicator color={STUDENTS_UI.emerald} /> : null}
              <Pressable style={styles.closeBtn} onPress={() => { setDetailStudent(null); setStudentAiInsight(''); }}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEACHER.bg },
  topBlock: {
    paddingHorizontal: TEACHER_SPACING.lg,
    gap: 10,
    paddingBottom: 8,
  },
  panelBody: { flex: 1, minHeight: 0 },
  panelContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 12 },
  panelListContent: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, gap: 8 },
  panelTabsScroll: { flexGrow: 0, maxHeight: 44 },
  panelTabsRow: { gap: 8, paddingVertical: 2 },
  panelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
  },
  panelTabActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  panelTabText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  panelTabTextActive: { color: TEACHER.textOnPrimary },
  kpiHorizontal: { gap: 10, paddingVertical: 4 },
  kpiCardWide: { width: 220 },
  quickJumpRow: {
    ...glassCard,
    borderRadius: TEACHER_RADIUS.lg,
    padding: 12,
    gap: 8,
  },
  quickJumpTitle: { ...TEACHER_TYPO.label, color: TEACHER.textMuted, marginBottom: 4 },
  quickJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  quickJumpText: { flex: 1, fontSize: 14, fontWeight: '600', color: TEACHER.text },
  insightsHeader: { gap: 8, marginBottom: 8 },
  insightCard: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(123,80,255,0.07)',
  },
  insightActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  listEmpty: { padding: 32, alignItems: 'center' },
  headerCard: {
    flexDirection: 'row',
    gap: 12,
    ...glassCard,
    borderRadius: TEACHER_RADIUS.xl,
    padding: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  headerSub: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4, lineHeight: 18 },
  kpiRow: { gap: 10 },
  kpiCard: {
    ...glassCard,
    borderRadius: TEACHER_RADIUS.lg,
    padding: 14,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiVal: { ...TEACHER_TYPO.number, fontSize: 24, color: TEACHER.text },
  kpiLbl: { fontSize: 12, color: TEACHER.textMuted },
  kpiSub: { fontSize: 11, color: TEACHER.textMuted, marginTop: 4 },
  sectionCard: {
    ...glassCard,
    borderRadius: TEACHER_RADIUS.xl,
    padding: 14,
    gap: 10,
  },
  aiSummaryCard: {
    borderRadius: TEACHER_RADIUS.xl,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    ...TEACHER.shadow.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...TEACHER_TYPO.body, fontWeight: '800', color: TEACHER.text },
  sectionHint: { fontSize: 11, color: TEACHER.textMuted, marginBottom: 4 },
  listItem: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(123,80,255,0.07)',
  },
  listItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  listName: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  listSub: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  progressLbl: { fontSize: 12, color: TEACHER.textMuted },
  progressPct: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  progressTrack: { height: 8, backgroundColor: TEACHER.surfaceBorder, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    padding: 10,
    marginBottom: 8,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: TEACHER.surfaceElevated,
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryLight },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: TEACHER.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshText: { fontSize: 11, fontWeight: '700', color: TEACHER.warning },
  aiText: { fontSize: 13, color: TEACHER.textMuted, lineHeight: 20 },
  emptyLine: { fontSize: 13, color: TEACHER.textMuted, fontStyle: 'italic' },
  performerRow: { flexDirection: 'row', gap: 8 },
  performerCard: {
    flex: 1,
    ...glassCard,
    borderRadius: TEACHER_RADIUS.lg,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  performerVal: { fontSize: 20, fontWeight: '800', color: TEACHER.text },
  performerLbl: { fontSize: 10, fontWeight: '700', color: TEACHER.textSecondary, textAlign: 'center' },
  performerSub: { fontSize: 9, color: TEACHER.textMuted, textAlign: 'center' },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(123,80,255,0.07)',
  },
  reportMeta: { flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' },
  classBadge: { backgroundColor: TEACHER.navActiveBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  classBadgeText: { fontSize: 11, fontWeight: '700', color: TEACHER.primaryLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text, marginBottom: 12 },
  remarkItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TEACHER.surfaceBorder },
  remarkText: { fontSize: 14, color: TEACHER.text },
  remarkMeta: { fontSize: 11, color: TEACHER.textMuted, marginTop: 4 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  metric: {
    width: '47%',
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  metricVal: { fontSize: 18, fontWeight: '800', color: TEACHER.primaryLight },
  metricLbl: { fontSize: 11, color: TEACHER.textMuted, marginTop: 4 },
  primaryBtn: { borderRadius: TEACHER_RADIUS.md, overflow: 'hidden', marginVertical: 12 },
  primaryBtnGrad: { padding: 14, alignItems: 'center' },
  primaryBtnText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  closeBtn: { alignItems: 'center', padding: 14 },
  closeBtnText: { color: TEACHER.textMuted, fontWeight: '600' },
});
