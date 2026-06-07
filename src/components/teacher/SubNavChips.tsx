import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

export type ChipItem = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  items: ChipItem[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'students';
};

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function ChipButton({
  item,
  selected,
  onChange,
}: {
  item: ChipItem;
  selected: boolean;
  onChange: (id: string) => void;
}) {
  const press = usePressScale();

  return (
    <Pressable
      onPress={() => onChange(item.id)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={press.style}>
        {selected ? (
          <Animated.View entering={ZoomIn.duration(200)}>
            <LinearGradient
              colors={[TEACHER.primary, TEACHER.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.chip, styles.chipActive]}
            >
              {item.icon ? (
                <Ionicons name={item.icon} size={14} color={TEACHER.textOnPrimary} />
              ) : null}
              <Text style={styles.chipTextActive}>{item.label}</Text>
            </LinearGradient>
          </Animated.View>
        ) : (
          <View style={styles.chip}>
            {item.icon ? (
              <Ionicons name={item.icon} size={14} color={TEACHER.textMuted} />
            ) : null}
            <Text style={styles.chipText}>{item.label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function SubNavChips({ items, active, onChange, variant = 'default' }: Props) {
  const isStudents = variant === 'students';

  const content = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => (
        <ChipButton
          key={item.id}
          item={item}
          selected={item.id === active}
          onChange={onChange}
        />
      ))}
    </ScrollView>
  );

  if (isStudents) {
    return <View style={styles.studentsWrap}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    paddingVertical: TEACHER_SPACING.sm,
    paddingHorizontal: TEACHER_SPACING.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.sm,
    borderRadius: TEACHER_RADIUS.chip,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  chipActive: {
    borderColor: TEACHER.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
  chipTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: TEACHER.textOnPrimary,
  },
  studentsWrap: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    backgroundColor: TEACHER.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
});
