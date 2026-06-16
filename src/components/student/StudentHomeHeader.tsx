import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getSchoolBranding } from '../../lib/school-branding';
import { STUDENT, STUDENT_RADIUS, studentGreeting } from '../../theme/student';

type Props = {
  user: any;
  streak?: number;
  onAvatarPress?: () => void;
  onLogout?: () => void;
};

export default function StudentHomeHeader({ user, streak = 0, onAvatarPress, onLogout }: Props) {
  const streakScale = useSharedValue(1);

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';
  const classLabel = user?.className || user?.class;
  const section = user?.section;
  const branding = getSchoolBranding(user);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    streakScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1
    );
  }, [streakScale]);

  const streakAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
  }));

  const initials = firstName.charAt(0).toUpperCase();

  return (
    <Animated.View entering={FadeInDown.duration(240)}>
      <LinearGradient
        colors={[...STUDENT.heroGradient]}
        style={styles.wrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.orbTop} />
        <View style={styles.orbBottom} />

        <View style={styles.topRow}>
          <View style={styles.greetBlock}>
            <Text style={styles.greeting}>
              {studentGreeting()}, {firstName}
            </Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <View style={styles.actions}>
            {onLogout ? (
              <Pressable
                style={styles.actionBtn}
                onPress={onLogout}
                accessibilityLabel="Logout"
                accessibilityRole="button"
              >
                <Ionicons name="log-out-outline" size={20} color={STUDENT.textOnPrimary} />
              </Pressable>
            ) : null}
            <Pressable style={styles.avatar} onPress={onAvatarPress}>
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        {branding ? (
          <View style={styles.schoolRow}>
            <View style={styles.schoolLogoWrap}>
              {branding.schoolLogo ? (
                <Image
                  source={{ uri: branding.schoolLogo }}
                  style={styles.schoolLogoImg}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="school-outline" size={18} color="rgba(255,255,255,0.92)" />
              )}
            </View>
            <Text style={styles.schoolName} numberOfLines={2}>
              {branding.schoolName || 'Your School'}
            </Text>
          </View>
        ) : null}

        {classLabel ? (
          <View style={styles.badges}>
            <View style={[styles.badge, styles.badgeAccent]}>
              <Ionicons name="layers-outline" size={12} color={STUDENT.textOnPrimary} />
              <Text style={styles.badgeTextAccent}>
                Class {classLabel}
                {section ? ` · ${section}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {streak > 0 ? (
          <Animated.View style={[styles.streak, streakAnimStyle]}>
            <Ionicons name="flame" size={14} color={STUDENT.warning} />
            <Text style={styles.streakText}>{streak}-day study streak</Text>
          </Animated.View>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: STUDENT_RADIUS.xxl,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...STUDENT.shadow.md,
  },
  orbTop: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -20,
  },
  orbBottom: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    left: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetBlock: { flex: 1, marginRight: 12 },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: STUDENT.textOnPrimary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
    fontWeight: '500',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: STUDENT.textOnPrimary,
  },
  avatarText: { color: STUDENT.textOnPrimary, fontWeight: '800', fontSize: 16 },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  schoolLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  schoolLogoImg: {
    width: 34,
    height: 34,
  },
  schoolName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    color: STUDENT.textOnPrimary,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: STUDENT_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeAccent: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeTextAccent: { fontSize: 11, fontWeight: '700', color: STUDENT.textOnPrimary },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: STUDENT_RADIUS.full,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: STUDENT.warning },
});
