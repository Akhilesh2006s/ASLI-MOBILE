import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAdminTheme } from './useAdminTheme';
import AdminScalePressable from './AdminScalePressable';

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AdminFAB({ onPress, icon = 'add' }: Props) {
  const { colors, radius } = useAdminTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, pulseStyle]}>
      <AdminScalePressable onPress={onPress} scaleTo={0.92}>
        <LinearGradient
          colors={[...colors.fabGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, { borderRadius: radius.full }]}
        >
          <Ionicons name={icon} size={26} color="#fff" />
        </LinearGradient>
      </AdminScalePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    zIndex: 50,
  },
  btn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
