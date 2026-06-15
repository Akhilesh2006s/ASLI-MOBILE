import { Text, StyleSheet, ScrollView, Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { TEACHER_AI_TOOLS, TEACHER_AI_TOOLS_SUBTITLE } from '../../../src/lib/teacher-ai-tools';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

const CONTENT_MAX = 1080;
const GRID_GAP = TEACHER_SPACING.md;
const TABLET_CARD_HEIGHT = 196;
/** Floating teacher tab bar height + gap so the last tool card is fully visible. */
const TAB_BAR_CLEARANCE = 100;

const TOOL_THEMES: Record<string, { bg: string; border: string; iconBg: string }> = {
  '#ea580c': { bg: '#FFF7ED', border: '#FDBA74', iconBg: '#FFEDD5' },
  '#2563eb': { bg: '#EFF6FF', border: '#93C5FD', iconBg: '#DBEAFE' },
  '#0d9488': { bg: '#F0FDFA', border: '#5EEAD4', iconBg: '#CCFBF1' },
  '#d97706': { bg: '#FFFBEB', border: '#FCD34D', iconBg: '#FEF3C7' },
  '#7c3aed': { bg: '#F5F3FF', border: '#C4B5FD', iconBg: '#EDE9FE' },
  '#db2777': { bg: '#FDF2F8', border: '#F9A8D4', iconBg: '#FCE7F3' },
};

function getToolTheme(color: string) {
  return TOOL_THEMES[color] ?? { bg: '#F8FAFC', border: '#E2E8F0', iconBg: `${color}18` };
}

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

  // Single-column list on all screen sizes (including digital boards).
  return { isGrid: false, columns: 1, shellWidth, cardWidth: listInnerWidth };
}

function ToolCard({
  tool,
  width,
  variant,
}: {
  tool: (typeof TEACHER_AI_TOOLS)[number];
  width: number;
  variant: 'list' | 'grid';
}) {
  const press = usePressScale();
  const theme = getToolTheme(tool.color);
  const isGrid = variant === 'grid';

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: tool.route as any,
          params: { returnTab: 'vidya-ai' },
        })
      }
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={{ width }}
    >
      <Animated.View
        style={[
          isGrid ? styles.toolCardGrid : styles.toolCardList,
          {
            width,
            backgroundColor: theme.bg,
            borderColor: theme.border,
            borderLeftColor: tool.color,
          },
          press.style,
        ]}
      >
        <View style={[styles.toolIcon, { backgroundColor: theme.iconBg }]}>
          <Ionicons
            name={tool.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={tool.color}
          />
        </View>

        <View style={isGrid ? styles.toolBodyGrid : styles.toolBodyList}>
          <Text style={styles.toolTitle} numberOfLines={2}>
            {tool.title}
          </Text>
          <Text style={styles.toolDescription} numberOfLines={isGrid ? 3 : 2}>
            {tool.description}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={tool.color}
          style={isGrid ? styles.toolChevronGrid : styles.toolChevronList}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function VidyaAIView() {
  const chatPress = usePressScale();
  const { isGrid, shellWidth, cardWidth } = useVidyaAILayout();
  const scrollBottomPad = TAB_BAR_CLEARANCE + TEACHER_SPACING.lg;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.innerShell, { width: shellWidth }]}>
        <Pressable
          onPress={() => router.push('/teacher/vidya-chat' as any)}
          onPressIn={chatPress.onPressIn}
          onPressOut={chatPress.onPressOut}
        >
          <Animated.View style={[styles.chatCard, chatPress.style]}>
            <VidyaAvatar size={48} borderColor="#93c5fd" />
            <View style={styles.chatCardBody}>
              <Text style={styles.chatCardTitle}>Vidya AI Chat</Text>
              <Text style={styles.chatCardDesc}>
                Ask about lessons, quizzes, classroom help, and teaching ideas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEACHER.primaryDark} />
          </Animated.View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Tools</Text>
          <Text style={styles.sectionSubtitle}>{TEACHER_AI_TOOLS_SUBTITLE}</Text>

          <View style={[styles.toolsGrid, isGrid && styles.toolsGridMulti]}>
            {TEACHER_AI_TOOLS.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                width={cardWidth}
                variant={isGrid ? 'grid' : 'list'}
              />
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
    backgroundColor: TEACHER.bg,
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
    padding: TEACHER_SPACING.lg,
    ...glassCard,
  },
  chatCardBody: {
    flex: 1,
  },
  chatCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEACHER.text,
  },
  chatCardDesc: {
    marginTop: 4,
    fontSize: 13,
    color: TEACHER.textMuted,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.sm,
  },
  sectionTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: TEACHER.textMuted,
    marginBottom: 20,
    lineHeight: 20,
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
  toolCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    padding: TEACHER_SPACING.lg,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    minHeight: 96,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  toolCardGrid: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    height: TABLET_CARD_HEIGHT,
    padding: TEACHER_SPACING.lg,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  toolBodyList: {
    flex: 1,
    minWidth: 0,
  },
  toolBodyGrid: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    marginTop: TEACHER_SPACING.md,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEACHER.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  toolDescription: {
    fontSize: 13,
    color: TEACHER.textMuted,
    lineHeight: 18,
  },
  toolChevronList: {
    opacity: 0.55,
    flexShrink: 0,
  },
  toolChevronGrid: {
    opacity: 0.55,
    alignSelf: 'flex-end',
  },
});
