import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_RADIUS, STUDENT_TYPO } from '../../theme/student';

type Props = {
  title: string;
  onBack: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  subtitle?: string;
};

export default function StudentScreenHeader({
  title,
  onBack,
  rightLabel,
  onRightPress,
  subtitle,
}: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <LinearGradient
        colors={[...STUDENT.heroGradient]}
        style={styles.wrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.row}>
          <Pressable
            style={styles.backBtn}
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={STUDENT.textOnPrimary} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightLabel && onRightPress ? (
            <Pressable
              style={styles.rightBtn}
              onPress={onRightPress}
              accessibilityRole="button"
            >
              <Text style={styles.rightText}>{rightLabel}</Text>
            </Pressable>
          ) : (
            <View style={styles.rightPlaceholder} />
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: STUDENT_RADIUS.xxl,
    borderBottomRightRadius: STUDENT_RADIUS.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...STUDENT_TYPO.section,
    color: STUDENT.textOnPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...STUDENT_TYPO.caption,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    textAlign: 'center',
  },
  rightBtn: {
    width: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rightPlaceholder: {
    width: 44,
  },
  rightText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.textOnPrimary,
  },
});
