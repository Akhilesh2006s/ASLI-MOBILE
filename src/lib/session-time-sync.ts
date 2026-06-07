import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api-config';
import { updateStudyTime } from '../utils/studyTimeTracker';

export function getLocalIsoDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type SessionTimeData = {
  today: number;
  thisWeek: number;
  weeklyData: Record<string, number>;
};

export async function fetchSessionTimeFromBackend(token: string): Promise<SessionTimeData | null> {
  const response = await fetch(`${API_BASE_URL}/api/student/session-time`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.success || !data?.data) return null;
  return {
    today: Number(data.data.today) || 0,
    thisWeek: Number(data.data.thisWeek) || 0,
    weeklyData: data.data.weeklyData || {},
  };
}

export async function saveSessionTimeToBackend(todayMinutes: number): Promise<void> {
  const token = await SecureStore.getItemAsync('authToken');
  if (!token || todayMinutes <= 0) return;
  await fetch(`${API_BASE_URL}/api/student/session-time`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: getLocalIsoDateKey(),
      totalMinutes: todayMinutes,
    }),
  }).catch(() => null);
}

/** Merge local tracker with backend session-time (same approach as web dashboard). */
export async function getMergedStudyTime(): Promise<{ today: number; thisWeek: number }> {
  const local = await updateStudyTime();
  const token = await SecureStore.getItemAsync('authToken');
  if (!token) return local;

  const backend = await fetchSessionTimeFromBackend(token);
  if (!backend) return local;

  const todayKey = getLocalIsoDateKey();
  const backendToday = Math.max(backend.today, Number(backend.weeklyData[todayKey]) || 0);
  const mergedToday = Math.max(backendToday, local.today);
  const mergedWeek = Math.max(backend.thisWeek, local.thisWeek);

  return { today: mergedToday, thisWeek: mergedWeek };
}

export function setupSessionTimeSync(
  onUpdate: (times: { today: number; thisWeek: number }) => void
): () => void {
  let saveInterval: ReturnType<typeof setInterval> | null = null;
  let displayInterval: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    const times = await getMergedStudyTime();
    onUpdate(times);
  };

  void refresh();
  displayInterval = setInterval(() => void refresh(), 60000);
  saveInterval = setInterval(async () => {
    const local = await updateStudyTime();
    await saveSessionTimeToBackend(local.today);
  }, 5 * 60 * 1000);

  return () => {
    if (displayInterval) clearInterval(displayInterval);
    if (saveInterval) clearInterval(saveInterval);
    void updateStudyTime().then((t) => saveSessionTimeToBackend(t.today));
  };
}
