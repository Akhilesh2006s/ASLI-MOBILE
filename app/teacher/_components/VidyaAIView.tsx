import { Text, StyleSheet, ScrollView, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { TEACHER_AI_TOOLS, TEACHER_AI_TOOLS_SUBTITLE } from '../../../src/lib/teacher-ai-tools';
import { TEACHER, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function ToolCard({ tool }: { tool: (typeof TEACHER_AI_TOOLS)[number] }) {
  const press = usePressScale();
  return (
    <Pressable
      onPress={() => router.push(tool.route as any)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[styles.toolCard, press.style]}>
        <LinearGradient colors={[tool.color + '30', tool.color + '10']} style={styles.toolIcon}>
          <Ionicons
            name={tool.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={tool.color}
          />
        </LinearGradient>
        <View style={styles.toolBody}>
          <Text style={styles.toolTitle}>{tool.title}</Text>
          <Text style={styles.toolDescription}>{tool.description}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function VidyaAIView() {
  const chatPress = usePressScale();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <LinearGradient colors={[TEACHER.primary + '40', TEACHER.primaryDark + '20']} style={styles.headerIcon}>
          <Ionicons name="sparkles" size={28} color={TEACHER.primaryDark} />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vidya AI</Text>
          <Text style={styles.headerSubtitle}>AI-powered teaching assistant</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/teacher/vidya-chat' as any)}
        onPressIn={chatPress.onPressIn}
        onPressOut={chatPress.onPressOut}
      >
        <Animated.View style={[styles.chatCard, chatPress.style]}>
          <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.chatCardIcon}>
            <Ionicons name="chatbubbles" size={22} color="#fff" />
          </LinearGradient>
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

        <View style={styles.toolsGrid}>
          {TEACHER_AI_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
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
    paddingBottom: 120,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TEACHER_SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    gap: 12,
    backgroundColor: TEACHER.bg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEACHER.textMuted,
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
  chatCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
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
    gap: TEACHER_SPACING.md,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: TEACHER_SPACING.md,
    ...glassCard,
    padding: TEACHER_SPACING.lg,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  toolBody: {
    flex: 1,
    minWidth: 0,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEACHER.text,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 13,
    color: TEACHER.textMuted,
    lineHeight: 18,
  },
});
