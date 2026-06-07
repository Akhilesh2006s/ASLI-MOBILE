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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import { useBackNavigation, getDashboardPath } from '../../src/hooks/useBackNavigation';
import MathRenderer from '../../src/components/MathRenderer';

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
  questions: Question[];
};

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
  const [dashboardPath, setDashboardPath] = useState('/dashboard');
  const submittedRef = useRef(false);

  useEffect(() => {
    if (id) fetchExam();
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, [id]);

  useBackNavigation(dashboardPath, false);

  const submitExam = useCallback(async () => {
    if (!exam || submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    const timeTaken = Math.max(0, exam.duration * 60 - timeLeft);
    const payload = {
      examId: exam._id,
      examTitle: exam.title,
      timeTaken,
      answers,
    };

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert('Submit Failed', json?.message || 'Could not save exam result.');
        submittedRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const result = json?.data || {};
      const pct = Math.round(Number(result.percentage) || 0);
      Alert.alert(
        'Exam Submitted',
        `Score: ${pct}% (${result.correctAnswers ?? 0}/${result.totalQuestions ?? exam.questions.length} correct)`,
        [{ text: 'OK', onPress: () => router.replace(dashboardPath) }]
      );
    } catch {
      Alert.alert('Error', 'Failed to submit exam. Please try again.');
      submittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [exam, timeLeft, answers, dashboardPath, router, isSubmitting]);

  useEffect(() => {
    if (!exam || timeLeft <= 0) return;
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#ea580c', '#c2410c']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.examTitle} numberOfLines={1}>{exam.title}</Text>
            <Text style={styles.examMeta}>
              Q {currentIndex + 1}/{exam.questions.length} · {formatTime(timeLeft)}
            </Text>
          </View>
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
            onPress={() => {
              Alert.alert('Submit Exam', 'Submit your answers?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: () => void submitExam() },
              ]);
            }}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 16 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 4 },
  examTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  examMeta: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
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
});
