import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  AiExamAnalysis,
  ExamAnalysisResult,
  normalizeMongoId,
} from '../../../src/lib/exam-analysis-helpers';
import {
  AdvancedTabMobile,
  AiReportTabMobile,
  InsightsTabMobile,
  PlanTabMobile,
  QuestionsTabMobile,
} from './exam-analysis/MobileExamAnalysisTabs';

type AnalysisTab = 'ai' | 'questions' | 'advanced' | 'insights' | 'plan';

interface DetailedAnalysisViewProps {
  result?: ExamAnalysisResult;
  examTitle?: string;
  onBack?: () => void;
  embedded?: boolean;
}

const TABS: { id: AnalysisTab; label: string }[] = [
  { id: 'ai', label: 'AI Report' },
  { id: 'questions', label: 'Questions' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'insights', label: 'Insights' },
  { id: 'plan', label: 'Plan' },
];

export default function DetailedAnalysisView({
  result,
  examTitle = 'Exam',
  onBack = () => {},
  embedded = false,
}: DetailedAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('ai');
  const [displayResult, setDisplayResult] = useState<ExamAnalysisResult | null>(result ?? null);
  const [reviewHydrated, setReviewHydrated] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiExamAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [studentName, setStudentName] = useState('Student');

  useEffect(() => {
    if (!result?.examId) return;
    setDisplayResult((prev) => ({
      ...(prev || result),
      ...result,
      answers:
        result.answers && Object.keys(result.answers).length > 0
          ? result.answers
          : prev?.answers,
      questions:
        Array.isArray(result.questions) && result.questions.length > 0
          ? result.questions
          : prev?.questions,
    }));
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
          const base = prev ?? srv;
          return {
            ...base,
            ...srv,
            _id: srv._id != null ? String(srv._id) : base._id,
            examId: String(srv.examId || base.examId || examIdStr),
            questions:
              Array.isArray(qs) && qs.length > 0
                ? qs
                : base.questions?.length
                  ? base.questions
                  : srv.questions,
            answers:
              srv.answers && Object.keys(srv.answers).length > 0
                ? { ...(base.answers || {}), ...srv.answers }
                : base.answers,
          };
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
  }, [result?.examId, result?._id, result?.attemptNumber]);

  useEffect(() => {
    if (!reviewHydrated || !displayResult?.examId) return;
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
    displayResult?.examId,
    displayResult?.correctAnswers,
    displayResult?.wrongAnswers,
    displayResult?.unattempted,
    displayResult?.obtainedMarks,
    displayResult?.percentage,
    displayResult?.attemptNumber,
    displayResult?._id,
    examTitle,
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

  return (
    <Shell {...shellProps}>
      <View style={[styles.header, embedded && styles.headerEmbedded]}>
        {!embedded ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Detailed Analysis</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{examTitle}</Text>
        </View>
      </View>

      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => (
        <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
        >
              <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
                {tab.label}
          </Text>
        </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.body}>
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
          <QuestionsTabMobile result={displayResult} aiAnalysis={aiAnalysis} />
        )}
        {activeTab === 'advanced' && advancedExamId ? (
          <AdvancedTabMobile examId={advancedExamId} />
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  tabsBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabsScroll: { paddingHorizontal: 12, gap: 4 },
  tabBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#7c3aed' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabBtnTextActive: { color: '#111827', fontWeight: '800' },
  body: { flex: 1 },
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
