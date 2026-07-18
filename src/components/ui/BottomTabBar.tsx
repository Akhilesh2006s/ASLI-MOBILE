import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../../theme';

export type TabItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  roleColor?: string;
};

export default function BottomTabBar({ tabs, activeTab, onTabChange, roleColor = COLORS.primary }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const iconName = active && tab.activeIcon ? tab.activeIcon : tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              {active ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[styles.activePill, { backgroundColor: `${roleColor}18` }]}
                >
                  <Ionicons name={iconName} size={compact ? 18 : 20} color={roleColor} />
                  {!compact ? (
                    <Text style={[styles.activeLabel, { color: roleColor }]} numberOfLines={1}>
                      {tab.label}
                    </Text>
                  ) : null}
                </Animated.View>
              ) : (
                <View style={styles.inactive}>
                  <Ionicons name={iconName} size={compact ? 20 : 22} color={COLORS.textMuted} />
                  {!compact ? (
                    <Text style={styles.inactiveLabel} numberOfLines={1}>
                      {tab.label}
                    </Text>
                  ) : null}
                </View>
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
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.lg,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  inactive: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: 2,
  },
  activeLabel: {
    fontSize: FONT.xs,
    fontWeight: FONT.bold,
  },
  inactiveLabel: {
    fontSize: FONT.xs,
    color: COLORS.textMuted,
    fontWeight: FONT.medium,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
});
