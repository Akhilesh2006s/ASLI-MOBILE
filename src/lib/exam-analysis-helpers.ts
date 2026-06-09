import { normalizeAndFormatExamDisplayText } from './exam-text-normalize';

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
  questionTimings?: Record<string, number>;
  questionAnalytics?: Array<{
    questionId?: string;
    index?: number;
    timeTaken?: number;
    timeBucket?: string;
    difficulty?: string;
    status?: string;
  }>;
};

export type QuestionFilterId =
  | 'all'
  | 'correct'
  | 'wrong'
  | 'skipped'
  | 'wrong-quick'
  | 'hard-wrong'
  | 'time-pressure';

export type QuestionRowStatus = {
  attempted: boolean;
  correct: boolean;
  isWrongQuick: boolean;
  isHardWrong: boolean;
  isTimePressure: boolean;
};

export type MistakeTaxonomy = {
  careless: number;
  conceptual: number;
  procedural: number;
  time: number;
  reading: number;
};

export type ScoreReconciliation = {
  marksEarned: number;
  negativePenalty: number;
  net: number;
  marksNotEarnedOnWrong: number;
  costPerWrong: number;
};

export type DnaScores = {
  accuracy: number;
  speed: number;
  concept: number;
  difficulty: number;
  consistency: number;
};

export type TimeQuadrant = {
  fastWrong: number;
  fastRight: number;
  slowWrong: number;
  slowRight: number;
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
    questionId?: string;
    subject?: string;
    status?: string;
    conceptGap?: string;
    insight?: string;
    fixStrategy?: string;
    practiceTask?: string;
    geminiExplanation?: string;
    priority?: string;
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
    return normalizeAndFormatExamDisplayText(String(option), subject);
  }
  if (typeof option === 'object' && !Array.isArray(option)) {
    const o = option as Record<string, unknown>;
    if (o.text != null) return normalizeAndFormatExamDisplayText(String(o.text), subject);
    if (o.label != null) return normalizeAndFormatExamDisplayText(String(o.label), subject);
    if (o.value != null) return normalizeAndFormatExamDisplayText(String(o.value), subject);
    if (o.answer != null) return normalizeAndFormatExamDisplayText(String(o.answer), subject);
  }
  if (Array.isArray(option)) return option.map((o) => getOptionText(o, subject)).join(', ');
  return normalizeAndFormatExamDisplayText(String(option), subject);
}

export function getQuestionOptions(question?: any) {
  if (!question?.options || !Array.isArray(question.options)) return [];
  const subj = question?.subject;
  return question.options.map((option: unknown, index: number) => {
    if (typeof option === 'string') {
      return {
        text: getOptionText(option, subj),
        rawText: String(option),
        id: '',
        index,
        letter: String.fromCharCode(65 + index),
      };
    }
    const o = option as { text?: string; _id?: string };
    return {
      text: getOptionText(o?.text || o?._id || '', subj),
      rawText: String(o?.text || ''),
      id: String(o?._id || ''),
      index,
      letter: String.fromCharCode(65 + index),
    };
  });
}

export function resolveSingleAnswerText(question: any, rawAnswer: unknown): string {
  if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') return '';
  const options = getQuestionOptions(question);
  const rawText = String(rawAnswer).trim();
  const normalizedRaw = getOptionText(rawText, question?.subject);

  if (!options.length || question?.questionType === 'integer') {
    return normalizedRaw;
  }

  if (/^-?\d+$/.test(rawText)) {
    const idx = Number(rawText);
    if (idx >= 0 && idx < options.length) return options[idx].text;
    if (idx >= 1 && idx <= options.length) return options[idx - 1].text;
  }

  if (/^[a-z]$/i.test(rawText)) {
    const letter = rawText.toUpperCase();
    const byLetter = options.find((o) => o.letter === letter);
    if (byLetter) return byLetter.text;
  }

  const byId = options.find((o) => o.id && o.id === rawText);
  if (byId) return byId.text;
  const byRaw = options.find((o) => o.rawText && o.rawText === rawText);
  if (byRaw) return byRaw.text;
  const byNormalized = options.find((o) => o.text === normalizedRaw);
  if (byNormalized) return byNormalized.text;

  return normalizedRaw;
}

export function resolveAnswerTexts(question: any, rawAnswer: unknown): string[] {
  const list = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
  return list.map((item) => resolveSingleAnswerText(question, item)).filter((text) => !!text);
}

export function getQuestionInsightByIndex(
  questionIndex: number,
  question: any,
  aiAnalysis?: AiExamAnalysis | null
) {
  const insights = aiAnalysis?.questionInsights;
  if (!insights?.length) return undefined;
  const qid = normalizeMongoId(question?._id);
  if (qid) {
    const byId = insights.find((x) => normalizeMongoId(x.questionId) === qid);
    if (byId) return byId;
  }
  return insights.find((x) => Number(x.index) === questionIndex + 1 || Number(x.index) === questionIndex);
}

export function getQuestionAnalysisBlocks(
  questionIndex: number,
  question: any,
  aiAnalysis?: AiExamAnalysis | null
): string[] {
  const item = getQuestionInsightByIndex(questionIndex, question, aiAnalysis);
  const blocks: string[] = [];
  const gap = String(item?.conceptGap || '').trim();
  const fix = String(item?.fixStrategy || '').trim();
  const insight = String(item?.insight || '').trim();
  const practice = String(item?.practiceTask || '').trim();
  if (gap) blocks.push(gap);
  if (fix) blocks.push(fix);
  if (insight && insight !== gap && insight !== fix) blocks.push(insight);
  if (practice) blocks.push(`Practice: ${practice}`);
  const solution = String(question?.explanation || item?.geminiExplanation || '').trim();
  if (solution) blocks.push(`Solution: ${getOptionText(solution, question?.subject)}`);
  return blocks;
}

export function resolveQuestionAnalysisStatus(
  questionIndex: number,
  question: any,
  answers: Record<string, unknown> | undefined,
  aiAnalysis?: AiExamAnalysis | null
): 'correct' | 'wrong' | 'unattempted' {
  const item = getQuestionInsightByIndex(questionIndex, question, aiAnalysis);
  const fromInsight = String(item?.status || '').toLowerCase();
  if (fromInsight === 'correct' || fromInsight === 'wrong' || fromInsight === 'unattempted') {
    return fromInsight;
  }
  const ua = getUserAnswerForQuestion(question, questionIndex, answers);
  const attempted = ua !== undefined && ua !== null && ua !== '';
  if (!attempted) return 'unattempted';
  return compareAnswers(question, ua, question.correctAnswer) ? 'correct' : 'wrong';
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

export function getAnswerTimeSeconds(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { timeTaken?: number; time?: number; duration?: number };
    if (typeof o.timeTaken === 'number') return o.timeTaken;
    if (typeof o.time === 'number') return o.time;
    if (typeof o.duration === 'number') return o.duration;
  }
  return null;
}

export function getQuestionDifficulty(q: any): 'easy' | 'medium' | 'hard' {
  const marks = Number(q?.marks ?? 4);
  if (marks <= 2) return 'easy';
  if (marks <= 3) return 'medium';
  return 'hard';
}

export function resolveQuestionDifficulty(q: any): 'easy' | 'medium' | 'hard' {
  const raw = String(q?.difficulty || '').trim().toLowerCase();
  if (raw.includes('high') || raw.includes('difficult') || raw === 'hard') return 'hard';
  if (raw.includes('moderate') || raw === 'medium') return 'medium';
  if (raw.includes('easy')) return 'easy';
  return getQuestionDifficulty(q);
}

function getIdealTimeSeconds(difficulty: 'easy' | 'medium' | 'hard'): number {
  if (difficulty === 'easy') return 30;
  if (difficulty === 'medium') return 60;
  return 90;
}

export function isTimePressureWrong(
  timeSeconds: number | null,
  avgTime: number,
  difficulty: 'easy' | 'medium' | 'hard',
  timeBucket?: string
): boolean {
  if (timeBucket === 'over_time') return true;
  if (timeSeconds == null) return false;
  const ideal = getIdealTimeSeconds(difficulty);
  return timeSeconds > ideal * 1.25 || (avgTime > 0 && timeSeconds >= avgTime * 1.2);
}

export function getQuestionTimeForIndex(
  question: any,
  questionIndex: number,
  userAnswer: unknown,
  result: ExamAnalysisResult
): number | null {
  const fromAnswer = getAnswerTimeSeconds(userAnswer);
  if (fromAnswer != null) return fromAnswer;
  const qid = question?._id != null ? String(question._id) : null;
  if (qid && result.questionTimings?.[qid] != null) {
    return result.questionTimings[qid];
  }
  const rows = result.questionAnalytics;
  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows.find(
      (r) =>
        r.index === questionIndex ||
        r.index === questionIndex + 1 ||
        (r.questionId && String(r.questionId) === qid)
    );
    if (row?.timeTaken != null && row.timeTaken > 0) return row.timeTaken;
  }
  return null;
}

export function matchesQuestionFilter(filter: QuestionFilterId, status: QuestionRowStatus): boolean {
  if (filter === 'all') return true;
  if (filter === 'correct') return status.correct;
  if (filter === 'wrong') return status.attempted && !status.correct;
  if (filter === 'skipped') return !status.attempted;
  if (filter === 'wrong-quick') return status.isWrongQuick;
  if (filter === 'hard-wrong') return status.isHardWrong;
  if (filter === 'time-pressure') return status.isTimePressure;
  return true;
}

type ErrorType = 'careless' | 'conceptual' | 'time-pressure' | 'reading' | null;

export function classifyErrorType(
  question: any,
  userAnswer: unknown,
  timeTaken: number | null,
  opts: {
    isCorrect: boolean;
    isAttempted: boolean;
    avgTime: number;
    aiInsight?: string;
  }
): ErrorType {
  if (!opts.isAttempted || opts.isCorrect) return null;
  if (opts.aiInsight && /not|except|incorrectly read/i.test(opts.aiInsight)) return 'reading';
  if (timeTaken != null && opts.avgTime > 0 && timeTaken >= opts.avgTime * 1.2) {
    return 'time-pressure';
  }
  if (timeTaken != null && timeTaken < 30) return 'careless';
  const diff = getQuestionDifficulty(question);
  if (timeTaken != null && timeTaken >= opts.avgTime && diff === 'hard') return 'conceptual';
  if (timeTaken != null && timeTaken >= opts.avgTime * 1.2) return 'conceptual';
  return 'careless';
}

export function buildQuestionRowStatuses(
  result: ExamAnalysisResult,
  aiAnalysis?: AiExamAnalysis | null
): QuestionRowStatus[] {
  const questions = result.questions || [];
  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const avgT = totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 60;

  return questions.map((q, i) => {
    const ua = getUserAnswerForQuestion(q, i, result.answers);
    const attempted = ua !== undefined && ua !== null && ua !== '';
    const correct = attempted && compareAnswers(q, ua, q.correctAnswer);
    const timeSeconds = getQuestionTimeForIndex(q, i, ua, result);
    const difficulty = resolveQuestionDifficulty(q);
    const analyticsRow = result.questionAnalytics?.find(
      (row) =>
        row.index === i ||
        row.index === i + 1 ||
        (row.questionId && String(row.questionId) === String(q?._id))
    );
    const isWrongQuick = attempted && !correct && timeSeconds != null && timeSeconds < 30;
    const isHardWrong = attempted && !correct && difficulty === 'hard';
    const isTimePressure =
      attempted &&
      !correct &&
      isTimePressureWrong(timeSeconds, avgT, difficulty, analyticsRow?.timeBucket);
    void aiAnalysis;
    return { attempted, correct, isWrongQuick, isHardWrong, isTimePressure };
  });
}

export function buildQuestionFilterCounts(statuses: QuestionRowStatus[]) {
  const counts = {
    all: statuses.length,
    correct: 0,
    wrong: 0,
    skipped: 0,
    wrongQuick: 0,
    hardWrong: 0,
    timePressure: 0,
  };
  statuses.forEach((s) => {
    if (s.correct) counts.correct += 1;
    if (s.attempted && !s.correct) counts.wrong += 1;
    if (!s.attempted) counts.skipped += 1;
    if (s.isWrongQuick) counts.wrongQuick += 1;
    if (s.isHardWrong) counts.hardWrong += 1;
    if (s.isTimePressure) counts.timePressure += 1;
  });
  return counts;
}

export function buildMistakeTaxonomy(
  result: ExamAnalysisResult,
  aiAnalysis?: AiExamAnalysis | null
): MistakeTaxonomy {
  const counts: MistakeTaxonomy = { careless: 0, conceptual: 0, procedural: 0, time: 0, reading: 0 };
  const questions = result.questions || [];
  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const avgTimePerQuestion = totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 60;

  questions.forEach((q, i) => {
    const ua = getUserAnswerForQuestion(q, i, result.answers);
    const attempted = ua !== undefined && ua !== null && ua !== '';
    const correct = compareAnswers(q, ua, q.correctAnswer);
    if (!attempted || correct) return;
    const t = getQuestionTimeForIndex(q, i, ua, result);
    const qi = aiAnalysis?.questionInsights?.find((x) => x.index === i + 1 || x.index === i);
    const insight = qi?.insight || qi?.fixStrategy || qi?.conceptGap;
    const err = classifyErrorType(q, ua, t, {
      isCorrect: correct,
      isAttempted: attempted,
      avgTime: avgTimePerQuestion || 60,
      aiInsight: insight,
    });
    if (err === 'careless') counts.careless += 1;
    else if (err === 'conceptual') counts.conceptual += 1;
    else if (err === 'time-pressure') counts.time += 1;
    else if (err === 'reading') counts.reading += 1;
    else counts.procedural += 1;
  });

  const wrongN = result.wrongAnswers || 0;
  if (
    wrongN > 0 &&
    counts.careless + counts.conceptual + counts.procedural + counts.time + counts.reading === 0
  ) {
    counts.careless = Math.round(wrongN * 0.35);
    counts.conceptual = Math.round(wrongN * 0.25);
    counts.procedural = Math.round(wrongN * 0.2);
    counts.time = Math.round(wrongN * 0.12);
    counts.reading = wrongN - counts.careless - counts.conceptual - counts.procedural - counts.time;
  }
  return counts;
}

export function buildScoreReconciliation(result: ExamAnalysisResult): ScoreReconciliation {
  let marksEarned = 0;
  let negativePenalty = 0;
  let marksNotEarnedOnWrong = 0;
  const questions = result.questions || [];
  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const wrongN = result.wrongAnswers || 0;
  const net = Math.round(Number(result.obtainedMarks) || 0);
  const marksPerWrong = wrongN > 0 ? Math.max(0, (result.totalMarks || 0) - net) / wrongN : 0;

  questions.forEach((q, i) => {
    const ua = getUserAnswerForQuestion(q, i, result.answers);
    const attempted = ua !== undefined && ua !== null && ua !== '';
    const qMarks = Number(q.marks ?? 4) || 4;
    const qNeg = Number(q.negativeMarks ?? 1) || 0;
    if (!attempted) return;
    if (compareAnswers(q, ua, q.correctAnswer)) {
      marksEarned += qMarks;
    } else {
      negativePenalty += qNeg;
      marksNotEarnedOnWrong += qMarks;
    }
  });

  if (questions.length === 0 && wrongN > 0) {
    const avgQMarks = (result.totalMarks || 0) / Math.max(totalQuestionCount, 1);
    marksNotEarnedOnWrong = Math.round(wrongN * avgQMarks);
    negativePenalty = Math.max(0, Math.round(net + marksNotEarnedOnWrong - (result.totalMarks || 0) + wrongN * avgQMarks));
    if (negativePenalty <= 0) negativePenalty = Math.round(wrongN * 1);
    marksEarned = net + negativePenalty;
  }

  marksEarned = Math.round(marksEarned);
  negativePenalty = Math.round(negativePenalty);
  marksNotEarnedOnWrong = Math.round(marksNotEarnedOnWrong);
  const totalImpact = marksNotEarnedOnWrong + negativePenalty;
  const costPerWrong = wrongN > 0 ? Math.round(totalImpact / wrongN) : Math.round(marksPerWrong);

  return { marksEarned, negativePenalty, net, marksNotEarnedOnWrong, costPerWrong };
}

export function getDNAScores(result: ExamAnalysisResult, aiAnalysis?: AiExamAnalysis | null): DnaScores {
  const attempted = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const total = result.totalQuestions || attempted + (result.unattempted || 0);
  const accuracy = total > 0 ? (result.correctAnswers / total) * 100 : 0;
  const avgTime = total > 0 ? result.timeTaken / total : 120;
  const speed = Math.max(0, Math.min(100, 100 - (avgTime / 180) * 100));
  const concept =
    aiAnalysis?.strengths?.length && aiAnalysis.strengths.length > 0
      ? Math.min(100, 40 + aiAnalysis.strengths.length * 15)
      : accuracy * 0.6;
  const difficulty = Math.min(
    100,
    ((result.obtainedMarks || 0) / Math.max(result.totalMarks || 1, 1)) * 100 + 20
  );
  const completion = total > 0 ? (attempted / total) * 100 : 0;
  const consistency = Math.min(100, (accuracy + completion) / 2);
  return { accuracy, speed, concept, difficulty, consistency };
}

export function getDNAProfileLabel(
  dna: DnaScores,
  accuracyPct: number,
  avgTimePerQ: number
): string {
  if (accuracyPct < 30 && avgTimePerQ < 60) return 'Rushed Reader';
  if (dna.accuracy >= 70) return 'Precision Player';
  if (dna.speed < 40) return 'Deep Thinker';
  if (dna.concept < 40) return 'Concept Builder';
  return 'Balanced Learner';
}

export function getTimeXAccuracyQuadrant(result: ExamAnalysisResult): TimeQuadrant {
  const out: TimeQuadrant = { fastWrong: 0, fastRight: 0, slowWrong: 0, slowRight: 0 };
  const questions = result.questions || [];
  if (!questions.length) return out;
  const avgTime = result.timeTaken / Math.max(questions.length, 1);
  const classified: Array<{ fast: boolean; right: boolean }> = [];

  questions.forEach((q, i) => {
    const ua = getUserAnswerForQuestion(q, i, result.answers);
    const attempted = ua !== undefined && ua !== null && ua !== '';
    if (!attempted) return;
    const t = getQuestionTimeForIndex(q, i, ua, result);
    const right = compareAnswers(q, ua, q.correctAnswer);
    const fast = (t ?? avgTime) < avgTime;
    classified.push({ fast, right });
  });

  if (!classified.length) {
    const wrong = questions.filter((q, i) => {
      const ua = getUserAnswerForQuestion(q, i, result.answers);
      return ua != null && ua !== '' && !compareAnswers(q, ua, q.correctAnswer);
    }).length;
    const correct = questions.filter((q, i) => {
      const ua = getUserAnswerForQuestion(q, i, result.answers);
      return ua != null && ua !== '' && compareAnswers(q, ua, q.correctAnswer);
    }).length;
    out.fastWrong = Math.round(wrong * 0.4);
    out.slowWrong = wrong - out.fastWrong;
    out.fastRight = Math.round(correct * 0.35);
    out.slowRight = correct - out.fastRight;
    return out;
  }

  classified.forEach(({ fast, right }) => {
    if (fast && right) out.fastRight += 1;
    else if (fast && !right) out.fastWrong += 1;
    else if (!fast && right) out.slowRight += 1;
    else out.slowWrong += 1;
  });
  return out;
}

export function getSpeedRatingLabel(result: ExamAnalysisResult): string {
  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const avgTimePerQuestion =
    totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 0;
  if (result.timeTaken < totalQuestionCount * 60) return 'Sharp';
  if (avgTimePerQuestion < 90) return 'Balanced';
  return 'Rushed';
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
