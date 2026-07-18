import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../../theme';

type Props = {
  title?: string;
  subtitle?: string;
  gradient?: readonly [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export default function PremiumCard({
  title,
  subtitle,
  gradient,
  icon,
  children,
  onPress,
  style,
}: Props) {
  const content = (
    <View style={[styles.card, style]}>
      {gradient && title ? (
        <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color={COLORS.textInverse} />
            </View>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </LinearGradient>
      ) : title ? (
        <View style={styles.plainHeader}>
          {icon ? <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.plainIcon} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.plainTitle}>{title}</Text>
            {subtitle ? <Text style={styles.plainSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.textInverse,
  },
  headerSubtitle: {
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  plainIcon: {
    marginRight: SPACING.md,
  },
  plainTitle: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.text,
  },
  plainSubtitle: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  body: {
    padding: SPACING.lg,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
