import { apiFetch } from '../../lib/api-config';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(endpoint, options);
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const json = await res.json();
      if (json?.message) message = String(json.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

const vidyaService = {
  getChatSessions: (userId: string) =>
    fetchJson<any[]>(`/api/users/${userId}/chat-sessions`),

  aiChat: (body: { userId: string; message: string; context?: Record<string, unknown> }) =>
    fetchJson<any>('/api/ai-chat', { method: 'POST', body: JSON.stringify(body) }),

  studentChat: (body: { message: string; studentId: string }) =>
    fetchJson<any>('/api/vidya/student/chat', { method: 'POST', body: JSON.stringify(body) }),

  analyzeImage: (body: { image: string; context?: string }) =>
    fetchJson<any>('/api/ai-chat/analyze-image', { method: 'POST', body: JSON.stringify(body) }),

  getStudentFocusCard: () => fetchJson<any>('/api/vidya/student/focus-card'),
};

export default vidyaService;
