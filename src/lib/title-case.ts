/** Capitalize the first letter of each word (space- or hyphen-separated). */
export function titleCaseWords(value: string): string {
  return String(value ?? '').replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}
