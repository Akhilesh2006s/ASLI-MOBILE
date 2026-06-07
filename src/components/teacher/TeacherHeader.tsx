import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
};

const STATUS_META: Record<BackendStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  online: { icon: 'cloud-done-outline', color: TEACHER.success, label: 'Live' },
  cached: { icon: 'cloud-offline-outline', color: TEACHER.secondary, label: 'Cached' },
  offline: { icon: 'cloud-offline', color: TEACHER.danger, label: 'Offline' },
};

export default function TeacherHeader({
  userName,
  subjects = [],
  nextClassLabel,
  countdown,
  stale,
  backendStatus = stale ? 'cached' : 'online',
  onMenu,
  onProfile,
}: Props) {
  const statusMeta = STATUS_META[backendStatus];
  return (
    <LinearGradient colors={[...TEACHER.headerGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.greeting}>{userName}</Text>
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
        <View style={styles.actions}>
          <View style={[styles.statusPill, { borderColor: `${statusMeta.color}55`, backgroundColor: `${statusMeta.color}18` }]}>
            <Ionicons name={statusMeta.icon} size={12} color={statusMeta.color} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
          {onProfile ? (
            <Pressable onPress={onProfile} style={styles.iconBtn}>
              <Ionicons name="person-circle-outline" size={26} color={TEACHER.text} />
            </Pressable>
          ) : null}
          {onMenu ? (
            <Pressable onPress={onMenu} style={styles.iconBtn}>
              <Ionicons name="menu" size={26} color={TEACHER.text} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {nextClassLabel ? (
        <View style={styles.scheduleRow}>
          <Ionicons name="time-outline" size={16} color={TEACHER.textSecondary} />
          <Text style={styles.scheduleText}>{nextClassLabel}</Text>
          {countdown ? <Text style={styles.countdown}>{countdown}</Text> : null}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textBlock: { flex: 1, paddingRight: TEACHER_SPACING.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 4 },
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  stalePill: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    marginTop: TEACHER_SPACING.md,
    backgroundColor: TEACHER.surface,
    borderRadius: 12,
    padding: TEACHER_SPACING.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  scheduleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  countdown: {
    fontSize: 13,
    fontWeight: '800',
    color: TEACHER.primaryLight,
  },
});
