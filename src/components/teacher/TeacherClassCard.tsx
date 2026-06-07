import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type ClassCardStudent = {
  id: string;
  name: string;
  email: string;
  status?: string;
};

type Props = {
  name: string;
  subject: string;
  studentCount: number;
  schedule: string;
  room: string;
  expanded: boolean;
  onToggleStudents: () => void;
  students?: ClassCardStudent[];
  onViewStudentAnalysis?: (studentId: string) => void;
};

function ScheduleDisplay({ schedule }: { schedule: string }) {
  const normalized = schedule?.trim() || '';
  if (!normalized || normalized === 'N/A' || normalized.toLowerCase() === 'not scheduled') {
    return <Text style={styles.scheduleMuted}>Not scheduled</Text>;
  }

  const parts = schedule.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <Text style={styles.infoValue}>{schedule}</Text>;
  }

  return (
    <View style={styles.scheduleChips}>
      {parts.map((day, i) => (
        <View key={`${day}-${i}`} style={styles.scheduleChip}>
          <Text style={styles.scheduleChipText}>{day.length <= 4 ? day : day.slice(0, 3)}</Text>
        </View>
      ))}
    </View>
  );
}

function formatRoom(room: string) {
  if (!room || room === '—' || room === 'N/A') return '—';
  if (room.toLowerCase().startsWith('room')) return room;
  return `Room ${room}`;
}

export default function TeacherClassCard({
  name,
  subject,
  studentCount,
  schedule,
  room,
  expanded,
  onToggleStudents,
  students = [],
  onViewStudentAnalysis,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.className}>{name}</Text>
          <View style={styles.subjectRow}>
            <Ionicons name="book-outline" size={14} color="#6366f1" />
            <Text style={styles.subjectText} numberOfLines={1}>{subject}</Text>
          </View>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelWrap}>
            <Ionicons name="people-outline" size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Students</Text>
          </View>
          <Text style={styles.infoValue}>{studentCount}</Text>
        </View>

        <View style={[styles.infoRow, styles.infoRowSchedule]}>
          <View style={styles.infoLabelWrap}>
            <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Schedule</Text>
          </View>
          <ScheduleDisplay schedule={schedule} />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelWrap}>
            <Ionicons name="business-outline" size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Room</Text>
          </View>
          <Text style={styles.infoValue}>{formatRoom(room)}</Text>
        </View>
      </View>

      {expanded && students.length > 0 ? (
        <View style={styles.rosterSection}>
          <Text style={styles.rosterTitle}>STUDENTS</Text>
          <ScrollView style={styles.rosterScroll} nestedScrollEnabled>
            {students.map((student) => (
              <View key={student.id} style={styles.studentRow}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  <Text style={styles.studentEmail} numberOfLines={1}>{student.email}</Text>
                </View>
                <View style={styles.studentActions}>
                  {onViewStudentAnalysis ? (
                    <Pressable
                      style={styles.analysisBtn}
                      onPress={() => onViewStudentAnalysis(student.id)}
                    >
                      <Ionicons name="bar-chart-outline" size={14} color="#4338ca" />
                      <Text style={styles.analysisBtnText}>Analysis</Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{student.status || 'active'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Pressable onPress={onToggleStudents} style={styles.btnWrap}>
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.viewBtn}
        >
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#fff" />
          <Text style={styles.viewBtnText}>{expanded ? 'Hide Students' : 'View Students'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  headerText: { flex: 1, minWidth: 0 },
  className: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    flex: 1,
  },
  activeBadge: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
  },
  infoBlock: { gap: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoRowSchedule: { alignItems: 'flex-start' },
  infoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  scheduleMuted: {
    fontSize: 12,
    color: '#6b7280',
  },
  scheduleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  scheduleChip: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  scheduleChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
  },
  rosterSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  rosterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  rosterScroll: { maxHeight: 220 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  studentInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  studentEmail: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  studentActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  analysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
  },
  analysisBtnText: { fontSize: 11, fontWeight: '700', color: '#4338ca' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    textTransform: 'capitalize',
  },
  btnWrap: { marginTop: 16 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  viewBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
