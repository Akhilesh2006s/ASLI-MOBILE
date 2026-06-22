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
  /** Shorter horizontal layout for tablet stat rows */
  compact?: boolean;
  /** Two-column mobile stat grid (default when not compact) */
  grid?: boolean;
};

export default function AdminStatCard({
  label,
  value,
  icon,
  gradientIndex = 0,
  subtext,
  loading,
  delay = 0,
  compact = false,
  grid = !compact,
}: Props) {
  const { colors, radius, typo } = useAdminTheme();
  const gradient = colors.statGradients[gradientIndex % colors.statGradients.length];

  const displayValue = loading ? '—' : value;
  const horizontal = compact || grid;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(450).springify()}
      style={[
        styles.wrap,
        horizontal && styles.wrapCompact,
        { borderRadius: radius.lg },
      ]}
    >
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          horizontal && styles.gradientHorizontal,
          { borderRadius: radius.lg },
        ]}
      >
        <View style={styles.compactInner}>
          <View style={styles.iconWrapCompact}>
            <Ionicons name={icon} size={20} color="#fff" />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
            <Text
              style={[
                typo.stat,
                styles.value,
                horizontal ? styles.valueHorizontal : null,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {displayValue}
            </Text>
            {subtext ? (
              <Text style={styles.subtext} numberOfLines={1}>
                {subtext}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  wrapCompact: {
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  gradient: {
    padding: 14,
    minHeight: 96,
    justifyContent: 'center',
  },
  gradientHorizontal: {
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  compactInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    gap: 2,
    flex: 1,
    minWidth: 0,
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
  valueHorizontal: {
    fontSize: 24,
    lineHeight: 28,
  },
  subtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});
