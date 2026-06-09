import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DetailedAnalysisView from '../../../app/dashboard/_components/DetailedAnalysisView';
import {
  ExamAnalysisResult,
  formatExamTime,
  getDisplayPercentage,
  getGradeLetter,
} from '../../lib/exam-analysis-helpers';

type Props = {
  result: ExamAnalysisResult;
  examTitle: string;
  onBack: () => void;
  onRetake: () => void;
  attemptsRemaining?: number;
  openDetailedByDefault?: boolean;
};

function gradeStyle(percentage: number) {
  if (percentage >= 70) return { color: '#16a34a', bg: '#dcfce7' };
  if (percentage >= 50) return { color: '#d97706', bg: '#fef3c7' };
  return { color: '#dc2626', bg: '#fee2e2' };
}

function subjectStyle(subject: string) {
  const map: Record<string, { bg: string; color: string }> = {
    maths: { bg: '#dbeafe', color: '#2563eb' },
    math: { bg: '#dbeafe', color: '#2563eb' },
    physics: { bg: '#dcfce7', color: '#16a34a' },
    chemistry: { bg: '#f3e8ff', color: '#7c3aed' },
    biology: { bg: '#d1fae5', color: '#059669' },
  };
  return map[subject.toLowerCase()] || { bg: '#f3f4f6', color: '#4b5563' };
}

export default function ExamResultsView({
  result,
  examTitle,
  onBack,
  onRetake,
  attemptsRemaining = 0,
  openDetailedByDefault = false,
}: Props) {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(openDetailedByDefault);

  if (showDetailedAnalysis) {
    return (
      <DetailedAnalysisView
        result={result}
        examTitle={examTitle}
        onBack={() => setShowDetailedAnalysis(false)}
      />
    );
  }

  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const attemptedCount = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const displayPercentage = getDisplayPercentage(result);
  const accuracyRate = attemptedCount > 0 ? (result.correctAnswers / attemptedCount) * 100 : 0;
  const completionRate = totalQuestionCount > 0 ? (attemptedCount / totalQuestionCount) * 100 : 0;
  const grade = getGradeLetter(displayPercentage);
  const gradeColors = gradeStyle(displayPercentage);
  const subjectScores = result.subjectWiseScore || {};

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="trophy" size={48} color="#eab308" />
          <Text style={styles.heroTitle}>Exam Completed!</Text>
          <Text style={styles.heroSubtitle}>{examTitle}</Text>
          {Number(result.attemptNumber) >= 1 ? (
            <Text style={styles.attemptLabel}>Attempt {Number(result.attemptNumber)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Performance</Text>
          <View style={styles.performanceRow}>
            <View style={styles.scoreCircleWrap}>
              <View style={[styles.scoreCircle, { borderColor: gradeColors.color }]}>
                <Text style={styles.scorePct}>{displayPercentage.toFixed(1)}%</Text>
                <Text style={[styles.scoreGrade, { color: gradeColors.color }]}>{grade}</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: gradeColors.bg }]}>
                <Ionicons name="ribbon" size={14} color={gradeColors.color} />
                <Text style={[styles.gradeBadgeText, { color: gradeColors.color }]}>{grade} Grade</Text>
              </View>
            </View>

            <View style={styles.statsCol}>
              <Text style={styles.marksBig}>{result.obtainedMarks}</Text>
              <Text style={styles.marksSub}>out of {result.totalMarks} marks</Text>
              <View style={styles.statLines}>
                <Text style={styles.statGreen}>Correct: {result.correctAnswers}</Text>
                <Text style={styles.statRed}>Wrong: {result.wrongAnswers}</Text>
                <Text style={styles.statMuted}>Unattempted: {result.unattempted}</Text>
                <Text style={styles.statMuted}>Time: {formatExamTime(result.timeTaken)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricBlock}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Accuracy</Text>
              <Text style={styles.metricValue}>{accuracyRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, accuracyRate)}%`, backgroundColor: '#16a34a' }]} />
            </View>
          </View>

          <View style={styles.metricBlock}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Completion</Text>
              <Text style={styles.metricValue}>{completionRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, completionRate)}%`, backgroundColor: '#2563eb' }]} />
            </View>
          </View>
        </View>

        {Object.keys(subjectScores).length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subject-wise Performance</Text>
            <View style={styles.subjectGrid}>
              {Object.entries(subjectScores).map(([subject, score]) => {
                const pct = score.total > 0 ? (score.correct / score.total) * 100 : 0;
                const colors = subjectStyle(subject);
                return (
                  <View key={subject} style={styles.subjectCard}>
                    <View style={[styles.subjectIcon, { backgroundColor: colors.bg }]}>
                      <Ionicons name="book" size={22} color={colors.color} />
                    </View>
                    <Text style={styles.subjectName}>{subject}</Text>
                    <Text style={styles.subjectPct}>{pct.toFixed(1)}%</Text>
                    <Text style={styles.subjectMeta}>
                      {score.correct}/{score.total} correct
                    </Text>
                    <Text style={styles.subjectMarks}>{score.marks} marks</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detailed Analysis</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownHeading}>Question Breakdown</Text>
              <BreakdownLine icon="checkmark-circle" color="#16a34a" label="Correct Answers" value={result.correctAnswers} />
              <BreakdownLine icon="close-circle" color="#dc2626" label="Wrong Answers" value={result.wrongAnswers} />
              <BreakdownLine icon="help-circle" color="#6b7280" label="Unattempted" value={result.unattempted} />
            </View>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownHeading}>Time Analysis</Text>
              <BreakdownLine icon="time" color="#2563eb" label="Time Taken" value={formatExamTime(result.timeTaken)} />
              <BreakdownLine
                icon="calculator"
                color="#7c3aed"
                label="Avg. per Question"
                value={formatExamTime(Math.floor(result.timeTaken / Math.max(1, totalQuestionCount)))}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommendations</Text>
          {displayPercentage < 50 ? (
            <Recommendation
              tone="red"
              title="Need More Practice"
              body="Focus on fundamental concepts and practice more questions in your weak areas."
            />
          ) : null}
          {displayPercentage >= 50 && displayPercentage < 70 ? (
            <Recommendation
              tone="amber"
              title="Good Progress"
              body="You're on the right track! Focus on improving accuracy and speed."
            />
          ) : null}
          {displayPercentage >= 70 ? (
            <Recommendation
              tone="green"
              title="Excellent Performance!"
              body="Great job! Keep up the good work and aim for even higher scores."
            />
          ) : null}
          {result.unattempted > 0 ? (
            <Recommendation
              tone="blue"
              title="Time Management"
              body={`You had ${result.unattempted} unattempted questions. Practice time management to attempt all questions.`}
            />
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={onBack}>
            <Text style={styles.outlineBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
          {attemptsRemaining > 0 ? (
            <TouchableOpacity style={[styles.outlineBtn, styles.retakeBtn]} onPress={onRetake}>
              <Text style={[styles.outlineBtnText, styles.retakeBtnText]}>
                Retake ({attemptsRemaining} left)
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowDetailedAnalysis(true)}>
            <Ionicons name="eye" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>View Detailed Analysis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownLine({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.breakdownLine}>
      <View style={styles.breakdownLeft}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={styles.breakdownLabel}>{label}</Text>
      </View>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
    </View>
  );
}

function Recommendation({
  tone,
  title,
  body,
}: {
  tone: 'red' | 'amber' | 'green' | 'blue';
  title: string;
  body: string;
}) {
  const tones = {
    red: { bg: '#fef2f2', border: '#fecaca', title: '#991b1b', body: '#b91c1c', icon: 'alert-circle' as const },
    amber: { bg: '#fffbeb', border: '#fde68a', title: '#92400e', body: '#b45309', icon: 'trending-up' as const },
    green: { bg: '#f0fdf4', border: '#bbf7d0', title: '#166534', body: '#15803d', icon: 'trophy' as const },
    blue: { bg: '#eff6ff', border: '#bfdbfe', title: '#1e40af', body: '#1d4ed8', icon: 'flag' as const },
  };
  const t = tones[tone];
  return (
    <View style={[styles.recoBox, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Ionicons name={t.icon} size={20} color={t.body} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.recoTitle, { color: t.title }]}>{title}</Text>
        <Text style={[styles.recoBody, { color: t.body }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 20 },
  heroTitle: { marginTop: 12, fontSize: 26, fontWeight: '800', color: '#111827' },
  heroSubtitle: { marginTop: 4, fontSize: 16, color: '#6b7280', textAlign: 'center' },
  attemptLabel: { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14, textAlign: 'center' },
  performanceRow: { gap: 16 },
  scoreCircleWrap: { alignItems: 'center' },
  scoreCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scorePct: { fontSize: 24, fontWeight: '800', color: '#111827' },
  scoreGrade: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gradeBadgeText: { fontSize: 13, fontWeight: '700' },
  statsCol: { alignItems: 'center' },
  marksBig: { fontSize: 32, fontWeight: '800', color: '#111827' },
  marksSub: { fontSize: 13, color: '#6b7280' },
  statLines: { marginTop: 10, gap: 4, alignItems: 'center' },
  statGreen: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  statRed: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  statMuted: { fontSize: 13, color: '#6b7280' },
  metricBlock: { marginTop: 14 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metricLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },
  metricValue: { fontSize: 13, color: '#111827', fontWeight: '700' },
  track: { height: 8, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  subjectCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  subjectIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  subjectName: { fontSize: 14, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  subjectPct: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  subjectMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  subjectMarks: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 4 },
  breakdownRow: { gap: 16 },
  breakdownCol: { gap: 8 },
  breakdownHeading: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  breakdownLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  breakdownLabel: { fontSize: 14, color: '#374151' },
  breakdownValue: { fontSize: 14, fontWeight: '700' },
  recoBox: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  recoTitle: { fontSize: 14, fontWeight: '800' },
  recoBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  actions: { gap: 10, marginTop: 4 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  retakeBtn: { borderColor: '#c7d2fe' },
  retakeBtnText: { color: '#4338ca' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
