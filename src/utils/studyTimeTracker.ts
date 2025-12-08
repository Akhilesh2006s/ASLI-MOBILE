/**
 * Study Time Tracker Utility for React Native
 * Tracks study time using timestamps and handles app state changes
 */

import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Get user-specific storage key
 */
async function getStorageKey(): Promise<string> {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      // Decode JWT to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id || payload._id;
      if (userId) {
        return `studyTimeData_${userId}`;
      }
    }
  } catch (error) {
    console.warn('Could not extract user ID from token:', error);
  }
  
  // Fallback: use default key
  console.warn('⚠️ Using default study time storage key');
  return 'studyTimeData';
}

interface DailyData {
  totalMinutes: number;
  sessions: Array<{
    startTime: number;
    endTime?: number;
  }>;
  lastUpdate: number;
}

interface StudyTimeData {
  dailyData: { [dateKey: string]: DailyData };
  weekStart: string;
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Get or initialize study time data
 */
async function getStudyTimeData(): Promise<StudyTimeData> {
  const STORAGE_KEY = await getStorageKey();
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  const TODAY_KEY = new Date().toDateString();
  const WEEK_START = getStartOfWeek(new Date()).toDateString();
  
  let studyTimeData: StudyTimeData = {
    dailyData: {},
    weekStart: WEEK_START
  };
  
  if (stored) {
    try {
      studyTimeData = JSON.parse(stored);
    } catch (e) {
      studyTimeData = { dailyData: {}, weekStart: WEEK_START };
    }
  }
  
  // If it's a new week, reset weekly data but keep daily history
  if (studyTimeData.weekStart !== WEEK_START) {
    studyTimeData.weekStart = WEEK_START;
    studyTimeData.dailyData = studyTimeData.dailyData || {};
    // Clear old daily data (keep only last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    Object.keys(studyTimeData.dailyData || {}).forEach((dateKey) => {
      if (new Date(dateKey) < sevenDaysAgo) {
        delete studyTimeData.dailyData[dateKey];
      }
    });
  }
  
  // Initialize daily data structure
  if (!studyTimeData.dailyData) {
    studyTimeData.dailyData = {};
  }
  
  // If it's a new day, initialize today's data
  if (!studyTimeData.dailyData[TODAY_KEY]) {
    studyTimeData.dailyData[TODAY_KEY] = {
      totalMinutes: 0,
      sessions: [],
      lastUpdate: Date.now()
    };
  } else {
    // Ensure sessions array exists
    if (!studyTimeData.dailyData[TODAY_KEY].sessions) {
      studyTimeData.dailyData[TODAY_KEY].sessions = [];
    }
  }
  
  return studyTimeData;
}

/**
 * Save study time data to SecureStore
 */
async function saveStudyTimeData(data: StudyTimeData): Promise<void> {
  const STORAGE_KEY = await getStorageKey();
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
}

let appStateListener: any = null;
let isAppActive = true;

/**
 * Setup app state listener to handle background/foreground
 */
export function setupAppStateListener(): void {
  if (appStateListener) {
    return; // Already set up
  }
  
  appStateListener = AppState.addEventListener('change', handleAppStateChange);
  
  // End any active session when app goes to background
  async function handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      isAppActive = false;
      await endSession();
    } else if (nextAppState === 'active') {
      isAppActive = true;
      // Don't auto-start session, let user activity trigger it
    }
  }
}

/**
 * Start a new study session
 */
export async function startSession(): Promise<void> {
  if (!isAppActive) {
    return;
  }
  
  const data = await getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  // Check if there's already an active session
  if (todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      // Session is already active
      return;
    }
  }
  
  // End any active session first
  if (todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      lastSession.endTime = Date.now();
      const sessionDuration = Math.floor((lastSession.endTime - lastSession.startTime) / 60000);
      todayData.totalMinutes = (todayData.totalMinutes || 0) + sessionDuration;
    }
  }
  
  // Start new session
  const startTime = Date.now();
  todayData.sessions.push({
    startTime: startTime
  });
  todayData.lastUpdate = startTime;
  
  data.dailyData[TODAY_KEY] = todayData;
  await saveStudyTimeData(data);
}

/**
 * End the current study session
 */
export async function endSession(): Promise<void> {
  const data = await getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  if (todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      lastSession.endTime = Date.now();
      const sessionDuration = Math.floor((lastSession.endTime - lastSession.startTime) / 60000);
      todayData.totalMinutes = (todayData.totalMinutes || 0) + sessionDuration;
      todayData.lastUpdate = Date.now();
      
      data.dailyData[TODAY_KEY] = todayData;
      await saveStudyTimeData(data);
    }
  }
}

/**
 * Update study time (called periodically)
 */
export async function updateStudyTime(): Promise<{ today: number; thisWeek: number }> {
  const data = await getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  const now = Date.now();
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  // If app is active and no active session, start one
  if (isAppActive && todayData.sessions.length === 0) {
    todayData.sessions.push({
      startTime: now
    });
    todayData.lastUpdate = now;
    data.dailyData[TODAY_KEY] = todayData;
    await saveStudyTimeData(data);
  } else if (isAppActive && todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (lastSession.endTime) {
      // All sessions ended, start new one
      todayData.sessions.push({
        startTime: now
      });
      todayData.lastUpdate = now;
      data.dailyData[TODAY_KEY] = todayData;
      await saveStudyTimeData(data);
    }
  }
  
  // Re-fetch fresh data
  const currentData = await getStudyTimeData();
  const currentTodayData = currentData.dailyData[TODAY_KEY];
  if (!currentTodayData.sessions) {
    currentTodayData.sessions = [];
  }
  
  // If app is active and there's an active session, periodically save time
  if (isAppActive && currentTodayData.sessions.length > 0) {
    const lastSession = currentTodayData.sessions[currentTodayData.sessions.length - 1];
    if (!lastSession.endTime) {
      const sessionDurationSeconds = now - lastSession.startTime;
      const sessionDurationMinutes = sessionDurationSeconds / 60000;
      
      // If session is longer than 1 minute, save it periodically
      if (sessionDurationMinutes >= 1) {
        lastSession.endTime = now;
        const savedMinutes = Math.floor(sessionDurationSeconds / 60000);
        currentTodayData.totalMinutes = (currentTodayData.totalMinutes || 0) + savedMinutes;
        
        // Start new session
        currentTodayData.sessions.push({
          startTime: now
        });
        currentTodayData.lastUpdate = now;
        currentData.dailyData[TODAY_KEY] = currentTodayData;
        await saveStudyTimeData(currentData);
      }
    }
  }
  
  // Calculate today's total
  const freshData = await getStudyTimeData();
  const freshTodayData = freshData.dailyData[TODAY_KEY];
  if (!freshTodayData.sessions) {
    freshTodayData.sessions = [];
  }
  
  let todayTotal = freshTodayData.totalMinutes || 0;
  if (isAppActive && freshTodayData.sessions.length > 0) {
    const lastSession = freshTodayData.sessions[freshTodayData.sessions.length - 1];
    if (!lastSession.endTime) {
      const activeSessionSeconds = now - lastSession.startTime;
      const activeSessionMinutes = activeSessionSeconds / 60000;
      todayTotal += activeSessionMinutes;
    }
  }
  
  // Calculate weekly total
  let weeklyTotal = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    if (freshData.dailyData[dateKey]) {
      let dayTotal = freshData.dailyData[dateKey].totalMinutes || 0;
      
      if (dateKey === TODAY_KEY && isAppActive) {
        const dayData = freshData.dailyData[dateKey];
        if (dayData.sessions && dayData.sessions.length > 0) {
          const lastSession = dayData.sessions[dayData.sessions.length - 1];
          if (!lastSession.endTime) {
            const activeSessionSeconds = now - lastSession.startTime;
            const activeSessionMinutes = activeSessionSeconds / 60000;
            dayTotal += activeSessionMinutes;
          }
        }
      }
      
      weeklyTotal += dayTotal;
    }
  }
  
  return {
    today: Math.max(0, Math.round(todayTotal)),
    thisWeek: Math.max(0, Math.round(weeklyTotal))
  };
}

/**
 * Get today's study time
 */
export async function getTodayStudyTime(): Promise<number> {
  const data = await getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  const now = Date.now();
  
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  let total = todayData.totalMinutes || 0;
  
  if (isAppActive && todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      const activeSessionSeconds = now - lastSession.startTime;
      const activeSessionMinutes = activeSessionSeconds / 60000;
      total += activeSessionMinutes;
    }
  }
  
  return Math.max(0, Math.round(total));
}

/**
 * Get weekly study time
 */
export async function getWeeklyStudyTime(): Promise<number> {
  const data = await getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const now = Date.now();
  
  let weeklyTotal = 0;
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    if (data.dailyData[dateKey]) {
      let dayTotal = data.dailyData[dateKey].totalMinutes || 0;
      
      if (dateKey === TODAY_KEY && isAppActive) {
        const dayData = data.dailyData[dateKey];
        if (dayData.sessions && dayData.sessions.length > 0) {
          const lastSession = dayData.sessions[dayData.sessions.length - 1];
          if (!lastSession.endTime) {
            const activeSessionMinutes = Math.floor((now - lastSession.startTime) / 60000);
            dayTotal += activeSessionMinutes;
          }
        }
      }
      
      weeklyTotal += dayTotal;
    }
  }
  
  return weeklyTotal;
}

/**
 * Get weekly study data for each day
 */
export async function getWeeklyStudyData(): Promise<{ [dateKey: string]: number }> {
  const data = await getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const now = Date.now();
  const weeklyData: { [dateKey: string]: number } = {};
  
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    if (data.dailyData[dateKey]) {
      let dayTotal = data.dailyData[dateKey].totalMinutes || 0;
      
      if (dateKey === TODAY_KEY && isAppActive) {
        const dayData = data.dailyData[dateKey];
        if (dayData.sessions && dayData.sessions.length > 0) {
          const lastSession = dayData.sessions[dayData.sessions.length - 1];
          if (!lastSession.endTime) {
            const activeSessionMinutes = Math.floor((now - lastSession.startTime) / 60000);
            dayTotal += activeSessionMinutes;
          }
        }
      }
      
      weeklyData[dateKey] = dayTotal;
    } else {
      weeklyData[dateKey] = 0;
    }
  }
  
  return weeklyData;
}
