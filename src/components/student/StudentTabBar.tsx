import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';

export type StudentTab = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: StudentTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

export default function StudentTabBar({ tabs, activeTab, onTabChange }: Props) {
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
    width: Math.max(tabWidth - 8, 0),
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View
        style={styles.bar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 ? (
          <Animated.View style={[styles.indicator, slideStyle, { left: 4 }]} />
        ) : null}
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const iconName = active ? tab.activeIcon : tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={active ? STUDENT.navActiveText : STUDENT.navInactive}
              />
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
    left: 20,
    right: 20,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STUDENT.tabBarBg,
    borderRadius: STUDENT_RADIUS.xxl,
    borderWidth: 1,
    borderColor: STUDENT.tabBarBorder,
    paddingVertical: 6,
    paddingHorizontal: 4,
    ...STUDENT.shadow.lg,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: STUDENT_RADIUS.xl,
    backgroundColor: STUDENT.navActiveBg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    zIndex: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
});
