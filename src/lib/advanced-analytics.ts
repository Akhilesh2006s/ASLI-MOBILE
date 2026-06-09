export type DifficultyRow = {
  difficulty: 'easy' | 'moderate' | 'difficult' | 'highly_difficult' | string;
  idealTimeSec: number;
  totalQuestions: number;
  correctAnswered: {
    count: number;
    avgTime: number;
    inTime: number;
    lessTime: number;
    overTime: number;
  };
  wrongAnswered: {
    count: number;
    avgTime: number;
    inTime: number;
    lessTime: number;
    overTime: number;
  };
};

export type AdvancedAnalyticsPayload = {
  difficultyTimeIntelligence: DifficultyRow[];
  questionTypeMatrix: Array<{
    type: string;
    correct: { physics: number; chemistry: number; maths: number };
    wrong: { physics: number; chemistry: number; maths: number };
    notAnswered: { physics: number; chemistry: number; maths: number };
  }>;
  conceptVsApplication: Array<{
    type: 'Concept' | 'Application' | string;
    accuracy: number;
    correct: number;
    wrong: number;
    notAnswered: number;
    totalTime: number;
    avgTimePerQuestion: number;
  }>;
  chapterWeakness: Array<{
    chapter: string;
    subject: string;
    accuracy: number;
    correct: number;
    errors: number;
    notAnswered: number;
  }>;
  aiObservations: string[];
  timeEfficiency: {
    avgTimePerSubject: Array<{ subject: string; avgTime: number; accuracy: number; totalQuestions: number }>;
    slowestSubject: string;
    fastestSubject: string;
    timeWastedOnWrongQuestions: number;
    efficiencyScore: number;
    totalTimeTaken: number;
  };
  visuals: {
    chapterHeatmap: Array<{ chapter: string; subject: string; accuracy: number }>;
    subjectPerformanceBars: Array<{ subject: string; accuracy: number; avgTime: number }>;
    outcomePie: Array<{ name: string; value: number }>;
    timeVsAccuracy: Array<{ subject: string; avgTime: number; accuracy: number }>;
  };
  recommendation: {
    riskLevel: 'High' | 'Medium' | 'Low' | string;
    focusAreas: string[];
    actionPlan: {
      today: string[];
      thisWeek: string[];
      beforeNextExam: string[];
    };
    strategy: string;
    confidenceTrend: string;
  } | null;
  metadata: {
    generatedAt: string;
    totalQuestionsAnalyzed: number;
  };
};

export const ADVANCED_CHART_COLORS = {
  correct: '#22c55e',
  wrong: '#f97316',
  notAnswered: '#3b82f6',
  inTime: '#22c55e',
  lessTime: '#3b82f6',
  overTime: '#f97316',
};

export const formatSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}m ${sec}s`;
};

export const difficultyLabel = (difficulty: string) => {
  const map: Record<string, string> = {
    easy: 'Easy',
    moderate: 'Moderate',
    difficult: 'Difficult',
    highly_difficult: 'Highly Difficult',
  };
  return map[difficulty] || difficulty;
};

export const advancedAnalyticsMockData: AdvancedAnalyticsPayload = {
  difficultyTimeIntelligence: [
    {
      difficulty: 'easy',
      idealTimeSec: 30,
      totalQuestions: 8,
      correctAnswered: { count: 6, avgTime: 24, inTime: 4, lessTime: 1, overTime: 1 },
      wrongAnswered: { count: 2, avgTime: 36, inTime: 1, lessTime: 0, overTime: 1 },
    },
    {
      difficulty: 'moderate',
      idealTimeSec: 60,
      totalQuestions: 12,
      correctAnswered: { count: 7, avgTime: 68, inTime: 4, lessTime: 1, overTime: 2 },
      wrongAnswered: { count: 3, avgTime: 82, inTime: 1, lessTime: 0, overTime: 2 },
    },
    {
      difficulty: 'difficult',
      idealTimeSec: 90,
      totalQuestions: 7,
      correctAnswered: { count: 2, avgTime: 95, inTime: 1, lessTime: 0, overTime: 1 },
      wrongAnswered: { count: 3, avgTime: 126, inTime: 0, lessTime: 0, overTime: 3 },
    },
    {
      difficulty: 'highly_difficult',
      idealTimeSec: 120,
      totalQuestions: 3,
      correctAnswered: { count: 1, avgTime: 134, inTime: 0, lessTime: 0, overTime: 1 },
      wrongAnswered: { count: 1, avgTime: 148, inTime: 0, lessTime: 0, overTime: 1 },
    },
  ],
  questionTypeMatrix: [],
  conceptVsApplication: [],
  chapterWeakness: [],
  aiObservations: [
    'You are spending more time than required on Moderate Physics questions.',
    'Application-based Mathematics questions need targeted timed drills.',
  ],
  timeEfficiency: {
    avgTimePerSubject: [
      { subject: 'physics', avgTime: 85, accuracy: 56, totalQuestions: 8 },
      { subject: 'chemistry', avgTime: 63, accuracy: 68, totalQuestions: 10 },
      { subject: 'maths', avgTime: 77, accuracy: 59, totalQuestions: 12 },
    ],
    slowestSubject: 'physics',
    fastestSubject: 'chemistry',
    timeWastedOnWrongQuestions: 545,
    efficiencyScore: 0.34,
    totalTimeTaken: 3120,
  },
  visuals: {
    chapterHeatmap: [],
    subjectPerformanceBars: [],
    outcomePie: [
      { name: 'Correct', value: 16 },
      { name: 'Wrong', value: 9 },
      { name: 'Skipped', value: 5 },
    ],
    timeVsAccuracy: [],
  },
  recommendation: {
    riskLevel: 'Medium',
    focusAreas: ['Electrostatics', 'Organic Chemistry'],
    actionPlan: {
      today: ['Revise Electrostatics notes', 'Solve 20 Organic reaction MCQs'],
      thisWeek: ['Take two timed sectional mocks', 'Audit wrong answers and classify mistakes'],
      beforeNextExam: ['One full test with exam constraints', 'Revision sprint on weak concepts'],
    },
    strategy: 'Improve time management in moderate questions',
    confidenceTrend: 'Improving',
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    totalQuestionsAnalyzed: 30,
  },
};
