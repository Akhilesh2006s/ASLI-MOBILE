import { displaySubjectName } from './subject-names';
import { teacherGreeting } from '../theme/teacher';

/** Title-case a word; keeps short acronyms (e.g. SL, IIT) uppercase. */
function formatWord(part: string): string {
  const trimmed = part.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4 && trimmed === trimmed.toUpperCase()) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** Title-case each word in a label. */
export function formatTitleCase(raw: string): string {
  return String(raw || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(formatWord)
    .join(' ');
}

export function formatPersonName(raw: string): string {
  return formatTitleCase(raw);
}

export function formatSubjectLabel(name: string): string {
  return formatTitleCase(displaySubjectName(name));
}

/** Comma-separated subjects → "Biology, English, Maths, SL Hindi". */
export function formatSubjectList(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 'General';
  return trimmed
    .split(',')
    .map((part) => formatSubjectLabel(part.trim()))
    .filter(Boolean)
    .join(', ');
}

export function formatTeacherTimeGreeting(): string {
  return teacherGreeting();
}

export function formatTeacherFullName(fullName?: string): string {
  return formatPersonName(String(fullName || 'Teacher').trim() || 'Teacher');
}

/** @deprecated Use formatTeacherTimeGreeting + formatTeacherFullName */
export function formatTeacherGreeting(fullName?: string): string {
  return `${formatTeacherTimeGreeting()}, ${formatTeacherFullName(fullName)}`;
}
