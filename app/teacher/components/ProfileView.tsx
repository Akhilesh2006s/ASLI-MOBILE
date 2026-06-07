import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';
import EduOTTView from './EduOTTView';
import TimetableView from './TimetableView';
import WorkDiaryView from './WorkDiaryView';

type Props = {
  user: any;
  stats: { totalStudents: number; totalClasses: number; pendingGrades?: number; totalVideos: number };
  onNavigate: (tab: string, sub?: string) => void;
  onLogout: () => void;
};

const MENU = [
  { id: 'timetable', label: 'My Timetable', icon: 'calendar-outline' as const, tab: 'classes', sub: 'timetable' },
  { id: 'diary', label: 'Work Diary', icon: 'journal-outline' as const, tab: 'classes', sub: 'diary' },
  { id: 'eduott', label: 'EduOTT Library', icon: 'play-circle-outline' as const, tab: 'profile', sub: 'eduott' },
  { id: 'calendar', label: 'Calendar View', icon: 'today-outline' as const, tab: 'profile', sub: 'calendar' },
  { id: 'attendance', label: 'Attendance History', icon: 'checkmark-done-outline' as const, route: '/teacher/attendance' },
  { id: 'password', label: 'Change Password', icon: 'key-outline' as const, route: '/profile' },
];

export default function ProfileView({ user, stats, onNavigate, onLogout }: Props) {
  const [subView, setSubView] = useState<'menu' | 'eduott' | 'calendar'>('menu');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (subView === 'calendar') loadCalendar();
  }, [subView]);

  const loadCalendar = async () => {
    setLoadingEvents(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await teacherService.calendarEvents(month);
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const initials = (user?.fullName || 'T')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (subView === 'eduott') {
    return (
      <View style={styles.full}>
        <Pressable style={styles.backRow} onPress={() => setSubView('menu')}>
          <Ionicons name="arrow-back" size={20} color={TEACHER.primaryLight} />
          <Text style={styles.backText}>Back to Profile</Text>
        </Pressable>
        <EduOTTView />
      </View>
    );
  }

  if (subView === 'calendar') {
    return (
      <ScrollView style={styles.full} contentContainerStyle={styles.scrollPad}>
        <Pressable style={styles.backRow} onPress={() => setSubView('menu')}>
          <Ionicons name="arrow-back" size={20} color={TEACHER.primaryLight} />
          <Text style={styles.backText}>Back to Profile</Text>
        </Pressable>
        {loadingEvents ? (
          <TeacherShimmer variant="list" count={3} />
        ) : events.length ? (
          events.map((ev, i) => (
            <View key={ev._id || i} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{ev.title || ev.name || 'Event'}</Text>
              <Text style={styles.eventMeta}>
                {ev.date ? new Date(ev.date).toLocaleDateString() : ev.startDate || '—'} · {ev.type || 'Event'}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={TEACHER.textMuted} />
            <Text style={styles.emptyText}>No events this month</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.full} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'Teacher'}</Text>
        <Text style={styles.meta}>ID: {user?.employeeId || user?._id?.slice(-6) || '—'}</Text>
        {user?.schoolName ? <Text style={styles.meta}>{user.schoolName}</Text> : null}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalClasses}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalStudents}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: TEACHER.secondary }]}>{stats.pendingGrades ?? 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalVideos}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>More</Text>
      {MENU.map((item) => (
        <Pressable
          key={item.id}
          style={styles.menuItem}
          onPress={() => {
            if (item.route) {
              router.push(item.route as any);
            } else if (item.sub === 'eduott') {
              setSubView('eduott');
            } else if (item.sub === 'calendar') {
              setSubView('calendar');
            } else if (item.tab) {
              onNavigate(item.tab, item.sub);
            }
          }}
        >
          <Ionicons name={item.icon} size={22} color={TEACHER.primaryLight} />
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={TEACHER.textMuted} />
        </Pressable>
      ))}

      <Pressable style={[styles.menuItem, styles.logout]} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={22} color={TEACHER.danger} />
        <Text style={[styles.menuLabel, { color: TEACHER.danger }]}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  scrollPad: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, paddingTop: TEACHER_SPACING.sm },
  profileCard: {
    alignItems: 'center',
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.card,
    padding: TEACHER_SPACING.xxl,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginBottom: TEACHER_SPACING.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TEACHER_SPACING.md,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: TEACHER.textOnPrimary },
  name: { fontSize: 22, fontWeight: '800', color: TEACHER.text },
  meta: { fontSize: 13, color: TEACHER.textMuted, marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TEACHER_SPACING.sm,
    marginBottom: TEACHER_SPACING.xl,
  },
  statBox: {
    width: '47%',
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: TEACHER.primaryLight },
  statLabel: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEACHER.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: TEACHER_SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    backgroundColor: TEACHER.surface,
    padding: TEACHER_SPACING.lg,
    borderRadius: TEACHER_RADIUS.lg,
    marginBottom: TEACHER_SPACING.sm,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: TEACHER.text },
  logout: { marginTop: TEACHER_SPACING.lg, borderColor: 'rgba(239,68,68,0.3)' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: TEACHER_SPACING.lg,
  },
  backText: { color: TEACHER.primaryLight, fontWeight: '700' },
  eventCard: {
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  eventTitle: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  eventMeta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.textMuted, marginTop: 12 },
});
