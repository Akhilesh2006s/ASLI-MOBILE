import { API_BASE_URL } from './api-config';

export type TimetableEntry = {
  _id?: string;
  date?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  subjectId?: { _id?: string; name?: string } | string;
  teacherId?: { _id?: string; fullName?: string; name?: string } | string;
  room?: string;
  status?: string;
};

export type TimetableSlot = {
  day?: string;
  period?: number;
  subject?: string;
  teacher?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function refName(v: string | { name?: string; fullName?: string } | undefined): string {
  if (!v || typeof v === 'string') return '';
  return v.name || v.fullName || '';
}

function entryWeekdayIndex(entry: TimetableEntry): number | null {
  const day = (entry.day || '').trim().toLowerCase();
  if (day.startsWith('mon')) return 0;
  if (day.startsWith('tue')) return 1;
  if (day.startsWith('wed')) return 2;
  if (day.startsWith('thu')) return 3;
  if (day.startsWith('fri')) return 4;
  if (day.startsWith('sat')) return 5;
  if (entry.date) {
    const d = new Date(entry.date);
    const dow = d.getDay();
    if (dow >= 1 && dow <= 6) return dow - 1;
  }
  return null;
}

function getSlotHour(startTime?: string): number | null {
  if (!startTime) return null;
  const hour = parseInt(startTime.split(':')[0], 10);
  if (Number.isNaN(hour) || hour < 9 || hour > 17) return null;
  return hour;
}

export function timetableEntriesToSlots(entries: TimetableEntry[]): TimetableSlot[] {
  const seen = new Set<string>();
  const slots: TimetableSlot[] = [];

  for (const entry of entries) {
    const dayIndex = entryWeekdayIndex(entry);
    const slotHour = getSlotHour(entry.startTime);
    if (dayIndex === null || slotHour === null) continue;

    const dedupeKey = `${dayIndex}-${slotHour}-${entry.startTime}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    slots.push({
      day: DAY_LABELS[dayIndex],
      period: slotHour - 8,
      subject: refName(entry.subjectId as any) || 'Class',
      teacher: refName(entry.teacherId as any),
      startTime: entry.startTime,
      endTime: entry.endTime,
      time: entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : entry.startTime,
      room: entry.room,
    });
  }

  return slots;
}

export async function fetchStudentTimetable(token: string): Promise<TimetableEntry[]> {
  const res = await fetch(`${API_BASE_URL}/api/timetable`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.data || [];
  return Array.isArray(list) ? list : [];
}

export function filterSlotsForToday(slots: TimetableSlot[]): TimetableSlot[] {
  const todayIndex = new Date().getDay();
  if (todayIndex === 0) return [];
  const todayLabel = DAY_LABELS[todayIndex - 1];
  const today = slots.filter((s) => (s.day || '').toLowerCase().startsWith(todayLabel.toLowerCase()));
  return today.length ? today : slots.slice(0, 6);
}
