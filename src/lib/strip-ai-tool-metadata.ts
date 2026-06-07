export function stripStructuredAiToolMetadata(text: string): string {
  if (text == null || typeof text !== 'string') return '';
  const normalized = text.replace(/\r\n/g, '\n');
  const re = /(?:^|\n)\s*CONTENT\s*:?\s*\r?\n/i;
  const m = normalized.match(re);
  if (!m || m.index === undefined) return text;
  const start = m.index + m[0].length;
  const rest = normalized.slice(start).trimStart();
  return rest.length > 0 ? rest : text;
}
