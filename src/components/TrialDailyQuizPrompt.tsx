import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../lib/api-config';
import { STUDENT } from '../theme/student';

type TrialQuiz = {
  _id: string;
  title: string;
  description?: string;
  questionBankSource?: string;
  scheduleType?: string;
};

const SKIP_PREFIXES = ['/auth', '/iq-rank-boost', '/signin', '/onboarding'];

/**
 * After login: prompt trial (and daily-bank) users to take today's class quiz
 * if they have not completed it yet.
 */
export default function TrialDailyQuizPrompt() {
  const pathname = usePathname();
  const [quiz, setQuiz] = useState<TrialQuiz | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      if (SKIP_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) return;
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/student/trial-login-quizzes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const next = list[0] || null;
      if (!next?._id) return;
      setQuiz(next);
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, [pathname]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!quiz) return null;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="trophy" size={28} color="#0284c7" />
          </View>
          <Text style={styles.title}>Today’s Daily Quiz</Text>
          <Text style={styles.subtitle}>{quiz.title}</Text>
          <Text style={styles.body}>
            {quiz.description ||
              '5 fresh questions for your class only — from IQ, reasoning, vocab, maths & science.'}
          </Text>
          <Pressable
            style={styles.primary}
            onPress={() => {
              setOpen(false);
              router.push({
                pathname: '/iq-rank-boost-quiz/[quizId]',
                params: { quizId: quiz._id },
              });
            }}
          >
            <Text style={styles.primaryText}>Start quiz</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => setOpen(false)}>
            <Text style={styles.secondaryText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 22,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: STUDENT.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0284c7',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: STUDENT.textMuted,
    marginBottom: 18,
  },
  primary: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: STUDENT.textMuted, fontWeight: '600', fontSize: 14 },
});
