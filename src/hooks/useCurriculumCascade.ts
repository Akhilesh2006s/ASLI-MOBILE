import { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../lib/api-config';

type CurriculumRow = { id: string; name: string; label: string };

const responseCache = new Map<string, unknown>();

function cacheGet<T>(key: string): T | undefined {
  return responseCache.get(key) as T | undefined;
}

function cacheSet(key: string, val: unknown) {
  if (responseCache.size >= 80) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, val);
}

function rowsToNames(rows: CurriculumRow[] | undefined): string[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map((r) => r.name || r.label || r.id).filter(Boolean);
}

function normalizeSubjectKey(value: string): string {
  const compact = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'maths' || compact === 'math') return 'mathematics';
  if (compact === 'socialstudies' || compact === 'sst') return 'socialscience';
  return compact;
}

function dedupeSubjectOptions(subjects: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const subject of subjects) {
    const key = normalizeSubjectKey(subject);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(subject);
  }
  return result;
}

export function normalizeGradeForCurriculum(gradeLevel: string | undefined) {
  if (!gradeLevel) return undefined;
  if (gradeLevel === 'Class-6-IIT' || gradeLevel === 'IIT-6') return 'IIT-6';
  return gradeLevel;
}

export function isGradeWithScienceCurriculumDropdowns(gradeLevel: string | undefined): boolean {
  const g = normalizeGradeForCurriculum(gradeLevel);
  return g === 'Class 6' || g === 'Class 7' || g === 'Class 8' || g === 'Class 10';
}

async function fetchCurriculum(path: string, token: string | null) {
  if (responseCache.has(path)) {
    return cacheGet<{ success?: boolean; data?: CurriculumRow[] }>(path)!;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  cacheSet(path, json);
  return json;
}

async function fetchManagedTopicTaxonomy(
  token: string | null,
  params: { board?: string; classLabel?: string; subject?: string; topicName?: string }
) {
  const qs = new URLSearchParams();
  if (params.board) qs.set('board', params.board);
  if (params.classLabel) qs.set('classLabel', params.classLabel);
  if (params.subject) qs.set('subject', params.subject);
  if (params.topicName) qs.set('topicName', params.topicName);
  const path = `/api/ai-generator/topic-taxonomy?${qs.toString()}`;
  if (responseCache.has(path)) {
    return cacheGet<{ data?: { topics?: string[]; subTopics?: string[] } }>(path)!;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  cacheSet(path, json);
  return json;
}

const SYLLABUS =
  'ncert6eng6hin6math6sst6-7-8-eng7-hin7-math7-sst7-eng8-hin8-math8-sst8-eng10-math10-sst10-hin10-sci10-v1';

export function useCurriculumCascade(
  gradeLevel: string | undefined,
  subject: string | undefined,
  topic: string | undefined,
  board: string | undefined = undefined
) {
  const gradeForApi = normalizeGradeForCurriculum(gradeLevel);
  const [classRows, setClassRows] = useState<CurriculumRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const qs = new URLSearchParams({ v: '3' });
        if (board) qs.set('board', board);
        const data = await fetchCurriculum(`/api/curriculum/classes?${qs.toString()}`, token);
        if (cancelled) return;
        const rows = (data as { data?: CurriculumRow[] }).data || [];
        setClassRows(rows);
      } catch {
        if (!cancelled) setClassRows([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board]);

  useEffect(() => {
    let cancelled = false;
    if (!gradeLevel || !gradeForApi) {
      setSubjects([]);
      setLoadingSubjects(false);
      return;
    }
    (async () => {
      setLoadingSubjects(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const qs = new URLSearchParams({ classId: gradeForApi, syllabus: 'curriculum-v3' });
        if (board) qs.set('board', board);
        const data = await fetchCurriculum(`/api/curriculum/subjects?${qs.toString()}`, token);
        if (cancelled) return;
        setSubjects(dedupeSubjectOptions(rowsToNames((data as { data?: CurriculumRow[] }).data)));
      } catch {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, board]);

  useEffect(() => {
    let cancelled = false;
    if (!gradeLevel || !gradeForApi || !subject) {
      setTopics([]);
      setLoadingTopics(false);
      return;
    }
    (async () => {
      setLoadingTopics(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const qs = new URLSearchParams({
          classId: gradeForApi,
          subjectId: subject,
          syllabus: SYLLABUS,
        });
        if (board) qs.set('board', board);
        const [data, managed] = await Promise.all([
          fetchCurriculum(`/api/curriculum/topics?${qs.toString()}`, token),
          fetchManagedTopicTaxonomy(token, { board, classLabel: gradeForApi, subject }),
        ]);
        if (cancelled) return;
        const curriculumTopics = rowsToNames((data as { data?: CurriculumRow[] }).data);
        const managedTopics = (managed as { data?: { topics?: string[] } })?.data?.topics || [];
        const allTopics = [...curriculumTopics, ...managedTopics].filter(Boolean);
        const unique = allTopics.filter((t, i) => allTopics.indexOf(t) === i);
        setTopics(unique.sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, board]);

  useEffect(() => {
    let cancelled = false;
    if (!gradeLevel || !gradeForApi || !subject || !topic) {
      setSubtopics([]);
      setLoadingSubtopics(false);
      return;
    }
    (async () => {
      setLoadingSubtopics(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const qs = new URLSearchParams({
          classId: gradeForApi,
          subjectId: subject,
          topicId: topic,
          syllabus: SYLLABUS,
        });
        if (board) qs.set('board', board);
        const [data, managed] = await Promise.all([
          fetchCurriculum(`/api/curriculum/subtopics?${qs.toString()}`, token),
          fetchManagedTopicTaxonomy(token, { board, classLabel: gradeForApi, subject, topicName: topic }),
        ]);
        if (cancelled) return;
        const curriculumSubtopics = rowsToNames((data as { data?: CurriculumRow[] }).data);
        const managedSubtopics = (managed as { data?: { subTopics?: string[] } })?.data?.subTopics || [];
        const allSubtopics = [...curriculumSubtopics, ...managedSubtopics].filter(Boolean);
        const unique = allSubtopics.filter((s, i) => allSubtopics.indexOf(s) === i);
        setSubtopics(unique.sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setLoadingSubtopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, topic, board]);

  const classOptions = useMemo(() => {
    if (classRows.length > 0) {
      return classRows.map((r) => r.name || r.label || r.id).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return [];
  }, [classRows]);

  return {
    classOptions,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  };
}
