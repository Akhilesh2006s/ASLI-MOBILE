/** Capitalize the first letter of each word (space- or hyphen-separated). */
export function titleCaseWords(value: string): string {
  return String(value ?? '').replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

/** Style merged into every React Native `Text` node at startup (see apply-global-text-capitalize). */
export const globalCapitalizeTextStyle = { textTransform: 'capitalize' as const };
