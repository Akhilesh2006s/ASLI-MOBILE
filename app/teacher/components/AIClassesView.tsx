import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import teacherService from '../../../src/services/api/teacherService';
import { SubNavChips, TeacherShimmer, TeacherClassCard } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';
import TimetableView from './TimetableView';
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
  { id: 'classes', label: 'My Classes' },
  { id: 'timetable', label: 'Timetable' },
  { id: 'schedule', label: 'Schedule' },
];

function asText(value: unknown, fallback = 'N/A'): string {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return asText((value as { name?: unknown }).name, fallback);
  }
  return String(value);
}

/** Match web display: "7A", "8B" */
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
            subject: asText(cls.subject, 'General'),
            studentCount: cls.students?.length || cls.studentCount || 0,
            schedule: schedule || 'Not scheduled',
            room: formatRoom(cls),
            classNumber: cls.classNumber ? String(cls.classNumber) : undefined,
            students: Array.isArray(cls.students)
              ? cls.students.map((s: any) => ({
                  id: String(s._id || s.id),
                  name: s.fullName || s.name || 'Student',
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
          <Ionicons name="school-outline" size={48} color={TEACHER.textMuted} />
          <Text style={styles.emptyTitle}>No Classes Assigned</Text>
          <Text style={styles.emptySub}>Contact your administrator to get class assignments.</Text>
        </View>
      );
    }

    return (
      <View style={styles.classesSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="people" size={18} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>My Classes</Text>
        </View>

        {classes.map((cls) => (
          <TeacherClassCard
            key={cls.id}
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
        ))}
      </View>
    );
  };

  return (
    <View>
      <SubNavChips items={SUB_TABS} active={subTab} onChange={(id: string) => setSubTab(id as ClassesSubTab)} />

      {stale && subTab === 'classes' ? (
        <View style={styles.staleBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={TEACHER.secondary} />
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
  classesSection: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: TEACHER_SPACING.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEACHER.text,
    letterSpacing: -0.4,
  },
  empty: {
    alignItems: 'center',
    padding: TEACHER_SPACING.xxxl,
    marginHorizontal: TEACHER_SPACING.lg,
    backgroundColor: '#ffffff',
    borderRadius: TEACHER_RADIUS.card,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: TEACHER_SPACING.lg,
  },
  emptySub: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: TEACHER_RADIUS.sm,
  },
  staleBannerText: {
    fontSize: 12,
    color: TEACHER.secondary,
    fontWeight: '600',
  },
});
