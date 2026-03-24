import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

export type EduOTTTab = 'videos' | 'live-sessions';

interface TabSwitcherProps {
  activeTab: EduOTTTab;
  onChange: (tab: EduOTTTab) => void;
}

function TabSwitcherComponent({ activeTab, onChange }: TabSwitcherProps) {
  const [width, setWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = width > 0 ? width / 2 : 0;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: activeTab === 'videos' ? 0 : tabWidth,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
      mass: 0.7,
    }).start();
  }, [activeTab, indicatorX, tabWidth]);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <Animated.View style={[styles.indicator, { width: tabWidth, transform: [{ translateX: indicatorX }] }]} />

      <Pressable style={styles.tab} onPress={() => onChange('videos')}>
        <Text style={[styles.tabLabel, activeTab === 'videos' && styles.tabLabelActive]}>Videos</Text>
      </Pressable>

      <Pressable style={styles.tab} onPress={() => onChange('live-sessions')}>
        <Text style={[styles.tabLabel, activeTab === 'live-sessions' && styles.tabLabelActive]}>Live Classes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#0f172a',
  },
});

export default memo(TabSwitcherComponent);
