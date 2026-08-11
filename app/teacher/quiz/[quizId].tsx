import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackNavigation } from '../../../src/hooks/useBackNavigation';
import api from '../../../src/services/api/api';
import { GlassPanel } from '../../../src/components/ui';

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  subject?: { _id: string; name: string } | string;
}

const LIST_PATH = '/teacher/quiz';
const HEADER_COLORS = ['#0284c7', '#0d9488'] as const;

function resolveCorrectAnswer(question: Question): string {
  if (question.correctAnswer) return String(question.correctAnswer);
  const correct = question.options?.find((o) => o.isCorrect);
  return correct?.text ? String(correct.text) : '';
}

export default function TeacherPlatformQuizTakeScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  useBackNavigation(LIST_PATH, false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState('Quiz');
  const [subjectName, setSubjectName] = useState('');
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

  useEffect(() => {
    if (!quizId) return;
    void (async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/api/teacher/platform-quizzes/${encodeURIComponent(String(quizId))}/questions`);
        const data = res?.data || {};
        const fetched = Array.isArray(data.data) ? data.data : Array.isArray(data.questions) ? data.questions : [];
        setQuestions([...fetched].sort(() => Math.random() - 0.5));
        if (data.quiz?.title) setQuizTitle(String(data.quiz.title));
        const subject = data.quiz?.subject || fetched[0]?.subject;
        if (subject) {
          setSubjectName(typeof subject === 'object' ? subject?.name || '' : '');
        }
      } catch {
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [quizId]);

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
      const subjectId =
        questions[0]?.subject && typeof questions[0].subject === 'object'
          ? questions[0].subject._id
          : questions[0]?.subject;
      await api.post(`/api/teacher/platform-quizzes/${encodeURIComponent(String(quizId))}/result`, {
        quizId,
        subjectId,
        subject: subjectId,
        totalQuestions: questions.length,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        unattempted,
        score,
        answers,
      });
    } catch (error) {
      console.error('Error saving teacher quiz result:', error);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion._id] : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.muted}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isSubmitted && results) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={[...HEADER_COLORS]} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.replace(LIST_PATH)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quiz Results</Text>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.resultsWrap}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{results.score}%</Text>
            <Text style={styles.muted}>Score</Text>
          </View>
          <View style={styles.statsRow}>
            <GlassPanel radius={12} style={styles.statCard}>
              <Text style={styles.statValue}>{results.correct}</Text>
              <Text style={styles.muted}>Correct</Text>
            </GlassPanel>
            <GlassPanel radius={12} style={styles.statCard}>
              <Text style={styles.statValue}>{results.incorrect}</Text>
              <Text style={styles.muted}>Incorrect</Text>
            </GlassPanel>
            <GlassPanel radius={12} style={styles.statCard}>
              <Text style={styles.statValue}>{results.unattempted}</Text>
              <Text style={styles.muted}>Skipped</Text>
            </GlassPanel>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace(LIST_PATH)}>
            <Text style={styles.primaryBtnText}>Back to Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.muted}>No questions available</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace(LIST_PATH)}>
            <Text style={styles.primaryBtnText}>Back to Quiz</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[...HEADER_COLORS]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace(LIST_PATH)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {quizTitle}
            </Text>
            <Text style={styles.headerSub}>
              {subjectName ? `${subjectName} · ` : ''}
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <GlassPanel radius={12} style={{ padding: 16 }}>
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
        </GlassPanel>
        {(currentQuestion.options || []).map((option, index) => {
          const selected = selectedAnswer === option.text;
          return (
            <TouchableOpacity
              key={`${currentQuestion._id}-${index}`}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion._id]: option.text,
                }))
              }
            >
              <View style={[styles.bullet, selected && styles.bulletSelected]}>
                <Text style={[styles.bulletText, selected && { color: '#fff' }]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.text}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={currentQuestionIndex === 0}
          onPress={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
          style={styles.navBtn}
        >
          <Text style={[styles.navText, currentQuestionIndex === 0 && { color: '#94a3b8' }]}>Previous</Text>
        </TouchableOpacity>
        {currentQuestionIndex < questions.length - 1 ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleSubmit()}>
            <Text style={styles.primaryBtnText}>Submit</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: '#64748b', fontSize: 13 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: '#e2e8f0' },
  progressFill: { height: 4, backgroundColor: '#0d9488' },
  questionText: { fontSize: 16, fontWeight: '700', color: '#0f172a', lineHeight: 24 },
  option: {
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
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletSelected: { backgroundColor: '#0284c7' },
  bulletText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
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
  },
  navBtn: { padding: 10 },
  navText: { color: '#0284c7', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  resultsWrap: { padding: 24, alignItems: 'center', gap: 20 },
  scoreCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 34, fontWeight: '900', color: '#0284c7' },
  statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  statCard: { flex: 1, alignItems: 'center', padding: 14, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
});
