"use strict";
/**
 * Study Time Tracker Utility for React Native
 * Tracks foreground app session time (not video/quiz duration).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAppStateListener = setupAppStateListener;
exports.startSession = startSession;
exports.endSession = endSession;
exports.updateStudyTime = updateStudyTime;
exports.getTodayStudyTime = getTodayStudyTime;
exports.getWeeklyStudyTime = getWeeklyStudyTime;
exports.getWeeklyStudyData = getWeeklyStudyData;
const SecureStore = __importStar(require("expo-secure-store"));
const react_native_1 = require("react-native");
const MAX_CONTINUOUS_SESSION_MS = 30 * 60 * 1000;
const MAX_ORPHAN_SESSION_MINUTES = 5;
let trackerMutex = Promise.resolve();
async function withTrackerLock(fn) {
    const run = trackerMutex.then(fn, fn);
    trackerMutex = run.then(() => undefined, () => undefined);
    return run;
}
async function getStorageKey() {
    try {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.id || payload._id;
            if (userId) {
                return `studyTimeData_${userId}`;
            }
        }
    }
    catch (error) {
        console.warn('Could not extract user ID from token:', error);
    }
    console.warn('⚠️ Using default study time storage key');
    return 'studyTimeData';
}
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}
function todayDateKey() {
    return new Date().toDateString();
}
/** Close crashed/orphan sessions so reopening the app does not credit hours of idle time. */
function reconcileStaleSessions(todayData, now) {
    if (!todayData.sessions?.length)
        return;
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (lastSession.endTime)
        return;
    const openMs = now - lastSession.startTime;
    if (openMs <= MAX_CONTINUOUS_SESSION_MS)
        return;
    const creditedMinutes = Math.min(MAX_ORPHAN_SESSION_MINUTES, Math.floor(openMs / 60000));
    if (creditedMinutes > 0) {
        todayData.totalMinutes = (todayData.totalMinutes || 0) + creditedMinutes;
    }
    lastSession.endTime = lastSession.startTime + creditedMinutes * 60000;
    todayData.lastUpdate = now;
}
function activeSessionMinutes(todayData, now) {
    if (!todayData.sessions?.length)
        return 0;
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (lastSession.endTime)
        return 0;
    return Math.max(0, (now - lastSession.startTime) / 60000);
}
function computeDayTotal(todayData, now, includeActive) {
    let total = todayData.totalMinutes || 0;
    if (includeActive) {
        total += activeSessionMinutes(todayData, now);
    }
    return Math.max(0, total);
}
async function getStudyTimeData() {
    const STORAGE_KEY = await getStorageKey();
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    const TODAY_KEY = todayDateKey();
    const WEEK_START = getStartOfWeek(new Date()).toDateString();
    const now = Date.now();
    let studyTimeData = {
        dailyData: {},
        weekStart: WEEK_START,
    };
    if (stored) {
        try {
            studyTimeData = JSON.parse(stored);
        }
        catch {
            studyTimeData = { dailyData: {}, weekStart: WEEK_START };
        }
    }
    if (studyTimeData.weekStart !== WEEK_START) {
        studyTimeData.weekStart = WEEK_START;
        studyTimeData.dailyData = studyTimeData.dailyData || {};
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        Object.keys(studyTimeData.dailyData || {}).forEach((dateKey) => {
            if (new Date(dateKey) < sevenDaysAgo) {
                delete studyTimeData.dailyData[dateKey];
            }
        });
    }
    if (!studyTimeData.dailyData) {
        studyTimeData.dailyData = {};
    }
    if (!studyTimeData.dailyData[TODAY_KEY]) {
        studyTimeData.dailyData[TODAY_KEY] = {
            totalMinutes: 0,
            sessions: [],
            lastUpdate: now,
        };
    }
    else if (!studyTimeData.dailyData[TODAY_KEY].sessions) {
        studyTimeData.dailyData[TODAY_KEY].sessions = [];
    }
    const todayData = studyTimeData.dailyData[TODAY_KEY];
    reconcileStaleSessions(todayData, now);
    studyTimeData.dailyData[TODAY_KEY] = todayData;
    return studyTimeData;
}
async function saveStudyTimeData(data) {
    const STORAGE_KEY = await getStorageKey();
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
}
let appStateListener = null;
let isAppActive = react_native_1.AppState.currentState === 'active';
function setupAppStateListener() {
    if (appStateListener)
        return;
    appStateListener = react_native_1.AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            isAppActive = false;
            void endSession();
        }
        else if (nextAppState === 'active') {
            isAppActive = true;
        }
    });
}
async function startSession() {
    return withTrackerLock(async () => {
        if (!isAppActive)
            return;
        const data = await getStudyTimeData();
        const TODAY_KEY = todayDateKey();
        const todayData = data.dailyData[TODAY_KEY];
        const now = Date.now();
        if (!todayData.sessions) {
            todayData.sessions = [];
        }
        const lastSession = todayData.sessions[todayData.sessions.length - 1];
        if (lastSession && !lastSession.endTime) {
            return;
        }
        todayData.sessions.push({ startTime: now });
        todayData.lastUpdate = now;
        data.dailyData[TODAY_KEY] = todayData;
        await saveStudyTimeData(data);
    });
}
async function endSession() {
    return withTrackerLock(async () => {
        const data = await getStudyTimeData();
        const TODAY_KEY = todayDateKey();
        const todayData = data.dailyData[TODAY_KEY];
        const now = Date.now();
        if (!todayData.sessions?.length)
            return;
        const lastSession = todayData.sessions[todayData.sessions.length - 1];
        if (!lastSession.endTime) {
            const sessionDuration = Math.floor((now - lastSession.startTime) / 60000);
            if (sessionDuration > 0) {
                todayData.totalMinutes = (todayData.totalMinutes || 0) + sessionDuration;
            }
            lastSession.endTime = now;
            todayData.lastUpdate = now;
            data.dailyData[TODAY_KEY] = todayData;
            await saveStudyTimeData(data);
        }
    });
}
async function updateStudyTime() {
    return withTrackerLock(async () => {
        const data = await getStudyTimeData();
        const TODAY_KEY = todayDateKey();
        const todayData = data.dailyData[TODAY_KEY];
        const now = Date.now();
        if (!todayData.sessions) {
            todayData.sessions = [];
        }
        const lastSession = todayData.sessions[todayData.sessions.length - 1];
        const hasActiveSession = Boolean(lastSession && !lastSession.endTime);
        if (isAppActive && !hasActiveSession) {
            todayData.sessions.push({ startTime: now });
            todayData.lastUpdate = now;
            data.dailyData[TODAY_KEY] = todayData;
            await saveStudyTimeData(data);
        }
        else if (isAppActive && hasActiveSession && lastSession) {
            const openMinutes = (now - lastSession.startTime) / 60000;
            if (openMinutes >= 1) {
                const savedMinutes = Math.floor((now - lastSession.startTime) / 60000);
                if (savedMinutes > 0) {
                    todayData.totalMinutes = (todayData.totalMinutes || 0) + savedMinutes;
                }
                lastSession.endTime = now;
                todayData.sessions.push({ startTime: now });
                todayData.lastUpdate = now;
                data.dailyData[TODAY_KEY] = todayData;
                await saveStudyTimeData(data);
            }
        }
        const freshData = await getStudyTimeData();
        const freshTodayData = freshData.dailyData[TODAY_KEY];
        const todayTotal = computeDayTotal(freshTodayData, now, isAppActive);
        let weeklyTotal = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toDateString();
            const dayData = freshData.dailyData[dateKey];
            if (!dayData)
                continue;
            const includeActive = dateKey === TODAY_KEY && isAppActive;
            weeklyTotal += computeDayTotal(dayData, now, includeActive);
        }
        return {
            today: Math.max(0, Math.round(todayTotal)),
            thisWeek: Math.max(0, Math.round(weeklyTotal)),
        };
    });
}
async function getTodayStudyTime() {
    const data = await getStudyTimeData();
    const todayData = data.dailyData[todayDateKey()];
    return Math.max(0, Math.round(computeDayTotal(todayData, Date.now(), isAppActive)));
}
async function getWeeklyStudyTime() {
    const data = await getStudyTimeData();
    const now = Date.now();
    const TODAY_KEY = todayDateKey();
    let weeklyTotal = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toDateString();
        const dayData = data.dailyData[dateKey];
        if (!dayData)
            continue;
        weeklyTotal += computeDayTotal(dayData, now, dateKey === TODAY_KEY && isAppActive);
    }
    return Math.round(weeklyTotal);
}
async function getWeeklyStudyData() {
    const data = await getStudyTimeData();
    const now = Date.now();
    const TODAY_KEY = todayDateKey();
    const weeklyData = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toDateString();
        const dayData = data.dailyData[dateKey];
        weeklyData[dateKey] = dayData
            ? Math.round(computeDayTotal(dayData, now, dateKey === TODAY_KEY && isAppActive))
            : 0;
    }
    return weeklyData;
}
