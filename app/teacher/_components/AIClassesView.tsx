import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService from '../../../src/services/api/teacherService';
import {
  SubNavChips,
  TeacherShimmer,
  TeacherClassCard,
  TimetableView,
} from '../../../src/components/teacher';
import { formatPersonName, formatSubjectList } from '../../../src/lib/teacher-text';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../../src/theme/teacher';
import ScheduleCalendarView from './ScheduleCalendarView';

type ClassesSubTab = 'classes' | 'timetable' | 'schedule';

interface ClassItem {
  id: string;
  name: string;
  section: string;
  subject: string;
  studentCount: number;
  schedule: string;
  room: string;
  classNumber?: string;
  students: Array<{ id: string; name: string; email: string; status: string }>;
}

type Props = {
  stats: { totalStudents: number; totalClasses: number; totalVideos: number; pendingGrades?: number };
  initialSubTab?: ClassesSubTab;
  onOpenProgress?: (classNumber: string, studentId?: string) => void;
};

const SUB_TABS = [
  { id: 'classes', label: 'Classes', shortLabel: 'Classes', icon: 'school-outline' as const },
  { id: 'timetable', label: 'Timetable', shortLabel: 'Schedule', icon: 'calendar-outline' as const },
  { id: 'schedule', label: 'Schedule', shortLabel: 'Today', icon: 'time-outline' as const },
];

const STAT_ITEMS = [
  { key: 'students', label: 'Students', icon: 'people' as const, color: TEACHER.primary, value: (s: Props['stats']) => s.totalStudents },
  { key: 'classes', label: 'Classes', icon: 'layers' as const, color: TEACHER.secondary, value: (s: Props['stats']) => s.totalClasses },
  { key: 'videos', label: 'Videos', icon: 'play-circle' as const, color: TEACHER.success, value: (s: Props['stats']) => s.totalVideos },
  { key: 'grades', label: 'Pending', icon: 'ribbon' as const, color: TEACHER.warning, value: (s: Props['stats']) => s.pendingGrades ?? 0 },
];

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return display;
}

function StatsRibbon({ stats }: { stats: Props['stats'] }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.statsWrap}>
      <LinearGradient
        colors={['#EEF2FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsRibbon}
      >
        <View style={styles.statsGlow} />
        {STAT_ITEMS.map((item, index) => (
          <StatCell key={item.key} item={item} stats={stats} showDivider={index < STAT_ITEMS.length - 1} />
        ))}
      </LinearGradient>
    </Animated.View>
  );
}

function StatCell({
  item,
  stats,
  showDivider,
}: {
  item: typeof STAT_ITEMS[number];
  stats: Props['stats'];
  showDivider: boolean;
}) {
  const count = useCountUp(item.value(stats));
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIconWrap, { backgroundColor: item.color + '22' }]}>
        <Ionicons name={item.icon} size={14} color={item.color} />
      </View>
      <Text style={[styles.statValue, { color: item.color }]}>{count}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
      {showDivider ? <View style={styles.statDivider} /> : null}
    </View>
  );
}

function asText(value: unknown, fallback = 'N/A'): string {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return asText((value as { name?: unknown }).name, fallback);
  }
  return String(value);
}

function formatClassName(cls: any): string {
  const num = cls.classNumber != null ? String(cls.classNumber) : '';
  const sec = cls.section != null ? String(cls.section).trim() : '';
  if (num && sec) return `${num}${sec}`;
  if (cls.name && typeof cls.name === 'string') {
    const n = cls.name.trim();
    if (/^\d+[A-Za-z]$/.test(n.replace(/\s/g, ''))) return n.replace(/\s/g, '');
    return n;
  }
  if (num) return num;
  return 'Class';
}

function formatRoom(cls: any): string {
  const room = asText(cls.room, '');
  if (room && room !== 'N/A' && room !== '—') {
    if (room.toLowerCase().startsWith('room')) return room;
    return `Room ${room}`;
  }
  const num = cls.classNumber != null ? String(cls.classNumber) : '';
  const sec = cls.section != null ? String(cls.section).trim() : '';
  if (num && sec) return `Room ${num}${sec}`;
  return '—';
}

export default function AIClassesView({ stats, initialSubTab, onOpenProgress }: Props) {
  const [subTab, setSubTab] = useState<ClassesSubTab>(initialSubTab || 'classes');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (subTab === 'classes') loadClasses();
  }, [subTab]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await teacherService.classes();
      const data = res.data ?? [];

      setClasses(
        (Array.isArray(data) ? data : []).map((cls: any) => {
          const schedule = asText(cls.schedule, '');
          return {
            id: String(cls._id || cls.id || ''),
            name: formatClassName(cls),
            section: asText(cls.section, ''),
            subject: formatSubjectList(asText(cls.subject, 'General')),
            studentCount: cls.students?.length || cls.studentCount || 0,
            schedule: schedule || 'Not Scheduled',
            room: formatRoom(cls),
            classNumber: cls.classNumber ? String(cls.classNumber) : undefined,
            students: Array.isArray(cls.students)
              ? cls.students.map((s: any) => ({
                  id: String(s._id || s.id),
                  name: formatPersonName(s.fullName || s.name || 'Student'),
                  email: s.email || '',
                  status: s.status || 'active',
                }))
              : [],
          };
        })
      );
      setStale(res.stale);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderClasses = () => {
    if (loading) return <TeacherShimmer variant="card" count={3} />;

    if (!classes.length) {
      return (
        <View style={styles.empty}>
          <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.emptyIconCircle}>
            <Ionicons name="school-outline" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Classes Assigned</Text>
          <Text style={styles.emptySub}>Contact your administrator to get class assignments.</Text>
        </View>
      );
    }

    return (
      <View style={styles.classesSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>My Classes</Text>
            <View style={styles.classCountPill}>
              <Text style={styles.classCountText}>{classes.length}</Text>
            </View>
          </View>
        </View>

        {classes.map((cls, index) => (
          <Animated.View
            key={cls.id}
            entering={FadeInDown.duration(350).delay(Math.min(index * 70, 420))}
          >
            <TeacherClassCard
              name={cls.name}
              subject={cls.subject}
              studentCount={cls.studentCount}
              schedule={cls.schedule}
              room={cls.room}
              expanded={expanded.has(cls.id)}
              onToggleStudents={() => toggleExpanded(cls.id)}
              students={cls.students}
              onViewStudentAnalysis={(studentId) =>
                onOpenProgress?.(cls.classNumber || cls.name, studentId)
              }
            />
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <SubNavChips items={SUB_TABS} active={subTab} onChange={(id: string) => setSubTab(id as ClassesSubTab)} />

      {subTab === 'classes' ? <StatsRibbon stats={stats} /> : null}

      {stale && subTab === 'classes' ? (
        <View style={styles.staleBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={TEACHER.warning} />
          <Text style={styles.staleBannerText}>Showing cached data</Text>
        </View>
      ) : null}

      {subTab === 'classes' && renderClasses()}

      {subTab === 'timetable' && <TimetableView />}
      {subTab === 'schedule' && <ScheduleCalendarView />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: TEACHER.bg,
  },
  statsWrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: TEACHER_SPACING.md,
  },
  statsRibbon: {
    flexDirection: 'row',
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
    paddingVertical: TEACHER_SPACING.lg,
  },
  statsGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: TEACHER.primaryLight,
    opacity: 0.5,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEACHER.textSecondary,
    letterSpacing: 0.1,
  },
  statDivider: {
    position: 'absolute',
    right: 0,
    top: '15%',
    bottom: '15%',
    width: 1,
    backgroundColor: TEACHER.surfaceBorder,
  },
  classesSection: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.xxl,
  },
  sectionHeader: {
    marginBottom: TEACHER_SPACING.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEACHER.primary,
  },
  sectionTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 18,
    color: TEACHER.text,
    flex: 1,
  },
  classCountPill: {
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  classCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: TEACHER.primaryDark,
  },
  empty: {
    alignItems: 'center',
    padding: TEACHER_SPACING.xxxl,
    marginHorizontal: TEACHER_SPACING.lg,
    backgroundColor: TEACHER.cardBg,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEACHER.text,
    marginTop: TEACHER_SPACING.lg,
  },
  emptySub: {
    fontSize: 14,
    color: TEACHER.textMuted,
    textAlign: 'center',
    marginTop: TEACHER_SPACING.sm,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    padding: TEACHER_SPACING.sm,
    backgroundColor: 'rgba(255,189,60,0.08)',
    borderRadius: TEACHER_RADIUS.sm,
  },
  staleBannerText: {
    fontSize: 12,
    color: TEACHER.warning,
    fontWeight: '600',
  },
});
