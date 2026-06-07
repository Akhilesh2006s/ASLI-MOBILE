import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from '../../../../src/lib/api-config';

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
  if (priority === 'High') return { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' };
  if (priority === 'Medium') return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
}

function typeStyle(displayType: string) {
  const d = displayType.toLowerCase();
  if (d === 'video') return { bg: '#ede9fe', text: '#6d28d9' };
  if (d === 'pdf') return { bg: '#fee2e2', text: '#b91c1c' };
  if (d === 'practice') return { bg: '#ffedd5', text: '#c2410c' };
  return { bg: '#f3f4f6', text: '#374151' };
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
    <View style={[dark ? styles.sectionCardDark : styles.sectionCard, styles.gradientBorder]}>
      <View style={styles.headerBlock}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={['#9333ea', '#2563eb']} style={styles.brainIcon}>
            <Ionicons name="bulb-outline" size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Adaptive Learning</Text>
            <Text style={styles.subtitle}>
              Personalized resources from your performance — only content available in your library
            </Text>
          </View>
        </View>
        <LinearGradient colors={['#a855f7', '#3b82f6']} style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color="#fff" />
          <Text style={styles.aiBadgeText}>AI Powered</Text>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#9333ea" />
          <Text style={styles.muted}>Analyzing your weak topics…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
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
            return (
              <View key={rec.subjectId} style={styles.subjectCard}>
                <View style={styles.subjectTop}>
                  <LinearGradient colors={['#a855f7', '#3b82f6']} style={styles.subjectIcon}>
                    <Ionicons name={getSubjectIcon(rec.subjectName)} size={16} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{rec.subjectName}</Text>
                    <Text style={styles.subjectMeta}>
                      Exam score {Math.round(examScore)}% · Weak topics: {rec.weakTopicCount}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: pri.bg, borderColor: pri.border }]}>
                    <Text style={[styles.priorityText, { color: pri.text }]}>
                      PRIORITY: {rec.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {rec.recommendedContent?.length > 0 ? (
                  <>
                    <Text style={styles.recLabel}>
                      📖 {rec.usesLibraryFallback ? 'RECOMMENDED FROM YOUR LIBRARY' : 'RECOMMENDED FOR YOUR WEAK AREAS'}
                    </Text>
                    {rec.recommendedContent.map((item) => {
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
                          <Ionicons name="document-text-outline" size={16} color="#7c3aed" />
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
                          <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#e9d5ff',
  },
  sectionCardDark: {
    backgroundColor: 'rgba(88,28,135,0.15)',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  gradientBorder: {},
  headerBlock: { marginBottom: 12, gap: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  brainIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 17 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  aiBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  muted: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  mutedSmall: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  errorText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  emptyBox: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  emptySub: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
  cardsScroll: { maxHeight: 420 },
  subjectCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  subjectTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  subjectMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
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
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  recTitle: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  recHint: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  actionLabel: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },
  gapBox: {
    marginTop: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  gapTitle: { fontSize: 9, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  gapItem: { fontSize: 11, color: '#b45309' },
});

export default memo(AdaptiveLearningModuleComponent);
