import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

export type TeacherTab = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: TeacherTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

const SPRING = { damping: 16, stiffness: 280 };

export default function TeacherTabBar({ tabs, activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const indicatorX = useSharedValue(0);
  const tabWidth = barWidth > 0 ? barWidth / tabs.length : 0;

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, indicatorX]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * tabWidth }],
    width: Math.max(tabWidth - 6, 0),
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {tabWidth > 0 ? <Animated.View style={[styles.indicator, slideStyle, { left: 3 }]} /> : null}
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const iconName = active ? tab.activeIcon : tab.icon;
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
                name={iconName}
                size={20}
                color={active ? TEACHER.navActiveText : TEACHER.navInactive}
              />
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: TEACHER_SPACING.md,
    right: TEACHER_SPACING.md,
    bottom: 0,
    zIndex: 40,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: TEACHER.tabBarBg,
    borderRadius: TEACHER_RADIUS.xl,
    borderWidth: 1,
    borderColor: TEACHER.tabBarBorder,
    paddingVertical: TEACHER_SPACING.sm,
    ...TEACHER.shadow.md,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: TEACHER_RADIUS.lg,
    backgroundColor: TEACHER.navActiveBg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: TEACHER_SPACING.xs,
    gap: 2,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
  labelActive: {
    color: TEACHER.navActiveText,
  },
  labelInactive: {
    color: TEACHER.navInactive,
  },
});
