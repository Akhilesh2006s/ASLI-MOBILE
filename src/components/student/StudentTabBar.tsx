import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

const SPRING = { damping: 15, stiffness: 260 };
const TAB_BAR_MAX_WIDTH = 960;
const FAB_CLEARANCE = 64;

export default function StudentTabBar({ tabs, activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [barWidth, setBarWidth] = useState(0);
  const isTablet = windowWidth >= 768;
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const indicatorX = useSharedValue(0);
  const tabWidth = barWidth > 0 ? barWidth / tabs.length : 0;
  const iconOnly = tabWidth > 0 && tabWidth < 64;
  const compactLabel = tabWidth > 0 && tabWidth < 84 && !iconOnly;

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, indicatorX]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * tabWidth }],
    width: Math.max(tabWidth - 8, 0),
  }));

  const handleTabPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(id);
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 12) },
        isTablet ? styles.wrapTablet : styles.wrapPhone,
      ]}
    >
      <View
        style={[styles.bar, isTablet && styles.barTablet]}
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
              onPress={() => handleTabPress(tab.id)}
              style={styles.tab}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={iconName}
                size={iconOnly ? 20 : 22}
                color={active ? STUDENT.navActiveText : STUDENT.navInactive}
              />
              {iconOnly ? null : (
                <Text
                  style={[
                    styles.label,
                    compactLabel && styles.labelCompact,
                    active ? styles.labelActive : styles.labelInactive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {tab.label}
                </Text>
              )}
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
    bottom: 12,
    zIndex: 50,
    alignItems: 'center',
  },
  wrapPhone: {
    left: 16,
    right: 16 + FAB_CLEARANCE,
  },
  wrapTablet: {
    left: 24,
    right: 24,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: STUDENT.tabBarBg,
    borderRadius: STUDENT_RADIUS.xxl,
    borderWidth: 1,
    borderColor: STUDENT.tabBarBorder,
    paddingVertical: 6,
    paddingHorizontal: 4,
    ...STUDENT.shadow.lg,
  },
  barTablet: {
    maxWidth: TAB_BAR_MAX_WIDTH,
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
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    zIndex: 1,
    gap: 2,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  labelCompact: {
    fontSize: 9,
  },
  labelActive: {
    color: STUDENT.navActiveText,
  },
  labelInactive: {
    color: STUDENT.navInactive,
  },
});
