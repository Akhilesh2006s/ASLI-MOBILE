import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Image,
  FlatList,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreventRemove } from '@react-navigation/native';
import { API_BASE_URL } from '../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import { getDashboardPath } from '../../src/hooks/useBackNavigation';
import ExamResultsView from '../../src/components/student/ExamResultsView';
import { ExamAnalysisResult } from '../../src/lib/exam-analysis-helpers';
import { normalizeAndFormatExamDisplayText } from '../../src/lib/exam-text-normalize';

const MAX_EXIT_ATTEMPTS = 5;
const PALETTE_COLUMNS = 5;
const PALETTE_PAGE_SIZE = 20;

type Question = {
  _id: string;
  questionText?: string;
  question?: string;
  questionImage?: string;
  questionType?: 'mcq' | 'multiple' | 'integer' | string;
  options?: Array<string | { text: string; isCorrect?: boolean }>;
  marks?: number;
  subject?: string;
};

function answerKey(question: Question | null | undefined): string {
  if (!question?._id) return '';
  return String(question._id);
}

function isAnswerProvided(question: Question, raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  const t = question.questionType || 'mcq';
  if (t === 'multiple') return Array.isArray(raw) && raw.length > 0;
  return String(raw).trim() !== '';
}

function normalizeExamText(value: unknown, subject?: string): string {
  return normalizeAndFormatExamDisplayText(value, subject);
}

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
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [palettePage, setPalettePage] = useState(0);
  const [showQuestionDropdown, setShowQuestionDropdown] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const paletteListRef = useRef<FlatList<number>>(null);
  const [examResult, setExamResult] = useState<ExamAnalysisResult | null>(null);
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const submittedRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const submitExamRef = useRef<() => Promise<void>>(async () => {});
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
    if (submittedRef.current || submitInFlightRef.current || isSubmitting || !exam) return;
    setExitAttempts((prev) => Math.min(prev + 1, MAX_EXIT_ATTEMPTS));
    setShowExitWarning(true);
  }, [exam, isSubmitting]);

  usePreventRemove(examInProgress, () => {
    recordExitAttempt();
  });

  useEffect(() => {
    if (!showQuestionDropdown || !exam?.questions?.length) return;
    const targetPage = Math.floor(currentIndex / PALETTE_PAGE_SIZE);
    setPalettePage(targetPage);
    requestAnimationFrame(() => {
      paletteListRef.current?.scrollToOffset({
        offset: targetPage * screenWidth,
        animated: false,
      });
    });
  }, [showQuestionDropdown, currentIndex, exam?.questions?.length, screenWidth]);

  const scrollToPalettePage = useCallback(
    (page: number) => {
      setPalettePage(page);
      paletteListRef.current?.scrollToOffset({
        offset: page * screenWidth,
        animated: true,
      });
    },
    [screenWidth]
  );

  const palettePageIndexes = useMemo(() => {
    const total = exam?.questions?.length ?? 0;
    if (!total) return [];
    const pageCount = Math.ceil(total / PALETTE_PAGE_SIZE);
    return Array.from({ length: pageCount }, (_, index) => index);
  }, [exam?.questions?.length]);

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
    if (!exam || submittedRef.current || submitInFlightRef.current) return;
    submittedRef.current = true;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setIsGrading(true);
    setShowExitWarning(false);
    setShowQuestionDropdown(false);

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
        submittedRef.current = false;
        autoSubmitTriggeredRef.current = false;
        Alert.alert('Submit Failed', json?.message || 'Could not save exam result.', [
          { text: 'Go to Dashboard', onPress: () => router.replace(dashboardPath) },
        ]);
        return;
      }

      const server = (json?.data || {}) as Record<string, unknown>;
      const merged = mergeExamResult(exam, answers, timeTaken, server, finalTimings);
      setExamResult(merged);
    } catch (error: unknown) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      submittedRef.current = false;
      autoSubmitTriggeredRef.current = false;
      if (aborted) {
        Alert.alert(
          'Grading is taking longer than usual',
          'Your result may appear under Attempted Exams shortly. You can check back from the dashboard.',
          [{ text: 'OK', onPress: () => router.replace(dashboardPath) }]
        );
      } else {
        Alert.alert('Error', 'Failed to submit exam. Please try again.', [
          { text: 'Go to Dashboard', onPress: () => router.replace(dashboardPath) },
        ]);
      }
    } finally {
      submitInFlightRef.current = false;
      setIsGrading(false);
      setIsSubmitting(false);
    }
  }, [exam, timeLeft, answers, dashboardPath, router, recordCurrentQuestionDuration]);

  submitExamRef.current = submitExam;

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
    setShowExitWarning(false);
    setIsGrading(true);
    void submitExamRef.current();
  }, [exitAttempts, examInProgress]);

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
        if (existing.length === 0) {
          const next = { ...prev };
          delete next[questionId];
          return next;
        }
        return { ...prev, [questionId]: existing };
      });
    } else {
      setAnswers((prev) => {
        if (prev[questionId] === value) {
          const next = { ...prev };
          delete next[questionId];
          return next;
        }
        return { ...prev, [questionId]: value };
      });
    }
  };

  const handleClearCurrentAnswer = () => {
    if (!currentQuestion) return;
    const qid = answerKey(currentQuestion);
    if (!qid) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };

  const toggleFlagQuestion = (index: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
    submitInFlightRef.current = false;
    setExamResult(null);
    setIsGrading(false);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft((Number(exam.duration) || 60) * 60);
    setExitAttempts(0);
    setShowExitWarning(false);
    setPalettePage(0);
    setShowQuestionDropdown(false);
    setFlaggedQuestions(new Set());
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
  const currentQid = answerKey(currentQuestion);
  const hasCurrentAnswer = isAnswerProvided(currentQuestion, answers[currentQid]);
  const questionImageUri = currentQuestion.questionImage
    ? currentQuestion.questionImage.startsWith('http')
      ? currentQuestion.questionImage
      : `${API_BASE_URL}${currentQuestion.questionImage}`
    : null;
  const answeredCount = exam.questions.filter((q) =>
    isAnswerProvided(q, answers[answerKey(q)])
  ).length;
  const paletteGap = 8;
  const palettePadding = 16;
  const paletteItemSize = Math.min(
    48,
    Math.floor(
      (screenWidth - palettePadding * 2 - paletteGap * (PALETTE_COLUMNS - 1)) / PALETTE_COLUMNS
    )
  );
  const palettePageCount = palettePageIndexes.length;
  const paletteRowCount =
    palettePageCount > 1
      ? Math.ceil(PALETTE_PAGE_SIZE / PALETTE_COLUMNS)
      : Math.ceil(exam.questions.length / PALETTE_COLUMNS);
  const paletteGridHeight =
    paletteRowCount * paletteItemSize + Math.max(0, paletteRowCount - 1) * paletteGap;

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    setShowQuestionDropdown(false);
  };

  const renderPaletteItem = (q: Question, index: number) => {
    const answered = isAnswerProvided(q, answers[answerKey(q)]);
    const flagged = flaggedQuestions.has(index);
    const isCurrent = index === currentIndex;
    return (
      <TouchableOpacity
        key={answerKey(q) || `q-${index}`}
        style={[
          styles.paletteItem,
          { width: paletteItemSize, height: paletteItemSize },
          isCurrent && styles.paletteItemCurrent,
          !isCurrent && answered && styles.paletteItemAnswered,
          !isCurrent && flagged && styles.paletteItemFlagged,
          !isCurrent && flagged && answered && styles.paletteItemFlaggedAnswered,
        ]}
        onPress={() => goToQuestion(index)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.paletteItemText,
            isCurrent && styles.paletteItemTextCurrent,
            !isCurrent && answered && styles.paletteItemTextAnswered,
            !isCurrent && flagged && styles.paletteItemTextFlagged,
          ]}
        >
          {index + 1}
        </Text>
        {flagged ? (
          <View style={styles.paletteFlagDot}>
            <Ionicons name="flag" size={8} color="#92400e" />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient colors={['#ea580c', '#ea580c']} style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.examTitle} numberOfLines={2}>
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
        </LinearGradient>

        {exitAttempts > 0 ? (
          <View style={styles.exitStrip}>
            <Text
              style={[
                styles.exitAttemptsText,
                maxExitReached ? styles.exitAttemptsDanger : null,
              ]}
            >
              Exit attempts: {exitAttempts}/{MAX_EXIT_ATTEMPTS}
            </Text>
          </View>
        ) : null}

        <View style={styles.navPanel}>
          <View style={styles.navPanelTop}>
            <Text style={styles.navPanelTitle}>Questions</Text>
            <Text style={styles.navPanelMeta}>
              {answeredCount} of {exam.questions.length} answered
            </Text>
          </View>

          <TouchableOpacity
            style={styles.questionDropdown}
            onPress={() => setShowQuestionDropdown(true)}
            activeOpacity={0.85}
          >
            <View style={styles.questionDropdownLeft}>
              <Text style={styles.questionDropdownLabel}>Jump to question</Text>
              <Text style={styles.questionDropdownValue}>
                Question {currentIndex + 1} of {exam.questions.length}
              </Text>
            </View>
            <View style={styles.questionDropdownRight}>
              {hasCurrentAnswer ? (
                <View style={[styles.statusPill, styles.statusPillAnswered]}>
                  <Text style={styles.statusPillTextAnswered}>Answered</Text>
                </View>
              ) : null}
              {flaggedQuestions.has(currentIndex) ? (
                <Ionicons name="flag" size={16} color="#ca8a04" />
              ) : null}
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.questionCard}>
            <View style={styles.questionCardHeader}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberBadgeText}>Q{currentIndex + 1}</Text>
              </View>
              <View style={styles.questionCardActions}>
                <TouchableOpacity
                  style={[
                    styles.flagBtn,
                    flaggedQuestions.has(currentIndex) && styles.flagBtnActive,
                  ]}
                  onPress={() => toggleFlagQuestion(currentIndex)}
                >
                  <Ionicons
                    name={flaggedQuestions.has(currentIndex) ? 'flag' : 'flag-outline'}
                    size={18}
                    color={flaggedQuestions.has(currentIndex) ? '#ca8a04' : '#9ca3af'}
                  />
                </TouchableOpacity>
                {hasCurrentAnswer ? (
                  <TouchableOpacity style={styles.clearBtn} onPress={handleClearCurrentAnswer}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.questionText}>
              {normalizeExamText(qText, currentQuestion.subject)}
            </Text>

            {questionImageUri ? (
              <Image
                source={{ uri: questionImageUri }}
                style={styles.questionImage}
                resizeMode="contain"
              />
            ) : null}

            {qType === 'integer' ? (
              <TextInput
                style={styles.integerInput}
                keyboardType="numeric"
                placeholder="Enter your answer"
                placeholderTextColor="#9ca3af"
                value={String(answers[currentQuestion._id] ?? '')}
                onChangeText={(t) => {
                  if (!t.trim()) {
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[currentQuestion._id];
                      return next;
                    });
                    return;
                  }
                  handleSelect(currentQuestion._id, t);
                }}
              />
            ) : (
              options.map((opt, index) => {
                const label = optionLabel(opt, index);
                const displayLabel = normalizeExamText(label, currentQuestion.subject);
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
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {displayLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.navBtn, styles.prevBtn, currentIndex === 0 && styles.navBtnDisabled]}
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navBtn,
              styles.nextBtn,
              currentIndex >= exam.questions.length - 1 && styles.navBtnDisabled,
            ]}
            disabled={currentIndex >= exam.questions.length - 1}
            onPress={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
          >
            <Text
              style={[
                styles.navBtnText,
                currentIndex >= exam.questions.length - 1 && styles.navBtnTextDisabled,
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal
        visible={showQuestionDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuestionDropdown(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setShowQuestionDropdown(false)}>
          <Pressable style={styles.dropdownSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownSheetTitle}>Select Question</Text>
              <TouchableOpacity onPress={() => setShowQuestionDropdown(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.dropdownSheetSubtitle}>
              {answeredCount} of {exam.questions.length} answered · tap a number to jump
            </Text>

            {palettePageCount > 1 ? (
              <View style={styles.palettePager}>
                {palettePageIndexes.map((pageIndex) => {
                  const start = pageIndex * PALETTE_PAGE_SIZE + 1;
                  const end = Math.min((pageIndex + 1) * PALETTE_PAGE_SIZE, exam.questions.length);
                  const active = palettePage === pageIndex;
                  return (
                    <TouchableOpacity
                      key={`palette-page-${pageIndex}`}
                      style={[styles.palettePagerBtn, active && styles.palettePagerBtnActive]}
                      onPress={() => scrollToPalettePage(pageIndex)}
                    >
                      <Text style={[styles.palettePagerText, active && styles.palettePagerTextActive]}>
                        Q{start}–{end}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.paletteSwipeHint}>Swipe →</Text>
              </View>
            ) : null}

            <FlatList
              ref={paletteListRef}
              data={palettePageIndexes}
              horizontal
              pagingEnabled
              scrollEnabled={palettePageCount > 1}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(pageIndex) => `dropdown-palette-page-${pageIndex}`}
              style={{ height: paletteGridHeight }}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const nextPage = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                if (nextPage >= 0 && nextPage < palettePageCount) {
                  setPalettePage(nextPage);
                }
              }}
              renderItem={({ item: pageIndex }) => {
                const startIndex = pageIndex * PALETTE_PAGE_SIZE;
                const pageQuestions = exam.questions.slice(
                  startIndex,
                  startIndex + PALETTE_PAGE_SIZE
                );
                return (
                  <View style={[styles.palettePage, { width: screenWidth }]}>
                    <View style={[styles.paletteGrid, { gap: paletteGap, minHeight: paletteGridHeight }]}>
                      {pageQuestions.map((q, offset) => renderPaletteItem(q, startIndex + offset))}
                    </View>
                  </View>
                );
              }}
            />

            <View style={styles.dropdownLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotCurrent]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotAnswered]} />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotFlagged]} />
                <Text style={styles.legendText}>Flagged</Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
                <Text style={styles.autoSubmitText}>
                  {isGrading || isSubmitting
                    ? 'Submitting your exam...'
                    : 'Preparing auto-submit...'}
                </Text>
                {!isGrading && !isSubmitting ? (
                  <TouchableOpacity
                    style={styles.forceSubmitBtn}
                    onPress={() => {
                      autoSubmitTriggeredRef.current = true;
                      setShowExitWarning(false);
                      void submitExamRef.current();
                    }}
                  >
                    <Text style={styles.forceSubmitBtnText}>Submit now</Text>
                  </TouchableOpacity>
                ) : null}
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 16 },
  gradingTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#111827' },
  gradingHint: { marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  examTitle: { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 26 },
  examMeta: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 4, fontWeight: '500' },
  headerSubmitBtn: {
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  headerSubmitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  exitStrip: {
    backgroundColor: '#c2410c',
    paddingVertical: 7,
    alignItems: 'center',
  },
  exitAttemptsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  exitAttemptsDanger: { color: '#fecaca' },
  body: { flex: 1, backgroundColor: '#f3f4f6' },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    flexGrow: 1,
  },
  navPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  navPanelTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navPanelTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  navPanelMeta: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  questionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  questionDropdownLeft: { flex: 1, minWidth: 0 },
  questionDropdownLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 2 },
  questionDropdownValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  questionDropdownRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillAnswered: { backgroundColor: '#dcfce7' },
  statusPillTextAnswered: { fontSize: 10, fontWeight: '700', color: '#166534' },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  questionCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionNumberBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  questionNumberBadgeText: { fontSize: 13, fontWeight: '800', color: '#c2410c' },
  flagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  flagBtnActive: { backgroundColor: '#fef9c3' },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 26,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
  },
  option: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  optionSelected: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  optionText: { fontSize: 16, color: '#111827' },
  optionTextSelected: { color: '#c2410c', fontWeight: '700' },
  integerInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtn: { backgroundColor: '#d1d5db' },
  nextBtn: { backgroundColor: '#ea580c' },
  navBtnDisabled: { backgroundColor: '#e5e7eb' },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  navBtnTextDisabled: { color: '#9ca3af' },
  palettePager: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  palettePagerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  palettePagerBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  palettePagerText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  palettePagerTextActive: { color: '#fff' },
  paletteSwipeHint: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginLeft: 'auto' },
  palettePage: {
    paddingHorizontal: 16,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paletteItem: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  paletteItemCurrent: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
    transform: [{ scale: 1.05 }],
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  paletteItemAnswered: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  paletteItemFlagged: {
    backgroundColor: '#fef9c3',
    borderColor: '#facc15',
  },
  paletteItemFlaggedAnswered: {
    backgroundColor: '#fde68a',
    borderColor: '#f59e0b',
  },
  paletteItemText: { fontSize: 13, fontWeight: '700', color: '#4b5563' },
  paletteItemTextCurrent: { color: '#fff' },
  paletteItemTextAnswered: { color: '#166534' },
  paletteItemTextFlagged: { color: '#92400e' },
  paletteFlagDot: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  dropdownSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  dropdownSheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  dropdownSheetSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
  dropdownLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendDotCurrent: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  legendDotAnswered: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  legendDotFlagged: { backgroundColor: '#fef9c3', borderColor: '#facc15' },
  legendText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
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
  autoSubmitBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  autoSubmitText: { fontSize: 14, fontWeight: '700', color: '#b91c1c', textAlign: 'center' },
  forceSubmitBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ea580c',
  },
  forceSubmitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
