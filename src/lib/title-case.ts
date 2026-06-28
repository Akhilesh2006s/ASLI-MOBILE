/** Capitalize the first letter of each word (space- or hyphen-separated). */
export function titleCaseWords(value: string): string {
  return String(value ?? '').replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

/** Style for optional CapitalizedText wrapper (see apply-global-text-capitalize.ts). */
export const globalCapitalizeTextStyle = { textTransform: 'capitalize' as const };
