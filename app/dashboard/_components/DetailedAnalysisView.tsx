import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  AiExamAnalysis,
  ExamAnalysisResult,
  getDisplayPercentage,
  getGradeDisplayColor,
  getGradeFromResult,
  getMarksPercentage,
  mergeExamResultPreserveScores,
  normalizeExamResultFromApi,
  normalizeMongoId,
} from '../../../src/lib/exam-analysis-helpers';
import { ANALYSIS, analysisStyles, TAB_META, useExamAnalysisLayout } from './exam-analysis/exam-analysis-ui';
import {
  AdvancedTabMobile,
  AiReportTabMobile,
  InsightsTabMobile,
  PlanTabMobile,
  QuestionsTabMobile,
} from './exam-analysis/MobileExamAnalysisTabs';

type AnalysisTab = keyof typeof TAB_META;

interface DetailedAnalysisViewProps {
  result?: ExamAnalysisResult;
  examTitle?: string;
  onBack?: () => void;
  onRetake?: () => void;
  attemptsRemaining?: number;
  embedded?: boolean;
}

export default function DetailedAnalysisView({
  result,
  examTitle = 'Exam',
  onBack = () => {},
  onRetake,
  attemptsRemaining = 0,
  embedded = false,
}: DetailedAnalysisViewProps) {
  const { isTablet, width: windowWidth } = useExamAnalysisLayout();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('ai');
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Partial<Record<AnalysisTab, { x: number; width: number }>>>({});
  const tabsViewportWidthRef = useRef(0);

  const scrollTabIntoView = useCallback((id: AnalysisTab, animated = true) => {
    const layout = tabLayoutsRef.current[id];
    const viewport = tabsViewportWidthRef.current || windowWidth;
    if (!layout) return;
    const targetX = Math.max(0, layout.x - viewport / 2 + layout.width / 2);
    tabsScrollRef.current?.scrollTo({ x: targetX, animated });
  }, [windowWidth]);

  const selectTab = useCallback(
    (id: AnalysisTab) => {
      setActiveTab(id);
      requestAnimationFrame(() => scrollTabIntoView(id));
      setTimeout(() => scrollTabIntoView(id), 50);
    },
    [scrollTabIntoView]
  );

  useEffect(() => {
    const timer = setTimeout(() => scrollTabIntoView(activeTab, false), 80);
    return () => clearTimeout(timer);
  }, [activeTab, scrollTabIntoView]);
  const [displayResult, setDisplayResult] = useState<ExamAnalysisResult | null>(result ?? null);
  const [reviewHydrated, setReviewHydrated] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiExamAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [studentName, setStudentName] = useState('Student');
  const aiFetchAttemptedRef = useRef(false);

  useEffect(() => {
    aiFetchAttemptedRef.current = false;
    setAiAnalysis(null);
    setAiError('');
    setAiLoading(false);
  }, [result?.examId, result?._id, result?.attemptNumber]);

  useEffect(() => {
    if (!result?.examId) return;
    setDisplayResult((prev) =>
      normalizeExamResultFromApi(
        mergeExamResultPreserveScores(prev || undefined, result)
      )
    );
  }, [result]);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          const user = data.user || data;
          setStudentName(user?.fullName || user?.email?.split('@')[0] || 'Student');
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  useEffect(() => {
    if (!result?.examId) {
      setReviewHydrated(true);
      return;
    }
    const hasQuestions = Array.isArray(result.questions) && result.questions.length > 0;
    const hasAnswers = result.answers && Object.keys(result.answers).length > 0;
    if (hasQuestions && hasAnswers) {
      setReviewHydrated(true);
      return;
    }
    let cancelled = false;
    const hydrateFromReview = async () => {
      const examIdStr = normalizeMongoId(result.examId);
      if (!examIdStr) {
        setReviewHydrated(true);
        return;
      }
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const resultRowId = normalizeMongoId((result as ExamAnalysisResult & { _id?: unknown })._id);
        const rid = resultRowId ? `?resultId=${encodeURIComponent(resultRowId)}` : '';
        const res = await fetch(`${API_BASE_URL}/api/student/exam-results/${examIdStr}/review${rid}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setReviewHydrated(true);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const qs = json?.data?.questions;
        const srv = json?.data?.result as ExamAnalysisResult | undefined;
        if (!srv || cancelled) {
          if (!cancelled) setReviewHydrated(true);
          return;
        }
        setDisplayResult((prev) => {
          const base = prev ?? result ?? srv;
          const merged = mergeExamResultPreserveScores(base, srv);
          const normalized = normalizeExamResultFromApi({
            ...merged,
            examId: srv.examId || base.examId || examIdStr,
            questions:
              Array.isArray(qs) && qs.length > 0
                ? qs
                : base.questions?.length
                  ? base.questions
                  : srv.questions,
            questionTimings: merged.questionTimings || base.questionTimings || result.questionTimings,
            questionAnalytics:
              srv.questionAnalytics && Array.isArray(srv.questionAnalytics)
                ? srv.questionAnalytics
                : base.questionAnalytics,
          });
          return normalized;
        });
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setReviewHydrated(true);
      }
    };
    setReviewHydrated(false);
    void hydrateFromReview();
    return () => { cancelled = true; };
  }, [result?.examId, result?._id, result?.attemptNumber, result?.questions, result?.answers]);

  const needsAiReport = activeTab === 'ai' || activeTab === 'insights' || activeTab === 'plan';

  useEffect(() => {
    if (!reviewHydrated || !displayResult?.examId || !needsAiReport) return;
    if (aiFetchAttemptedRef.current || aiAnalysis) return;
    aiFetchAttemptedRef.current = true;
    let cancelled = false;
    const fetchAiReport = async () => {
      setAiLoading(true);
      setAiError('');
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120_000);
        const response = await fetch(`${API_BASE_URL}/api/student/exam-results/ai-analysis`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ result: displayResult, examTitle }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to generate AI report');
        }
        if (!cancelled) setAiAnalysis(payload?.data?.analysis || null);
      } catch (error: any) {
        if (!cancelled) {
          setAiError(
            error?.name === 'AbortError'
              ? 'AI report is taking longer than expected. Try again in a moment.'
              : error?.message || 'AI report unavailable'
          );
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };
    void fetchAiReport();
    return () => { cancelled = true; };
  }, [
    reviewHydrated,
    needsAiReport,
    displayResult?.examId,
    displayResult?.correctAnswers,
    displayResult?.wrongAnswers,
    displayResult?.unattempted,
    displayResult?.obtainedMarks,
    displayResult?.percentage,
    displayResult?.attemptNumber,
    displayResult?._id,
    examTitle,
    aiAnalysis,
  ]);

  if (!displayResult?.examId) {
    return (
      <View style={[styles.container, styles.missingState]}>
        <Ionicons name="document-text-outline" size={40} color="#9ca3af" />
        <Text style={styles.missingTitle}>Exam data unavailable</Text>
        <Text style={styles.missingText}>Open an attempted exam and tap View Details.</Text>
        {!embedded ? (
          <TouchableOpacity onPress={onBack} style={styles.missingBack}>
            <Text style={styles.missingBackText}>Go back</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const advancedExamId = normalizeMongoId(displayResult.examId);
  const Shell = embedded ? View : SafeAreaView;
  const shellProps = embedded ? { style: styles.container } : { style: styles.container, edges: ['top'] as const };
  const attempted = (displayResult.correctAnswers || 0) + (displayResult.wrongAnswers || 0);
  const accuracy = attempted > 0 ? Math.round((displayResult.correctAnswers / attempted) * 100) : 0;
  const scorePct = Math.round(
    getMarksPercentage(displayResult) || getDisplayPercentage(displayResult)
  );
  const grade = getGradeFromResult(displayResult);

  const tabEntries = Object.entries(TAB_META) as [AnalysisTab, (typeof TAB_META)[AnalysisTab]][];

  const renderTab = (id: AnalysisTab, tab: (typeof TAB_META)[AnalysisTab]) => (
    <Pressable
      key={id}
      style={[analysisStyles.tabPill, activeTab === id && analysisStyles.tabPillActive]}
      onPress={() => selectTab(id)}
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        tabLayoutsRef.current[id] = { x, width };
      }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === id }}
    >
      <Ionicons
        name={tab.icon}
        size={15}
        color={activeTab === id ? ANALYSIS.accent : '#94A3B8'}
      />
      <Text style={[analysisStyles.tabPillText, activeTab === id && analysisStyles.tabPillTextActive]}>
        {tab.label}
      </Text>
    </Pressable>
  );

  return (
    <Shell {...shellProps}>
      <View style={analysisStyles.header} collapsable={false}>
        <LinearGradient colors={[...ANALYSIS.gradient]} style={styles.headerGradient}>
          <View style={[analysisStyles.headerTop, isTablet && analysisStyles.headerConstrained, embedded && styles.headerEmbedded]}>
            {!embedded ? (
              <TouchableOpacity onPress={onBack} style={analysisStyles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#334155" />
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={analysisStyles.headerTitle}>Exam Analysis</Text>
              <Text style={analysisStyles.headerSub} numberOfLines={1}>{examTitle}</Text>
            </View>
            {!embedded && onRetake && attemptsRemaining > 0 ? (
              <TouchableOpacity onPress={onRetake} style={analysisStyles.retakeBtn}>
                <Ionicons name="refresh" size={14} color={ANALYSIS.accent} />
                <Text style={analysisStyles.retakeBtnText}>{attemptsRemaining}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={[analysisStyles.statsStrip, isTablet && analysisStyles.headerConstrained]}>
            <View style={analysisStyles.statChip}>
              <Text style={analysisStyles.statChipVal}>{displayResult.obtainedMarks || 0}</Text>
              <Text style={analysisStyles.statChipLab}>Marks</Text>
            </View>
            <View style={analysisStyles.statChip}>
              <Text style={analysisStyles.statChipVal}>{scorePct}%</Text>
              <Text style={analysisStyles.statChipLab}>Score</Text>
            </View>
            <View style={analysisStyles.statChip}>
              <Text style={[analysisStyles.statChipVal, { color: getGradeDisplayColor(grade) }]}>{grade}</Text>
              <Text style={analysisStyles.statChipLab}>Grade</Text>
            </View>
            <View style={analysisStyles.statChip}>
              <Text style={analysisStyles.statChipVal}>{accuracy}%</Text>
              <Text style={analysisStyles.statChipLab}>Accuracy</Text>
            </View>
          </View>
        </LinearGradient>

        <View
          style={[analysisStyles.tabsWrap, isTablet && analysisStyles.headerConstrained]}
          collapsable={false}
        >
          <ScrollView
            ref={tabsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={analysisStyles.tabsScroll}
            onLayout={(event) => {
              tabsViewportWidthRef.current = event.nativeEvent.layout.width;
            }}
          >
            {tabEntries.map(([id, tab]) => renderTab(id, tab))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.body} key={activeTab}>
        {activeTab === 'ai' && (
          <AiReportTabMobile
            result={displayResult}
            examTitle={examTitle}
            studentName={studentName}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
            aiError={aiError}
          />
        )}
        {activeTab === 'questions' && (
          <QuestionsTabMobile
            result={displayResult}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
          />
        )}
        {activeTab === 'advanced' ? (
          advancedExamId ? (
            <AdvancedTabMobile
              examId={advancedExamId}
              resultId={displayResult._id}
              result={displayResult}
              aiAnalysis={aiAnalysis}
            />
          ) : (
            <View style={styles.advancedUnavailable}>
              <Ionicons name="stats-chart-outline" size={36} color="#9ca3af" />
              <Text style={styles.advancedUnavailableTitle}>Advanced analytics unavailable</Text>
              <Text style={styles.advancedUnavailableText}>
                Exam details could not be loaded. Go back and open this attempt again from View Details.
              </Text>
            </View>
          )
        ) : null}
        {activeTab === 'insights' && (
          <InsightsTabMobile result={displayResult} aiAnalysis={aiAnalysis} />
        )}
        {activeTab === 'plan' && (
          <PlanTabMobile studentName={studentName} aiAnalysis={aiAnalysis} />
            )}
          </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { paddingBottom: 4 },
  body: { flex: 1, zIndex: 0 },
  advancedUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  advancedUnavailableTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  advancedUnavailableText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  headerEmbedded: { paddingTop: 0 },
  missingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  missingTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  missingText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  missingBack: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
  },
  missingBackText: { color: '#fff', fontWeight: '700' },
});
