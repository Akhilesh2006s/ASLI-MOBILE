import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../theme/student';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  delay?: number;
  right?: React.ReactNode;
};

export default function PremiumSectionHeader({
  title,
  subtitle,
  icon,
  accent = STUDENT.primary,
  delay = 0,
  right,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}
      style={styles.wrap}
    >
      <View style={styles.left}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={icon} size={18} color={accent} />
          </View>
        ) : null}
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: STUDENT_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: STUDENT.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: STUDENT.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
});
