import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_RADIUS, STUDENT_TYPO } from '../../theme/student';
import { AI, AI_RADIUS, AI_TYPE } from '../../theme/ai';
import { GLASS_ROW, GLASS_VIOLET } from '../../theme/glass';
import GlassPanel from '../ui/GlassPanel';

type Props = {
  title: string;
  onBack: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  subtitle?: string;
  /** Larger title/subtitle on tablet tool screens */
  tabletUi?: boolean;
  variant?: 'default' | 'ai';
};

/** Shared liquid-glass header for student tool pages (all AI tools). */
export default function StudentScreenHeader({
  title,
  onBack,
  rightLabel,
  onRightPress,
  subtitle,
  tabletUi,
  variant = 'default',
}: Props) {
  const isAi = variant === 'ai';
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.outer}>
      <GlassPanel
        tone="strong"
        elevated
        colors={[...GLASS_VIOLET]}
        radius={0}
        bordered={false}
        style={[styles.wrap, isAi && styles.wrapAi, tabletUi && styles.wrapTablet]}
        contentStyle={styles.content}
      >
        <View style={styles.row}>
          <Pressable
            style={[styles.backBtn, isAi && styles.backBtnAi]}
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={tabletUi ? 26 : 24} color={isAi ? AI.primary : STUDENT.primaryDark} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, isAi && styles.titleAi, tabletUi && styles.titleTablet]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, isAi && styles.subtitleAi, tabletUi && styles.subtitleTablet]}
                numberOfLines={tabletUi ? 2 : 1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightLabel && onRightPress ? (
            <Pressable style={styles.rightBtn} onPress={onRightPress} accessibilityRole="button">
              <Text style={styles.rightText}>{rightLabel}</Text>
            </Pressable>
          ) : (
            <View style={styles.rightPlaceholder} />
          )}
        </View>
      </GlassPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderBottomLeftRadius: STUDENT_RADIUS.xxl,
    borderBottomRightRadius: STUDENT_RADIUS.xxl,
    overflow: 'hidden',
  },
  wrap: {
    width: '100%',
  },
  wrapTablet: {},
  wrapAi: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AI.primaryBorder,
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AI_RADIUS.sm,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
  },
  backBtnAi: {
    borderColor: AI.primaryBorder,
    backgroundColor: AI.surface,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...STUDENT_TYPO.section,
    color: STUDENT.text,
    textAlign: 'center',
  },
  titleTablet: {
    fontSize: 26,
    lineHeight: 32,
  },
  titleAi: {
    ...AI_TYPE.title,
    color: AI.text,
  },
  subtitle: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  subtitleTablet: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtitleAi: {
    ...AI_TYPE.caption,
    color: AI.textSecondary,
  },
  rightBtn: {
    width: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rightPlaceholder: {
    width: 44,
  },
  rightText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.primaryDark,
  },
});
