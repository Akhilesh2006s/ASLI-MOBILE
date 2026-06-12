import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExamDayRole } from '../../lib/exam-calendar-entries';
import {
  formatExamDateRange,
  getExamClassLabels,
  getExamDayRoleLabelForCard,
  getExamStatus,
  getExamTypeColor,
  getHydratedQuestionCount,
  getMaxAttemptsForExam,
  type StudentExamLike,
} from '../../lib/student-exam-display';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';

type Props = {
  exam: StudentExamLike;
  examDayRole?: ExamDayRole;
  usedAttempts?: number;
  studentClassNumber?: string | number | null;
  hasAttempted?: boolean;
  onViewInExams?: () => void;
  onStartPress?: () => void;
};

export default function StudentExamPreviewCard({
  exam,
  examDayRole,
  usedAttempts = 0,
  studentClassNumber,
  hasAttempted = false,
  onViewInExams,
  onStartPress,
}: Props) {
  const status = getExamStatus(exam);
  const typeColor = getExamTypeColor(exam.examType);
  const classLabels = getExamClassLabels(exam, studentClassNumber);
  const maxAttempts = getMaxAttemptsForExam(exam);
  const questionCount = getHydratedQuestionCount(exam);
  const dateRange = formatExamDateRange(exam);
  const dayRoleLabel = !hasAttempted ? getExamDayRoleLabelForCard(examDayRole) : null;
  const attemptsExhausted = usedAttempts >= maxAttempts;
  const canStart = status.status === 'active' && !attemptsExhausted && onStartPress;

  return (
    <View style={[styles.card, hasAttempted && styles.cardAttempted]}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>
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
            <Ionicons name="checkmark-circle" size={12} color="#047857" />
            <Text style={styles.attemptedBadgeText}>
              {attemptsExhausted ? 'COMPLETED' : 'ATTEMPTED'}
            </Text>
          </View>
        ) : dayRoleLabel ? (
          <View style={[styles.dayRoleBadge, roleBadgeStyle(examDayRole)]}>
            <Text style={[styles.dayRoleText, roleTextStyle(examDayRole)]}>{dayRoleLabel}</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{exam.title || 'Exam'}</Text>
      {exam.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {exam.description}
        </Text>
      ) : null}

      <View style={styles.stats}>
        {exam.duration ? (
          <View style={styles.statRow}>
            <Ionicons name="time-outline" size={16} color={STUDENT.textMuted} />
            <Text style={styles.statText}>{exam.duration} minutes</Text>
          </View>
        ) : null}
        <View style={styles.statRow}>
          <Ionicons name="book-outline" size={16} color={STUDENT.textMuted} />
          <Text style={styles.statText}>
            {questionCount} questions • {exam.totalMarks || 0} marks
          </Text>
        </View>
        {dateRange ? (
          <View style={styles.statRow}>
            <Ionicons name="calendar-outline" size={16} color={STUDENT.textMuted} />
            <Text style={styles.statText}>{dateRange}</Text>
          </View>
        ) : null}
        <View style={styles.statRow}>
          <Ionicons name="locate-outline" size={16} color={STUDENT.textMuted} />
          <Text style={styles.statText}>
            Attempts: {usedAttempts} / {maxAttempts}
          </Text>
        </View>
      </View>

      {canStart ? (
        <TouchableOpacity style={styles.startButton} onPress={onStartPress} activeOpacity={0.85}>
          <Text style={styles.startButtonText}>Start Exam</Text>
        </TouchableOpacity>
      ) : null}
      {hasAttempted && onViewInExams ? (
        <TouchableOpacity style={styles.reviewRow} onPress={onViewInExams} activeOpacity={0.85}>
          <Ionicons name="eye-outline" size={16} color={STUDENT.primary} />
          <Text style={styles.reviewText}>View in Attempted Exams</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function roleBadgeStyle(role: ExamDayRole | undefined) {
  switch (role) {
    case 'start':
      return { backgroundColor: '#d1fae5' };
    case 'end':
      return { backgroundColor: '#ffe4e6' };
    case 'middle':
      return { backgroundColor: '#ffedd5' };
    default:
      return { backgroundColor: '#dbeafe' };
  }
}

function roleTextStyle(role: ExamDayRole | undefined) {
  switch (role) {
    case 'start':
      return { color: '#047857' };
    case 'end':
      return { color: '#be123c' };
    case 'middle':
      return { color: '#c2410c' };
    default:
      return { color: '#2563eb' };
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.inner,
    padding: 12,
    marginBottom: 8,
    backgroundColor: STUDENT.surface,
  },
  cardAttempted: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  classPill: {
    backgroundColor: '#fff',
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.text,
  },
  statusBadge: {
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 'auto',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dayRoleBadge: {
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 'auto',
  },
  dayRoleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  attemptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 'auto',
    backgroundColor: '#d1fae5',
  },
  attemptedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
  },
  description: {
    fontSize: 13,
    color: STUDENT.textMuted,
    marginTop: 4,
  },
  stats: {
    gap: 6,
    marginTop: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    flex: 1,
  },
  startButton: {
    marginTop: 12,
    backgroundColor: STUDENT.accent,
    borderRadius: STUDENT_RADIUS.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: STUDENT.textOnPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  linkHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.primary,
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
    color: STUDENT.primary,
  },
});
