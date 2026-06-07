import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_SPACING } from '../../theme/teacher';
import type { BackendStatus } from '../../services/api/teacherService';

type Props = {
  userName: string;
  subjects?: string[];
  nextClassLabel?: string;
  countdown?: string;
  stale?: boolean;
  backendStatus?: BackendStatus;
  onMenu?: () => void;
  onProfile?: () => void;
  onLogout?: () => void;
};

const screenWidth = Dimensions.get('window').width;

export default function TeacherHeader({
  userName,
  subjects = [],
  nextClassLabel,
  countdown,
  onLogout,
}: Props) {
  const shimmerX = useSharedValue(-150);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(screenWidth + 150, { duration: 2400 }),
      -1,
      false,
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...TEACHER.headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(99,102,241,0.08)', 'transparent', 'rgba(99,102,241,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.shimmerSweep, shimmerStyle]} />

      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Animated.Text entering={FadeInDown.duration(400)} style={styles.greeting}>
            {userName}
          </Animated.Text>
          {subjects.length > 0 ? (
            <View style={styles.badges}>
              {subjects.slice(0, 3).map((s) => (
                <View key={s} style={styles.badge}>
                  <Text style={styles.badgeText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {onLogout ? (
          <Pressable
            onPress={onLogout}
            style={styles.logoutBtn}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={22} color={TEACHER.danger} />
          </Pressable>
        ) : null}
      </View>
      {nextClassLabel ? (
        <View style={styles.scheduleRow}>
          <View style={styles.scheduleAccent} />
          <LinearGradient
            colors={['#EEF2FF', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scheduleGradient}
          >
            <Ionicons name="time-outline" size={16} color={TEACHER.textSecondary} />
            <Text style={styles.scheduleText}>{nextClassLabel}</Text>
            {countdown ? (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdown}>{countdown}</Text>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
  },
  shimmerSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textBlock: { flex: 1, paddingRight: TEACHER_SPACING.sm },
  logoutBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: TEACHER.text,
    letterSpacing: -0.5,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TEACHER_SPACING.sm,
    marginTop: TEACHER_SPACING.sm,
  },
  badge: {
    backgroundColor: TEACHER.surfaceHover,
    borderRadius: 999,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEACHER.primaryDark,
  },
  scheduleRow: {
    marginTop: TEACHER_SPACING.md,
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  scheduleAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: TEACHER.primary,
    zIndex: 2,
  },
  scheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    padding: TEACHER_SPACING.md,
    paddingLeft: TEACHER_SPACING.lg,
  },
  scheduleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  countdownBadge: {
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countdown: {
    fontSize: 13,
    fontWeight: '800',
    color: TEACHER.primaryDark,
  },
});
