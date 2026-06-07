import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../services/api/api';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';
import GlassCard from './GlassCard';

type Entry = {
  _id: string;
  forDate?: string;
  title?: string;
  content: string;
  classDisplay?: string;
  teacherId?: { fullName?: string };
};

export default function TeacherDiaryFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const res = await fetch(`${API_BASE_URL}/api/student/teacher-work-diary?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setEntries(data.data);
        }
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <GlassCard style={styles.wrap}>
        <Text style={styles.muted}>Loading teacher notes…</Text>
      </GlassCard>
    );
  }

  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="book-outline" size={18} color={STUDENT.primary} />
        <Text style={styles.title}>Teacher Diary</Text>
      </View>
      {entries.map((e) => {
        const open = expanded === e._id;
        const teacher = e.teacherId?.fullName || 'Teacher';
        const preview = e.content?.slice(0, 120) || '';
        return (
          <Pressable key={e._id} onPress={() => setExpanded(open ? null : e._id)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{teacher.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teacher}>{teacher}</Text>
                  <Text style={styles.meta}>
                    {e.classDisplay || 'Class'} ·{' '}
                    {e.forDate ? new Date(e.forDate).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
              </View>
              {e.title ? <Text style={styles.entryTitle}>{e.title}</Text> : null}
              <Text style={styles.preview} numberOfLines={open ? undefined : 3}>
                {open ? e.content : preview}
                {!open && e.content.length > 120 ? '…' : ''}
              </Text>
            </GlassCard>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: STUDENT.text },
  muted: { color: STUDENT.textMuted, textAlign: 'center' },
  card: { marginBottom: 8 },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: STUDENT.text, fontWeight: '800' },
  teacher: { fontWeight: '700', color: STUDENT.text, fontSize: 14 },
  meta: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  entryTitle: { fontWeight: '600', color: STUDENT.accent, marginBottom: 6, fontSize: 13 },
  preview: { fontSize: 13, color: STUDENT.textSecondary, lineHeight: 19 },
});
