export function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getExamSubjectLabel(exam: any): string {
  if (typeof exam?.subject === 'string' && exam.subject.trim()) return exam.subject;
  if (Array.isArray(exam?.subjects) && exam.subjects.length > 0) return exam.subjects.join(', ');
  return exam?.subject?.name || 'Exam';
}

export function eachLocalDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= endDay.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function buildExamCalendarEntries(exams: any[]) {
  const entries: { id: string; type: 'exam'; title: string; subject: string; date: Date; source: any }[] = [];
  for (const exam of exams) {
    const start = parseCalendarDate(exam?.startDate);
    const end = parseCalendarDate(exam?.endDate) || start;
    if (!start || !end) continue;
    const examId = String(exam._id || exam.id || '');
    if (!examId) continue;
    for (const day of eachLocalDayInRange(start, end)) {
      const slot = new Date(day);
      slot.setHours(start.getHours(), start.getMinutes(), 0, 0);
      entries.push({
        id: examId,
        type: 'exam',
        title: exam.title || exam.examTitle || 'Exam',
        subject: getExamSubjectLabel(exam),
        date: slot,
        source: exam,
      });
    }
  }
  return entries;
}
