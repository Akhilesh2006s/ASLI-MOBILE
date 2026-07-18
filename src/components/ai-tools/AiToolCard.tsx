import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';

type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  badge?: string;
  compact?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export default function AiToolCard({
  title,
  description,
  icon,
  accent = AI.primary,
  badge,
  compact,
  onPress,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint="Opens this AI tool"
    >
      <Animated.View style={[styles.card, compact && styles.cardCompact, style, animatedStyle]}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={[styles.iconBox, { backgroundColor: `${accent}14`, borderColor: `${accent}28` }]}>
          <Ionicons name={icon} size={compact ? 24 : 26} color={accent} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {formatAiToolText(title)}
            </Text>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{formatAiToolText(badge)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.description} numberOfLines={compact ? 3 : 2}>
            {formatAiToolText(description)}
          </Text>
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{formatAiToolText('Open Tool')}</Text>
            <Ionicons name="arrow-forward" size={18} color={AI.primary} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 126,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AI_SPACING.md,
    overflow: 'hidden',
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
    padding: AI_SPACING.lg,
    ...AI_SHADOW,
  },
  cardCompact: {
    minHeight: 194,
    flexDirection: 'column',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderRadius: AI_RADIUS.full,
  },
  iconBox: {
    width: 54,
    height: 54,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: AI_SPACING.sm,
  },
  title: {
    ...AI_TYPE.title,
    flexShrink: 1,
    color: AI.text,
  },
  description: {
    ...AI_TYPE.caption,
    marginTop: AI_SPACING.xs,
    color: AI.textSecondary,
  },
  actionRow: {
    marginTop: AI_SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AI_SPACING.xs,
  },
  actionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: AI.primary,
  },
  badge: {
    borderRadius: AI_RADIUS.full,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: AI.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    ...AI_TYPE.eyebrow,
    color: AI.primaryPressed,
    letterSpacing: 0.3,
  },
});
