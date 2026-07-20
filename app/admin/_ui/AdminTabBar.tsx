import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassPanel } from '../../../src/components/ui';
import { useAdminTheme } from './useAdminTheme';
import type { AdminNavView } from '../_components/AdminNavDrawer';

const TAB_BAR_VIEWS = ['overview', 'students', 'classes', 'teachers', 'vidya-ai'] as const;
export type AdminTabBarView = (typeof TAB_BAR_VIEWS)[number];

type Tab = {
  id: AdminTabBarView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { id: 'overview', label: 'Dashboard', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'students', label: 'Students', icon: 'people-outline', activeIcon: 'people' },
  { id: 'classes', label: 'Classes', icon: 'school-outline', activeIcon: 'school' },
  { id: 'teachers', label: 'Teachers', icon: 'person-circle-outline', activeIcon: 'person-circle' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

const SPRING = { damping: 15, stiffness: 260 };

type Props = {
  activeView: AdminNavView;
  onTabChange: (id: AdminNavView) => void;
};

export default function AdminTabBar({ activeView, onTabChange }: Props) {
  const { colors } = useAdminTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const activeIndex = TAB_BAR_VIEWS.includes(activeView as AdminTabBarView)
    ? TAB_BAR_VIEWS.indexOf(activeView as AdminTabBarView)
    : -1;

  const tabWidth = barWidth > 0 ? barWidth / TABS.length : 0;
  const indicatorX = useSharedValue(-1);

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, indicatorX]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, indicatorX.value) * tabWidth }],
    width: Math.max(tabWidth - 8, 0),
    opacity: activeIndex >= 0 ? 1 : 0,
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Frosted pill floating over the app artwork; `strong` keeps the small
          tab labels legible against whatever is scrolling underneath. */}
      <GlassPanel style={styles.bar} radius={9999} tone="strong">
        <View
          style={styles.barInner}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
        {tabWidth > 0 && (
          <Animated.View style={[styles.indicator, slideStyle, { left: 4, backgroundColor: colors.primaryMuted }]} />
        )}
        {TABS.map((tab) => {
          const active = tab.id === activeView;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTabChange(tab.id);
              }}
              style={styles.tab}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.label, { color: active ? colors.primary : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        </View>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    zIndex: 50,
  },
  bar: {
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  // Row layout lives on the inner view so GlassPanel's content wrapper doesn't
  // flatten the tabs into a column.
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 9999,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    zIndex: 1,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
