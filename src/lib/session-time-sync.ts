import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api-config';
import { updateStudyTime, getWeeklyStudyData, startSession, endSession } from '../utils/studyTimeTracker';
import { toLocalDateKey } from './profile-overview-stats';

const MAX_STUDY_MINUTES_PER_DAY = 12 * 60;
const MAX_STUDY_MINUTES_PER_WEEK = MAX_STUDY_MINUTES_PER_DAY * 7;

export function dateStringToIsoKey(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return toLocalDateKey(parsed);
}

type SessionBaseline = {
  useBackend: boolean;
  backendToday: number;
  backendWeek: number;
  localTodayAtLoad: number;
  localWeekAtLoad: number;
};

let sessionBaseline: SessionBaseline = {
  useBackend: false,
  backendToday: 0,
  backendWeek: 0,
  localTodayAtLoad: 0,
  localWeekAtLoad: 0,
};

let baselineInitialized = false;
let baselineUserKey = '';

function capStudyMinutes(minutes: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(minutes)));
}

/** Backend week total already includes today — replace today's slice with live capped today. */
export function mergeDisplayedStudyTime(
  baseline: SessionBaseline,
  localTimes: { today: number; thisWeek: number }
): { today: number; thisWeek: number } {
  if (!baseline.useBackend) {
    return {
      today: capStudyMinutes(localTimes.today, MAX_STUDY_MINUTES_PER_DAY),
      thisWeek: capStudyMinutes(localTimes.thisWeek, MAX_STUDY_MINUTES_PER_WEEK),
    };
  }

  // Only add new local minutes since baseline load — avoids inflating with stale local totals.
  const deltaToday = Math.max(0, localTimes.today - baseline.localTodayAtLoad);
  const mergedToday = capStudyMinutes(
    baseline.backendToday + deltaToday,
    MAX_STUDY_MINUTES_PER_DAY
  );
  const weekWithoutToday = Math.max(0, baseline.backendWeek - baseline.backendToday);
  const thisWeek = capStudyMinutes(
    weekWithoutToday + mergedToday,
    MAX_STUDY_MINUTES_PER_WEEK
  );

  return { today: mergedToday, thisWeek };
}

/** Backend + local study minutes per calendar day (YYYY-MM-DD). */
export async function fetchWeeklySessionMinutes(
  token?: string | null
): Promise<{ backend: Record<string, number>; local: Record<string, number> }> {
  await updateStudyTime();
  const localRaw = await getWeeklyStudyData();
  const local: Record<string, number> = {};
  for (const [dateStr, mins] of Object.entries(localRaw)) {
    const key = dateStringToIsoKey(dateStr);
    local[key] = Math.max(local[key] || 0, Number(mins) || 0);
  }

  if (!token) {
    return { backend: {}, local };
  }

  const backendSession = await fetchSessionTimeFromBackend(token);
  const backend = backendSession?.weeklyData || {};
  return { backend, local };
}

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

async function readBaselineUserKey(token: string): Promise<string> {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return String(payload.userId || payload.id || payload._id || token.slice(-12));
  } catch {
    return token.slice(-12);
  }
}

async function initSessionBaseline(token: string, force = false): Promise<void> {
  const userKey = await readBaselineUserKey(token);
  if (baselineInitialized && !force && baselineUserKey === userKey) {
    return;
  }

  const localAtLoad = await updateStudyTime();
  const backend = await fetchSessionTimeFromBackend(token);

  if (backend) {
    const todayKey = getLocalIsoDateKey();
    const todayFromWeekly = Number(backend.weeklyData[todayKey]) || 0;
    const backendToday = Math.max(Number(backend.today) || 0, todayFromWeekly);
    sessionBaseline = {
      useBackend: true,
      backendToday,
      backendWeek: backend.thisWeek || 0,
      localTodayAtLoad: localAtLoad.today,
      localWeekAtLoad: localAtLoad.thisWeek,
    };
  } else {
    sessionBaseline = {
      useBackend: false,
      backendToday: 0,
      backendWeek: 0,
      localTodayAtLoad: localAtLoad.today,
      localWeekAtLoad: localAtLoad.thisWeek,
    };
  }

  baselineInitialized = true;
  baselineUserKey = userKey;
}

export function resetSessionBaseline(): void {
  baselineInitialized = false;
  baselineUserKey = '';
  sessionBaseline = {
    useBackend: false,
    backendToday: 0,
    backendWeek: 0,
    localTodayAtLoad: 0,
    localWeekAtLoad: 0,
  };
}

/** Merge local tracker with backend session-time (web dashboard parity). */
export async function getMergedStudyTime(forceRefresh = false): Promise<{ today: number; thisWeek: number }> {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    await initSessionBaseline(token, forceRefresh);
  }
  const localTimes = await updateStudyTime();
  return mergeDisplayedStudyTime(sessionBaseline, localTimes);
}

export function setupSessionTimeSync(
  onUpdate: (times: { today: number; thisWeek: number }) => void
): () => void {
  let saveInterval: ReturnType<typeof setInterval> | null = null;
  let displayInterval: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;
  let trackingStarted = false;

  const refresh = async () => {
    const localTimes = await updateStudyTime();
    onUpdate(mergeDisplayedStudyTime(sessionBaseline, localTimes));
  };

  const startTracking = async () => {
    if (trackingStarted || cancelled) return;
    trackingStarted = true;
    await startSession();
    await refresh();
  };

  const bootstrap = async () => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      await initSessionBaseline(token);
    } else {
      const localAtLoad = await updateStudyTime();
      sessionBaseline = {
        useBackend: false,
        backendToday: 0,
        backendWeek: 0,
        localTodayAtLoad: localAtLoad.today,
        localWeekAtLoad: localAtLoad.thisWeek,
      };
    }
    await startTracking();
  };

  void bootstrap();
  displayInterval = setInterval(() => void refresh(), 60_000);
  saveInterval = setInterval(async () => {
    const localTimes = await updateStudyTime();
    const { today, thisWeek } = mergeDisplayedStudyTime(sessionBaseline, localTimes);
    await saveSessionTimeToBackend(today);
    if (sessionBaseline.useBackend) {
      const previousToday = sessionBaseline.backendToday;
      sessionBaseline.backendToday = today;
      const weekWithoutToday = Math.max(0, sessionBaseline.backendWeek - previousToday);
      sessionBaseline.backendWeek = thisWeek || weekWithoutToday + today;
      sessionBaseline.localTodayAtLoad = localTimes.today;
    }
  }, 5 * 60 * 1000);

  return () => {
    cancelled = true;
    if (displayInterval) clearInterval(displayInterval);
    if (saveInterval) clearInterval(saveInterval);
    void endSession().then(async () => {
      const localTimes = await updateStudyTime();
      const { today } = mergeDisplayedStudyTime(sessionBaseline, localTimes);
      await saveSessionTimeToBackend(today);
    });
  };
}
