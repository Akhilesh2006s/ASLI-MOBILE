import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getContentTypeLabel,
  getSubjectName,
  getTaskTimeLabel,
} from '../../../../src/lib/todays-tasks-helpers';
import {
  getVideoDisplayTitle,
  isVideoContentType,
} from '../../../../src/lib/video-chapter-schedule';
import { STUDENT } from '../../../../src/theme/student';

type Props = {
  incompleteQuizzes: any[];
  incompleteContent: any[];
  completedScheduleIds: Set<string>;
  isLoading?: boolean;
  onToggleComplete: (item: any, isQuiz: boolean) => void;
  onOpenItem: (item: any, isQuiz: boolean) => void;
};

function TodaysTasksSectionComponent({
  incompleteQuizzes,
  incompleteContent,
  completedScheduleIds,
  isLoading,
  onToggleComplete,
  onOpenItem,
}: Props) {
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#6b7280" />
          </View>
          <Text style={styles.headerTitle}>TODAY&apos;S TASKS</Text>
        </View>
        <Text style={styles.headerDate}>{dateLabel}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={STUDENT.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : incompleteQuizzes.length === 0 && incompleteContent.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySub}>No pending content or quizzes</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {incompleteQuizzes.map((quiz) => {
            const id = String(quiz._id || quiz.id);
            const isCompleted = completedScheduleIds.has(id);
            const timeLabel = getTaskTimeLabel(quiz, true);
            return (
              <TouchableOpacity
                key={`quiz-${id}`}
                style={[styles.row, isCompleted && styles.rowDone]}
                onPress={() => onOpenItem(quiz, true)}
                activeOpacity={0.85}
              >
                <TouchableOpacity
                  style={styles.checkWrap}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onToggleComplete(quiz, true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isCompleted ? (
                    <View style={styles.checkDone}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.checkEmpty} />
                  )}
                </TouchableOpacity>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, isCompleted && styles.rowTitleDone]} numberOfLines={2}>
                    Complete {quiz.title || 'Quiz'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {typeof quiz.subject === 'string'
                        ? quiz.subject
                        : quiz.subject?.name || 'Unknown Subject'}
                    </Text>
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>Quiz</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.timePill}>
                  <Text style={styles.timePillText}>{isCompleted ? 'Done' : timeLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {incompleteContent.map((content) => {
            const id = String(content._id || content.id);
            const isCompleted = completedScheduleIds.has(id);
            const isVideo = isVideoContentType(content.type);
            const isHomework = String(content.type || '').toLowerCase() === 'homework';
            const subjectName = getSubjectName(content);
            const timeLabel = getTaskTimeLabel(content, false);
            const deadline = content.deadline ? new Date(content.deadline) : null;
            const isOverdue = deadline && deadline < new Date() && !isCompleted;
            const title = isVideo
              ? getVideoDisplayTitle(content)
              : `${getContentTypeLabel(content.type || 'Material')} ${content.title || 'Content'}`;

            return (
              <TouchableOpacity
                key={`content-${id}`}
                style={[styles.row, isCompleted && styles.rowDone, isOverdue && styles.rowOverdue]}
                onPress={() => onOpenItem(content, false)}
                activeOpacity={0.85}
              >
                <TouchableOpacity
                  style={styles.checkWrap}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    if (isVideo && !isCompleted) {
                      onOpenItem(content, false);
                      return;
                    }
                    onToggleComplete(content, false);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isCompleted ? (
                    <View style={styles.checkDone}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  ) : isVideo ? (
                    <View style={styles.playCircle}>
                      <Ionicons name="play" size={12} color="#0284c7" />
                    </View>
                  ) : (
                    <View style={styles.checkEmpty} />
                  )}
                </TouchableOpacity>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, isCompleted && styles.rowTitleDone]} numberOfLines={2}>
                    {title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {subjectName}
                    </Text>
                    {content.type ? (
                      <View style={styles.typePill}>
                        <Text style={styles.typePillText}>{content.type}</Text>
                      </View>
                    ) : null}
                    {isHomework && deadline ? (
                      <View style={[styles.duePill, isOverdue && styles.duePillOverdue]}>
                        <Text style={[styles.dueText, isOverdue && styles.dueTextOverdue]}>
                          Due: {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.timePill}>
                  <Text style={styles.timePillText}>{isCompleted ? 'Done' : timeLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.3,
  },
  headerDate: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 13, color: '#6b7280' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#6b7280' },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowDone: { backgroundColor: '#ecfdf5' },
  rowOverdue: { backgroundColor: '#fef2f2' },
  checkWrap: { padding: 2 },
  checkEmpty: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  checkDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#38bdf8',
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowTitleDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 11, color: '#6b7280', maxWidth: '45%' },
  typePill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: { fontSize: 10, fontWeight: '600', color: '#4b5563' },
  duePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  duePillOverdue: { backgroundColor: '#fee2e2' },
  dueText: { fontSize: 10, fontWeight: '600', color: '#dc2626' },
  dueTextOverdue: { color: '#b91c1c' },
  timePill: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timePillText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
});

export default memo(TodaysTasksSectionComponent);
