import { storageGetItem } from './safe-storage';

export type SubjectProgressItem = {
  id: string;
  name: string;
  progress: number;
  currentTopic: string;
};

type ScoreBucket = { total: number; correct: number };

function toPlainScoreMap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  if (raw instanceof Map) return Object.fromEntries(raw);
  return raw as Record<string, unknown>;
}

function addScore(map: Map<string, ScoreBucket>, key: string, total: number, correct: number) {
  const subjectKey = String(key || '').trim();
  if (!subjectKey || total <= 0) return;
  const current = map.get(subjectKey) || { total: 0, correct: 0 };
  current.total += total;
  current.correct += correct;
  map.set(subjectKey, current);
}

export function collectSubjectWiseScores(result: any): Record<string, ScoreBucket> {
  const raw =
    result?.subjectWiseScore ||
    result?.subjectWiseScores ||
    result?.subjectScores ||
    null;
  const obj = toPlainScoreMap(raw);
  const out: Record<string, ScoreBucket> = {};
  Object.entries(obj).forEach(([subject, score]) => {
    if (score && typeof score === 'object') {
      const row = score as { total?: number; correct?: number };
      const total = Number(row.total || 0);
      const correct = Number(row.correct || 0);
      if (total > 0) out[subject] = { total, correct };
      return;
    }
    if (typeof score === 'number' && Number.isFinite(score)) {
      out[subject] = { total: 100, correct: Math.max(0, Math.min(100, score)) };
    }
  });
  return out;
}

function examIdOf(result: any): string {
  const examId = result?.examId;
  if (examId && typeof examId === 'object') return String(examId._id || examId.id || '');
  return examId != null ? String(examId) : '';
}

function examSubjectKey(exam: any, result: any): string {
  const fromExam = exam?.subject || (Array.isArray(exam?.subjects) ? exam.subjects[0] : '');
  const fromResult = result?.subject || result?.examSubject;
  return String(fromExam || fromResult || '').trim();
}

export function buildSubjectNameMap(subjectsList: any[]): Map<string, string> {
  const subjectNameMap = new Map<string, string>();
  subjectsList.forEach((subject: any) => {
    const subjectName = String(subject?.name || '');
    const normalized = subjectName.toLowerCase();
    if (!normalized) return;
    subjectNameMap.set(normalized, subjectName);
    if (normalized.includes('math')) {
      subjectNameMap.set('maths', subjectName);
      subjectNameMap.set('mathematics', subjectName);
    }
    if (normalized.includes('physics')) subjectNameMap.set('physics', subjectName);
    if (normalized.includes('chemistry')) subjectNameMap.set('chemistry', subjectName);
    if (normalized.includes('bio')) subjectNameMap.set('biology', subjectName);
    if (normalized.includes('english')) subjectNameMap.set('english', subjectName);
  });
  return subjectNameMap;
}

export function displaySubjectName(key: string, subjectNameMap: Map<string, string>): string {
  const lower = key.toLowerCase();
  return subjectNameMap.get(lower) || key.charAt(0).toUpperCase() + key.slice(1);
}

export function aggregateExamSubjectScores(
  resultsData: any[],
  examsData: any[]
): Map<string, ScoreBucket> {
  const examById = new Map<string, any>();
  examsData.forEach((exam: any) => {
    const id = String(exam?._id || exam?.id || '');
    if (id) examById.set(id, exam);
  });

  const examSubjectMap = new Map<string, ScoreBucket>();
  resultsData.forEach((result: any) => {
    const subjectWise = collectSubjectWiseScores(result);
    const entries = Object.entries(subjectWise);
    if (entries.length > 0) {
      entries.forEach(([subject, score]) => addScore(examSubjectMap, subject, score.total, score.correct));
      return;
    }

    const exam = examById.get(examIdOf(result));
    const fallbackSubject = examSubjectKey(exam, result);
    const total = Number(result?.totalQuestions || result?.totalMarks || 0);
    const correct = Number(
      result?.correctAnswers ??
        (Number(result?.totalMarks) > 0
          ? (Number(result?.obtainedMarks || 0) / Number(result.totalMarks)) * total
          : 0)
    );
    if (fallbackSubject && total > 0) {
      addScore(examSubjectMap, fallbackSubject, total, correct);
    }
  });

  return examSubjectMap;
}

export async function buildLearningProgress(params: {
  resultsData: any[];
  examsData: any[];
  subjectsList: any[];
}): Promise<SubjectProgressItem[]> {
  const { resultsData, examsData, subjectsList } = params;
  const subjectNameMap = buildSubjectNameMap(subjectsList);
  const examSubjectMap = aggregateExamSubjectScores(resultsData, examsData);

  const mergedProgress = new Map<string, SubjectProgressItem>();
  examSubjectMap.forEach((value, key) => {
    const progress = value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0;
    const name = displaySubjectName(key, subjectNameMap);
    mergedProgress.set(key.toLowerCase(), {
      id: key.toLowerCase(),
      name,
      progress,
      currentTopic: `${name} - Recent Exams`,
    });
  });

  const learningPathRows = await Promise.all(
    subjectsList.map(async (subject: any) => {
      const subjectId = String(subject?._id || subject?.id || '');
      const subjectName = String(subject?.name || 'Subject');
      let learningPathProgress = 0;
      if (!subjectId) return { subjectId, subjectName, learningPathProgress };
      try {
        const stored = await storageGetItem(`completed_content_${subjectId}`);
        const completedIds = stored ? JSON.parse(stored) : [];
        if (Array.isArray(completedIds) && completedIds.length > 0) {
          const totalContent = Number(subject.contentCount) > 0 ? Number(subject.contentCount) : 0;
          learningPathProgress =
            totalContent > 0
              ? Math.round((completedIds.length / totalContent) * 100)
              : Math.min(100, completedIds.length * 10);
        }
      } catch {
        // Ignore per-subject local progress read errors
      }
      return { subjectId, subjectName, learningPathProgress };
    })
  );

  learningPathRows.forEach(({ subjectId, subjectName, learningPathProgress }) => {
    if (learningPathProgress <= 0) return;
    const existing = Array.from(mergedProgress.values()).find((s) => s.name === subjectName);
    if (existing) {
      existing.progress = Math.round((existing.progress + learningPathProgress) / 2);
      existing.currentTopic = `${subjectName} - Learning Path`;
      return;
    }
    mergedProgress.set(subjectId, {
      id: subjectId,
      name: subjectName,
      progress: learningPathProgress,
      currentTopic: `${subjectName} - Learning Path`,
    });
  });

  return Array.from(mergedProgress.values());
}

export function overallFromSubjectProgress(items: SubjectProgressItem[]): number {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + (item.progress || 0), 0) / items.length);
}
