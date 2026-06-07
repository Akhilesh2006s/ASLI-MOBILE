import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../theme/student';

type Action = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

export default function StudentQuickActions({ actions }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {actions.map((action, index) => (
        <Animated.View
          key={action.id}
          entering={FadeInRight.duration(STUDENT_ANIMATION.normal).delay(index * 60)}
        >
          <TouchableOpacity style={styles.item} onPress={action.onPress} activeOpacity={0.82}>
            <View style={[styles.iconCircle, { backgroundColor: `${action.color}18` }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.label}>{action.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 14,
    paddingVertical: 4,
    paddingRight: 8,
  },
  item: {
    alignItems: 'center',
    width: 76,
    gap: 8,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: STUDENT_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: STUDENT.surface,
    ...STUDENT.shadow.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.textSecondary,
    textAlign: 'center',
  },
});
