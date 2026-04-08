/** Parse Super Admin style subject keys, e.g. Chemistry_10 → class "10", plain "Chemistry". */

export function extractClassNumberFromSubjectName(name: string): string | null {
  const match = name.match(/_(\d+)$/);
  return match ? match[1] : null;
}

export function extractPlainSubjectName(name: string): string {
  const match = name.match(/^(.+?)_\d+$/);
  return match ? match[1] : name;
}

export function getSubjectClassLabel(subject: {
  name?: string;
  classNumber?: string;
}): string | null {
  if (subject.classNumber != null && String(subject.classNumber).trim() !== '') {
    return String(subject.classNumber).trim();
  }
  return extractClassNumberFromSubjectName(subject.name || '');
}
