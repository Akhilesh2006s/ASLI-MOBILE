/**
 * Parse Worksheet & MCQ Generator payloads into a 10-section worksheet model.
 */

export type WorksheetQuestion = {
  questionNumber?: number;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  marks?: number;
  type?: string;
  section?: string;
};

export type WorksheetSection = {
  id: string;
  order: number;
  label: string;
  displayLabel: string;
  questions: WorksheetQuestion[];
};

export type NormalizedWorksheet = {
  title: string;
  learningObjectives: string[];
  instructions: string;
  sections: WorksheetSection[];
  answerKey: string;
  bloomLevel: string;
  difficultyTag: string;
};

export type ResolvedWorksheetMcq = {
  worksheet: NormalizedWorksheet | null;
  markdownFallback: string | null;
};

export const WORKSHEET_SECTION_ORDER = [
  'Section A: MCQs',
  'Section B: Fill in the Blanks',
  'Section C: Very Short Answer Questions',
  'Section D: Short Answer Questions',
  'Section E: Competency / Real-life Application Questions',
] as const;

const SECTION_META: Record<
  string,
  { id: string; order: number; displayPrefix: string }
> = {
  'Section A: MCQs': { id: 'section_a', order: 4, displayPrefix: '4' },
  'Section B: Fill in the Blanks': { id: 'section_b', order: 5, displayPrefix: '5' },
  'Section C: Very Short Answer Questions': { id: 'section_c', order: 6, displayPrefix: '6' },
  'Section D: Short Answer Questions': { id: 'section_d', order: 7, displayPrefix: '7' },
  'Section E: Competency / Real-life Application Questions': {
    id: 'section_e',
    order: 8,
    displayPrefix: '8',
  },
};

function coalesceLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? '').trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
      .filter(Boolean);
  }
  return [];
}

function coalesceText(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join('\n');
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return coalesceText(o.text ?? o.content ?? o.body ?? o.value);
  }
  return String(v ?? '').trim();
}

function stripInlineMarkdown(text: string): string {
  let t = String(text || '');
  if (!t.trim()) return '';
  // Basic inline cleanup: bold/italic/code + heading markers
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/(^|[^\*])\*([^*\n]+)\*/g, '$1$2');
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function normalizeOptions(entry: Record<string, unknown>): string[] {
  if (!Array.isArray(entry?.options)) return [];
  return (entry.options as unknown[])
    .map((opt: unknown, idx: number) => {
      const text = stripInlineMarkdown(String(opt || '').trim());
      if (!text) return '';
      if (/^[A-D][\).]/i.test(text)) return text.replace(/^([A-D])\./i, '$1)');
      return `${String.fromCharCode(65 + idx)}) ${text}`;
    })
    .filter(Boolean);
}

function toWorksheetQuestions(value: unknown): WorksheetQuestion[] {
  const rows = Array.isArray(value) ? value : [];
  const out: WorksheetQuestion[] = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    const question = stripInlineMarkdown(String(entry.question || entry.prompt || entry.text || '').trim());
    if (!question) continue;
    const marksRaw = entry.marks ?? entry.mark;
    const marks =
      marksRaw != null && !Number.isNaN(Number(marksRaw)) ? Number(marksRaw) : undefined;
    out.push({
      questionNumber:
        entry.question_number != null
          ? Number(entry.question_number)
          : entry.questionNumber != null
            ? Number(entry.questionNumber)
            : undefined,
      question,
      options: normalizeOptions(entry),
      answer: stripInlineMarkdown(String(entry.answer || entry.correctAnswer || '').trim()),
      explanation:
        stripInlineMarkdown(String(entry.explanation || entry.solution || '').trim()) || undefined,
      marks: Number.isFinite(marks) ? marks : undefined,
      type: stripInlineMarkdown(String(entry.type || entry.question_type || '').trim()) || undefined,
      section:
        stripInlineMarkdown(String(entry.section || entry.sectionName || '').trim()) || undefined,
    });
  }

  return out;
}

export function mapSectionName(name: string): string {
  const n = String(name || '').trim();
  if (/^multiple\s*choice\s*questions?$/i.test(n)) return WORKSHEET_SECTION_ORDER[0];
  if (/^fill\s*in\s*the\s*blanks?$/i.test(n)) return WORKSHEET_SECTION_ORDER[1];
  if (/^very\s*short\s*answer\s*questions?$/i.test(n)) return WORKSHEET_SECTION_ORDER[2];
  if (/^short\s*answer\s*questions?$/i.test(n) && !/very/i.test(n)) return WORKSHEET_SECTION_ORDER[3];
  if (/^section\s*a|mcq|multiple\s*choice/i.test(n)) return WORKSHEET_SECTION_ORDER[0];
  if (/^section\s*b|fill|blank|fib/i.test(n)) return WORKSHEET_SECTION_ORDER[1];
  if (/^section\s*c|very\s*short|vsa/i.test(n)) return WORKSHEET_SECTION_ORDER[2];
  if (/^section\s*d|short\s*answer/i.test(n) && !/very/i.test(n)) return WORKSHEET_SECTION_ORDER[3];
  if (/^section\s*[ef]|competency|real[\s-]*life|application/i.test(n)) return WORKSHEET_SECTION_ORDER[4];
  if ((WORKSHEET_SECTION_ORDER as readonly string[]).includes(n)) return n;
  return n || 'Questions';
}

function inferSectionForQuestion(q: WorksheetQuestion): string {
  let sec = String(q.section || '').trim();
  const qType = String(q.type || '').trim();
  if (/multiple\s*choice/i.test(qType)) return WORKSHEET_SECTION_ORDER[0];
  if (/fill\s*in/i.test(qType)) return WORKSHEET_SECTION_ORDER[1];
  if (/very\s*short/i.test(qType)) return WORKSHEET_SECTION_ORDER[2];
  if (/short\s*answer/i.test(qType) && !/very/i.test(qType)) return WORKSHEET_SECTION_ORDER[3];
  if (sec && sec !== 'Questions') return mapSectionName(sec);
  const qt = q.question;
  const words = qt.split(/\s+/).filter(Boolean).length;
  const competencyCue =
    /(?:real[\s-]*life|application|competency|case[\s-]*based|scenario|daily\s+life|at\s+home|in\s+school|how\s+would\s+you|what\s+would\s+you\s+do|design|plan|investigate|experiment|observe|compare)\b/i.test(
      qt,
    );
  const looksPromptLike =
    /\?/.test(qt) ||
    /^(?:imagine|suppose|consider|how would you|what would you do|design|plan|investigate|observe|compare)\b/i.test(
      qt,
    );
  if (q.options.length > 0) return WORKSHEET_SECTION_ORDER[0];
  if (/_{2,}/.test(qt)) return WORKSHEET_SECTION_ORDER[1];
  if (competencyCue && looksPromptLike) {
    return WORKSHEET_SECTION_ORDER[4];
  }
  if (looksPromptLike && /(?:in your daily life|around you|at home|in school)\b/i.test(qt)) {
    return WORKSHEET_SECTION_ORDER[4];
  }
  const marks = q.marks;
  if (marks != null && marks >= 3) return WORKSHEET_SECTION_ORDER[3];
  if (marks != null && marks > 0 && marks <= 2) return WORKSHEET_SECTION_ORDER[2];
  if (/\?/.test(qt) && words <= 12) return WORKSHEET_SECTION_ORDER[2];
  if (/\?/.test(qt)) return WORKSHEET_SECTION_ORDER[3];
  if (words >= 10) return WORKSHEET_SECTION_ORDER[3];
  return WORKSHEET_SECTION_ORDER[2];
}

function isLikelyCompetencyQuestionText(text: string): boolean {
  const q = String(text || '').trim();
  if (!q) return false;
  return /(?:real[\s-]*life|application|competency|case[\s-]*based|scenario|daily\s+life|at\s+home|in\s+school|how\s+would\s+you|what\s+would\s+you\s+do|design|plan|investigate|experiment|observe|compare)/i.test(
    q,
  );
}

function balanceWorksheetSectionList(sections: WorksheetSection[]): WorksheetSection[] {
  const dKey = WORKSHEET_SECTION_ORDER[3];
  const cKey = WORKSHEET_SECTION_ORDER[2];
  const dSec = sections.find((s) => s.label === dKey);
  const cSec = sections.find((s) => s.label === cKey);
  if (!dSec || !cSec || dSec.questions.length > 0 || cSec.questions.length < 2) return sections;

  const longest = [...cSec.questions].sort(
    (a, b) =>
      String(b.question || '').split(/\s+/).filter(Boolean).length -
      String(a.question || '').split(/\s+/).filter(Boolean).length,
  )[0];
  if (!longest) return sections;

  return sections.map((sec) => {
    if (sec.label === cKey) {
      return { ...sec, questions: sec.questions.filter((q) => q !== longest) };
    }
    if (sec.label === dKey) {
      return { ...sec, questions: [{ ...longest, section: dKey }] };
    }
    return sec;
  });
}

function buildSectionsFromQuestions(questions: WorksheetQuestion[]): WorksheetSection[] {
  const sectionMap = new Map<string, WorksheetQuestion[]>();
  for (const q of questions) {
    const key = inferSectionForQuestion(q);
    const prev = sectionMap.get(key) || [];
    sectionMap.set(key, [...prev, q]);
  }
  const dKey = WORKSHEET_SECTION_ORDER[3];
  const eKey = WORKSHEET_SECTION_ORDER[4];
  const dQuestions = sectionMap.get(dKey) || [];
  const eQuestions = sectionMap.get(eKey) || [];
  if (eQuestions.length === 0 && dQuestions.length > 1) {
    const moveIdx = dQuestions.findIndex((q) => isLikelyCompetencyQuestionText(q.question));
    if (moveIdx >= 0) {
      const [moved] = dQuestions.splice(moveIdx, 1);
      sectionMap.set(dKey, dQuestions);
      sectionMap.set(eKey, [...eQuestions, moved]);
    }
  }
  if (dQuestions.length === 0 && eQuestions.length > 1) {
    const moveBackIdx = eQuestions.findIndex((q) => !isLikelyCompetencyQuestionText(q.question));
    const idx = moveBackIdx >= 0 ? moveBackIdx : eQuestions.length - 1;
    const [movedBack] = eQuestions.splice(idx, 1);
    if (movedBack) {
      sectionMap.set(dKey, [...dQuestions, movedBack]);
      sectionMap.set(eKey, eQuestions);
    }
  }
  return balanceWorksheetSectionList(
    WORKSHEET_SECTION_ORDER.map((label) => {
      const meta = SECTION_META[label];
      return {
        id: meta.id,
        order: meta.order,
        label,
        displayLabel: `${meta.displayPrefix}. ${label}`,
        questions: sectionMap.get(label) || [],
      };
    }),
  );
}

function expandRawRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const r = { ...raw };
  r.title = r.title ?? r.worksheet_title ?? r.name;
  r.learning_objectives = r.learning_objectives ?? r.learningObjectives ?? r.objectives;
  r.instructions = r.instructions ?? r.student_instructions;
  r.answer_key = r.answer_key ?? r.answerKey ?? r.answers;
  r.bloom_level = r.bloom_level ?? r.bloomLevel;
  r.difficulty_tag = r.difficulty_tag ?? r.difficultyTag ?? r.difficulty;
  return r;
}

function materializeWorksheet(raw: Record<string, unknown>): NormalizedWorksheet {
  const r = expandRawRecord(raw);
  const sectionMap = new Map<string, WorksheetQuestion[]>();

  const sectionsRaw = r.sections;
  if (Array.isArray(sectionsRaw)) {
    for (const sec of sectionsRaw) {
      if (!sec || typeof sec !== 'object') continue;
      const s = sec as Record<string, unknown>;
      const name = mapSectionName(String(s.sectionName || s.title || s.name || 'Section'));
      const qs = toWorksheetQuestions(s.questions);
      const prev = sectionMap.get(name) || [];
      sectionMap.set(name, [...prev, ...qs]);
    }
  }

  const sectionKeyMap: Array<[string, string]> = [
    ['section_a', WORKSHEET_SECTION_ORDER[0]],
    ['section_a_mcqs', WORKSHEET_SECTION_ORDER[0]],
    ['section_b', WORKSHEET_SECTION_ORDER[1]],
    ['section_b_fib', WORKSHEET_SECTION_ORDER[1]],
    ['fill_in_blanks', WORKSHEET_SECTION_ORDER[1]],
    ['section_c', WORKSHEET_SECTION_ORDER[2]],
    ['section_c_vsa', WORKSHEET_SECTION_ORDER[2]],
    ['section_d', WORKSHEET_SECTION_ORDER[3]],
    ['section_d_sa', WORKSHEET_SECTION_ORDER[3]],
    ['section_e', WORKSHEET_SECTION_ORDER[4]],
    ['section_e_competency', WORKSHEET_SECTION_ORDER[4]],
    ['section_f', WORKSHEET_SECTION_ORDER[4]],
    ['section_f_competency', WORKSHEET_SECTION_ORDER[4]],
  ];
  for (const [key, sectionLabel] of sectionKeyMap) {
    const block = r[key];
    if (!block) continue;
    const rows = Array.isArray(block)
      ? block
      : block && typeof block === 'object'
        ? ((block as Record<string, unknown>).questions ??
          (block as Record<string, unknown>).items ??
          (block as Record<string, unknown>).data ??
          [])
        : [];
    const qs = toWorksheetQuestions(rows).map((q) => ({ ...q, section: q.section || sectionLabel }));
    if (!qs.length) continue;
    const prev = sectionMap.get(sectionLabel) || [];
    sectionMap.set(sectionLabel, [...prev, ...qs]);
  }

  const flatQs = toWorksheetQuestions(r.questions);
  if (flatQs.length) {
    for (const q of flatQs) {
      const key = inferSectionForQuestion(q);
      const prev = sectionMap.get(key) || [];
      sectionMap.set(key, [...prev, q]);
    }
  }

  if (!sectionMap.size && String(r.question || '').trim()) {
    const single = toWorksheetQuestions([r])[0];
    if (single) {
      const key = inferSectionForQuestion(single);
      sectionMap.set(key, [single]);
    }
  }

  const sections = balanceWorksheetSectionList(
    WORKSHEET_SECTION_ORDER.map((label) => {
      const meta = SECTION_META[label];
      return {
        id: meta.id,
        order: meta.order,
        label,
        displayLabel: `${meta.displayPrefix}. ${label}`,
        questions: sectionMap.get(label) || [],
      };
    }),
  );

  return {
    title: String(r.title || r.worksheet_title || 'Worksheet').trim(),
    learningObjectives: coalesceLines(r.learning_objectives),
    instructions: coalesceText(r.instructions),
    sections,
    answerKey: coalesceText(r.answer_key),
    bloomLevel: coalesceText(r.bloom_level),
    difficultyTag: coalesceText(r.difficulty_tag),
  };
}

function absorbRawRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.sections) && (o.title || o.questions || o.learning_objectives)) return [o];
  if (Array.isArray(o.questions) && (o.title || o.instructions)) return [o];
  if (o.raw && typeof o.raw === 'object') return absorbRawRecords(o.raw);
  if (o.data && typeof o.data === 'object') return absorbRawRecords(o.data);
  if (o.structuredContent && typeof o.structuredContent === 'object') {
    return absorbRawRecords(o.structuredContent);
  }
  if (o.title || o.worksheet_title || o.questions) return [o];
  return [];
}

function looksLikeJsonText(text: string): boolean {
  const t = String(text || '').trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

function extractMarkdownSection(body: string, titlePattern: RegExp): string {
  const lines = body.split('\n');
  let capturing = false;
  const buf: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    const plain = stripInlineMarkdown(t);
    if (/^#{1,3}\s/.test(t) || /^\d{1,2}\.\s+[A-Z]/.test(plain)) {
      if (capturing) break;
      if (titlePattern.test(plain.replace(/^#+\s*|\d+\.\s*/i, ''))) {
        capturing = true;
        continue;
      }
    }
    if (capturing) buf.push(line);
  }
  return buf.join('\n').trim();
}

function normalizeOptionLine(line: string, idx: number): string {
  const t = stripInlineMarkdown(String(line || '').trim());
  if (!t) return '';
  if (/^[A-D][\).]/i.test(t)) return t.replace(/^([A-D])\./i, '$1)');
  return `${String.fromCharCode(65 + idx)}) ${t}`;
}

function parseQuestionsFromLines(
  lines: string[],
  opts: { relaxedNumbered?: boolean } = {},
): WorksheetQuestion[] {
  const out: WorksheetQuestion[] = [];
  let current: WorksheetQuestion | null = null;
  let optionBuf: string[] = [];

  const flush = () => {
    if (!current) return;
    if (!current.options.length && optionBuf.length) {
      const opts = optionBuf
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map((l, i) => normalizeOptionLine(l, i))
        .filter(Boolean);
      // Heuristic: treat as options only if multiple lines (MCQ-style)
      if (opts.length >= 2) current.options = opts;
    }
    optionBuf = [];
    const qText = current.question.trim();
    const wordCount = qText.split(/\s+/).filter(Boolean).length;
    const looksLikeAnswerFragment =
      !/\?/.test(qText) &&
      !/_{2,}/.test(qText) &&
      !/^(what|why|how|which|who|when|where|define|explain|state|list|name|describe|give|write|compare|differentiate|justify|identify|predict|design|plan)\b/i.test(
        qText,
      ) &&
      (wordCount <= 3 || /[,;:]$/.test(qText));
    if (qText && !looksLikeAnswerFragment) out.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = stripInlineMarkdown(String(raw || '').trim());
    if (!line) continue;

    const isTemplateHeading =
      /^section\s+[a-f]\b/i.test(line) ||
      /^\d{1,2}\.\s*(learning objectives|instructions to students|answer key|bloom'?s|difficulty)/i.test(
        line,
      ) ||
      /^(answer key|bloom'?s level)/i.test(line);

    if (isTemplateHeading) {
      // End current question before template headings so 9/10 never become fake options.
      flush();
      continue;
    }

    const qStart =
      line.match(/^(?:\*\*)?Q(?:uestion)?\s*(\d+)?\s*[\).:\-]?\s*(.+)$/i) ||
      (() => {
        const m = line.match(/^(\d+)\.\s+(.+)$/);
        if (!m) return null;
        const candidate = String(m[2] || '').trim();
        // Numeric line should look like a real question, not a section label.
        if (
          /^(section|answer key|bloom|difficulty|learning objectives|instructions)/i.test(candidate)
        ) {
          return null;
        }
        if (
          /\?$/.test(candidate) ||
          /^what|why|how|which|who|when|where|explain|define/i.test(candidate)
        ) {
          return m;
        }
        if (
          opts.relaxedNumbered &&
          candidate.length >= 15 &&
          candidate.split(/\s+/).filter(Boolean).length >= 4
        ) {
          return m;
        }
        return null;
      })();
    if (qStart) {
      flush();
      const qNum = qStart[1] ? Number(qStart[1]) : undefined;
      current = {
        questionNumber: Number.isFinite(qNum as number) ? (qNum as number) : undefined,
        question: stripInlineMarkdown(String(qStart[2] || '').trim()),
        options: [],
        answer: '',
      };
      continue;
    }

    const ansMatch = line.match(/^(?:\*\*)?Answer\s*[:\-]\s*(.+)$/i);
    if (ansMatch && current) {
      current.answer = stripInlineMarkdown(String(ansMatch[1] || '').trim());
      continue;
    }

    const expMatch = line.match(/^(?:\*\*)?Explanation\s*[:\-]\s*(.+)$/i);
    if (expMatch && current) {
      current.explanation = stripInlineMarkdown(String(expMatch[1] || '').trim());
      continue;
    }

    const marksMatch = line.match(/^(?:\*\*)?Marks?\s*[:\-]\s*(\d+)\b/i);
    if (marksMatch && current) {
      current.marks = Number(marksMatch[1]);
      continue;
    }

    if (!current) {
      // In explicit section parsing mode, treat bullet lines as standalone prompts.
      if (opts.relaxedNumbered) {
        const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
          out.push({
            question: stripInlineMarkdown(String(bulletMatch[1] || '').trim()),
            options: [],
            answer: '',
          });
        }
      }
      continue;
    }

    // If the question line was short and the next lines look like options, buffer them.
    // This supports outputs where options are NOT labeled A/B/C/D (like your screenshot).
    optionBuf.push(line);
  }

  flush();
  return out;
}

function splitMarkdownIntoNamedBlocks(markdown: string): Array<{ heading: string; lines: string[] }> {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: Array<{ heading: string; lines: string[] }> = [];
  let currentHeading = '';
  let buf: string[] = [];

  const flush = () => {
    if (!currentHeading && buf.length === 0) return;
    blocks.push({ heading: currentHeading, lines: buf });
    buf = [];
  };

  for (const line of lines) {
    const t = line.trim();
    const plain = stripInlineMarkdown(t);
    const sectionHeading = plain.match(
      /^#{0,3}\s*(?:\d+\.\s*)?(Section\s+[A-F]\s*:?.*)$/i,
    );
    if (sectionHeading) {
      flush();
      currentHeading = sectionHeading[1].replace(/\s+/g, ' ').trim();
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

function parseWorksheetFromMarkdown(text: string): NormalizedWorksheet | null {
  const body = String(text || '').trim();
  if (!body) return null;

  let title = 'Worksheet';
  const h2 = body.match(/^##\s+(.+?)(?:\n|$)/m);
  if (h2) title = h2[1].replace(/^\d+\.\s*/, '').trim();

  const objectivesBlock = extractMarkdownSection(body, /learning\s+objectives?/i);
  const instructionsBlock = extractMarkdownSection(body, /instructions?\s+to\s+students?/i);
  let answerKeyBlock = extractMarkdownSection(body, /answer\s+key/i);
  let bloomBlock = extractMarkdownSection(body, /bloom|difficulty\s+tag/i);

  // Fallback for plain numbered headings (e.g. "9. Answer Key", "10. Bloom's Level...")
  if (!answerKeyBlock) {
    const m = body.match(
      /(?:^|\n)(?:\*\*)?\s*9\.\s*Answer\s*Key(?:\*\*)?\s*\n+([\s\S]*?)(?=\n(?:\*\*)?\s*10\.\s*Bloom|\n#{1,3}\s|$)/i,
    );
    if (m) answerKeyBlock = m[1].trim();
  }
  if (!bloomBlock) {
    const m = body.match(
      /(?:^|\n)(?:\*\*)?\s*10\.\s*Bloom'?s?\s*Level.*?\n+([\s\S]*?)(?=\n#{1,3}\s|$)/i,
    );
    if (m) bloomBlock = m[1].trim();
  }

  // Prefer parsing by explicit Section A–F blocks (F is mapped to E).
  const blockSections = splitMarkdownIntoNamedBlocks(body);
  const sectionMap = new Map<string, WorksheetQuestion[]>();
  for (const block of blockSections) {
    const mapped = mapSectionName(block.heading);
    if (!/^section\s+[a-f]/i.test(mapped)) continue;
    const qs = parseQuestionsFromLines(block.lines, { relaxedNumbered: true });
    if (!qs.length) continue;
    const prev = sectionMap.get(mapped) || [];
    sectionMap.set(mapped, [...prev, ...qs]);
  }

  // Fallback: parse questions from entire body if no section blocks were found.
  let sections = buildSectionsFromQuestions([]);
  if (sectionMap.size) {
    sections = balanceWorksheetSectionList(
      WORKSHEET_SECTION_ORDER.map((label) => {
        const meta = SECTION_META[label];
        return {
          id: meta.id,
          order: meta.order,
          label,
          displayLabel: `${meta.displayPrefix}. ${label}`,
          questions: sectionMap.get(label) || [],
        };
      }),
    );
  } else {
    const qs = parseQuestionsFromLines(body.split('\n'));
    sections = buildSectionsFromQuestions(qs);
  }

  // If the markdown didn't provide a dedicated "Answer key" block, but individual
  // questions include answers, synthesize a compact key from those answers so the
  // "Answer key" section in the UI is not empty.
  if (!answerKeyBlock) {
    const allQuestions: WorksheetQuestion[] = [];
    for (const sec of sections) {
      allQuestions.push(...sec.questions);
    }
    const lines: string[] = [];
    allQuestions.forEach((q, i) => {
      const ans = String(q.answer || '').trim();
      if (!ans) return;
      const num =
        Number.isFinite(q.questionNumber as number) && (q.questionNumber as number) > 0
          ? (q.questionNumber as number)
          : i + 1;
      lines.push(`${num}. ${ans}`);
    });
    if (lines.length) {
      answerKeyBlock = lines.join('\n');
    }
  }

  const ws: NormalizedWorksheet = {
    title,
    learningObjectives: objectivesBlock ? coalesceLines(objectivesBlock) : [],
    instructions: instructionsBlock,
    sections,
    answerKey: answerKeyBlock,
    bloomLevel: bloomBlock,
    difficultyTag: '',
  };

  return worksheetHasVisibleContent(ws) ? ws : null;
}

function mergeWorksheetWithMarkdown(
  base: NormalizedWorksheet,
  fromMd: NormalizedWorksheet,
): NormalizedWorksheet {
  return {
    // Prefer markdown title when base is generic.
    title:
      !base.title || /^worksheet$/i.test(base.title.trim())
        ? fromMd.title || base.title
        : base.title,
    learningObjectives: fromMd.learningObjectives.length
      ? fromMd.learningObjectives
      : base.learningObjectives,
    instructions: fromMd.instructions || base.instructions,
    // IMPORTANT: keep markdown section order/content authoritative, fallback to base only if md section empty.
    sections: fromMd.sections.map((mdSec, i) => ({
      ...mdSec,
      questions: mdSec.questions.length ? mdSec.questions : base.sections[i]?.questions || [],
    })),
    // Prefer markdown extraction for these to prevent them being swallowed by question parsing.
    answerKey: fromMd.answerKey || base.answerKey,
    bloomLevel: fromMd.bloomLevel || base.bloomLevel,
    difficultyTag: fromMd.difficultyTag || base.difficultyTag,
  };
}

export function worksheetHasVisibleContent(w: NormalizedWorksheet): boolean {
  return (
    !!w.title ||
    w.learningObjectives.length > 0 ||
    !!w.instructions ||
    w.sections.some((s) => s.questions.length > 0) ||
    !!w.answerKey ||
    !!w.bloomLevel ||
    !!w.difficultyTag
  );
}

export function countWorksheetQuestions(w: NormalizedWorksheet): number {
  return w.sections.reduce((n, s) => n + s.questions.length, 0);
}

export function resolveWorksheetFromPayload(
  content?: string,
  rawContent?: unknown,
): ResolvedWorksheetMcq {
  let formattedText = String(content || '').trim();
  const rawRecords: Record<string, unknown>[] = [];

  try {
    const parsed = JSON.parse(formattedText) as Record<string, unknown>;
    if (parsed.formatted != null) formattedText = String(parsed.formatted).trim();
    if (!formattedText && parsed.markdown) formattedText = String(parsed.markdown).trim();
    rawRecords.push(...absorbRawRecords(parsed.raw));
    if (!rawRecords.length) rawRecords.push(...absorbRawRecords(parsed));
  } catch {
    /* plain markdown */
  }

  if (!rawRecords.length) {
    try {
      rawRecords.push(...absorbRawRecords(JSON.parse(formattedText)));
    } catch {
      /* not json */
    }
  }

  rawRecords.push(...absorbRawRecords(rawContent));

  let worksheet: NormalizedWorksheet | null = null;
  if (rawRecords.length) {
    worksheet = materializeWorksheet(rawRecords[0]);
    for (let i = 1; i < rawRecords.length; i++) {
      const next = materializeWorksheet(rawRecords[i]);
      if (countWorksheetQuestions(next) > countWorksheetQuestions(worksheet)) {
        worksheet = next;
      }
    }
  }

  const displayMarkdown =
    formattedText && !looksLikeJsonText(formattedText) ? formattedText : null;

  if (displayMarkdown) {
    const fromMd = parseWorksheetFromMarkdown(displayMarkdown);
    if (fromMd) {
      if (!worksheet || !worksheetHasVisibleContent(worksheet)) {
        worksheet = fromMd;
      } else {
        worksheet = mergeWorksheetWithMarkdown(worksheet, fromMd);
      }
    }
  }

  let markdownFallback: string | null = null;
  if (!worksheet || !worksheetHasVisibleContent(worksheet)) {
    if (displayMarkdown) markdownFallback = displayMarkdown;
  }

  return { worksheet, markdownFallback };
}
