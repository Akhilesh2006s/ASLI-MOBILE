import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import GlassCard from '../../../../src/components/student/GlassCard';
import PremiumSectionHeader from '../../../../src/components/student/PremiumSectionHeader';
import { ShimmerCard } from '../../../../src/components/student/StudentShimmer';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';
import { capAdaptiveRecommendationsPerSubject } from '../../../../src/lib/adaptive-learning-helpers';

interface RecommendedItem {
  kind: string;
  _id: string;
  title: string;
  displayType: string;
  topicHint?: string;
  fileUrl?: string;
  navigatePath?: string;
  examId?: string;
  openMode?: string;
}

interface AdaptiveCard {
  subjectId: string;
  subjectName: string;
  progressPercent: number;
  examScorePercent?: number;
  weakTopicCount: number;
  priority: 'High' | 'Medium' | 'Low';
  gapsWithoutContent: string[];
  usesLibraryFallback?: boolean;
  recommendedContent: RecommendedItem[];
}

function parseAdaptivePayload(json: Record<string, unknown>) {
  const root = json as { success?: boolean; data?: unknown };
  let payload = root.data ?? json;
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    const nested = (payload as { data?: { cards?: AdaptiveCard[]; meta?: unknown } }).data;
    if (nested && Array.isArray(nested.cards)) payload = nested;
  }
  const cards = Array.isArray((payload as { cards?: AdaptiveCard[] })?.cards)
    ? (payload as { cards: AdaptiveCard[] }).cards
    : [];
  const meta =
    payload && typeof payload === 'object' && 'meta' in payload
      ? (payload as { meta?: Record<string, unknown> }).meta
      : undefined;
  return { cards, meta };
}

function priorityStyle(priority: string) {
  if (priority === 'High') return { bg: `${STUDENT.danger}18`, text: STUDENT.danger, border: `${STUDENT.danger}33` };
  if (priority === 'Medium') return { bg: `${STUDENT.warning}18`, text: STUDENT.warning, border: `${STUDENT.warning}33` };
  return { bg: STUDENT.surfaceHover, text: STUDENT.textSecondary, border: STUDENT.surfaceBorder };
}

function typeStyle(displayType: string) {
  const d = displayType.toLowerCase();
  if (d === 'video') return { bg: `${STUDENT.accent}18`, text: STUDENT.accent };
  if (d === 'pdf') return { bg: `${STUDENT.danger}18`, text: STUDENT.danger };
  if (d === 'practice') return { bg: `${STUDENT.warning}18`, text: STUDENT.warning };
  return { bg: STUDENT.surfaceHover, text: STUDENT.textSecondary };
}

function getSubjectIcon(name: string): keyof typeof Ionicons.glyphMap {
  const n = (name || '').toLowerCase();
  if (n.includes('math')) return 'calculator-outline';
  if (n.includes('physics')) return 'planet-outline';
  if (n.includes('chem')) return 'flask-outline';
  if (n.includes('bio')) return 'leaf-outline';
  return 'book-outline';
}

function resolveFileUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

function AdaptiveLearningModuleComponent({ dark }: { dark?: boolean }) {
  const [cards, setCards] = useState<AdaptiveCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdaptive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setCards([]);
        setError('Sign in to load adaptive recommendations.');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/student/adaptive-learning`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to load adaptive learning');
      const json = await response.json();
      const payload = parseAdaptivePayload(json);
      setCards(payload.cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recommendations');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdaptive();
  }, [fetchAdaptive]);

  const openResource = async (item: RecommendedItem) => {
    const mode = item.openMode || 'url';
    if (mode === 'navigate' && item.navigatePath) {
      router.push(item.navigatePath as any);
      return;
    }
    const url = item.fileUrl;
    if (!url) return;
    const fullUrl = resolveFileUrl(url);
    const isVideo =
      item.displayType?.toLowerCase() === 'video' ||
      fullUrl.includes('youtube') ||
      fullUrl.includes('youtu.be');
    if (isVideo && item._id) {
      router.push({ pathname: '/video-player', params: { videoId: item._id } });
      return;
    }
    await WebBrowser.openBrowserAsync(fullUrl);
  };

  return (
    <GlassCard variant="gradient" padding={14} style={dark ? styles.darkWrap : undefined}>
      <PremiumSectionHeader
        title="Adaptive Learning"
        subtitle="Personalized resources from your performance — only content available in your library"
        icon="bulb-outline"
        accent={STUDENT.accent}
        badge="AI Powered"
      />

      {loading ? (
        <ShimmerCard />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={STUDENT.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAdaptive}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>No adaptive recommendations yet.</Text>
          <Text style={styles.emptySub}>
            Attempt exams so we can infer weak chapters and map them to your class library.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.cardsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {cards.map((rec) => {
            const examScore = rec.examScorePercent ?? rec.progressPercent;
            const pri = priorityStyle(rec.priority);
            const displayContent = capAdaptiveRecommendationsPerSubject(rec.recommendedContent ?? []);
            return (
              <View key={rec.subjectId} style={styles.subjectCard}>
                <View style={styles.subjectTop}>
                  <LinearGradient colors={[STUDENT.accent, STUDENT.primary]} style={styles.subjectIcon}>
                    <Ionicons name={getSubjectIcon(rec.subjectName)} size={16} color={STUDENT.textOnPrimary} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{rec.subjectName}</Text>
                    <Text style={styles.subjectMeta}>
                      Exam score {Math.round(examScore)}% · Weak topics: {rec.weakTopicCount}
                    </Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, examScore)}%` }]} />
                    </View>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: pri.bg, borderColor: pri.border }]}>
                    <Text style={[styles.priorityText, { color: pri.text }]}>
                      PRIORITY: {rec.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {displayContent.length > 0 ? (
                  <>
                    <Text style={styles.recLabel}>
                      {rec.usesLibraryFallback ? 'RECOMMENDED FROM YOUR LIBRARY' : 'RECOMMENDED FOR YOUR WEAK AREAS'}
                    </Text>
                    {displayContent.map((item) => {
                      const ts = typeStyle(item.displayType);
                      const actionLabel =
                        item.kind === 'quiz' || item.kind === 'exam'
                          ? 'Open'
                          : item.displayType?.toLowerCase() === 'pdf'
                            ? 'View only'
                            : item.displayType?.toLowerCase() === 'video'
                              ? 'Watch'
                              : 'View';
                      return (
                        <TouchableOpacity
                          key={`${item.kind}-${item._id}`}
                          style={styles.recRow}
                          onPress={() => openResource(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="document-text-outline" size={16} color={STUDENT.accent} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            {item.topicHint && item.topicHint !== 'From your library' ? (
                              <Text style={styles.recHint} numberOfLines={1}>
                                Focus: {item.topicHint}
                              </Text>
                            ) : null}
                          </View>
                          <View style={[styles.typeBadge, { backgroundColor: ts.bg }]}>
                            <Text style={[styles.typeBadgeText, { color: ts.text }]}>{item.displayType}</Text>
                          </View>
                          <Text style={styles.actionLabel}>{actionLabel}</Text>
                          <Ionicons name="chevron-forward" size={14} color={STUDENT.textMuted} />
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <Text style={styles.mutedSmall}>No library content available for this subject yet.</Text>
                )}

                {rec.gapsWithoutContent?.length > 0 ? (
                  <View style={styles.gapBox}>
                    <Text style={styles.gapTitle}>No matching library items</Text>
                    {rec.gapsWithoutContent.slice(0, 3).map((topic) => (
                      <Text key={topic} style={styles.gapItem}>
                        No content for: {topic}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  darkWrap: { opacity: 0.95 },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  muted: { fontSize: 13, color: STUDENT.textMuted, textAlign: 'center' },
  mutedSmall: { fontSize: 12, color: STUDENT.textMuted, fontStyle: 'italic' },
  errorText: { fontSize: 13, color: STUDENT.danger, textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700', color: STUDENT.accent },
  emptyBox: {
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.inner,
    padding: 16,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  emptySub: { fontSize: 12, color: STUDENT.textMuted, textAlign: 'center', marginTop: 6 },
  cardsScroll: { maxHeight: 420 },
  subjectCard: {
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.inner,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  subjectTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontSize: 15, fontWeight: '800', color: STUDENT.text },
  subjectMeta: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  progressBar: {
    height: 4,
    backgroundColor: STUDENT.surfaceBorder,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: STUDENT.primary,
    borderRadius: 2,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  priorityText: { fontSize: 9, fontWeight: '800' },
  recLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: STUDENT.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: STUDENT.surfaceBorder,
  },
  recTitle: { fontSize: 13, fontWeight: '600', color: STUDENT.text },
  recHint: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  actionLabel: { fontSize: 10, fontWeight: '700', color: STUDENT.accent },
  gapBox: {
    marginTop: 8,
    backgroundColor: `${STUDENT.warning}12`,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: `${STUDENT.warning}33`,
  },
  gapTitle: { fontSize: 9, fontWeight: '800', color: STUDENT.warning, marginBottom: 4 },
  gapItem: { fontSize: 11, color: STUDENT.warning },
});

export default memo(AdaptiveLearningModuleComponent);
