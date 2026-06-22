/**
 * Compare API markdown sections vs structured / rendered HTML sections (mobile AI tools).
 */

import {
  countNumberedTemplateSections,
  parseNumberedTemplateSections,
  type ParsedTemplateSection,
} from './ai-tool-display-content';

export { countNumberedTemplateSections };

export type AiToolSectionAudit = {
  toolType: string;
  variant: 'student' | 'teacher';
  apiSectionCount: number;
  apiSections: Array<{ num: number; title: string; hasBody: boolean }>;
  structuredSectionNums: number[];
  renderedPath: string;
  renderedSectionNums: number[];
  missingFromRender: number[];
  preferMarkdown: boolean;
};

const SECTION_NUM_IN_HTML_RE = /Section\s+(\d{1,2})\b/gi;

/** Section numbers referenced in generated section-card HTML. */
export function extractSectionNumsFromHtml(html: string): number[] {
  const nums = new Set<number>();
  const s = String(html || '');
  let match: RegExpExecArray | null;
  const re = new RegExp(SECTION_NUM_IN_HTML_RE.source, 'gi');
  while ((match = re.exec(s)) !== null) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) nums.add(n);
  }
  if (/hero-title-card|Section\s+1\b/i.test(s)) nums.add(1);
  return [...nums].sort((a, b) => a - b);
}

export function summarizeApiSections(display: string): {
  count: number;
  sections: Array<{ num: number; title: string; hasBody: boolean }>;
  parsed: ParsedTemplateSection[];
} {
  const { sections: parsed } = parseNumberedTemplateSections(display);
  const sections = parsed.map((sec) => ({
    num: sec.num,
    title: sec.title,
    hasBody: Boolean(sec.body.trim()),
  }));
  return { count: countNumberedTemplateSections(display), sections, parsed };
}

/**
 * Prefer full numbered markdown when the API payload has sections that structured HTML omits.
 * Structured parsers only map known fields; markdown from Super Admin is the source of truth.
 */
/** Tools whose question blocks live only in rawData — structured render is required when markdown lacks them. */
const STRUCTURED_HYBRID_TOOL_TYPES = new Set([
  'smart-qa-practice-generator',
]);

export function apiMarkdownShouldDriveDisplay(toolType: string, display: string): boolean {
  if (!display.trim()) return false;
  if (STRUCTURED_HYBRID_TOOL_TYPES.has(toolType)) return false;
  return countNumberedTemplateSections(display) >= 1;
}

export function shouldPreferMarkdownOverStructured(
  display: string,
  structuredHtml: string | null | undefined,
): boolean {
  const { sections: apiSections } = parseNumberedTemplateSections(display);
  if (!apiSections.length) return false;
  if (!structuredHtml?.trim()) return true;

  const renderedNums = new Set(extractSectionNumsFromHtml(structuredHtml));
  const apiWithBody = apiSections.filter((s) => s.num > 0 && s.body.trim());

  for (const sec of apiWithBody) {
    if (!renderedNums.has(sec.num)) return true;
  }

  const apiBodyCount = apiWithBody.length;
  const renderedCount = renderedNums.size;
  if (apiBodyCount > renderedCount) return true;

  const maxApiNum = Math.max(...apiSections.map((s) => s.num));
  const maxRenderedNum = renderedNums.size ? Math.max(...renderedNums) : 0;
  if (maxApiNum > maxRenderedNum && apiWithBody.some((s) => s.num > maxRenderedNum)) {
    return true;
  }

  return false;
}

export function buildAiToolSectionAudit(opts: {
  toolType: string;
  variant: 'student' | 'teacher';
  display: string;
  structuredHtml: string | null | undefined;
  renderedPath: string;
  renderedHtml: string;
  preferMarkdown: boolean;
}): AiToolSectionAudit {
  const api = summarizeApiSections(opts.display);
  const structuredSectionNums = extractSectionNumsFromHtml(opts.structuredHtml || '');
  const renderedSectionNums = extractSectionNumsFromHtml(opts.renderedHtml);
  const renderedSet = new Set(renderedSectionNums);
  const missingFromRender = api.sections
    .filter((s) => s.hasBody && !renderedSet.has(s.num))
    .map((s) => s.num);

  return {
    toolType: opts.toolType,
    variant: opts.variant,
    apiSectionCount: api.count,
    apiSections: api.sections,
    structuredSectionNums,
    renderedPath: opts.renderedPath,
    renderedSectionNums,
    missingFromRender,
    preferMarkdown: opts.preferMarkdown,
  };
}

export function logAiToolSectionAudit(audit: AiToolSectionAudit): void {
  const apiNums = audit.apiSections.map((s) => s.num).join(',') || 'none';
  const renderedNums = audit.renderedSectionNums.join(',') || 'none';
  const missing =
    audit.missingFromRender.length > 0 ? audit.missingFromRender.join(',') : 'none';

  console.log(
    `[AiToolSections] ${audit.toolType} (${audit.variant}) path=${audit.renderedPath} ` +
      `api=[${apiNums}] rendered=[${renderedNums}] missing=[${missing}] preferMarkdown=${audit.preferMarkdown}`,
  );

  if (audit.missingFromRender.length > 0) {
    const detail = audit.apiSections
      .filter((s) => audit.missingFromRender.includes(s.num))
      .map((s) => `${s.num}:${s.title}`)
      .join(' | ');
    console.warn(`[AiToolSections] Missing on screen for ${audit.toolType}: ${detail}`);
  }
}
