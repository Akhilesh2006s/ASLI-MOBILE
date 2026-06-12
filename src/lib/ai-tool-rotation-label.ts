import type { AiToolGenerationMeta } from './ai-tool-generate';

/** Shown when Super Admin saved multiple records for the same selection. */
export function formatAiToolRotationLabel(meta?: AiToolGenerationMeta | null): string | null {
  const total = meta?.totalCandidates;
  const idx = meta?.selectedIndex;
  if (!total || total <= 1 || idx == null || idx < 0) return null;
  return `Record ${idx + 1} of ${total}`;
}

export function simpleContentFingerprint(text: string): string {
  let hash = 0;
  const value = String(text || '');
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return `${hash.toString(36)}-${value.length}`;
}

export function buildAiToolContentRenderKey(
  toolType: string,
  content: string,
  meta?: AiToolGenerationMeta | null
): string {
  const idx = meta?.selectedIndex ?? -1;
  return `${toolType}:${idx}:${simpleContentFingerprint(content)}`;
}
