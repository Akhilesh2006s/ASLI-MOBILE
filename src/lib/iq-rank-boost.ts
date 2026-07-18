export type IQActivityType = 'iq-test' | 'rank-boost' | 'challenge' | 'quiz';
export type IQDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface IQActivity {
  _id: string;
  title: string;
  description: string;
  type: IQActivityType;
  difficulty: IQDifficulty;
  points: number;
  duration: number;
  subject?: { _id: string; name: string };
  board?: string;
  classNumber?: string;
  questions: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  participants?: number;
  averageScore?: number;
  completionRate?: number;
}

export interface IQActivityFormState {
  title: string;
  description: string;
  type: IQActivityType;
  difficulty: IQDifficulty;
  points: number;
  duration: number;
  subject: string;
  board: string;
  classNumber: string;
  questions: number;
  isActive: boolean;
}

export interface QuestionGeneratorFormState {
  numberOfQuestions: number;
  difficulty: string;
  subject: string;
  topic: string;
  subtopic: string;
}

export const IQ_ACTIVITY_TYPES = [
  { value: 'iq-test' as const, label: 'IQ Test' },
  { value: 'rank-boost' as const, label: 'Rank Boost' },
  { value: 'challenge' as const, label: 'Challenge' },
  { value: 'quiz' as const, label: 'Quiz' },
];

export const IQ_DIFFICULTIES = [
  { value: 'easy' as const, label: 'Easy' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'hard' as const, label: 'Hard' },
  { value: 'expert' as const, label: 'Expert' },
];

export const CLASS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const emptyActivityForm = (): IQActivityFormState => ({
  title: '',
  description: '',
  type: 'iq-test',
  difficulty: 'medium',
  points: 100,
  duration: 30,
  subject: '',
  board: '',
  classNumber: '',
  questions: 10,
  isActive: true,
});

export const emptyGeneratorForm = (): QuestionGeneratorFormState => ({
  numberOfQuestions: 10,
  difficulty: 'medium',
  subject: '',
  topic: '',
  subtopic: '',
});

export const activityFormFromActivity = (activity: IQActivity): IQActivityFormState => ({
  title: activity.title,
  description: activity.description,
  type: activity.type,
  difficulty: activity.difficulty,
  points: activity.points,
  duration: activity.duration,
  subject: activity.subject?._id || '',
  board: activity.board || '',
  classNumber: activity.classNumber || '',
  questions: activity.questions,
  isActive: activity.isActive,
});

export const getClassStats = (activities: IQActivity[], classNum: number) => {
  const classActivities = activities.filter((a) => a.classNumber === classNum.toString());
  return {
    total: classActivities.length,
    active: classActivities.filter((a) => a.isActive).length,
    questions: classActivities.reduce((sum, a) => sum + (a.questions || 0), 0),
    participants: classActivities.reduce((sum, a) => sum + (a.participants || 0), 0),
  };
};

export const getTypeIconName = (type: string): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap => {
  switch (type) {
    case 'iq-test':
      return 'bulb';
    case 'rank-boost':
      return 'trophy';
    case 'challenge':
      return 'locate-outline';
    case 'quiz':
      return 'star';
    default:
      return 'star';
  }
};

export const getTypeColorStyle = (type: string) => {
  switch (type) {
    case 'iq-test':
      return { bg: '#ede9fe', text: '#6b21a8' };
    case 'rank-boost':
      return { bg: '#fef9c3', text: '#a16207' };
    case 'challenge':
      return { bg: '#fee2e2', text: '#b91c1c' };
    case 'quiz':
      return { bg: '#dbeafe', text: '#1d4ed8' };
    default:
      return { bg: '#f3f4f6', text: '#374151' };
  }
};

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'hard':
      return '#ef4444';
    case 'expert':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
};

export function sanitizeTopicStrings(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const t = String(r ?? '').trim();
    if (!t) continue;
    const k = t.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export const normalizeActivitiesResponse = (payload: unknown): IQActivity[] => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: IQActivity[] }).data
      : [];
  if (!Array.isArray(list)) return [];
  return list.map((item: any) => ({
    _id: String(item?._id || ''),
    title: String(item?.title || ''),
    description: String(item?.description || ''),
    type: (item?.type || 'quiz') as IQActivityType,
    difficulty: (item?.difficulty || 'medium') as IQDifficulty,
    points: Number(item?.points ?? 0),
    duration: Number(item?.duration ?? 0),
    subject: item?.subject,
    board: item?.board,
    classNumber: item?.classNumber != null ? String(item.classNumber) : undefined,
    questions: Number(item?.questions ?? 0),
    isActive: item?.isActive !== false,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
    participants: Number(item?.participants ?? 0),
    averageScore: Number(item?.averageScore ?? 0),
    completionRate: Number(item?.completionRate ?? 0),
  })).filter((a) => a._id);
};
