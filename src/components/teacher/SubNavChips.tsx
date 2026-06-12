import React, { useCallback, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

export type ChipItem = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  items: ChipItem[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'students';
};

type ScrollEdges = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withSpring(to, { damping: 14, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1.0, { damping: 14, stiffness: 300 });
  };
  return { style, onPressIn, onPressOut };
}

function ChipButton({
  item,
  selected,
  onChange,
  studentsStyle,
}: {
  item: ChipItem;
  selected: boolean;
  onChange: (id: string) => void;
  studentsStyle?: boolean;
}) {
  const press = usePressScale();
  const inactiveChipStyle = studentsStyle ? styles.chipStudents : styles.chip;

  return (
    <Pressable
      onPress={() => onChange(item.id)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={press.style}>
        {selected ? (
          <Animated.View entering={ZoomIn.duration(200)}>
            <LinearGradient
              colors={[TEACHER.primary, TEACHER.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[inactiveChipStyle, styles.chipActive]}
            >
              {item.icon ? (
                <Ionicons name={item.icon} size={14} color={TEACHER.textOnPrimary} />
              ) : null}
              <Text style={styles.chipTextActive}>{item.label}</Text>
            </LinearGradient>
          </Animated.View>
        ) : (
          <View style={inactiveChipStyle}>
            {item.icon ? (
              <Ionicons name={item.icon} size={14} color={TEACHER.primaryLight} />
            ) : null}
            <Text style={studentsStyle ? styles.chipTextStudents : styles.chipText}>{item.label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function SubNavChips({ items, active, onChange, variant = 'default' }: Props) {
  const isStudents = variant === 'students';
  const scrollRef = useRef<ScrollView>(null);
  const layoutWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const [edges, setEdges] = useState<ScrollEdges>({ canScrollLeft: false, canScrollRight: false });

  const updateScrollEdges = useCallback((scrollX = 0) => {
    const layoutWidth = layoutWidthRef.current;
    const contentWidth = contentWidthRef.current;
    const overflow = contentWidth > layoutWidth + 6;
    setEdges({
      canScrollLeft: overflow && scrollX > 6,
      canScrollRight: overflow && scrollX < contentWidth - layoutWidth - 6,
    });
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateScrollEdges(event.nativeEvent.contentOffset.x);
    },
    [updateScrollEdges],
  );

  const onLayout = useCallback(
    (width: number) => {
      layoutWidthRef.current = width;
      updateScrollEdges(0);
    },
    [updateScrollEdges],
  );

  const onContentSizeChange = useCallback(
    (width: number) => {
      contentWidthRef.current = width;
      updateScrollEdges(0);
    },
    [updateScrollEdges],
  );

  const content = (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={isStudents}
      style={styles.scroll}
      contentContainerStyle={[styles.row, isStudents && styles.rowStudents]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
      onContentSizeChange={(w) => onContentSizeChange(w)}
    >
      {items.map((item) => (
        <ChipButton
          key={item.id}
          item={item}
          selected={item.id === active}
          onChange={onChange}
          studentsStyle={isStudents}
        />
      ))}
    </ScrollView>
  );

  if (isStudents) {
    return (
      <View style={styles.studentsWrap}>
        {content}
        {edges.canScrollLeft ? (
          <View style={styles.fadeLeft} pointerEvents="none">
            <LinearGradient
              colors={['#F5F7FF', 'rgba(245,247,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}
        {edges.canScrollRight ? (
          <View style={styles.fadeRight} pointerEvents="none">
            <LinearGradient
              colors={['rgba(245,247,255,0)', '#F5F7FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.scrollHint}>
              <Ionicons name="chevron-forward" size={14} color={TEACHER.primaryLight} />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    paddingVertical: TEACHER_SPACING.sm,
    paddingHorizontal: TEACHER_SPACING.lg,
  },
  rowStudents: {
    paddingRight: 36,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.sm,
    borderRadius: TEACHER_RADIUS.chip,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  chipStudents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.sm,
    borderRadius: TEACHER_RADIUS.chip,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  chipActive: {
    borderColor: TEACHER.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
  chipTextStudents: {
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.primaryDark,
  },
  chipTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: TEACHER.textOnPrimary,
  },
  studentsWrap: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    backgroundColor: '#F5F7FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    overflow: 'hidden',
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scrollHint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
});
