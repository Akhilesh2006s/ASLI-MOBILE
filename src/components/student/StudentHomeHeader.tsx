import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { fetchStudentNotifications } from '../../lib/student-notifications';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS, studentGreeting } from '../../theme/student';
import BottomSheet from '../ui/BottomSheet';

type Props = {
  user: any;
  streak?: number;
  onAvatarPress?: () => void;
};

export default function StudentHomeHeader({ user, streak = 0, onAvatarPress }: Props) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(false);

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';
  const classLabel = user?.className || user?.class;
  const section = user?.section;
  const school = user?.schoolName || user?.school?.name || 'Your School';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const list = await fetchStudentNotifications(token);
        setNotifications(list.slice(0, 20));
        setUnread(list.some((n) => !n.read));
      } catch {
        /* optional */
      }
    })();
  }, []);

  const initials = firstName.charAt(0).toUpperCase();

  return (
    <>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
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
              <Pressable style={styles.actionBtn} onPress={() => setNotificationsOpen(true)}>
                <Ionicons name="notifications-outline" size={20} color={STUDENT.textOnPrimary} />
                {unread ? <View style={styles.dot} /> : null}
              </Pressable>
              <Pressable style={styles.avatar} onPress={onAvatarPress}>
                <Text style={styles.avatarText}>{initials}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="school-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.badgeText} numberOfLines={1}>
                {school}
              </Text>
            </View>
            {classLabel ? (
              <View style={[styles.badge, styles.badgeAccent]}>
                <Ionicons name="layers-outline" size={12} color="#fff" />
                <Text style={styles.badgeTextAccent}>
                  Class {classLabel}
                  {section ? ` · ${section}` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {streak > 0 ? (
            <View style={styles.streak}>
              <Ionicons name="flame" size={14} color="#fde047" />
              <Text style={styles.streakText}>{streak}-day study streak</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>

      <BottomSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Notifications">
        {notifications.length === 0 ? (
          <Text style={styles.emptyNotif}>No notifications yet</Text>
        ) : (
          notifications.map((n, i) => (
            <View key={n._id || i} style={styles.notifItem}>
              <Text style={styles.notifTitle}>{n.title || 'Update'}</Text>
              <Text style={styles.notifBody}>{n.message || n.body || ''}</Text>
            </View>
          ))
        )}
        <TouchableOpacity
          style={styles.viewAllNotif}
          onPress={() => {
            setNotificationsOpen(false);
            router.push('/notifications');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.viewAllNotifText}>View All Notifications</Text>
          <Ionicons name="chevron-forward" size={16} color={STUDENT.primary} />
        </TouchableOpacity>
      </BottomSheet>
    </>
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
    fontSize: 24,
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
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: STUDENT.danger,
    borderWidth: 1.5,
    borderColor: '#047857',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: STUDENT_RADIUS.full,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeAccent: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },
  badgeTextAccent: { fontSize: 11, fontWeight: '700', color: '#fff' },
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
  streakText: { fontSize: 12, fontWeight: '700', color: '#fef9c3' },
  emptyNotif: { color: STUDENT.textMuted, textAlign: 'center', padding: 20 },
  notifItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.2)',
  },
  notifTitle: { fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  notifBody: { fontSize: 13, color: '#475569' },
  viewAllNotif: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.2)',
  },
  viewAllNotifText: { fontSize: 14, fontWeight: '700', color: STUDENT.primary },
});
