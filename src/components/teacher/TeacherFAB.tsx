import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_SPACING } from '../../theme/teacher';

export type FabAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

const SPRING = { damping: 14, stiffness: 220 };

function FabActionItem({
  action,
  index,
  progress,
  bottom,
  onSelect,
}: {
  action: FabAction;
  index: number;
  progress: SharedValue<number>;
  bottom: number;
  onSelect: (action: FabAction) => void;
}) {
  const angle = -90 - index * 22;
  const radius = 72 + index * 8;

  const itemStyle = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    const scale = progress.value;
    return {
      opacity: progress.value,
      transform: [
        { translateX: Math.cos(rad) * radius * scale },
        { translateY: Math.sin(rad) * radius * scale },
        { scale: 0.6 + progress.value * 0.4 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.actionWrap, { bottom, right: 20 }, itemStyle]}>
      <Pressable style={styles.actionBtn} onPress={() => onSelect(action)}>
        <Ionicons name={action.icon} size={18} color={TEACHER.text} />
      </Pressable>
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Animated.View>
  );
}

type Props = {
  actions: FabAction[];
  bottomOffset?: number;
};

export default function TeacherFAB({ actions, bottomOffset = 88 }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const progress = useSharedValue(0);
  const bottom = Math.max(insets.bottom, 12) + bottomOffset;

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !open;
    setOpen(next);
    progress.value = withSpring(next ? 1 : 0, SPRING);
  };

  const close = () => {
    setOpen(false);
    progress.value = withTiming(0, { duration: 180 });
  };

  const mainRotate = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  const handleSelect = (action: FabAction) => {
    close();
    action.onPress();
  };

  return (
    <>
      {open ? (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
      ) : null}

      {actions.map((action, index) => (
        <FabActionItem
          key={action.id}
          action={action}
          index={index}
          progress={progress}
          bottom={bottom}
          onSelect={handleSelect}
        />
      ))}

      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.fabWrap, { bottom, right: 20 }, pressed && styles.pressed]}
      >
        <LinearGradient colors={[...TEACHER.fabGradient]} style={styles.fab}>
          <Animated.View style={mainRotate}>
            <Ionicons name={open ? 'close' : 'add'} size={28} color={TEACHER.textOnPrimary} />
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 45,
  },
  fabWrap: {
    position: 'absolute',
    zIndex: 50,
    ...TEACHER.shadow.lg,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  actionWrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 48,
    width: 90,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TEACHER_SPACING.xs,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEACHER.text,
    textAlign: 'center',
  },
});
