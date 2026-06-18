import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ExamDayRole } from '../../lib/exam-calendar-entries';
import {
  formatExamDateRange,
  getExamCardGradientScheme,
  getExamClassLabels,
  getExamDayRoleLabelForCard,
  getExamStatus,
  getHydratedQuestionCount,
  getMaxAttemptsForExam,
  type StudentExamLike,
} from '../../lib/student-exam-display';
import { STUDENT_RADIUS } from '../../theme/student';

type Props = {
  exam: StudentExamLike;
  examDayRole?: ExamDayRole;
  usedAttempts?: number;
  studentClassNumber?: string | number | null;
  hasAttempted?: boolean;
  focused?: boolean;
  colorIndex?: number;
  variant?: 'available' | 'upcoming';
  style?: ViewStyle;
  onViewInExams?: () => void;
  onStartPress?: () => void;
};

type StatItem = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

export default function StudentExamPreviewCard({
  exam,
  examDayRole,
  usedAttempts = 0,
  studentClassNumber,
  hasAttempted = false,
  focused = false,
  colorIndex = 0,
  variant = 'available',
  style,
  onViewInExams,
  onStartPress,
}: Props) {
  const status = variant === 'upcoming' ? { status: 'upcoming' as const } : getExamStatus(exam);
  const scheme = getExamCardGradientScheme(colorIndex);
  const classLabels = getExamClassLabels(exam, studentClassNumber);
  const maxAttempts = getMaxAttemptsForExam(exam);
  const questionCount = getHydratedQuestionCount(exam);
  const dateRange = formatExamDateRange(exam);
  const dayRoleLabel = !hasAttempted ? getExamDayRoleLabelForCard(examDayRole) : null;
  const attemptsExhausted = usedAttempts >= maxAttempts;
  const canStart =
    variant === 'available' && status.status === 'active' && !attemptsExhausted && onStartPress;
  const isUpcoming = variant === 'upcoming' || status.status === 'upcoming';

  const stats: StatItem[] = [];
  if (exam.duration) {
    stats.push({ icon: 'time-outline', text: `${exam.duration} minutes` });
  }
  stats.push({
    icon: 'book-outline',
    text: `${questionCount} questions • ${exam.totalMarks || 0} marks`,
  });
  if (variant === 'upcoming' && exam.startDate && exam.endDate) {
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    if (!Number.isNaN(start.getTime())) {
      stats.push({ icon: 'calendar-outline', text: `Starts: ${start.toLocaleDateString()}` });
    }
    if (!Number.isNaN(end.getTime())) {
      stats.push({ icon: 'calendar-outline', text: `Ends: ${end.toLocaleDateString()}` });
    }
  } else if (dateRange) {
    stats.push({ icon: 'calendar-outline', text: dateRange });
  }
  stats.push({ icon: 'locate-outline', text: `Attempts: ${usedAttempts} / ${maxAttempts}` });

  return (
    <LinearGradient
      colors={scheme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, focused && styles.cardFocused, style]}
    >
      <Text style={styles.title}>{exam.title || 'Exam'}</Text>
      {exam.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {exam.description}
        </Text>
      ) : null}

      <View style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: scheme.typeBadgeBg }]}>
          <Text style={[styles.typeBadgeText, { color: scheme.typeBadgeText }]}>
            {(exam.examType || 'practice').toUpperCase()}
          </Text>
        </View>
        {classLabels.map((cl) => (
          <View key={cl} style={styles.classPill}>
            <Text style={styles.classPillText}>Class {cl}</Text>
          </View>
        ))}
        {hasAttempted ? (
          <View style={styles.attemptedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.attemptedBadgeText}>
              {attemptsExhausted ? 'COMPLETED' : 'ATTEMPTED'}
            </Text>
          </View>
        ) : dayRoleLabel ? (
          <View style={[styles.statusPill, styles.dayRoleBadge]}>
            <Text style={styles.statusPillText}>{dayRoleLabel}</Text>
          </View>
        ) : status.status === 'ended' ? (
          <View style={[styles.statusPill, styles.statusEnded]}>
            <Text style={styles.statusPillText}>ENDED</Text>
          </View>
        ) : isUpcoming ? (
          <View style={[styles.statusPill, styles.statusUpcoming]}>
            <Text style={styles.statusPillText}>UPCOMING</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, styles.statusActive]}>
            <Text style={styles.statusPillText}>ACTIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.statsList}>
        {stats.map((stat, index) => (
          <View key={`${stat.icon}-${index}`} style={styles.statRow}>
            <Ionicons name={stat.icon} size={14} color="#fff" />
            <Text style={styles.statText}>{stat.text}</Text>
          </View>
        ))}
      </View>

      {canStart ? (
        <TouchableOpacity style={styles.startButton} onPress={onStartPress} activeOpacity={0.85}>
          <Ionicons name="play" size={16} color="#111827" />
          <Text style={styles.startButtonText}>Start Exam</Text>
        </TouchableOpacity>
      ) : variant === 'upcoming' ? (
        <View style={styles.upcomingButton}>
          <Ionicons name="calendar-outline" size={16} color="#111827" />
          <Text style={styles.upcomingButtonText}>Not Yet Available</Text>
        </View>
      ) : null}
      {hasAttempted && onViewInExams ? (
        <TouchableOpacity style={styles.reviewRow} onPress={onViewInExams} activeOpacity={0.85}>
          <Ionicons name="eye-outline" size={16} color="#fff" />
          <Text style={styles.reviewText}>View in Attempted Exams</Text>
        </TouchableOpacity>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardFocused: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  typeBadge: {
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  classPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  classPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  statusPill: {
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  statusActive: {
    backgroundColor: '#0d9488',
  },
  statusEnded: {
    backgroundColor: '#dc2626',
  },
  statusUpcoming: {
    backgroundColor: '#ca8a04',
  },
  dayRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  attemptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  attemptedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  statsList: {
    gap: 8,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
    flexShrink: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: STUDENT_RADIUS.sm,
    paddingVertical: 12,
  },
  startButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  upcomingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: STUDENT_RADIUS.sm,
    paddingVertical: 12,
    opacity: 0.85,
  },
  upcomingButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
