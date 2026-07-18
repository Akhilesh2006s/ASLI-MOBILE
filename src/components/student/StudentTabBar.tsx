import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
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

const TAB_BAR_MAX_WIDTH = 520;
const ICON_SIZE = 20;
const ACTIVE_CIRCLE = 36;

export default function StudentTabBar({ tabs, activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const handleTabPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(id);
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 10) },
        isTablet && styles.wrapTablet,
      ]}
    >
      <View style={[styles.bar, isTablet && styles.barTablet]}>
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
              {active ? (
                <Animated.View entering={FadeIn.duration(180)} style={styles.activeCircle}>
                  <Ionicons name={iconName} size={ICON_SIZE} color={STUDENT.navActiveText} />
                </Animated.View>
              ) : (
                <View style={styles.iconSlot}>
                  <Ionicons name={iconName} size={ICON_SIZE} color={STUDENT.navInactive} />
                </View>
              )}
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
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
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  wrapTablet: {
    paddingHorizontal: 24,
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
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
    minWidth: 0,
  },
  activeCircle: {
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    borderRadius: ACTIVE_CIRCLE / 2,
    backgroundColor: STUDENT.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
  labelActive: {
    color: STUDENT.navActiveText,
    fontWeight: '800',
  },
  labelInactive: {
    color: STUDENT.navInactive,
    fontWeight: '600',
  },
});
