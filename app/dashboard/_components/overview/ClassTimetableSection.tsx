import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Pressable, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import { GlassPanel } from '../../../../src/components/ui';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';

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

function ClassTimetableSectionComponent() {
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<PhotoPayload | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/timetable/photo`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          setPhoto(null);
          return;
        }
        const data = await res.json();
        setPhoto(data?.data || null);
      } catch {
        setPhoto(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const imageUrl = resolveUrl(photo?.imageUrl);

  return (
    <View style={styles.wrap}>
      <GlassPanel style={styles.gridCard} radius={STUDENT_RADIUS.card} tone="strong">
        <Text style={styles.title}>
          Class Timetable{photo?.label ? ` · ${photo.label}` : ''}
        </Text>
        {loading ? (
          <ActivityIndicator color={STUDENT.accent} style={{ padding: 24 }} />
        ) : imageUrl ? (
          <Pressable onPress={() => Linking.openURL(imageUrl)}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            <Text style={styles.hint}>Tap to open full size</Text>
          </Pressable>
        ) : (
          <Text style={styles.empty}>
            No timetable photo yet. Ask your school admin or teacher to upload it.
          </Text>
        )}
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  gridCard: { padding: 12 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: STUDENT.text,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  empty: {
    paddingVertical: 28,
    textAlign: 'center',
    fontSize: 13,
    color: STUDENT.textMuted,
  },
});

export default memo(ClassTimetableSectionComponent);
