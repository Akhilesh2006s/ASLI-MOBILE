import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';

type Chip = { id: string; label: string };

type Props = {
  chips: Chip[];
  active: string;
  onChange: (id: string) => void;
};

const PRESS_SPRING = { damping: 15, stiffness: 260 };

function ChipItem({
  chip,
  active,
  onChange,
}: {
  chip: Chip;
  active: boolean;
  onChange: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => onChange(chip.id)}
      onPressIn={() => {
        scale.value = withSpring(0.95, PRESS_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, PRESS_SPRING);
      }}
    >
      <Animated.View style={animStyle}>
        {active ? (
          <LinearGradient
            colors={[STUDENT.primary, STUDENT.primaryDark]}
            style={styles.chip}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.text, styles.textActive]}>{chip.label}</Text>
          </LinearGradient>
        ) : (
          <Animated.View style={styles.chipInactive}>
            <Text style={styles.text}>{chip.label}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function ChipNav({ chips, active, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => (
        <ChipItem
          key={chip.id}
          chip={chip}
          active={chip.id === active}
          onChange={onChange}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: STUDENT_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInactive: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.surface,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: STUDENT.textMuted,
  },
  textActive: {
    color: STUDENT.textOnPrimary,
  },
});
