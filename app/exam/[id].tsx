import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  BackHandler,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreventRemove } from '@react-navigation/native';
import { API_BASE_URL } from '../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import { getDashboardPath } from '../../src/hooks/useBackNavigation';
import MathRenderer from '../../src/components/MathRenderer';
import ExamResultsView from '../../src/components/student/ExamResultsView';
import { ExamAnalysisResult } from '../../src/lib/exam-analysis-helpers';

const MAX_EXIT_ATTEMPTS = 5;

type Question = {
  _id: string;
  questionText?: string;
  question?: string;
  questionType?: 'mcq' | 'multiple' | 'integer' | string;
  options?: Array<string | { text: string; isCorrect?: boolean }>;
  marks?: number;
  subject?: string;
};

type Exam = {
  _id: string;
  title: string;
  duration: number;
  maxAttempts?: number;
  startDate?: string;
  endDate?: string;
  questions: Question[];
};

function mergeExamResult(
  exam: Exam,
  answers: Record<string, unknown>,
  timeTaken: number,
  server: Record<string, unknown>,
  localQuestionTimings?: Record<string, number>
): ExamAnalysisResult {
  const serverAnswersRaw = server.answers;
  const normalizedServerAnswers =
    serverAnswersRaw && typeof serverAnswersRaw === 'object' && !Array.isArray(serverAnswersRaw)
      ? Object.fromEntries(Object.entries(serverAnswersRaw).map(([k, v]) => [String(k), v]))
      : {};
  const localAnswerCount = Object.keys(answers).length;
  const serverAnswerCount = Object.keys(normalizedServerAnswers).length;

  return {
    _id: server._id != null ? String(server._id) : undefined,
    attemptNumber:
      Number(server.attemptNumber) >= 1 ? Number(server.attemptNumber) : undefined,
    examId: String(server.examId || exam._id),
    examTitle: String(server.examTitle || exam.title),
    totalQuestions: Number(server.totalQuestions ?? exam.questions.length),
    correctAnswers: Number(server.correctAnswers ?? 0),
    wrongAnswers: Number(server.wrongAnswers ?? 0),
    unattempted: Number(server.unattempted ?? 0),
    totalMarks: Number(server.totalMarks ?? 0),
    obtainedMarks: Number(server.obtainedMarks ?? 0),
    percentage: Number(server.percentage ?? 0),
    timeTaken: Number(server.timeTaken ?? timeTaken),
    subjectWiseScore:
      server.subjectWiseScore && typeof server.subjectWiseScore === 'object'
        ? (server.subjectWiseScore as ExamAnalysisResult['subjectWiseScore'])
        : undefined,
    answers:
      serverAnswerCount > 0 || localAnswerCount === 0 ? normalizedServerAnswers : answers,
    questions:
      Array.isArray(server.questions) && server.questions.length > 0
        ? server.questions
        : exam.questions,
    questionTimings:
      server.questionTimings && typeof server.questionTimings === 'object'
        ? (server.questionTimings as Record<string, number>)
        : localQuestionTimings && Object.keys(localQuestionTimings).length > 0
          ? localQuestionTimings
          : undefined,
  };
}

function optionLabel(opt: string | { text: string }, index: number): string {
  if (typeof opt === 'string') return opt;
  return opt.text || `Option ${index + 1}`;
}

export default function ExamPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [dashboardPath, setDashboardPath] = useState('/dashboard');
  const [exitAttempts, setExitAttempts] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [examResult, setExamResult] = useState<ExamAnalysisResult | null>(null);
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const submittedRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const questionEnterTimestampRef = useRef<number>(Date.now());
  const lastTrackedQuestionIdRef = useRef<string | null>(null);

  const examInProgress = !!exam && !submittedRef.current && !isLoading && !examResult;

  useEffect(() => {
    if (id) fetchExam();
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, [id]);

  const recordExitAttempt = useCallback(() => {
    if (submittedRef.current || isSubmitting || !exam) return;
    setExitAttempts((prev) => Math.min(prev + 1, MAX_EXIT_ATTEMPTS));
    setShowExitWarning(true);
  }, [exam, isSubmitting]);

  usePreventRemove(examInProgress, () => {
    recordExitAttempt();
  });

  useEffect(() => {
    if (!examInProgress) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      recordExitAttempt();
      return true;
    });
    return () => handler.remove();
  }, [examInProgress, recordExitAttempt]);

  const recordCurrentQuestionDuration = useCallback(
    (baseTimings: Record<string, number> = questionTimings) => {
      if (!exam?.questions?.length) return baseTimings;
      const now = Date.now();
      const current = exam.questions[currentIndex];
      const currentId = current?._id ? String(current._id) : null;
      if (!currentId) return baseTimings;

      if (!lastTrackedQuestionIdRef.current) {
        lastTrackedQuestionIdRef.current = currentId;
        questionEnterTimestampRef.current = now;
        return baseTimings;
      }

      const elapsedSec = Math.max(0, Math.round((now - questionEnterTimestampRef.current) / 1000));
      const trackedId = lastTrackedQuestionIdRef.current;
      let updatedTimings = baseTimings;
      if (elapsedSec > 0) {
        updatedTimings = {
          ...baseTimings,
          [trackedId]: (baseTimings[trackedId] || 0) + elapsedSec,
        };
        setQuestionTimings(updatedTimings);
      }
      lastTrackedQuestionIdRef.current = currentId;
      questionEnterTimestampRef.current = now;
      return updatedTimings;
    },
    [exam, currentIndex, questionTimings]
  );

  useEffect(() => {
    if (!exam?.questions?.length || examResult) return;
    const current = exam.questions[currentIndex];
    if (!current?._id) return;
    if (!lastTrackedQuestionIdRef.current) {
      lastTrackedQuestionIdRef.current = String(current._id);
      questionEnterTimestampRef.current = Date.now();
      return;
    }
    recordCurrentQuestionDuration();
  }, [exam, currentIndex, examResult, recordCurrentQuestionDuration]);

  const submitExam = useCallback(async () => {
    if (!exam || submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setIsGrading(true);
    setShowExitWarning(false);

    const finalTimings = recordCurrentQuestionDuration();
    const timeTaken = Math.max(0, exam.duration * 60 - timeLeft);
    const payload = {
      examId: exam._id,
      examTitle: exam.title,
      timeTaken,
      answers,
      questionTimings: finalTimings,
    };

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert('Submit Failed', json?.message || 'Could not save exam result.');
        submittedRef.current = false;
        autoSubmitTriggeredRef.current = false;
        setIsGrading(false);
        setIsSubmitting(false);
        return;
      }

      const server = (json?.data || {}) as Record<string, unknown>;
      const merged = mergeExamResult(exam, answers, timeTaken, server, finalTimings);
      setExamResult(merged);
    } catch (error: unknown) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (aborted) {
        Alert.alert(
          'Grading is taking longer than usual',
          'Your result may appear under Attempted Exams shortly. You can check back from the dashboard.',
          [{ text: 'OK', onPress: () => router.replace(dashboardPath) }]
        );
      } else {
        Alert.alert('Error', 'Failed to submit exam. Please try again.');
        submittedRef.current = false;
        autoSubmitTriggeredRef.current = false;
      }
    } finally {
      setIsGrading(false);
      setIsSubmitting(false);
    }
  }, [exam, timeLeft, answers, dashboardPath, router, isSubmitting, recordCurrentQuestionDuration]);

  useEffect(() => {
    if (
      !examInProgress ||
      exitAttempts < MAX_EXIT_ATTEMPTS ||
      autoSubmitTriggeredRef.current ||
      submittedRef.current
    ) {
      return;
    }

    autoSubmitTriggeredRef.current = true;
    const timer = setTimeout(() => {
      void submitExam();
    }, 1200);
    return () => clearTimeout(timer);
  }, [exitAttempts, examInProgress, submitExam]);

  useEffect(() => {
    if (!exam || timeLeft <= 0 || submittedRef.current) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, timeLeft, submitExam]);

  const fetchExam = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exams/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Unavailable', err?.message || 'This exam is not available.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const data = await response.json();
      const examData = data.data || data;
      const questions = Array.isArray(examData.questions) ? examData.questions : [];
      if (!questions.length) {
        Alert.alert('Unavailable', 'No questions uploaded for this exam.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      setExam({ ...examData, questions });
      setTimeLeft((Number(examData.duration) || 60) * 60);
    } catch {
      Alert.alert('Error', 'Failed to load exam.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = exam?.questions[currentIndex];

  const handleSelect = (questionId: string, value: any, multi = false) => {
    if (multi) {
      setAnswers((prev) => {
        const existing = Array.isArray(prev[questionId]) ? [...prev[questionId]] : [];
        const idx = existing.indexOf(value);
        if (idx >= 0) existing.splice(idx, 1);
        else existing.push(value);
        return { ...prev, [questionId]: existing };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
  };

  const confirmSubmit = () => {
    Alert.alert('Submit Exam', 'Are you sure you want to submit? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: () => void submitExam() },
    ]);
  };

  const handleBackToDashboard = () => {
    router.replace(dashboardPath);
  };

  const handleRetakeExam = () => {
    if (!exam) return;
    const maxA = Math.max(1, Number(exam.maxAttempts) || 1);
    const used = Number(examResult?.attemptNumber) >= 1 ? Number(examResult?.attemptNumber) : 1;
    if (used >= maxA) {
      Alert.alert('No Attempts Left', 'You have used all attempts for this exam.');
      return;
    }
    if (exam.endDate && new Date() > new Date(exam.endDate)) {
      Alert.alert('Exam Ended', 'This exam window has ended. Retakes are not available.');
      return;
    }
    submittedRef.current = false;
    autoSubmitTriggeredRef.current = false;
    setExamResult(null);
    setIsGrading(false);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft((Number(exam.duration) || 60) * 60);
    setExitAttempts(0);
    setShowExitWarning(false);
    setQuestionTimings({});
    lastTrackedQuestionIdRef.current = null;
    questionEnterTimestampRef.current = Date.now();
  };

  const attemptsRemaining = exam
    ? Math.max(
        0,
        Math.max(1, Number(exam.maxAttempts) || 1) -
          (Number(examResult?.attemptNumber) >= 1 ? Number(examResult?.attemptNumber) : 1)
      )
    : 0;

  if (isGrading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.gradingTitle}>Grading your exam...</Text>
          <Text style={styles.gradingHint}>This usually takes a few seconds</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (examResult && exam) {
    return (
      <ExamResultsView
        result={examResult}
        examTitle={exam.title}
        onBack={handleBackToDashboard}
        onRetake={handleRetakeExam}
        attemptsRemaining={attemptsRemaining}
      />
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Loading exam...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>No exam data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qText = currentQuestion.questionText || currentQuestion.question || '';
  const qType = currentQuestion.questionType || 'mcq';
  const options = currentQuestion.options || [];
  const maxExitReached = exitAttempts >= MAX_EXIT_ATTEMPTS;

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#ea580c', '#c2410c']} style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.examTitle} numberOfLines={1}>
                {exam.title}
              </Text>
              <Text style={styles.examMeta}>
                Q {currentIndex + 1}/{exam.questions.length} · {formatTime(timeLeft)}
              </Text>
            </View>
            <TouchableOpacity style={styles.headerSubmitBtn} onPress={confirmSubmit} disabled={isSubmitting}>
              <Text style={styles.headerSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / exam.questions.length) * 100}%` },
              ]}
            />
          </View>
          {exitAttempts > 0 ? (
            <Text
              style={[
                styles.exitAttemptsText,
                maxExitReached ? styles.exitAttemptsDanger : styles.exitAttemptsWarn,
              ]}
            >
              Exit attempts: {exitAttempts}/{MAX_EXIT_ATTEMPTS}
            </Text>
          ) : null}
        </LinearGradient>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MathRenderer formula={qText} style={styles.questionText} />

          {qType === 'integer' ? (
            <TextInput
              style={styles.integerInput}
              keyboardType="numeric"
              placeholder="Enter your answer"
              value={String(answers[currentQuestion._id] ?? '')}
              onChangeText={(t) => handleSelect(currentQuestion._id, t)}
            />
          ) : (
            options.map((opt, index) => {
              const label = optionLabel(opt, index);
              const selected =
                qType === 'multiple'
                  ? Array.isArray(answers[currentQuestion._id]) &&
                    answers[currentQuestion._id].includes(label)
                  : answers[currentQuestion._id] === label;
              return (
                <TouchableOpacity
                  key={`${currentQuestion._id}-${index}`}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handleSelect(currentQuestion._id, label, qType === 'multiple')}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={styles.navBtnText}>Previous</Text>
          </TouchableOpacity>

          {currentIndex < exam.questions.length - 1 ? (
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex((i) => i + 1)}>
              <Text style={styles.navBtnText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, styles.submitBtn]}
              onPress={confirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.navBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <Modal visible={showExitWarning} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="warning" size={22} color="#dc2626" />
              <Text style={styles.modalTitle}>Warning: Exit Attempt Detected</Text>
            </View>

            <View style={styles.modalAlertBox}>
              <Text style={styles.modalAttemptText}>
                Attempt {exitAttempts} of {MAX_EXIT_ATTEMPTS}
              </Text>
              <Text style={styles.modalAlertBody}>
                {maxExitReached
                  ? 'Maximum exit attempts reached. Your exam will be auto-submitted.'
                  : `You have ${MAX_EXIT_ATTEMPTS - exitAttempts} attempt(s) remaining before auto-submission.`}
              </Text>
            </View>

            <Text style={styles.modalHint}>
              Please stay on the exam screen. Leaving the exam multiple times will result in automatic
              submission.
            </Text>

            {maxExitReached ? (
              <View style={styles.autoSubmitBox}>
                <ActivityIndicator color="#dc2626" />
                <Text style={styles.autoSubmitText}>Submitting your exam...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => setShowExitWarning(false)}
              >
                <Text style={styles.continueBtnText}>Continue Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 16 },
  gradingTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#111827' },
  gradingHint: { marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  examMeta: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerSubmitBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerSubmitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  exitAttemptsText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  exitAttemptsWarn: { color: '#fef08a' },
  exitAttemptsDanger: { color: '#fecaca' },
  body: { flex: 1 },
  bodyContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  questionText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  option: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  optionSelected: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  optionText: { fontSize: 16, color: '#374151' },
  optionTextSelected: { color: '#c2410c', fontWeight: '700' },
  integerInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  navBtnDisabled: { backgroundColor: '#e5e7eb' },
  submitBtn: { backgroundColor: '#16a34a' },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fca5a5',
    padding: 20,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#dc2626' },
  modalAlertBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  modalAttemptText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalAlertBody: { fontSize: 13, color: '#dc2626', textAlign: 'center', lineHeight: 20 },
  modalHint: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 16 },
  continueBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  autoSubmitBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  autoSubmitText: { fontSize: 14, fontWeight: '700', color: '#b91c1c' },
});
