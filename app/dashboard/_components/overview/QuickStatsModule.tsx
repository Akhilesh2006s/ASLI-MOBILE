import React, { memo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedProps } from 'react-native-reanimated';
import { AnimatedStatInput, useCountUp } from '../../../../src/hooks/useCountUp';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../../../src/theme/student';

interface QuickStatsModuleProps {
  stats: {
    questionsAnswered: number;
    accuracyRate: number;
    rank: number;
  };
  dark?: boolean;
}

function StatValue({
  target,
  suffix = '',
  prefix = '',
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const value = useCountUp(target, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(value.value)}${suffix}`,
  }));

  return (
    <AnimatedStatInput
      animatedProps={animatedProps as never}
      editable={false}
      style={styles.value}
      underlineColorAndroid="transparent"
    />
  );
}

const ITEMS = [
  {
    key: 'questions',
    label: 'Questions Solved',
    icon: 'checkmark-circle' as const,
    gradient: STUDENT.statGradients.questions,
    getTarget: (s: QuickStatsModuleProps['stats']) => s.questionsAnswered,
    suffix: '',
    prefix: '',
  },
  {
    key: 'accuracy',
    label: 'Accuracy Rate',
    icon: 'trending-up' as const,
    gradient: STUDENT.statGradients.accuracy,
    getTarget: (s: QuickStatsModuleProps['stats']) => s.accuracyRate,
    suffix: '%',
    prefix: '',
  },
  {
    key: 'rank',
    label: 'Rank',
    icon: 'bar-chart' as const,
    gradient: STUDENT.statGradients.rank,
    getTarget: (s: QuickStatsModuleProps['stats']) => (s.rank > 0 ? s.rank : 0),
    suffix: '',
    prefix: '#',
    showDash: (s: QuickStatsModuleProps['stats']) => s.rank <= 0,
  },
];

function QuickStatsModuleComponent({ stats }: QuickStatsModuleProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.grid}>
      {ITEMS.map((item, index) => (
        <Animated.View
          key={item.key}
          entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(index * 70)}
          style={styles.cardWrap}
        >
          <LinearGradient
            colors={[...item.gradient]}
            style={[styles.card, compact && styles.cardCompact]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconBubble}>
              <Ionicons name={item.icon} size={compact ? 16 : 18} color={STUDENT.textOnPrimary} />
            </View>
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
              {item.label}
            </Text>
            {'showDash' in item && item.showDash?.(stats) ? (
              <Text style={[styles.value, compact && styles.valueCompact]}>—</Text>
            ) : (
              <StatValue
                target={item.getTarget(stats)}
                suffix={item.suffix}
                prefix={item.prefix}
              />
            )}
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cardWrap: { flex: 1 },
  card: {
    borderRadius: STUDENT_RADIUS.card,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 108,
    justifyContent: 'space-between',
    ...STUDENT.shadow.sm,
  },
  cardCompact: {
    minHeight: 96,
    paddingVertical: 12,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    color: STUDENT.textOnPrimary,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.3,
    padding: 0,
    margin: 0,
  },
  labelCompact: { fontSize: 10 },
  valueCompact: { fontSize: 20 },
});

export default memo(QuickStatsModuleComponent);
