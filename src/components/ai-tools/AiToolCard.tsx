import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';
import GlassSurface from '../ui/GlassSurface';

type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  badge?: string;
  compact?: boolean;
  /** Frosted-glass card: translucent + blurred instead of a solid white surface. */
  glass?: boolean;
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
  glass = true,
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
      <Animated.View
        style={[
          styles.card,
          compact && styles.cardCompact,
          glass && styles.cardGlassShell,
          { borderColor: accent },
          style,
          animatedStyle,
        ]}
      >
        {glass ? <GlassSurface intensity={55} tone="strong" /> : null}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: accent, borderColor: accent },
          ]}
        >
          <Ionicons name={icon} size={compact ? 24 : 26} color="#FFFFFF" />
        </View>
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {formatAiToolText(title)}
            </Text>
            {badge ? (
              <View style={styles.badge}>
                {/*
                  Keep badge raw (no title-case transform). Android often under-measures
                  bold + letterSpacing and clips "Teacher" → "Teache"; trailing NBSP +
                  zero letterSpacing fixes the layout width.
                */}
                <Text
                  style={styles.badgeText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  android_hyphenationFrequency="none"
                >
                  {`${String(badge).trim()}\u00A0`}
                </Text>
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
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: 'transparent',
    padding: AI_SPACING.lg,
    ...AI_SHADOW,
  },
  cardCompact: {
    minHeight: 194,
    flexDirection: 'column',
  },
  cardGlassShell: {
    backgroundColor: 'transparent',
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
  titleBlock: {
    gap: AI_SPACING.xs,
    alignItems: 'flex-start',
  },
  title: {
    ...AI_TYPE.title,
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
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderRadius: AI_RADIUS.full,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: AI.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: AI.primaryPressed,
    letterSpacing: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
