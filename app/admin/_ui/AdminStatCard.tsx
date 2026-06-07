import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  gradientIndex?: number;
  subtext?: string;
  loading?: boolean;
  delay?: number;
};

export default function AdminStatCard({
  label,
  value,
  icon,
  gradientIndex = 0,
  subtext,
  loading,
  delay = 0,
}: Props) {
  const { colors, radius, typo } = useAdminTheme();
  const gradient = colors.statGradients[gradientIndex % colors.statGradients.length];

  const displayValue = loading ? '—' : value;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(450).springify()}
      style={[styles.wrap, { borderRadius: radius.lg }]}
    >
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: radius.lg }]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[typo.stat, styles.value]}>{displayValue}</Text>
          {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: '46%',
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    minHeight: 96,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  textBlock: {
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.3,
  },
  value: {
    color: '#fff',
  },
  subtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});
