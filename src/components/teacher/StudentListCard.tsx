import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  formatClassBadge,
  formatLastLogin,
  progressColors,
  progressTier,
  type StudentRow,
} from '../../lib/students-ui';
import { TEACHER, glassCard } from '../../theme/teacher';

type Props = {
  student: StudentRow;
  onAddRemark: () => void;
};

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function StudentListCard({ student, onAddRemark }: Props) {
  const press = usePressScale();
  const perf = student.performance || {};
  const classLabel = formatClassBadge(student);
  const lastLogin = formatLastLogin(student.lastLogin);
  const overall = perf.overallProgress ?? 0;
  const learning = perf.learningProgress ?? 0;
  const hasOverall = overall > 0;
  const overallTier = progressTier(overall);
  const overallColors = progressColors(overallTier);
  const learningTier = progressTier(learning);
  const learningColors = progressColors(learningTier);

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.email}>{student.email}</Text>
        </View>
        <View style={[styles.statusBadge, student.isActive !== false ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, student.isActive !== false ? styles.activeText : styles.inactiveText]}>
            {student.isActive !== false ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Ionicons name="call-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Contact</Text>
          <Text style={styles.metaValue}>{student.phone?.trim() || 'No phone'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="school-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Class</Text>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>{classLabel}</Text>
          </View>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Last Login</Text>
          {lastLogin ? (
            <>
              <Text style={styles.metaValue}>{lastLogin.date}</Text>
              <Text style={styles.metaSub}>{lastLogin.time}</Text>
            </>
          ) : (
            <Text style={styles.metaMuted}>Never</Text>
          )}
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="stats-chart-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Average</Text>
          {(perf.totalExams ?? 0) > 0 ? (
            <>
              <Text style={styles.metaValue}>{(perf.averageMarks ?? 0).toFixed(1)}</Text>
              <Text style={styles.metaSub}>
                {perf.totalExams} exam{(perf.totalExams ?? 0) !== 1 ? 's' : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.metaMuted}>-</Text>
          )}
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Overall Progress</Text>
        {hasOverall ? (
          <>
            <View style={styles.progressHeader}>
              <View style={[styles.pill, { backgroundColor: overallColors.bg + '33' }]}>
                <Text style={[styles.pillText, { color: overallColors.text }]}>
                  {overall.toFixed(1)}%
                </Text>
              </View>
            </View>
            <ProgressBar value={overall} color={overallColors.bar} />
            {(perf.totalExams ?? 0) > 0 ? (
              <Text style={styles.progressNote}>
                {perf.totalExams} exam{(perf.totalExams ?? 0) !== 1 ? 's' : ''} completed
              </Text>
            ) : null}
            {learning > 0 ? (
              <View style={styles.learningBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.learningLabel}>Learning Progress</Text>
                  <View style={[styles.pill, { backgroundColor: learningColors.bg + '33' }]}>
                    <Text style={[styles.pillText, { color: learningColors.text }]}>
                      {learning.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                <ProgressBar value={learning} color={learningColors.bar} />
              </View>
            ) : null}
          </>
        ) : (
          <View>
            <Text style={styles.metaMuted}>No progress data</Text>
            {(perf.totalExams ?? 0) === 0 ? (
              <Text style={styles.progressNote}>No exams taken</Text>
            ) : null}
            {learning === 0 ? (
              <Text style={styles.progressNote}>No content completed</Text>
            ) : null}
          </View>
        )}
      </View>

      <Pressable
        onPress={onAddRemark}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.remarkBtnWrap}
      >
        <Animated.View style={press.style}>
          <LinearGradient
            colors={['#9333ea', '#db2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.remarkBtn}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.remarkBtnText}>Add Remark</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glassCard,
    backgroundColor: TEACHER.cardBg,
    padding: 16,
    gap: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  email: { fontSize: 13, color: TEACHER.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  activeBadge: { backgroundColor: 'rgba(0,214,143,0.15)', borderColor: 'rgba(0,214,143,0.3)' },
  inactiveBadge: { backgroundColor: 'rgba(255,77,106,0.15)', borderColor: 'rgba(255,77,106,0.3)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  activeText: { color: TEACHER.success },
  inactiveText: { color: TEACHER.danger },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { width: '47%', gap: 2 },
  metaLabel: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted, marginTop: 2 },
  metaValue: { fontSize: 14, fontWeight: '600', color: TEACHER.text },
  metaSub: { fontSize: 11, color: TEACHER.textMuted },
  metaMuted: { fontSize: 13, color: TEACHER.textMuted },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: TEACHER.surfaceHover,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  classBadgeText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryDark },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
    paddingTop: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: TEACHER.textMuted },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressNote: { fontSize: 11, color: TEACHER.textMuted },
  learningBlock: { marginTop: 4, gap: 6 },
  learningLabel: { fontSize: 12, color: TEACHER.textMuted },
  remarkBtnWrap: { borderRadius: 12, overflow: 'hidden' },
  remarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  remarkBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
