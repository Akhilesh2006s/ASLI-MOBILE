export const STUDENTS_UI = {
  emerald: '#059669',
  emeraldDark: '#047857',
  emeraldLight: '#d1fae5',
  emeraldBorder: '#a7f3d0',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  indigo: '#4f46e5',
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
};

export type StudentPerformance = {
  overallProgress?: number;
  learningProgress?: number;
  totalExams?: number;
  averageMarks?: number;
  averagePercentage?: number;
  dailyAverageWatchTime?: number;
  recentExamTitle?: string | null;
  recentPercentage?: number | null;
};

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  isActive?: boolean;
  lastLogin?: string | null;
  assignedClass?: { classNumber?: string; section?: string };
  performance?: StudentPerformance;
};

export function progressTier(pct: number): 'good' | 'avg' | 'low' {
  if (pct >= 70) return 'good';
  if (pct >= 50) return 'avg';
  return 'low';
}

export function progressColors(tier: 'good' | 'avg' | 'low') {
  if (tier === 'good') return { bg: '#dcfce7', text: '#166534', bar: '#22c55e' };
  if (tier === 'avg') return { bg: '#fef9c3', text: '#854d0e', bar: '#eab308' };
  return { bg: '#fee2e2', text: '#991b1b', bar: '#ef4444' };
}

export function formatClassBadge(student: StudentRow): string {
  if (student.assignedClass) {
    const num = student.assignedClass.classNumber || student.classNumber;
    const sec = student.assignedClass.section || '';
    return `${num}${sec}`;
  }
  return student.classNumber || 'N/A';
}

export function formatLastLogin(lastLogin?: string | null): { date: string; time: string } | null {
  if (!lastLogin) return null;
  try {
    const d = new Date(lastLogin);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return null;
  }
}

export function mapStudentRow(raw: any): StudentRow {
  return {
    id: String(raw._id || raw.id || ''),
    name: raw.fullName || raw.name || 'Unknown Student',
    email: raw.email || '',
    classNumber: raw.classNumber || 'N/A',
    phone: raw.phone || '',
    isActive: raw.isActive !== false,
    lastLogin: raw.lastLogin || null,
    assignedClass: raw.assignedClass || null,
    performance: raw.performance || {},
  };
}

export function mergeStudentsWithPerformance(students: any[], perfRows: any[]): StudentRow[] {
  const perfMap = new Map<string, StudentPerformance>();
  (Array.isArray(perfRows) ? perfRows : []).forEach((row) => {
    const id = String(row._id || row.id || '');
    if (id) perfMap.set(id, row.performance || row);
  });

  return (Array.isArray(students) ? students : []).map((s) => {
    const mapped = mapStudentRow(s);
    const perf = perfMap.get(mapped.id);
    if (perf) mapped.performance = { ...mapped.performance, ...perf };
    return mapped;
  });
}

export function performerCounts(students: StudentRow[]) {
  let high = 0;
  let average = 0;
  let needAttention = 0;
  students.forEach((s) => {
    const pct = s.performance?.overallProgress ?? 0;
    if (pct >= 70) high += 1;
    else if (pct >= 50) average += 1;
    else needAttention += 1;
  });
  return { high, average, needAttention };
}

export function progressStatusLabel(pct: number): string {
  if (pct >= 70) return 'Good Progress';
  if (pct >= 50) return 'Average';
  return 'Needs Improvement';
}
