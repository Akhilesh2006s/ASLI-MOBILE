import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VideoCardProps {
  title: string;
  description?: string;
  subjectName?: string;
  durationText: string;
  views?: number;
  watchProgress?: number;
  isBookmarked: boolean;
  isYouTubeVideo?: boolean;
  onPress: () => void;
  onToggleBookmark: () => void;
}

function VideoCardComponent({
  title,
  description,
  subjectName,
  durationText,
  views = 0,
  watchProgress = 0,
  isBookmarked,
  isYouTubeVideo,
  onPress,
  onToggleBookmark,
}: VideoCardProps) {
  const progress = Math.max(0, Math.min(1, watchProgress || 0));

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      android_ripple={{ color: '#e2e8f0' }}
      onPress={onPress}
    >
      <View style={styles.thumbnail}>
        <Ionicons
          name={isYouTubeVideo ? 'logo-youtube' : 'play-circle'}
          size={34}
          color={isYouTubeVideo ? '#ef4444' : '#1d4ed8'}
        />
        <Pressable onPress={onToggleBookmark} style={styles.bookmark} hitSlop={10}>
          <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color="#ffffff" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subjectName || description || 'Video lecture'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{durationText}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{views} views</Text>
        </View>
        {progress > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  thumbnail: {
    width: 110,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bookmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 21,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748b',
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  dot: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  progressTrack: {
    marginTop: 8,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
});

export default memo(VideoCardComponent);
