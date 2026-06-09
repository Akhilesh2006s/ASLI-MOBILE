export type SubjectScore = { correct: number; total: number; marks: number };

export type ExamAnalysisResult = {
  _id?: string;
  examId: string;
  examTitle?: string;
  attemptNumber?: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeTaken: number;
  subjectWiseScore?: Record<string, SubjectScore>;
  answers?: Record<string, unknown>;
  questions?: any[];
};

export type AiExamAnalysis = {
  summary?: string;
  strengths?: string[];
  rootCauses?: string[];
  motivation?: string;
  predictions?: { trend?: string };
  actionPlan?: { today?: string[]; thisWeek?: string[]; beforeNextExam?: string[] };
  focusAreas?: Array<{ subject: string; issue: string; whatToDo: string }>;
  questionInsights?: Array<{
    index?: number;
    subject?: string;
    status?: string;
    conceptGap?: string;
    insight?: string;
    fixStrategy?: string;
  }>;
};

export type PlanTopic = { topicNum: number; title: string; subtitle: string; duration: string };
export type PlanQueueItem = { id: string; minutes: number; title: string; tier: 'warmup' | 'core' | 'stretch' };

export function normalizeMongoId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && '_id' in (value as object)) {
    return normalizeMongoId((value as { _id?: unknown })._id);
  }
  return String(value).trim();
}

export function formatExamTime(seconds: number): string {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function getDisplayPercentage(result: ExamAnalysisResult): number {
  const correct = Number(result.correctAnswers || 0);
  const wrong = Number(result.wrongAnswers || 0);
  const unattempted = Number(result.unattempted || 0);
  const total = Number(result.totalQuestions || 0) || correct + wrong + unattempted;
  return total > 0 ? (correct / total) * 100 : 0;
}

export function getExamResultRowId(result: {
  _id?: unknown;
  id?: unknown;
  attemptNumber?: number;
  examId?: unknown;
}): string {
  const id = result?._id ?? result?.id;
  if (id != null && String(id).trim() !== '') return String(id);
  const att = Number(result?.attemptNumber) >= 1 ? Number(result.attemptNumber) : 1;
  const eid = result?.examId != null ? String(result.examId) : '';
  return `${eid || 'exam'}-attempt-${att}`;
}

export function formatAttemptHistoryLabel(
  result: {
    attemptNumber?: number;
    obtainedMarks?: number;
    totalMarks?: number;
    completedAt?: string;
  },
  totalMarks: number
): string {
  const att = Number(result?.attemptNumber) >= 1 ? Number(result.attemptNumber) : 1;
  const obtained = result?.obtainedMarks ?? 0;
  const total = result?.totalMarks || totalMarks || 0;
  const when = result?.completedAt
    ? new Date(result.completedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  return `Attempt ${att} — ${obtained}/${total} marks${when ? ` (${when})` : ''}`;
}

export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  return 'D';
}

export function getOptionText(option: unknown, subject?: string): string {
  if (option == null) return '';
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return String(option);
  }
  if (typeof option === 'object' && !Array.isArray(option)) {
    const o = option as Record<string, unknown>;
    if (o.text != null) return String(o.text);
    if (o.label != null) return String(o.label);
    if (o.value != null) return String(o.value);
  }
  if (Array.isArray(option)) return option.map((o) => getOptionText(o, subject)).join(', ');
  return String(option);
}

export function compareAnswers(question: any, userAnswer: unknown, correctAnswer: unknown): boolean {
  if (userAnswer == null && userAnswer !== 0) return false;
  const type = question?.questionType;
  if (type === 'multiple') {
    const correct = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const user = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    const norm = (arr: unknown[]) =>
      arr.map((a) => getOptionText(a, question?.subject).toLowerCase().trim()).sort().join('|');
    return norm(correct as unknown[]) === norm(user as unknown[]);
  }
  const correct = Array.isArray(correctAnswer) ? getOptionText(correctAnswer[0], question?.subject) : getOptionText(correctAnswer, question?.subject);
  const user = Array.isArray(userAnswer) ? getOptionText(userAnswer[0], question?.subject) : getOptionText(userAnswer, question?.subject);
  return user.toLowerCase().trim() === correct.toLowerCase().trim();
}

export function getUserAnswerForQuestion(question: any, index: number, answers?: Record<string, unknown>): unknown {
  const map = answers || {};
  const keys = [question?._id, String(question?._id), `q${index}`, `Q${index + 1}`, index, index + 1];
  for (const key of keys) {
    if (key == null || key === '') continue;
    if (map[String(key)] !== undefined) return map[String(key)];
  }
  return undefined;
}

export function generatePlanTopics(aiAnalysis: AiExamAnalysis | null): PlanTopic[] {
  const weekActions = aiAnalysis?.actionPlan?.thisWeek || [];
  const focus = aiAnalysis?.focusAreas || [];
  const topics = focus.map((f) => {
    const m = String(f.issue || '').match(/in\s+(.+?)(?:\s*\(|$)/i);
    return m?.[1]?.trim() || f.subject;
  });
  const defaults = ['Rotation', 'Slow-Mode Read', 'Friction', 'Pacing Drill', 'Calorimetry', 'Calculus', 'Mock Retake'];
  const subtitles = ['Concept + 10 Qs', 'Read twice', 'Build on prior topic', 'Timed 15-Q drill', 'Concept + 10 Q', 'Core maths practice', 'Full mock retake'];
  const durations = ['25 min', '15 min', '25 min', '20 min', '25 min', '30 min', '35 min'];
  return Array.from({ length: 7 }, (_, i) => ({
    topicNum: i + 1,
    title: topics[i] || weekActions[i]?.slice(0, 48) || defaults[i],
    subtitle: subtitles[i],
    duration: durations[i],
  }));
}

export function generatePlanQueueItems(topicTitle: string, topicIndex: number): {
  warmup: PlanQueueItem[];
  core: PlanQueueItem[];
  stretch: PlanQueueItem[];
} {
  const concept = topicTitle || 'Focus';
  const warmup: PlanQueueItem[] = [
    { id: 'w1', minutes: 1, title: `${concept}: quick recall`, tier: 'warmup' },
    { id: 'w2', minutes: 1, title: `${concept}: formula check`, tier: 'warmup' },
    { id: 'w3', minutes: 1, title: `${concept}: easy starter`, tier: 'warmup' },
  ];
  const core: PlanQueueItem[] = [
    { id: 'c1', minutes: 2, title: `${concept}: standard problem`, tier: 'core' },
    { id: 'c2', minutes: 2, title: `${concept}: mixed practice`, tier: 'core' },
    { id: 'c3', minutes: 2, title: `${concept}: exam-style Q`, tier: 'core' },
    { id: 'c4', minutes: 2, title: `${concept}: timed drill`, tier: 'core' },
    { id: 'c5', minutes: 2, title: `${concept}: error review`, tier: 'core' },
    { id: 'c6', minutes: 2, title: `${concept}: checkpoint`, tier: 'core' },
    { id: 'c7', minutes: 2, title: `${concept}: consolidation`, tier: 'core' },
  ];
  const stretch: PlanQueueItem[] =
    topicIndex >= 5
      ? [
          { id: 's1', minutes: 3, title: `${concept}: challenge set A`, tier: 'stretch' },
          { id: 's2', minutes: 3, title: `${concept}: challenge set B`, tier: 'stretch' },
        ]
      : [{ id: 's1', minutes: 3, title: `${concept}: optional hard Q`, tier: 'stretch' }];
  return { warmup, core, stretch };
}

export function buildPerformanceInsights(result: ExamAnalysisResult, aiAnalysis: AiExamAnalysis | null) {
  const insights: Array<{ title: string; description: string; color: string; bg: string; icon: string }> = [];
  const displayPercentage = getDisplayPercentage(result);
  const attemptedCount = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const totalQuestionCount =
    Number(result.totalQuestions || 0) || attemptedCount + (result.unattempted || 0);

  if (displayPercentage >= 90) {
    insights.push({
      title: 'Outstanding Performance!',
      description: "You've achieved exceptional results. You're among the top performers!",
      color: '#9333ea',
      bg: '#faf5ff',
      icon: 'trophy',
    });
  }
  if (totalQuestionCount > 0 && result.correctAnswers / totalQuestionCount >= 0.8) {
    insights.push({
      title: 'High Accuracy',
      description: 'Your accuracy rate is excellent! Keep up the precision.',
      color: '#059669',
      bg: '#ecfdf5',
      icon: 'flash',
    });
  }
  if (result.timeTaken < totalQuestionCount * 60) {
    insights.push({
      title: 'Speed Master',
      description: 'You completed the exam efficiently. Great time management!',
      color: '#2563eb',
      bg: '#eff6ff',
      icon: 'time',
    });
  }
  if (result.unattempted === 0) {
    insights.push({
      title: 'Complete Attempt',
      description: 'You attempted all questions. Excellent completion rate!',
      color: '#4f46e5',
      bg: '#eef2ff',
      icon: 'checkmark-circle',
    });
  }
  const trend = String(aiAnalysis?.predictions?.trend || '').toLowerCase();
  if (trend === 'improving') {
    insights.push({
      title: 'Trend Improvement',
      description: 'Your marks trend is improving versus recent attempts.',
      color: '#059669',
      bg: '#ecfdf5',
      icon: 'trending-up',
    });
  }
  return insights;
}

export function buildWeakAreas(result: ExamAnalysisResult) {
  const weakAreas: Array<{
    subject: string;
    percentage: number;
    correct: number;
    total: number;
    color: string;
    bg: string;
  }> = [];
  const subjects = Object.entries(result.subjectWiseScore || {});
  subjects.forEach(([subject, score]) => {
    const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
    if (percentage < 60) {
      weakAreas.push({
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        percentage,
        correct: score.correct,
        total: score.total,
        color: percentage < 40 ? '#dc2626' : '#ca8a04',
        bg: percentage < 40 ? '#fef2f2' : '#fefce8',
      });
    }
  });
  return weakAreas;
}
