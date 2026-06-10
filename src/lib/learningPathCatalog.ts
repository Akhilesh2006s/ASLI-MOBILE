import api from '../services/api/api';
import { apiFetch } from './api-config';
import { consolidateLearningPathSubjects } from './learning-path-admin';
import { isActiveCatalogSubject, isSoftDeletedSubjectName } from './subject-names';
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
  mergedSubjectIds?: string[];
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

async function fetchTeacherPayload<T>(endpoint: string): Promise<T> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const json = await res.json();
  if (json?.success && json?.data !== undefined) return json.data as T;
  if (json?.data !== undefined) return json.data as T;
  return json as T;
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
    const data = await fetchTeacherPayload<unknown>('/api/teacher/subjects');
    return parseSubjectsPayload(data);
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
    const data = await fetchTeacherPayload<unknown>('/api/teacher/asli-prep-content');
    return parseContentPayload(data);
  }
  const response = await api.get('/api/student/asli-prep-content');
  return parseContentPayload(response?.data);
}

function sortContentNewestFirst(items: any[]): any[] {
  return items.slice().sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Teacher cards must match /teacher/subject/:id — fetch per assigned subject so sibling
 * subject IDs are resolved server-side (same as the subject content screen).
 */
async function loadTeacherLearningPathCatalog(
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  const subjects = await fetchSubjects('teacher');
  const rows: Array<SubjectWithPathContent | null> = await Promise.all(
    subjects.map(async (subject): Promise<SubjectWithPathContent | null> => {
      const subjectId = String(subject._id || subject.id || '');
      if (!subjectId) return null;

      try {
        const data = await fetchTeacherPayload<unknown>(
          `/api/teacher/asli-prep-content?subject=${encodeURIComponent(subjectId)}`
        );
        const asliPrepContent = sortContentNewestFirst(
          filterContentsBySchoolProgram(parseContentPayload(data), isAsliPrepExclusive)
        );
        if (asliPrepContent.length === 0) return null;

        return {
          _id: subjectId,
          id: subjectId,
          name: subject.name || 'Unknown Subject',
          description: subject.description || `Content for ${subject.name || 'Subject'}`,
          board: subject.board || '',
          classNumber: subject.classNumber,
          asliPrepContent,
          totalContent: asliPrepContent.length,
        } satisfies SubjectWithPathContent;
      } catch {
        return null;
      }
    })
  );

  return rows
    .filter((row): row is SubjectWithPathContent => row !== null)
    .filter((row) => isActiveCatalogSubject(row) && row.totalContent > 0)
    .sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );
}

/** Load subjects grouped with catalog content — matches web admin learning paths. */
export async function loadLearningPathCatalog(
  role: LearningPathRole,
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  if (role === 'teacher') {
    return loadTeacherLearningPathCatalog(isAsliPrepExclusive);
  }

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
    const asliPrepContent = sortContentNewestFirst(bySubjectId.get(subjectId) || []);
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
    const sorted = sortContentNewestFirst(items);
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

  const withContent = merged.filter((row) => row.totalContent > 0);

  if (role === 'admin') {
    return consolidateLearningPathSubjects(withContent).filter(
      (row) => isActiveCatalogSubject(row) && row.totalContent > 0
    );
  }

  return withContent
    .filter((row) => !isSoftDeletedSubjectName(row.name || ''))
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
