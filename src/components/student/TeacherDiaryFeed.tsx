import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../services/api/api';
import { STUDENT, STUDENT_TYPO } from '../../theme/student';
import GlassCard from './GlassCard';
import { ShimmerCard } from './StudentShimmer';
import PremiumSectionHeader from './PremiumSectionHeader';

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
    return <ShimmerCard style={styles.wrap} />;
  }

  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <PremiumSectionHeader title="Teacher Diary" icon="book-outline" accent={STUDENT.primary} />
      {entries.map((e, index) => {
        const open = expanded === e._id;
        const teacher = e.teacherId?.fullName || 'Teacher';
        const preview = e.content?.slice(0, 120) || '';
        return (
          <Animated.View key={e._id} entering={FadeInDown.duration(320).delay(index * 60)}>
            <Pressable
              onPress={() => setExpanded(open ? null : e._id)}
              accessibilityRole="button"
              accessibilityLabel={`Diary entry from ${teacher}`}
              accessibilityHint={open ? 'Collapse entry' : 'Expand entry'}
              accessibilityState={{ expanded: open }}
            >
              <GlassCard variant="glass" style={styles.card}>
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
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  card: { marginBottom: 8 },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${STUDENT.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: STUDENT.text, fontWeight: '800' },
  teacher: { fontWeight: '700', color: STUDENT.text, fontSize: 14 },
  meta: { ...STUDENT_TYPO.label, color: STUDENT.textMuted, marginTop: 2 },
  entryTitle: { fontWeight: '600', color: STUDENT.accent, marginBottom: 6, fontSize: 13 },
  preview: { fontSize: 13, color: STUDENT.textSecondary, lineHeight: 19 },
});
