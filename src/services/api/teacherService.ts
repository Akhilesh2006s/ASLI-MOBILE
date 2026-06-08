import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_BASE_URL } from '../../lib/api-config';

export { API_BASE_URL };

const CACHE_PREFIX = 'teacher_cache:';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { data: T; ts: number };

export function asArray<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.subjects)) return payload.subjects;
  if (Array.isArray(payload?.students)) return payload.students;
  if (Array.isArray(payload?.homeworks)) return payload.homeworks;
  return [];
}

async function getCached<T>(key: string): Promise<{ data: T; stale: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return { data: entry.data, stale: Date.now() - entry.ts > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(endpoint, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

function unwrap<T>(payload: any): T {
  if (payload?.success && payload?.data !== undefined) return payload.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return payload as T;
}

export type CachedResult<T> = { data: T; stale: boolean; fromCache: boolean };

async function cachedFetch<T>(key: string, endpoint: string, options?: RequestInit): Promise<CachedResult<T>> {
  const cached = await getCached<T>(key);
  try {
    const json = await fetchJson<any>(endpoint, options);
    const data = unwrap<T>(json);
    await setCache(key, data);
    return { data, stale: false, fromCache: false };
  } catch {
    if (cached) return { data: cached.data, stale: true, fromCache: true };
    throw new Error(`Unable to reach server (${endpoint})`);
  }
}

export type BackendStatus = 'online' | 'cached' | 'offline';

const teacherService = {
  health: async (): Promise<{ ok: boolean; status?: string }> => {
    const res = await apiFetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    const json = await res.json().catch(() => ({}));
    return { ok: true, status: json?.status };
  },

  checkBackendStatus: async (): Promise<BackendStatus> => {
    try {
      await teacherService.health();
      return 'online';
    } catch {
      try {
        const me = await getCached<any>('me');
        if (me) return 'cached';
      } catch {
        /* ignore */
      }
      return 'offline';
    }
  },

  me: () => cachedFetch<any>('me', '/api/auth/me'),
  dashboard: () => cachedFetch<any>('dashboard', '/api/teacher/dashboard'),
  classes: () => cachedFetch<any[]>('classes', '/api/teacher/classes'),
  subjects: () => cachedFetch<any[]>('subjects', '/api/teacher/subjects'),
  students: () => cachedFetch<any[]>('students', '/api/teacher/students'),
  studentsPerformance: () => cachedFetch<any[]>('students_perf', '/api/teacher/students/performance'),
  studentPerformance: (id: string) =>
    cachedFetch<any>(`student_perf_${id}`, `/api/teacher/students/${id}/performance`),
  classStudents: (classId: string) =>
    cachedFetch<any[]>(`class_students_${classId}`, `/api/teacher/classes/${classId}/students`),
  timetable: () => cachedFetch<any[]>('timetable', '/api/timetable'),
  calendarEvents: (month: string) =>
    cachedFetch<any[]>(`calendar_${month}`, `/api/teacher/calendar/events?month=${month}`),
  assessments: () => cachedFetch<any[]>('assessments', '/api/teacher/assessments'),
  videos: () => cachedFetch<any[]>('videos', '/api/teacher/videos'),
  homework: () => cachedFetch<any[]>('homework', '/api/teacher/homework-submissions'),
  homeworkSubmissions: () => cachedFetch<any>('hw_subs', '/api/teacher/homework-submissions'),
  liveSessions: () => cachedFetch<any[]>('live_sessions', '/api/teacher/streams'),
  homeworkSubmissionsGrouped: async (): Promise<CachedResult<{ homeworks: any[]; students: any[] }>> => {
    const cached = await getCached<{ homeworks: any[]; students: any[] }>('hw_grouped');
    try {
      const json = await fetchJson<any>('/api/teacher/homework-submissions');
      const raw = unwrap<any>(json);
      const data = {
        homeworks: raw?.homeworks ?? (Array.isArray(raw) ? raw : []),
        students: raw?.students ?? [],
      };
      await setCache('hw_grouped', data);
      return { data, stale: false, fromCache: false };
    } catch {
      if (cached) return { data: cached.data, stale: true, fromCache: true };
      return { data: { homeworks: [], students: [] }, stale: false, fromCache: false };
    }
  },
  trackProgressRemarks: () => cachedFetch<any[]>('track_remarks', '/api/teacher/students/remarks'),
  progressAiInsights: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/students/progress-ai-insights', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  subject: (id: string) => cachedFetch<any>(`subject_${id}`, `/api/subjects/${id}`),
  quizzes: () => cachedFetch<any[]>('quizzes', '/api/teacher/quizzes'),
  remarks: () => cachedFetch<any[]>('remarks', '/api/teacher/remarks'),
  workDiary: (limit = 40) =>
    cachedFetch<any[]>(`diary_${limit}`, `/api/teacher/work-diary?limit=${limit}`),
  classStats: () => cachedFetch<any>('class_stats', '/api/teacher/class-stats'),
  attendance: () => cachedFetch<any>('attendance', '/api/teacher/attendance'),
  asliPrepContent: (params?: { subject?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.subject) qs.set('subject', params.subject);
    if (params?.type) qs.set('type', params.type);
    const q = qs.toString();
    return cachedFetch<any[]>(`prep_${q}`, `/api/teacher/asli-prep-content${q ? `?${q}` : ''}`);
  },

  createAssessment: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/assessments', { method: 'POST', body: JSON.stringify(body) }),
  updateAssessment: (id: string, body: Record<string, unknown>) =>
    fetchJson<any>(`/api/teacher/assessments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAssessment: (id: string) =>
    fetchJson<any>(`/api/teacher/assessments/${id}`, { method: 'DELETE' }),

  createVideo: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/videos', { method: 'POST', body: JSON.stringify(body) }),
  updateVideo: (id: string, body: Record<string, unknown>) =>
    fetchJson<any>(`/api/teacher/videos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  createHomework: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/homework', { method: 'POST', body: JSON.stringify(body) }),
  gradeHomework: (id: string, body: Record<string, unknown>) =>
    fetchJson<any>(`/api/teacher/homework-submissions/${id}/grade`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  markAttendance: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/attendance', { method: 'POST', body: JSON.stringify(body) }),

  sendRemark: (studentId: string, body: Record<string, unknown>) =>
    fetchJson<any>(`/api/teacher/students/${studentId}/remarks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createRemark: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/remarks', { method: 'POST', body: JSON.stringify(body) }),

  createDiaryEntry: (body: Record<string, unknown>) =>
    fetchJson<any>('/api/teacher/work-diary', { method: 'POST', body: JSON.stringify(body) }),
  deleteDiaryEntry: (id: string) =>
    fetchJson<any>(`/api/teacher/work-diary/${id}`, { method: 'DELETE' }),

  updateTimetableStatus: (id: string, status: string) =>
    fetchJson<any>(`/api/timetable/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  aiChat: (body: { userId: string; message: string; context?: Record<string, unknown> }) =>
    fetchJson<any>('/api/ai-chat', { method: 'POST', body: JSON.stringify(body) }),

  runAiTool: (body: Record<string, unknown> & { toolType: string }) =>
    fetchJson<any>('/api/teacher/ai/tool', { method: 'POST', body: JSON.stringify(body) }),

  generateAiToolContent: (body: Record<string, unknown> & { toolType: string }) =>
    fetchJson<any>('/api/teacher/ai/generate-content', { method: 'POST', body: JSON.stringify(body) }),

  /** @deprecated use runAiTool */
  generateAiTool: (toolName: string, body: Record<string, unknown>) =>
    fetchJson<any>(`/api/teacher/ai/tool`, {
      method: 'POST',
      body: JSON.stringify({ toolType: toolName, params: body }),
    }),

  resolveMediaUrl: (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
  },

  invalidateCache: async (key?: string) => {
    if (key) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(CACHE_PREFIX)));
  },
};

export default teacherService;
