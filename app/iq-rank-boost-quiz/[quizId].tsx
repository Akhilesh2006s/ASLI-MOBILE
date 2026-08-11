import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../../src/hooks/useBackNavigation';
import { GlassPanel } from '../../src/components/ui';

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation?: string;
  difficulty: string;
  subject: {
    _id: string;
    name: string;
  } | string;
}

const HEADER_COLORS = ['#0284c7', '#0d9488'] as const;
const LIST_PATH = '/iq-rank-boost-subjects';

function resolveCorrectAnswer(question: Question): string {
  if (question.correctAnswer) return String(question.correctAnswer);
  const correct = question.options?.find((o) => o.isCorrect);
  return correct?.text ? String(correct.text) : '';
}

export default function IQRankBoostQuiz() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState('Quiz');
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
  } | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    if (quizId) {
      void fetchQuiz();
    }
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, [quizId]);

  useBackNavigation(LIST_PATH, false);

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-questions?quizId=${encodeURIComponent(String(quizId))}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const fetched = data.data || data.questions || [];
        const shuffled = [...fetched].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        if (data.quiz?.title) setQuizTitle(String(data.quiz.title));
        const subject = data.quiz?.subject || shuffled[0]?.subject;
        if (subject) {
          setSubjectName(typeof subject === 'object' ? subject?.name || 'Subject' : 'Subject');
        }
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const questionId = questions[currentQuestionIndex]._id;
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleSubmit = async () => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    questions.forEach((question) => {
      const userAnswer = answers[question._id];
      const expected = resolveCorrectAnswer(question);
      if (!userAnswer) unattempted++;
      else if (userAnswer === expected) correct++;
      else incorrect++;
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setResults({ total: questions.length, correct, incorrect, unattempted, score });
    setIsSubmitted(true);

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const subjectId =
        questions.length > 0 && questions[0].subject
          ? typeof questions[0].subject === 'object'
            ? questions[0].subject._id
            : questions[0].subject
          : quizId;

      await fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-result`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          subjectId,
          totalQuestions: questions.length,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          unattempted,
          score,
          answers,
        }),
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion._id] : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isSubmitted && results) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={[...HEADER_COLORS]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.replace(LIST_PATH)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quiz Results</Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreText}>{results.score}%</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>

            <View style={styles.statsGrid}>
              <GlassPanel style={styles.statCard} radius={12}>
                <View style={styles.statCardInner}>
                  <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                  <Text style={styles.statValue}>{results.correct}</Text>
                  <Text style={styles.statLabel}>Correct</Text>
                </View>
              </GlassPanel>
              <GlassPanel style={styles.statCard} radius={12}>
                <View style={styles.statCardInner}>
                  <Ionicons name="close-circle" size={32} color="#ef4444" />
                  <Text style={styles.statValue}>{results.incorrect}</Text>
                  <Text style={styles.statLabel}>Incorrect</Text>
                </View>
              </GlassPanel>
              <GlassPanel style={styles.statCard} radius={12}>
                <View style={styles.statCardInner}>
                  <Ionicons name="alert-circle" size={32} color="#6b7280" />
                  <Text style={styles.statValue}>{results.unattempted}</Text>
                  <Text style={styles.statLabel}>Unattempted</Text>
                </View>
              </GlassPanel>
            </View>

            <TouchableOpacity style={styles.doneButton} onPress={() => router.replace(LIST_PATH)}>
              <Text style={styles.doneButtonText}>Back to Quiz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No questions available</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace(LIST_PATH)}>
            <Text style={styles.doneButtonText}>Back to Quiz</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[...HEADER_COLORS]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(LIST_PATH)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {quizTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {subjectName ? `${subjectName} · ` : ''}
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GlassPanel style={styles.questionCard} radius={12}>
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
        </GlassPanel>

        <View style={styles.optionsList}>
          {(currentQuestion.options || []).map((option, index) => {
            const selected = selectedAnswer === option.text;
            return (
              <TouchableOpacity
                key={`${currentQuestion._id}-${index}`}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => handleAnswerSelect(option.text)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionBullet, selected && styles.optionBulletSelected]}>
                  <Text style={[styles.optionBulletText, selected && styles.optionBulletTextSelected]}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          disabled={currentQuestionIndex === 0}
          onPress={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
        >
          <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? '#94a3b8' : '#0284c7'} />
          <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestionIndex < questions.length - 1 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={() => void handleSubmit()}>
            <Text style={styles.nextButtonText}>Submit</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#64748b' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  emptyText: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  header: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  progressBar: { height: 4, backgroundColor: '#e2e8f0' },
  progressFill: { height: 4, backgroundColor: '#0d9488' },
  content: { flex: 1 },
  questionCard: { margin: 16, padding: 16 },
  questionText: { fontSize: 16, fontWeight: '700', color: '#0f172a', lineHeight: 24 },
  optionsList: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  optionSelected: { borderColor: '#0284c7', backgroundColor: '#e0f2fe' },
  optionBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBulletSelected: { backgroundColor: '#0284c7' },
  optionBulletText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  optionBulletTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  optionTextSelected: { color: '#0c4a6e', fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 12,
  },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8 },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { fontSize: 14, fontWeight: '700', color: '#0284c7' },
  navButtonTextDisabled: { color: '#94a3b8' },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  nextButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  resultsContainer: { padding: 24, alignItems: 'center' },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scoreText: { fontSize: 36, fontWeight: '900', color: '#0284c7' },
  scoreLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 24 },
  statCard: { flex: 1 },
  statCardInner: { alignItems: 'center', padding: 14, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  doneButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignSelf: 'center',
  },
  doneButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
