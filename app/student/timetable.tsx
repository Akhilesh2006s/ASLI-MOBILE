import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { EmptyState, ErrorState, GlassPanel, LoadingState } from '../../src/components/ui';
import StudentScreenHeader from '../../src/components/student/StudentScreenHeader';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING } from '../../src/theme/student';

type PhotoPayload = {
  label?: string;
  imageUrl?: string;
};

function resolveUrl(imageUrl?: string): string {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

export default function StudentTimetable() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<PhotoPayload | null>(null);

  useBackNavigation('/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setError('Please sign in again.');
        setPhoto(null);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/timetable/photo`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        setPhoto(null);
        setError('Could not load timetable photo.');
        return;
      }
      const data = await res.json();
      setPhoto(data?.data || null);
    } catch {
      setError('Could not load timetable photo.');
      setPhoto(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const imageUrl = resolveUrl(photo?.imageUrl);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StudentScreenHeader
        title={photo?.label ? `Timetable · ${photo.label}` : 'Class Timetable'}
        subtitle="Photo from your school"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
        ) : imageUrl ? (
          <GlassPanel style={styles.card} radius={STUDENT_RADIUS.card} tone="strong">
            <Pressable onPress={() => Linking.openURL(imageUrl)}>
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
              <Text style={styles.hint}>Tap to open full size</Text>
            </Pressable>
          </GlassPanel>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No timetable photo"
            subtitle="Ask your school admin or teacher to upload the class timetable photo."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STUDENT.bg },
  content: { padding: STUDENT_SPACING.md, paddingBottom: 40 },
  card: { padding: 12 },
  image: {
    width: '100%',
    height: 420,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: STUDENT.textMuted,
  },
});
