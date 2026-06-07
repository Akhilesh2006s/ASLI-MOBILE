import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../../src/theme/student';
import { useAuth } from '../../../src/context/AuthContext';
import studentService from '../../../src/services/api/studentService';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { dedupeStudentExamResults } from '../../../src/lib/dedupe-exam-results';
import {
  buildWeeklyActivityStats,
  computeProfileOverviewStats,
  getExamIdFromResult,
} from '../../../src/lib/profile-overview-stats';

type Props = {
  user: any;
  onLogout: () => void;
};

function getInitials(name?: string): string {
  if (!name?.trim()) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || 'N/A'}</Text>
    </View>
  );
}

export default function ProfileTabView({ user, onLogout }: Props) {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [progressRecords, setProgressRecords] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    studentService.getProfile().then((me) => setProfile(me?.user || user)).catch(() => setProfile(user));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        const [resultsRes, rankingsRes, focusRes, progressRes, meRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/exam-results`, { headers }),
          fetch(`${API_BASE_URL}/api/student/rankings`, { headers }),
          fetch(`${API_BASE_URL}/api/vidya/student/focus-card`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/student/learning-progress`, { headers }),
          fetch(`${API_BASE_URL}/api/auth/me`, { headers }),
        ]);

        if (!cancelled && resultsRes.ok) {
          const json = await resultsRes.json();
          const rows = Array.isArray(json.data) ? json.data : [];
          setExamResults(dedupeStudentExamResults(rows, getExamIdFromResult));
        }
        if (!cancelled && rankingsRes.ok) {
          const json = await rankingsRes.json();
          setRankings(Array.isArray(json.data) ? json.data : []);
        }
        let streak = 0;
        if (focusRes && 'ok' in focusRes && focusRes.ok) {
          const focusJson = await focusRes.json();
          streak = Number(focusJson?.studyStreak?.current ?? focusJson?.studyStreak?.count ?? 0);
        }
        if ((!Number.isFinite(streak) || streak <= 0) && meRes.ok) {
          const meJson = await meRes.json();
          streak = Number(meJson?.user?.studyStreak?.current ?? 0);
        }
        if (!cancelled) setStreakCount(Number.isFinite(streak) ? Math.max(0, streak) : 0);

        if (!cancelled && progressRes.ok) {
          const progressJson = await progressRes.json();
          setProgressRecords(progressJson?.data?.progressRecords || []);
        }
      } catch {
        if (!cancelled) {
          setExamResults([]);
          setRankings([]);
          setProgressRecords([]);
          setStreakCount(0);
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => computeProfileOverviewStats(examResults, rankings, streakCount),
    [examResults, rankings, streakCount]
  );

  const weeklyStats = useMemo(
    () => buildWeeklyActivityStats(examResults, progressRecords),
    [examResults, progressRecords]
  );

  const weeklyHoursTotal = useMemo(
    () => Math.round(weeklyStats.reduce((sum, day) => sum + day.hours, 0) * 10) / 10,
    [weeklyStats]
  );

  const profileClassNumber =
    profile?.assignedClass?.classNumber != null && String(profile.assignedClass.classNumber).trim() !== ''
      ? String(profile.assignedClass.classNumber).trim()
      : profile?.classNumber && String(profile.classNumber).trim() !== '' && profile.classNumber !== 'Unassigned'
        ? String(profile.classNumber).trim()
        : null;

  const profileSection =
    profile?.assignedClass?.section != null && String(profile.assignedClass.section).trim() !== ''
      ? String(profile.assignedClass.section).trim()
      : profile?.section != null && String(profile.section).trim() !== ''
        ? String(profile.section).trim()
        : null;

  const displayBoard =
    profile?.curriculumBoard && String(profile.curriculumBoard).trim() !== ''
      ? String(profile.curriculumBoard).toUpperCase()
      : profile?.board && String(profile.board).toUpperCase() !== 'ASLI_EXCLUSIVE_SCHOOLS'
        ? String(profile.board).toUpperCase()
        : profile?.board || '';

  const logout = () => {
    Alert.alert('Logout', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          onLogout();
        },
      },
    ]);
  };

  const onEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be available soon. You can update your information from the web dashboard.');
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
        <LinearGradient colors={[...STUDENT.heroGradient]} style={styles.profileHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile?.fullName)}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{profile?.fullName || 'Student'}</Text>
              <Text style={styles.email}>{profile?.email || ''}</Text>
              <View style={styles.badgeRow}>
                {profileClassNumber ? (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                      Class {profileClassNumber}
                      {profileSection ? ` · Sec ${profileSection}` : ''}
                    </Text>
                  </View>
                ) : null}
                {displayBoard ? (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{displayBoard}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <Pressable style={styles.editBtn} onPress={onEditProfile}>
            <Ionicons name="create-outline" size={16} color={STUDENT.primaryDark} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="settings-outline" size={20} color="#0f172a" />
          <Text style={styles.cardTitle}>Profile Settings</Text>
        </View>
        <View style={styles.fieldsGrid}>
          <ProfileField label="Full Name" value={profile?.fullName || ''} />
          <ProfileField label="Email" value={profile?.email || ''} />
          <ProfileField label="Class" value={profileClassNumber || ''} />
          <ProfileField label="Section" value={profileSection || ''} />
          <ProfileField label="Phone" value={profile?.phone || ''} />
          <ProfileField label="School" value={profile?.schoolName || profile?.school?.name || ''} />
          <ProfileField label="Board" value={displayBoard} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="trending-up-outline" size={20} color="#0f172a" />
          <Text style={styles.cardTitle}>Performance Overview</Text>
        </View>
        {overviewLoading ? (
          <ActivityIndicator color="#059669" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#ea580c' }]}>{stats.streak}</Text>
              <Text style={styles.metricLabel}>Day Streak</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#16a34a' }]}>{stats.questionsAnswered}</Text>
              <Text style={styles.metricLabel}>Questions Solved</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#2563eb' }]}>{stats.accuracyRate}%</Text>
              <Text style={styles.metricLabel}>Accuracy Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#7c3aed' }]}>
                {stats.rank > 0 ? `#${stats.rank}` : '—'}
              </Text>
              <Text style={styles.metricLabel}>Avg Exam Rank</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="calendar-outline" size={20} color="#0f172a" />
          <Text style={styles.cardTitle}>This Week&apos;s Activity</Text>
        </View>
        {overviewLoading ? (
          <ActivityIndicator color="#059669" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.weekRow}>
              {weeklyStats.map((day) => (
                <View key={day.dateKey} style={styles.weekCell}>
                  <Text style={styles.weekDay}>{day.day}</Text>
                  <View
                    style={[
                      styles.weekHoursBox,
                      day.completed ? styles.weekHoursActive : styles.weekHoursIdle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekHoursText,
                        day.completed ? styles.weekHoursTextActive : undefined,
                      ]}
                    >
                      {day.hours}h
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.weekTotal}>Total: {weeklyHoursTotal} hours this week</Text>
            <Text style={styles.weekSub}>From exam time and content study sessions.</Text>
          </>
        )}
      </View>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { paddingBottom: 100, gap: 14 },
  profileHero: {
    borderRadius: STUDENT_RADIUS.xxl,
    padding: 18,
    marginBottom: 2,
    ...STUDENT.shadow.md,
  },
  card: {
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    padding: 16,
    ...STUDENT.shadow.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerInfo: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: STUDENT.primaryDark },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: STUDENT.text },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: { width: '47%', gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  fieldValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  metricItem: { width: '50%', alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  metricLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginTop: 4, textAlign: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekCell: { flex: 1, alignItems: 'center', minWidth: 36 },
  weekDay: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  weekHoursBox: {
    width: '100%',
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHoursActive: { backgroundColor: '#dcfce7' },
  weekHoursIdle: { backgroundColor: '#f3f4f6' },
  weekHoursText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  weekHoursTextActive: { color: '#166534' },
  weekTotal: { marginTop: 14, textAlign: 'center', fontSize: 13, color: '#6b7280' },
  weekSub: { marginTop: 4, textAlign: 'center', fontSize: 12, color: '#9ca3af' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
