import api from '../services/api/api';
import teacherService from '../services/api/teacherService';
import { filterContentsBySchoolProgram } from './school-program';

export type LearningPathRole = 'admin' | 'teacher' | 'student';

export type SubjectWithPathContent = {
  _id: string;
  id: string;
  name: string;
  description?: string;
  board?: string;
  classNumber?: string;
  asliPrepContent: any[];
  totalContent: number;
};

function parseSubjectsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.subjects)) return data.subjects;
  return [];
}

function parseContentPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getContentSubjectId(content: any): string | null {
  const subj = content?.subject;
  if (subj == null) return null;
  if (typeof subj === 'object' && subj._id != null) return String(subj._id);
  if (typeof subj === 'string' && subj.trim()) return subj.trim();
  return null;
}

async function fetchSubjects(role: LearningPathRole): Promise<any[]> {
  if (role === 'admin') {
    const response = await api.get('/api/admin/subjects');
    return parseSubjectsPayload(response?.data);
  }
  if (role === 'teacher') {
    const response = await teacherService.subjects();
    return parseSubjectsPayload(response?.data ?? response);
  }
  const response = await api.get('/api/student/subjects');
  return parseSubjectsPayload(response?.data);
}

async function fetchAllPrepContent(role: LearningPathRole): Promise<any[]> {
  if (role === 'admin') {
    const response = await api.get('/api/admin/asli-prep-content');
    return parseContentPayload(response?.data);
  }
  if (role === 'teacher') {
    const response = await teacherService.asliPrepContent();
    return parseContentPayload(response?.data ?? response);
  }
  const response = await api.get('/api/student/asli-prep-content');
  return parseContentPayload(response?.data);
}

/** Load subjects grouped with catalog content — matches web admin learning paths. */
export async function loadLearningPathCatalog(
  role: LearningPathRole,
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  const [subjects, allContentRaw] = await Promise.all([
    fetchSubjects(role),
    fetchAllPrepContent(role),
  ]);

  const allContent = filterContentsBySchoolProgram(allContentRaw, isAsliPrepExclusive);
  const bySubjectId = new Map<string, any[]>();

  for (const item of allContent) {
    const sid = getContentSubjectId(item);
    if (!sid) continue;
    if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
    bySubjectId.get(sid)!.push(item);
  }

  const consumedIds = new Set<string>();
  const merged: SubjectWithPathContent[] = [];

  for (const subject of subjects) {
    const subjectId = String(subject._id || subject.id || '');
    if (!subjectId) continue;
    const asliPrepContent = (bySubjectId.get(subjectId) || [])
      .slice()
      .sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    consumedIds.add(subjectId);
    merged.push({
      _id: subjectId,
      id: subjectId,
      name: subject.name || 'Unknown Subject',
      description: subject.description || '',
      board: subject.board || '',
      classNumber: subject.classNumber,
      asliPrepContent,
      totalContent: asliPrepContent.length,
    });
  }

  bySubjectId.forEach((items, subjectId) => {
    if (consumedIds.has(subjectId)) return;
    const sorted = items.slice().sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    const first = sorted[0];
    const populated = first?.subject;
    const nameFromPopulate =
      typeof populated === 'object' && populated?.name ? populated.name : 'Subject';
    merged.push({
      _id: subjectId,
      id: subjectId,
      name: nameFromPopulate,
      description: `Content for ${nameFromPopulate}`,
      board: first?.board || '',
      classNumber: first?.classNumber,
      asliPrepContent: sorted,
      totalContent: sorted.length,
    });
  });

  return merged
    .filter((row) => row.totalContent > 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
}

/** Filter + count content rows by type for library tiles. */
export function countContentByType(
  contents: any[],
  isAsliPrepExclusive: boolean
): Record<string, number> {
  const filtered = filterContentsBySchoolProgram(contents, isAsliPrepExclusive);
  const counts: Record<string, number> = {};
  for (const item of filtered) {
    const t = item.type || 'Material';
    counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}
