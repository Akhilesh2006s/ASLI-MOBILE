import { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, ScrollView, Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  filterVisibleTeacherTools,
  TEACHER_AI_TOOLS_SUBTITLE,
} from '../../../src/lib/teacher-ai-tools';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import AiToolCard from '../../../src/components/ai-tools/AiToolCard';
import GlassSurface from '../../../src/components/ui/GlassSurface';
import { TEACHER_SPACING } from '../../../src/theme/teacher';
import { AI, AI_RADIUS, AI_SPACING, AI_TYPE } from '../../../src/theme/ai';

const CONTENT_MAX = 1080;
const GRID_GAP = TEACHER_SPACING.md;
/** Floating teacher tab bar height + gap so the last tool card is fully visible. */
const TAB_BAR_CLEARANCE = 100;

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function useVidyaAILayout() {
  const { width } = useWindowDimensions();
  const shellWidth = Math.min(width, CONTENT_MAX);
  const listInnerWidth = shellWidth - TEACHER_SPACING.lg * 2;
  const columns = width >= 1040 ? 3 : width >= 700 ? 2 : 1;
  const cardWidth = (listInnerWidth - GRID_GAP * (columns - 1)) / columns;
  return { isGrid: columns > 1, columns, shellWidth, cardWidth };
}

export default function VidyaAIView({ chatEnabled = true }: { chatEnabled?: boolean }) {
  const chatPress = usePressScale();
  const { isGrid, shellWidth, cardWidth } = useVidyaAILayout();
  const scrollBottomPad = TAB_BAR_CLEARANCE + TEACHER_SPACING.lg;
  const [subjectNames, setSubjectNames] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        const names = rows
          .map((subj: any) => String(subj?.name || subj?.displayName || '').trim())
          .filter(Boolean);
        setSubjectNames(names);
      } catch {
        /* optional */
      }
    })();
  }, []);

  const visibleTools = useMemo(
    () => filterVisibleTeacherTools(subjectNames),
    [subjectNames],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.innerShell, { width: shellWidth }]}>
        {chatEnabled ? (
        <Pressable
          onPress={() => router.push('/teacher/vidya-chat' as any)}
          onPressIn={chatPress.onPressIn}
          onPressOut={chatPress.onPressOut}
          accessibilityRole="button"
          accessibilityLabel="Open Vidya AI Chat"
          accessibilityHint="Ask Vidya for classroom and teaching help"
        >
          <Animated.View style={[styles.chatCard, chatPress.style]}>
            <GlassSurface intensity={60} />
            <VidyaAvatar size={48} borderColor="#93c5fd" />
            <View style={styles.chatCardBody}>
              <Text style={styles.chatCardTitle}>Vidya AI Chat</Text>
              <Text style={styles.chatCardDesc}>
                Ask about lessons, quizzes, classroom help, and teaching ideas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={AI.primary} />
          </Animated.View>
        </Pressable>
        ) : null}

        <View style={styles.section}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>TEACHER AI STUDIO</Text>
          </View>
          <Text style={styles.sectionTitle}>Create your next classroom resource</Text>
          <Text style={styles.sectionSubtitle}>{TEACHER_AI_TOOLS_SUBTITLE}</Text>

          <View style={[styles.toolsGrid, isGrid && styles.toolsGridMulti]}>
            {visibleTools.map((tool) => (
              <View key={tool.id} style={{ width: cardWidth }}>
                <AiToolCard
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon as keyof typeof Ionicons.glyphMap}
                  accent={tool.color || AI.primary}
                  badge="Teacher"
                  compact={isGrid}
                  glass
                  onPress={() =>
                    router.push({
                      pathname: tool.route as any,
                      params: { returnTab: 'vidya-ai' },
                    })
                  }
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    alignItems: 'center',
  },
  innerShell: {
    alignSelf: 'center',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    marginHorizontal: TEACHER_SPACING.lg,
    marginTop: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    padding: AI_SPACING.lg,
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  chatCardBody: {
    flex: 1,
  },
  chatCardTitle: {
    ...AI_TYPE.title,
    color: AI.text,
  },
  chatCardDesc: {
    marginTop: 4,
    ...AI_TYPE.caption,
    color: AI.textSecondary,
  },
  section: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: AI_SPACING.sm,
    marginBottom: AI_SPACING.sm,
    borderRadius: AI_RADIUS.full,
    borderWidth: 1,
    borderColor: AI.orangeBorder,
    backgroundColor: AI.orangeSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroBadgeText: {
    ...AI_TYPE.eyebrow,
    color: AI.orange,
  },
  sectionTitle: {
    ...AI_TYPE.hero,
    color: AI.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...AI_TYPE.body,
    color: AI.textSecondary,
    marginBottom: 20,
  },
  toolsGrid: {
    width: '100%',
    gap: GRID_GAP,
  },
  toolsGridMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GRID_GAP,
    rowGap: GRID_GAP,
    gap: 0,
  },
});
