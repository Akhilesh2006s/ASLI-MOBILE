import { resolveConceptBreakdownFromPayload } from './parse-concept-breakdown';
import { resolveChapterSummaryFromPayload } from './parse-chapter-summary';
import { resolveKeyPointsFromPayload } from './parse-key-points';
import { resolvePracticeQaFromPayload } from './parse-practice-qa';
import { resolveQuickAssignmentFromPayload } from './parse-quick-assignment';
import { resolveMockTestFromPayload } from './parse-mock-test';
import { resolveExamPaperFromPayload } from './parse-exam-question-paper';
import { resolveLessonsFromPayload } from './parse-lesson-planner';
import { resolveDailyPlansFromPayload } from './parse-daily-class-plan';
import { resolveHomeworkFromPayload } from './parse-homework-creator';
import { resolveWorksheetFromPayload } from './parse-worksheet-mcq';
import { resolveStoryFromPayload, type ParsedStory, type StoryQuestion } from './parse-story-content';
import { resolveConceptsFromPayload, type NormalizedConcept } from './parse-concept-mastery';
import {
  cleanReflectionProse,
  dedupeStringLines,
  normalizeParsedActivityFields,
  resolveActivitiesFromPayload,
  studentActivitySectionsComplete,
  teacherActivitySectionsComplete,
  type ParsedActivity,
} from './parse-activity-markdown';
import {
  flashcardsHaveVisibleBody,
  resolveFlashcardsFromPayload,
  resolveStudentDeckMeta,
  resolveTeacherDeckMeta,
  type Flashcard,
} from './parse-flashcards';
import {
  contentHasNumberedTemplateSections,
  resolveRichDisplayContent,
} from './ai-tool-display-content';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';
import {
  bulletListHtml,
  checkListHtml,
  conceptGridHtml,
  emptySectionPlaceholderHtml,
  escapeHtml,
  heroTitleCardHtml,
  numberedMaterialsHtml,
  numberedStepsHtml,
  richTextHtml,
  sectionCardHtml,
  sectionNumberIconSvg,
  termGridHtml,
} from './ai-tool-html-primitives';

type Variant = 'student' | 'teacher';

function renderConceptBreakdownHtml(content: string, rawContent: unknown): string | null {
  const { concepts, markdownFallback } = resolveConceptBreakdownFromPayload(content, rawContent);
  if (markdownFallback || !concepts.length) return null;
  return concepts
    .map((concept, idx) => {
      let html = heroTitleCardHtml({
        eyebrow: 'Concept Title',
        title: concept.conceptTitle,
        theme: 'violet',
      });
      if (concept.simpleDefinition) {
        html += sectionCardHtml({
          sectionNum: 'Section 2',
          title: 'Simple Definition',
          stripe: 'border-violet-300',
          iconWrap: 'bg-violet-100 text-violet-800',
          iconSvg: '<span>🧠</span>',
          borderColor: 'border-violet-200/90',
          body: richTextHtml(concept.simpleDefinition),
        });
      }
      if (concept.breakdownSteps.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 3',
          title: 'Step-by-Step Breakdown',
          stripe: 'border-indigo-300',
          iconWrap: 'bg-indigo-100 text-indigo-800',
          iconSvg: '<span>📋</span>',
          borderColor: 'border-violet-200/90',
          body: numberedStepsHtml(concept.breakdownSteps, 'bg-indigo-100 text-indigo-800'),
        });
      }
      if (concept.realLifeExamples.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 4',
          title: 'Real-life and Indian Context Examples',
          stripe: 'border-emerald-300',
          iconWrap: 'bg-emerald-100 text-emerald-800',
          iconSvg: '<span>💡</span>',
          borderColor: 'border-violet-200/90',
          body: bulletListHtml(concept.realLifeExamples, 'text-emerald-600'),
        });
      }
      if (concept.importantTerms.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 5',
          title: 'Important Terms and Keywords',
          stripe: 'border-amber-300',
          iconWrap: 'bg-amber-100 text-amber-900',
          iconSvg: '<span>🏷</span>',
          borderColor: 'border-violet-200/90',
          body: termGridHtml(concept.importantTerms),
        });
      }
      if (concept.quickRevisionSummary) {
        html += sectionCardHtml({
          sectionNum: 'Section 9',
          title: 'Quick Revision Summary',
          stripe: 'border-violet-300',
          iconWrap: 'bg-violet-100 text-violet-900',
          iconSvg: '<span>✨</span>',
          borderColor: 'border-violet-200/90',
          body: `<div class="rounded-lg border border-violet-200 bg-violet-50/60 px-2.5 py-2">${richTextHtml(concept.quickRevisionSummary)}</div>`,
        });
      }
      return html;
    })
    .join('<div class="h-4"></div>');
}

function renderChapterSummaryHtml(content: string, rawContent: unknown): string | null {
  const { summary, markdownFallback } = resolveChapterSummaryFromPayload(content, rawContent);
  if (markdownFallback || !summary) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Section 1 · Chapter Summary',
    title: summary.title || 'Chapter Summary',
    theme: 'blue',
  });
  if (summary.chapterOverview) {
    html += sectionCardHtml({
      sectionNum: 'Section 2',
      title: 'Overview of the Chapter',
      stripe: 'border-sky-300',
      iconWrap: 'bg-sky-100 text-sky-800',
      iconSvg: '<span>📖</span>',
      borderColor: 'border-blue-200/90',
      body: richTextHtml(summary.chapterOverview),
    });
  }
  if (summary.learningObjectives.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 3',
      title: 'Learning Objectives',
      stripe: 'border-indigo-300',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      iconSvg: '<span>🎯</span>',
      borderColor: 'border-blue-200/90',
      body: bulletListHtml(summary.learningObjectives, 'text-indigo-500'),
    });
  }
  if (summary.importantConcepts.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 4',
      title: 'Important Concepts and Explanations',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      iconSvg: '<span>✨</span>',
      borderColor: 'border-blue-200/90',
      body: conceptGridHtml(summary.importantConcepts),
    });
  }
  if (summary.quickRevisionNotes.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 9',
      title: 'Quick Revision Notes',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      iconSvg: '<span>📝</span>',
      borderColor: 'border-blue-200/90',
      body: bulletListHtml(summary.quickRevisionNotes),
    });
  }
  return html;
}

function renderKeyPointsHtml(content: string, rawContent: unknown): string | null {
  const { keyPoints, markdownFallback } = resolveKeyPointsFromPayload(content, rawContent);
  if (markdownFallback || !keyPoints) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Section 1 · Key Points Sheet',
    title: keyPoints.title || 'Key Points & Formulas',
    theme: 'amber',
  });
  if (keyPoints.importantConcepts.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 2',
      title: 'Important Concepts',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-900',
      iconSvg: '<span>⭐</span>',
      borderColor: 'border-amber-200/90',
      body: conceptGridHtml(keyPoints.importantConcepts),
    });
  }
  if (keyPoints.formulae.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 4',
      title: 'Formulae',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      iconSvg: '<span>∑</span>',
      borderColor: 'border-amber-200/90',
      body: termGridHtml(
        keyPoints.formulae.map((f) => ({
          term: f.name || f.formula,
          definition: f.note,
        }))
      ),
    });
  }
  if (keyPoints.oneMinuteSummary) {
    html += sectionCardHtml({
      sectionNum: 'Section 10',
      title: 'One-Minute Summary',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      iconSvg: '<span>⏱</span>',
      borderColor: 'border-amber-200/90',
      body: richTextHtml(keyPoints.oneMinuteSummary),
    });
  }
  return html;
}

function renderPracticeQaHtml(content: string, rawContent: unknown): string | null {
  const { practice, markdownFallback } = resolvePracticeQaFromPayload(content, rawContent);
  if (markdownFallback || !practice) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Practice Q&A',
    title: practice.title || 'Smart Q&A Practice',
    theme: 'orange',
    badge: `${practice.sections.length} sections`,
  });
  for (const sec of practice.sections) {
    const questions = sec.questions || [];
    if (!questions.length) continue;
    const body = questions
      .map((q, i) => {
        const opts =
          q.options && q.options.length
            ? `<div class="mt-2 space-y-1">${q.options
                .map((o) => `<div class="rounded border border-slate-200 bg-white px-2 py-1 text-xs">${escapeHtml(o)}</div>`)
                .join('')}</div>`
            : '';
        const ans = q.answer ? `<p class="mt-2 text-xs text-emerald-700 font-semibold">Answer: ${escapeHtml(q.answer)}</p>` : '';
        return `<div class="rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2 mb-2">
          <p class="text-xs font-bold text-orange-800">Q${i + 1}</p>
          <p class="text-sm text-slate-800 mt-1">${escapeHtml(q.question || '')}</p>
          ${opts}${ans}
        </div>`;
      })
      .join('');
    html += sectionCardHtml({
      sectionNum: sec.displayLabel || sec.label || 'Section',
      title: sec.label || 'Questions',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      iconSvg: '<span>❓</span>',
      body,
    });
  }
  return html;
}

function renderQuickAssignmentHtml(content: string, rawContent: unknown): string | null {
  const { assignment, markdownFallback } = resolveQuickAssignmentFromPayload(content, rawContent);
  if (markdownFallback || !assignment) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Quick Assignment',
    title: assignment.title || 'Assignment',
    theme: 'orange',
  });
  if (assignment.instructions) {
    html += sectionCardHtml({
      sectionNum: 'Section 2',
      title: 'Instructions',
      stripe: 'border-orange-300',
      iconWrap: 'bg-orange-100 text-orange-800',
      iconSvg: '<span>📋</span>',
      body: richTextHtml(assignment.instructions),
    });
  }
  if (assignment.applicationTasks?.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 3',
      title: 'Application Tasks',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      iconSvg: '<span>✓</span>',
      body: numberedStepsHtml(assignment.applicationTasks),
    });
  }
  if (assignment.conceptQuestions?.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 4',
      title: 'Concept Questions',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      iconSvg: '<span>❓</span>',
      body: assignment.conceptQuestions
        .map(
          (q, i) =>
            `<div class="mb-2 rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2 text-sm"><span class="font-bold text-orange-800">Q${i + 1}. </span>${escapeHtml(q.question)}</div>`
        )
        .join(''),
    });
  }
  return html;
}

function renderMockTestHtml(content: string, rawContent: unknown): string | null {
  const { paper, markdownFallback } = resolveMockTestFromPayload(content, rawContent);
  if (markdownFallback || !paper) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Mock Test',
    title: paper.paperTitle || 'Mock Test',
    theme: 'violet',
  });
  for (const section of paper.sections || []) {
    const qs = section.questions || [];
    if (!qs.length) continue;
    const body = qs
      .map(
        (q, i) =>
          `<div class="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2 mb-2">
            <p class="text-xs font-bold text-violet-800">Q${i + 1}${q.marks ? ` (${q.marks} marks)` : ''}</p>
            <p class="text-sm text-slate-800 mt-1">${escapeHtml(q.question || '')}</p>
          </div>`
      )
      .join('');
    html += sectionCardHtml({
      sectionNum: section.id || 'Section',
      title: section.title || 'Questions',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      iconSvg: '<span>📝</span>',
      body,
    });
  }
  return html;
}

function renderExamPaperHtml(content: string, rawContent: unknown): string | null {
  const { paper, markdownFallback } = resolveExamPaperFromPayload(content, rawContent);
  if (markdownFallback || !paper) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Exam Question Paper',
    title: paper.paperTitle || 'Question Paper',
    theme: 'blue',
  });
  for (const section of paper.sections || []) {
    const qs = section.questions || [];
    if (!qs.length) continue;
    const body = qs
      .map(
        (q, i) =>
          `<div class="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 mb-2">
            <p class="text-xs font-bold text-blue-800">Q${i + 1}${q.marks ? ` (${q.marks} marks)` : ''}</p>
            <p class="text-sm text-slate-800 mt-1">${escapeHtml(q.question || '')}</p>
          </div>`
      )
      .join('');
    html += sectionCardHtml({
      sectionNum: section.id || 'Section',
      title: section.title || 'Questions',
      stripe: 'border-blue-300',
      iconWrap: 'bg-blue-100 text-blue-800',
      iconSvg: '<span>📄</span>',
      body,
    });
  }
  return html;
}

const ACTIVITY_SECTION_THEMES = [
  { stripe: 'border-indigo-300', iconWrap: 'bg-indigo-100 text-indigo-800' },
  { stripe: 'border-violet-300', iconWrap: 'bg-violet-100 text-violet-800' },
  { stripe: 'border-emerald-300', iconWrap: 'bg-emerald-100 text-emerald-800' },
  { stripe: 'border-sky-300', iconWrap: 'bg-sky-100 text-sky-800' },
  { stripe: 'border-amber-300', iconWrap: 'bg-amber-100 text-amber-800' },
  { stripe: 'border-teal-300', iconWrap: 'bg-teal-100 text-teal-800' },
] as const;

type NormalizedActivityRow = {
  title: string;
  subtopicLink: string;
  learningObjectives: string[];
  ncfAlignment: string[];
  materials: string[];
  steps: string[];
  teacherInstructions: string[];
  studentInstructions: string[];
  differentiation: string;
  assessmentRubric: string[];
  expectedOutcomes: string;
  realLife: string;
  reflection: string;
};

function coalesceActivityTextLines(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        String(x ?? '')
          .replace(/^\s*\d+[\).\s]+/i, '')
          .replace(/^\s*[-*•]\s*/, '')
          .trim(),
      )
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((line) =>
        line
          .replace(/^\s*\d+[\).\s]+/i, '')
          .replace(/^\s*[-*•]\s*/, '')
          .trim(),
      )
      .filter(Boolean);
  }
  return [];
}

function firstActivityText(...values: unknown[]): string {
  for (const v of values) {
    if (Array.isArray(v)) {
      const joined = v
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
        .join('\n');
      if (joined.trim()) return joined.trim();
    } else {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  return '';
}

function normalizeActivityRow(
  raw: ParsedActivity,
  idx: number,
  mode: 'student' | 'teacher',
): NormalizedActivityRow {
  const a = normalizeParsedActivityFields(raw);
  const ncfRaw = a.ncf_competency_alignment;
  const ncf = dedupeStringLines(
    Array.isArray(ncfRaw)
      ? ncfRaw.map((x) => String(x).trim()).filter(Boolean)
      : String(ncfRaw || '')
          .split(/[;\n]+/)
          .map((x) => x.trim())
          .filter(Boolean),
  );
  const studentSteps = coalesceActivityTextLines(a.student_instructions);
  const procedureSteps = coalesceActivityTextLines(
    a.step_by_step_procedure || a.steps || a.instructions,
  );
  const steps =
    mode === 'teacher' ? procedureSteps : studentSteps.length ? studentSteps : procedureSteps;

  return {
    title: stripAiToolGenerationLabel(String(a.title || a.name || ''), 'Activity'),
    subtopicLink: firstActivityText(a.subtopic_link_prior_knowledge),
    learningObjectives: dedupeStringLines(
      coalesceActivityTextLines(a.learning_objectives || a.learningObjectives),
    ),
    ncfAlignment: ncf,
    materials: dedupeStringLines(coalesceActivityTextLines(a.materials_required || a.materials)),
    steps,
    teacherInstructions: coalesceActivityTextLines(
      a.teacher_instructions || a.teacherInstructions,
    ),
    studentInstructions: studentSteps.length
      ? studentSteps
      : coalesceActivityTextLines(a.student_instructions || a.studentInstructions),
    differentiation: String(a.differentiation_support_extension || a.differentiation || '').trim(),
    assessmentRubric: dedupeStringLines(
      coalesceActivityTextLines(a.assessment_criteria_rubric || a.assessment || a.evaluation),
    ),
    expectedOutcomes: firstActivityText(
      a.expected_learning_outcomes,
      a.learning_outcome,
      a.learning_outcomes,
      a.expected_outcome,
    ),
    realLife: String(a.real_life_application || '').trim(),
    reflection: cleanReflectionProse(String(a.reflection_exit_ticket || a.reflection || '')),
  };
}

function activitiesFromRawPayload(rawContent: unknown): ParsedActivity[] | undefined {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities as ParsedActivity[];
  return undefined;
}

function appendActivitySectionCards(
  activity: NormalizedActivityRow,
  mode: 'student' | 'teacher',
  startThemeIndex = 0,
): { html: string; nextThemeIndex: number } {
  type SectionSpec = {
    num: number;
    title: string;
    iconSvg: string;
    hasContent: (a: NormalizedActivityRow) => boolean;
    body: (a: NormalizedActivityRow) => string;
  };

  const teacherSections: SectionSpec[] = [
    {
      num: 2,
      title: 'Subtopic link and prior knowledge required',
      iconSvg: '<span>📚</span>',
      hasContent: (a) => !!a.subtopicLink,
      body: (a) => richTextHtml(a.subtopicLink),
    },
    {
      num: 3,
      title: 'Learning objectives',
      iconSvg: '<span>🎯</span>',
      hasContent: (a) => a.learningObjectives.length > 0,
      body: (a) => checkListHtml(a.learningObjectives),
    },
    {
      num: 4,
      title: 'NCF competency / learning outcome alignment',
      iconSvg: '<span>🏫</span>',
      hasContent: (a) => a.ncfAlignment.length > 0,
      body: (a) => bulletListHtml(a.ncfAlignment),
    },
    {
      num: 5,
      title: 'Materials required',
      iconSvg: '<span>📦</span>',
      hasContent: (a) => a.materials.length > 0,
      body: (a) => numberedMaterialsHtml(a.materials),
    },
    {
      num: 6,
      title: 'Step-by-step procedure',
      iconSvg: '<span>📋</span>',
      hasContent: (a) => a.steps.length > 0,
      body: (a) => numberedStepsHtml(a.steps, 'bg-emerald-100 text-emerald-800'),
    },
    {
      num: 7,
      title: 'Teacher instructions',
      iconSvg: '<span>👩‍🏫</span>',
      hasContent: (a) => a.teacherInstructions.length > 0,
      body: (a) => bulletListHtml(a.teacherInstructions),
    },
    {
      num: 8,
      title: 'Student instructions',
      iconSvg: '<span>🎒</span>',
      hasContent: (a) => a.studentInstructions.length > 0,
      body: (a) => bulletListHtml(a.studentInstructions),
    },
    {
      num: 9,
      title: 'Differentiation',
      iconSvg: '<span>🔀</span>',
      hasContent: (a) => !!a.differentiation,
      body: (a) => richTextHtml(a.differentiation),
    },
    {
      num: 10,
      title: 'Assessment rubric',
      iconSvg: '<span>📊</span>',
      hasContent: (a) => a.assessmentRubric.length > 0,
      body: (a) => bulletListHtml(a.assessmentRubric),
    },
    {
      num: 11,
      title: 'Expected learning outcomes',
      iconSvg: '<span>🏆</span>',
      hasContent: (a) => !!a.expectedOutcomes,
      body: (a) => richTextHtml(a.expectedOutcomes),
    },
    {
      num: 12,
      title: 'Real-life application',
      iconSvg: '<span>✨</span>',
      hasContent: (a) => !!a.realLife,
      body: (a) => richTextHtml(a.realLife),
    },
    {
      num: 13,
      title: 'Reflection / exit ticket',
      iconSvg: '<span>💡</span>',
      hasContent: (a) => !!a.reflection,
      body: (a) => richTextHtml(a.reflection),
    },
  ];

  const studentSections: SectionSpec[] = [
    {
      num: 2,
      title: 'Subtopic link and prior knowledge required',
      iconSvg: '<span>📚</span>',
      hasContent: (a) => !!a.subtopicLink,
      body: (a) => richTextHtml(a.subtopicLink),
    },
    {
      num: 3,
      title: "Learning Objectives - Bloom's Taxonomy Aligned",
      iconSvg: '<span>🎯</span>',
      hasContent: (a) => a.learningObjectives.length > 0,
      body: (a) => checkListHtml(a.learningObjectives),
    },
    {
      num: 6,
      title: 'Step-by-step Student Procedure',
      iconSvg: '<span>📋</span>',
      hasContent: (a) => a.steps.length > 0,
      body: (a) => numberedStepsHtml(a.steps, 'bg-emerald-100 text-emerald-800'),
    },
  ];

  const sections = mode === 'teacher' ? teacherSections : studentSections;
  let html = '';
  let themeIndex = startThemeIndex;

  for (const sec of sections) {
    if (!sec.hasContent(activity)) continue;
    const theme = ACTIVITY_SECTION_THEMES[themeIndex % ACTIVITY_SECTION_THEMES.length];
    themeIndex += 1;
    html += sectionCardHtml({
      sectionNum: `Section ${sec.num}`,
      title: sec.title,
      stripe: theme.stripe,
      iconWrap: theme.iconWrap,
      iconSvg: sec.iconSvg,
      body: sec.body(activity),
    });
  }

  return { html, nextThemeIndex: themeIndex };
}

function renderActivityProjectHtml(
  content: string,
  rawContent: unknown,
  variant: Variant,
): string | null {
  const mode = variant === 'student' ? 'student' : 'teacher';
  const rows = resolveActivitiesFromPayload(activitiesFromRawPayload(rawContent), content);
  const isComplete =
    mode === 'student' ? studentActivitySectionsComplete : teacherActivitySectionsComplete;
  const activities = rows.filter(isComplete).map((row, idx) => normalizeActivityRow(row, idx, mode));
  if (!activities.length) return null;

  return activities
    .map((activity, idx) => {
      const heroTheme = mode === 'teacher' ? 'indigo' : 'orange';
      const eyebrow =
        mode === 'teacher' ? 'Title of activity / project' : 'Project / Activity Title';
      let html = heroTitleCardHtml({
        eyebrow,
        title: activity.title,
        theme: heroTheme,
      });
      html += appendActivitySectionCards(activity, mode).html;
      return html;
    })
    .join('<div class="h-4"></div>');
}

function flashcardGridHtml(cards: Flashcard[]): string {
  if (!cards.length) return emptySectionPlaceholderHtml();
  return cards
    .map((card, i) => {
      const meta = [
        card.difficultyTag ? `Difficulty: ${card.difficultyTag}` : '',
        card.memoryHookQuickTip || card.memoryCue
          ? `Memory hook: ${card.memoryHookQuickTip || card.memoryCue}`
          : '',
        card.skillFocus ? `Skill: ${card.skillFocus}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return `<div class="mb-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
        <p class="text-[10px] font-bold uppercase tracking-wider text-violet-600">Card ${i + 1}</p>
        <p class="text-xs font-semibold text-slate-600 mt-1">Front</p>
        <p class="text-sm text-slate-800">${escapeHtml(card.front)}</p>
        <p class="text-xs font-semibold text-slate-600 mt-2">Back</p>
        <p class="text-sm text-slate-800">${escapeHtml(card.back)}</p>
        ${meta ? `<p class="text-xs text-violet-700 mt-1">${escapeHtml(meta)}</p>` : ''}
      </div>`;
    })
    .join('');
}

function contextChipsHtml(chips: Array<{ label: string; value: string }>): string {
  if (!chips.length) return emptySectionPlaceholderHtml();
  return `<div class="flex flex-wrap gap-2">${chips
    .map(
      (chip) =>
        `<span class="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800"><strong>${escapeHtml(chip.label)}:</strong> ${escapeHtml(chip.value)}</span>`,
    )
    .join('')}</div>`;
}

function appendThemedSectionCards(
  specs: Array<{
    num: number;
    title: string;
    iconSvg: string;
    hasContent: () => boolean;
    body: string;
  }>,
  startThemeIndex = 0,
): string {
  let html = '';
  let themeIndex = startThemeIndex;
  for (const spec of specs) {
    if (!spec.hasContent()) continue;
    const theme = ACTIVITY_SECTION_THEMES[themeIndex % ACTIVITY_SECTION_THEMES.length];
    themeIndex += 1;
    html += sectionCardHtml({
      sectionNum: `Section ${spec.num}`,
      title: spec.title,
      stripe: theme.stripe,
      iconWrap: theme.iconWrap,
      iconSvg: spec.iconSvg,
      body: spec.body,
    });
  }
  return html;
}

function renderFlashcardHtml(content: string, rawContent: unknown, variant: Variant): string | null {
  const { cards } = resolveFlashcardsFromPayload(content, rawContent);
  if (!flashcardsHaveVisibleBody(cards)) return null;

  if (variant === 'teacher') {
    const meta = resolveTeacherDeckMeta(content, rawContent);
    const title = meta?.title || 'Flashcard deck';
    const topicLabel =
      meta?.topic ||
      (meta?.topicAndSubtopicLink
        ? meta.topicAndSubtopicLink.split(/\s*[—–\-:]\s*/)[0]?.trim()
        : '');
    const subtopicLabel =
      meta?.subtopic ||
      (meta?.topicAndSubtopicLink
        ? meta.topicAndSubtopicLink.split(/\s*[—–\-:]\s*/).slice(1).join(' — ').trim()
        : '');

    const contextChips = [
      topicLabel ? { label: 'Topic', value: topicLabel } : null,
      subtopicLabel ? { label: 'Subtopic', value: subtopicLabel } : null,
      meta?.classLevel ? { label: 'Class', value: meta.classLevel } : null,
      meta?.difficultyLevel ? { label: 'Difficulty', value: meta.difficultyLevel } : null,
      meta?.bloomLevel ? { label: "Bloom's", value: meta.bloomLevel } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    let html = heroTitleCardHtml({
      eyebrow: 'Flashcard Generator',
      title,
      theme: 'violet',
      badge: `${cards.length} cards`,
    });

    html += appendThemedSectionCards([
      {
        num: 1,
        title: 'Context & Alignment',
        iconSvg: '<span>ℹ️</span>',
        hasContent: () => contextChips.length > 0,
        body: contextChipsHtml(contextChips),
      },
      {
        num: 2,
        title: 'Foundations',
        iconSvg: '<span>📚</span>',
        hasContent: () =>
          Boolean(
            meta?.priorKnowledgeRequired ||
              (meta?.learningObjectives?.length ?? 0) > 0 ||
              meta?.ncfCompetencyAlignment,
          ),
        body: [
          meta?.priorKnowledgeRequired
            ? `<p class="text-sm text-slate-800"><strong>Prior knowledge:</strong> ${escapeHtml(meta.priorKnowledgeRequired)}</p>`
            : '',
          meta?.learningObjectives?.length
            ? `<p class="text-sm font-semibold text-slate-800 mt-2">Learning objectives</p>${bulletListHtml(meta.learningObjectives)}`
            : '',
          meta?.ncfCompetencyAlignment
            ? `<p class="text-sm text-slate-800 mt-2"><strong>NCF alignment:</strong> ${escapeHtml(meta.ncfCompetencyAlignment)}</p>`
            : '',
        ].join(''),
      },
      {
        num: 3,
        title: 'The Card Set: Application & HOTS',
        iconSvg: '<span>⚡</span>',
        hasContent: () => cards.length > 0,
        body: flashcardGridHtml(cards),
      },
      {
        num: 4,
        title: 'Study Aids',
        iconSvg: '<span>💡</span>',
        hasContent: () =>
          Boolean(
            meta?.deckMemoryHook ||
              (meta?.commonMistakesToAvoid?.length ?? 0) > 0 ||
              meta?.selfCheckRapidRecallRound,
          ),
        body: [
          meta?.deckMemoryHook
            ? `<p class="text-sm text-slate-800"><strong>Deck memory hook:</strong> ${escapeHtml(meta.deckMemoryHook)}</p>`
            : '',
          meta?.commonMistakesToAvoid?.length
            ? `<p class="text-sm font-semibold text-slate-800 mt-2">Common mistakes to avoid</p>${bulletListHtml(meta.commonMistakesToAvoid)}`
            : '',
          meta?.selfCheckRapidRecallRound
            ? `<p class="text-sm text-slate-800 mt-2"><strong>Self-check round:</strong> ${escapeHtml(meta.selfCheckRapidRecallRound)}</p>`
            : '',
        ].join(''),
      },
      {
        num: 5,
        title: 'Wrap-Up',
        iconSvg: '<span>🏁</span>',
        hasContent: () =>
          Boolean(
            meta?.realLifeConnection || meta?.differentiationSupport || meta?.reflectionExitTicket,
          ),
        body: [
          meta?.realLifeConnection
            ? `<p class="text-sm text-slate-800"><strong>Real-life connection:</strong> ${escapeHtml(meta.realLifeConnection)}</p>`
            : '',
          meta?.differentiationSupport
            ? `<p class="text-sm text-slate-800 mt-2"><strong>Differentiation:</strong> ${escapeHtml(meta.differentiationSupport)}</p>`
            : '',
          meta?.reflectionExitTicket
            ? `<p class="text-sm text-slate-800 mt-2"><strong>Reflection:</strong> ${escapeHtml(meta.reflectionExitTicket)}</p>`
            : '',
        ].join(''),
      },
    ]);

    return html;
  }

  const meta = resolveStudentDeckMeta(content, rawContent);
  let html = heroTitleCardHtml({
    eyebrow: 'My Study Decks',
    title: meta.title || 'Study deck',
    theme: 'violet',
    badge: `${cards.length} flashcards`,
  });

  html += appendThemedSectionCards([
    {
      num: 2,
      title: 'Subtopic Link and Prior Knowledge Required',
      iconSvg: '<span>📚</span>',
      hasContent: () => !!meta.subtopicLinkPriorKnowledge,
      body: richTextHtml(meta.subtopicLinkPriorKnowledge),
    },
    {
      num: 3,
      title: "Learning Objectives - Bloom's Taxonomy Aligned",
      iconSvg: '<span>🎯</span>',
      hasContent: () => meta.learningObjectives.length > 0,
      body: checkListHtml(meta.learningObjectives),
    },
    {
      num: 4,
      title: 'NCF Competency / Learning Outcome Alignment',
      iconSvg: '<span>🏫</span>',
      hasContent: () => !!meta.ncfAlignment,
      body: richTextHtml(meta.ncfAlignment),
    },
    {
      num: 5,
      title: 'Flashcard Set',
      iconSvg: '<span>⚡</span>',
      hasContent: () => cards.length > 0,
      body: flashcardGridHtml(cards),
    },
    {
      num: 8,
      title: 'Self-Check Round',
      iconSvg: '<span>✅</span>',
      hasContent: () => !!meta.selfCheckRound,
      body: richTextHtml(meta.selfCheckRound),
    },
    {
      num: 9,
      title: 'Common Mistakes to Avoid',
      iconSvg: '<span>⚠️</span>',
      hasContent: () => meta.commonMistakesToAvoid.length > 0,
      body: bulletListHtml(meta.commonMistakesToAvoid),
    },
    {
      num: 10,
      title: 'Expected Learning Outcomes',
      iconSvg: '<span>🏆</span>',
      hasContent: () => meta.expectedLearningOutcomes.length > 0,
      body: bulletListHtml(meta.expectedLearningOutcomes),
    },
    {
      num: 11,
      title: 'Real-life Application',
      iconSvg: '<span>✨</span>',
      hasContent: () => !!meta.realLifeApplication,
      body: richTextHtml(meta.realLifeApplication),
    },
    {
      num: 12,
      title: 'Reflection / Exit Ticket',
      iconSvg: '<span>💡</span>',
      hasContent: () => !!meta.reflectionExitTicket,
      body: richTextHtml(meta.reflectionExitTicket),
    },
  ]);

  return html;
}

function renderLessonPlannerHtml(content: string, rawContent: unknown): string | null {
  const { lessons, markdownFallback } = resolveLessonsFromPayload(content, rawContent);
  if (markdownFallback || !lessons.length) return null;
  return lessons
    .map((lesson) => {
      const procedure = lesson.studyPlanTable?.length
        ? lesson.studyPlanTable
        : lesson.classroomActivities?.length
          ? lesson.classroomActivities
          : lesson.timeline;

      let html = heroTitleCardHtml({
        eyebrow: 'Lesson Planner',
        title: lesson.lessonName || 'Lesson',
        theme: 'amber',
        badge: lesson.durationLabel || lesson.subjectArea || undefined,
      });

      html += appendThemedSectionCards([
        {
          num: 2,
          title: 'Study goal / subtopic link',
          iconSvg: '<span>🎯</span>',
          hasContent: () => !!lesson.studyGoalSubtopicLink,
          body: richTextHtml(lesson.studyGoalSubtopicLink),
        },
        {
          num: 3,
          title: 'Prior knowledge / readiness',
          iconSvg: '<span>📚</span>',
          hasContent: () => !!(lesson.priorKnowledgeReadiness || lesson.priorKnowledge),
          body: richTextHtml(lesson.priorKnowledgeReadiness || lesson.priorKnowledge),
        },
        {
          num: 4,
          title: 'Learning objectives',
          iconSvg: '<span>✅</span>',
          hasContent: () => lesson.learningObjectives.length > 0,
          body: checkListHtml(lesson.learningObjectives),
        },
        {
          num: 5,
          title: 'NCF alignment',
          iconSvg: '<span>🏫</span>',
          hasContent: () => lesson.ncfAlignment.length > 0,
          body: bulletListHtml(lesson.ncfAlignment),
        },
        {
          num: 6,
          title: 'Study plan / procedure',
          iconSvg: '<span>📋</span>',
          hasContent: () => (procedure?.length ?? 0) > 0,
          body: numberedStepsHtml(procedure || [], 'bg-emerald-100 text-emerald-800'),
        },
        {
          num: 7,
          title: 'Concept learning slot',
          iconSvg: '<span>🧠</span>',
          hasContent: () => !!lesson.conceptLearningSlot,
          body: richTextHtml(lesson.conceptLearningSlot),
        },
        {
          num: 8,
          title: 'Practice slot',
          iconSvg: '<span>✏️</span>',
          hasContent: () => !!lesson.practiceSlot,
          body: richTextHtml(lesson.practiceSlot),
        },
        {
          num: 9,
          title: 'Breaks & focus tips',
          iconSvg: '<span>⏱</span>',
          hasContent: () => !!lesson.breaksFocusTips,
          body: richTextHtml(lesson.breaksFocusTips),
        },
        {
          num: 10,
          title: 'Self-assessment checkpoint',
          iconSvg: '<span>🔍</span>',
          hasContent: () => !!lesson.selfAssessmentCheckpoint,
          body: richTextHtml(lesson.selfAssessmentCheckpoint),
        },
        {
          num: 11,
          title: 'Support & extension plan',
          iconSvg: '<span>🔀</span>',
          hasContent: () => !!lesson.supportExtensionPlan,
          body: richTextHtml(lesson.supportExtensionPlan),
        },
        {
          num: 12,
          title: 'Expected learning outcomes',
          iconSvg: '<span>🏆</span>',
          hasContent: () => lesson.expectedLearningOutcomes.length > 0,
          body: bulletListHtml(lesson.expectedLearningOutcomes),
        },
        {
          num: 13,
          title: 'Reflection / exit ticket',
          iconSvg: '<span>💡</span>',
          hasContent: () => !!lesson.reflectionExitTicket,
          body: richTextHtml(lesson.reflectionExitTicket),
        },
      ]);

      return html;
    })
    .join('<div class="h-4"></div>');
}

function renderDailyClassPlanHtml(content: string, rawContent: unknown): string | null {
  const { plans, markdownFallback } = resolveDailyPlansFromPayload(content, rawContent);
  if (markdownFallback || !plans.length) return null;
  return plans
    .map((plan) => {
      const schedule = plan.timeSlots.length
        ? plan.timeSlots.map((slot) =>
            [slot.time, slot.activity, slot.type].filter(Boolean).join(' — '),
          )
        : plan.timeline.length
          ? plan.timeline
          : plan.classroomActivities;

      let html = heroTitleCardHtml({
        eyebrow: 'Daily Class Plan',
        title: plan.title || 'Class Plan',
        theme: 'indigo',
        badge: plan.dayPeriodBreakup || undefined,
      });

      html += appendThemedSectionCards([
        {
          num: 2,
          title: 'Learning objectives',
          iconSvg: '<span>🎯</span>',
          hasContent: () => plan.objectives.length > 0,
          body: checkListHtml(plan.objectives),
        },
        {
          num: 3,
          title: 'Teaching methods',
          iconSvg: '<span>👩‍🏫</span>',
          hasContent: () => plan.teachingMethods.length > 0,
          body: bulletListHtml(plan.teachingMethods),
        },
        {
          num: 4,
          title: 'Classroom activities / schedule',
          iconSvg: '<span>⏱</span>',
          hasContent: () => schedule.length > 0,
          body: numberedStepsHtml(schedule, 'bg-indigo-100 text-indigo-800'),
        },
        {
          num: 5,
          title: 'Exit ticket',
          iconSvg: '<span>🎫</span>',
          hasContent: () => !!plan.exitTicket,
          body: richTextHtml(plan.exitTicket),
        },
        {
          num: 6,
          title: 'Differentiated support',
          iconSvg: '<span>🔀</span>',
          hasContent: () => !!plan.differentiatedSupport,
          body: richTextHtml(plan.differentiatedSupport),
        },
        {
          num: 7,
          title: 'Homework follow-up',
          iconSvg: '<span>📝</span>',
          hasContent: () => !!plan.homeworkFollowup,
          body: richTextHtml(plan.homeworkFollowup),
        },
        {
          num: 8,
          title: 'Teaching aids',
          iconSvg: '<span>🧰</span>',
          hasContent: () => plan.teachingAids.length > 0,
          body: bulletListHtml(plan.teachingAids),
        },
        {
          num: 9,
          title: 'Teacher reflection',
          iconSvg: '<span>💡</span>',
          hasContent: () => !!plan.teacherReflection,
          body: richTextHtml(plan.teacherReflection),
        },
      ]);

      return html;
    })
    .join('<div class="h-4"></div>');
}

function homeworkPracticeQuestionsHtml(
  questions: import('./parse-homework-creator').HomeworkPracticeQuestion[],
): string {
  if (!questions.length) return emptySectionPlaceholderHtml();
  return questions
    .map((q, i) => {
      const num = q.questionNumber ?? i + 1;
      const opts = (q.options || [])
        .map(
          (o) =>
            `<div class="rounded border border-slate-200 bg-white px-2 py-1 text-xs mt-1">${escapeHtml(o)}</div>`,
        )
        .join('');
      const meta = [q.type, q.marks != null ? `${q.marks} marks` : '']
        .filter(Boolean)
        .map((t) => `<span class="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 mr-1">${escapeHtml(String(t))}</span>`)
        .join('');
      const answer = q.answer
        ? `<p class="mt-2 text-xs text-emerald-700 font-semibold">Answer: ${escapeHtml(q.answer)}</p>`
        : '';
      const explanation = q.explanation
        ? `<p class="mt-1 text-xs text-slate-600">Explanation: ${escapeHtml(q.explanation)}</p>`
        : '';
      return `<div class="mb-3 rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2">
        <p class="text-xs font-bold text-orange-800">Q${num}</p>
        <p class="text-sm text-slate-800 mt-1">${escapeHtml(q.question || '')}</p>
        ${meta ? `<div class="mt-1">${meta}</div>` : ''}${opts}${answer}${explanation}
      </div>`;
    })
    .join('');
}

function renderHomeworkHtml(content: string, rawContent: unknown): string | null {
  const { homework, markdownFallback } = resolveHomeworkFromPayload(content, rawContent);
  if (markdownFallback || !homework) return null;

  let html = heroTitleCardHtml({
    eyebrow: 'Homework Creator',
    title: homework.title || 'Homework Assignment',
    theme: 'orange',
    badge: 'Homework Title',
  });

  const sections: Array<{
    num: number;
    title: string;
    stripe: string;
    iconWrap: string;
    icon: string;
    body: string;
  }> = [
    {
      num: 2,
      title: 'Clear Student Instructions',
      stripe: 'border-orange-300',
      iconWrap: 'bg-orange-100 text-orange-800',
      icon: '📋',
      body: homework.instructions.trim()
        ? richTextHtml(homework.instructions)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 3,
      title: 'Practice Questions',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '❓',
      body: homeworkPracticeQuestionsHtml(homework.practiceQuestions),
    },
    {
      num: 4,
      title: 'Application-based Tasks',
      stripe: 'border-yellow-300',
      iconWrap: 'bg-yellow-100 text-yellow-900',
      icon: '💡',
      body: homework.applicationTasks.length
        ? bulletListHtml(homework.applicationTasks, 'text-orange-600')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 5,
      title: 'One Creative / Thinking Question',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      icon: '🧠',
      body: homework.creativeThinkingQuestion.trim()
        ? richTextHtml(homework.creativeThinkingQuestion)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 6,
      title: 'One Real-life Observation Task',
      stripe: 'border-cyan-300',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      icon: '👁',
      body: homework.realLifeObservationTask.trim()
        ? richTextHtml(homework.realLifeObservationTask)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 7,
      title: 'Challenge Question',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '✨',
      body: homework.challengeQuestion.trim()
        ? richTextHtml(homework.challengeQuestion)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 8,
      title: 'Support Hint for Struggling Learners',
      stripe: 'border-teal-300',
      iconWrap: 'bg-teal-100 text-teal-800',
      icon: '💬',
      body: homework.supportHint.trim()
        ? richTextHtml(homework.supportHint)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 9,
      title: 'Answer Hints / Key Points',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      icon: '🔑',
      body: homework.answerHints.trim()
        ? richTextHtml(homework.answerHints)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 10,
      title: 'Parent Note',
      stripe: 'border-indigo-300',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      icon: '👪',
      body: homework.parentNote.trim()
        ? richTextHtml(homework.parentNote)
        : emptySectionPlaceholderHtml(),
    },
  ];

  for (const sec of sections) {
    html += sectionCardHtml({
      sectionNum: `Section ${sec.num}`,
      title: sec.title,
      stripe: sec.stripe,
      iconWrap: sec.iconWrap,
      iconSvg: `<span>${sec.icon}</span>`,
      body: sec.body,
    });
  }

  return html;
}

function renderWorksheetHtml(content: string, rawContent: unknown): string | null {
  const { worksheet, markdownFallback } = resolveWorksheetFromPayload(content, rawContent);
  if (markdownFallback || !worksheet) return null;

  let html = heroTitleCardHtml({
    eyebrow: 'Worksheet & MCQ',
    title: worksheet.title || 'Worksheet',
    theme: 'indigo',
    badge: 'Teacher worksheet pack',
  });

  html += sectionCardHtml({
    sectionNum: 'Section 2',
    title: 'Learning Objectives',
    stripe: 'border-emerald-300',
    iconWrap: 'bg-emerald-100 text-emerald-800',
    iconSvg: '<span>🎯</span>',
    borderColor: 'border-emerald-200/80',
    body: worksheet.learningObjectives.length
      ? bulletListHtml(worksheet.learningObjectives, 'text-emerald-600')
      : emptySectionPlaceholderHtml(),
  });

  html += sectionCardHtml({
    sectionNum: 'Section 3',
    title: 'Instructions to Students',
    stripe: 'border-teal-300',
    iconWrap: 'bg-teal-100 text-teal-800',
    iconSvg: '<span>📋</span>',
    borderColor: 'border-emerald-200/80',
    body: worksheet.instructions.trim()
      ? richTextHtml(worksheet.instructions)
      : emptySectionPlaceholderHtml(),
  });

  const sortedSections = [...(worksheet.sections || [])].sort((a, b) => a.order - b.order);
  for (const sec of sortedSections) {
    const qs = sec.questions || [];
    html += sectionCardHtml({
      sectionNum: sec.displayLabel || sec.label || 'Section',
      title: sec.label || 'Questions',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      iconSvg: '<span>✓</span>',
      borderColor: 'border-emerald-200/80',
      body: qs.length
        ? qs
            .map((q, i) => {
              const num = q.questionNumber ?? i + 1;
              const opts = (q.options || [])
                .map(
                  (o) =>
                    `<div class="rounded border border-slate-200 bg-white px-2 py-1 text-xs mt-1">${escapeHtml(o)}</div>`
                )
                .join('');
              const answer = q.answer
                ? `<p class="mt-2 text-xs text-emerald-700 font-semibold">Answer: ${escapeHtml(q.answer)}</p>`
                : '';
              const explanation = q.explanation
                ? `<p class="mt-1 text-xs text-slate-600">Explanation: ${escapeHtml(q.explanation)}</p>`
                : '';
              return `<div class="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
            <p class="text-xs font-bold text-emerald-800">Q${num}${q.marks ? ` (${q.marks} marks)` : ''}</p>
            <p class="text-sm text-slate-800 mt-1">${escapeHtml(q.question || '')}</p>${opts}${answer}${explanation}
          </div>`;
            })
            .join('')
        : emptySectionPlaceholderHtml(),
    });
  }

  html += sectionCardHtml({
    sectionNum: 'Section 9',
    title: 'Answer Key',
    stripe: 'border-sky-300',
    iconWrap: 'bg-sky-100 text-sky-800',
    iconSvg: '<span>🔑</span>',
    borderColor: 'border-emerald-200/80',
    body: worksheet.answerKey.trim()
      ? richTextHtml(worksheet.answerKey)
      : emptySectionPlaceholderHtml(),
  });

  const tags = [worksheet.bloomLevel, worksheet.difficultyTag].filter(Boolean).join(' — ');
  html += sectionCardHtml({
    sectionNum: 'Section 10',
    title: "Bloom's Level & Difficulty",
    stripe: 'border-violet-300',
    iconWrap: 'bg-violet-100 text-violet-800',
    iconSvg: '<span>🎓</span>',
    borderColor: 'border-emerald-200/80',
    body: tags.trim() ? richTextHtml(tags) : emptySectionPlaceholderHtml(),
  });

  return html;
}

function storyQuestionsHtml(questions: StoryQuestion[], badgeClass: string): string {
  const valid = questions.filter((q) => q.question && q.question !== '[object Object]');
  if (!valid.length) return emptySectionPlaceholderHtml();
  return valid
    .map(
      (q, i) =>
        `<div class="mb-2 flex gap-2 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${badgeClass} text-xs font-bold">${i + 1}</span>
          <p class="text-sm text-slate-800 leading-relaxed">${escapeHtml(q.question)}</p>
        </div>`,
    )
    .join('');
}

function renderTeacherStoryPassageSections(story: ParsedStory): string {
  const sections: Array<{
    num: number;
    title: string;
    stripe: string;
    iconWrap: string;
    icon: string;
    body: string;
  }> = [
    {
      num: 2,
      title: 'Topic and Subtopic Connection',
      stripe: 'border-cyan-300',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      icon: '🎯',
      body: story.topicSubtopicConnection?.trim()
        ? richTextHtml(story.topicSubtopicConnection)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 3,
      title: 'Prior Knowledge Required',
      stripe: 'border-sky-300',
      iconWrap: 'bg-sky-100 text-sky-800',
      icon: '📚',
      body: story.priorKnowledgeRequired?.trim()
        ? richTextHtml(story.priorKnowledgeRequired)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 4,
      title: "Learning Objectives – Bloom's Taxonomy Aligned",
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      icon: '🎯',
      body: story.learningObjectives.length
        ? bulletListHtml(story.learningObjectives, 'text-violet-600')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 5,
      title: 'NCF Competency / Learning Outcome Alignment',
      stripe: 'border-blue-300',
      iconWrap: 'bg-blue-100 text-blue-800',
      icon: '🎓',
      body: story.ncfAlignment?.trim()
        ? richTextHtml(story.ncfAlignment)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 6,
      title: 'Vocabulary Warm-up',
      stripe: 'border-teal-300',
      iconWrap: 'bg-teal-100 text-teal-800',
      icon: '📝',
      body: story.vocabulary.length
        ? bulletListHtml(story.vocabulary, 'text-teal-700')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 7,
      title: 'Pre-reading Thinking Prompt',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '💡',
      body: story.preReadingPrompt?.trim()
        ? richTextHtml(story.preReadingPrompt)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 8,
      title: 'Story / Passage Content',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '📖',
      body: story.passage?.trim()
        ? richTextHtml(story.passage)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 9,
      title: 'Read and Recall Questions',
      stripe: 'border-indigo-300',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      icon: '❓',
      body: storyQuestionsHtml(story.readRecallQuestions, 'bg-indigo-100 text-indigo-800'),
    },
    {
      num: 10,
      title: 'Think and Infer Questions',
      stripe: 'border-sky-300',
      iconWrap: 'bg-sky-100 text-sky-800',
      icon: '❓',
      body: storyQuestionsHtml(story.thinkInferQuestions, 'bg-sky-100 text-sky-800'),
    },
    {
      num: 11,
      title: 'Apply and Connect Questions',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      icon: '❓',
      body: storyQuestionsHtml(story.applyConnectQuestions, 'bg-emerald-100 text-emerald-800'),
    },
    {
      num: 12,
      title: 'Vocabulary and Grammar Practice',
      stripe: 'border-teal-300',
      iconWrap: 'bg-teal-100 text-teal-800',
      icon: '📝',
      body:
        story.vocabularyGrammarPractice?.trim()
          ? richTextHtml(story.vocabularyGrammarPractice)
          : story.vocabularyPractice.length
            ? bulletListHtml(story.vocabularyPractice, 'text-teal-700')
            : emptySectionPlaceholderHtml(),
    },
    {
      num: 13,
      title: 'Creative Response Activity',
      stripe: 'border-purple-300',
      iconWrap: 'bg-purple-100 text-purple-800',
      icon: '✨',
      body: story.creativeResponseActivity?.trim()
        ? richTextHtml(story.creativeResponseActivity)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 14,
      title: 'Answer Key / Suggested Responses',
      stripe: 'border-yellow-300',
      iconWrap: 'bg-yellow-100 text-yellow-900',
      icon: '🔑',
      body:
        story.answerKeySuggestedResponses?.trim()
          ? richTextHtml(story.answerKeySuggestedResponses)
          : story.answerHints.length
            ? bulletListHtml(story.answerHints, 'text-yellow-800')
            : emptySectionPlaceholderHtml(),
    },
    {
      num: 15,
      title: 'Common Mistakes to Avoid',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '⚠️',
      body: story.commonMistakesToAvoid?.trim()
        ? richTextHtml(story.commonMistakesToAvoid)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 16,
      title: 'Differentiation Support',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      icon: '👥',
      body: story.differentiationSupport?.trim()
        ? richTextHtml(story.differentiationSupport)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 17,
      title: 'Expected Learning Outcomes',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      icon: '🎓',
      body: story.expectedLearningOutcomes?.trim()
        ? richTextHtml(story.expectedLearningOutcomes)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 18,
      title: 'Real-life Application',
      stripe: 'border-orange-300',
      iconWrap: 'bg-orange-100 text-orange-800',
      icon: '🌍',
      body: story.realLifeApplication?.trim()
        ? richTextHtml(story.realLifeApplication)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 19,
      title: 'Reflection / Exit Ticket',
      stripe: 'border-fuchsia-300',
      iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
      icon: '💬',
      body: story.reflection?.trim()
        ? richTextHtml(story.reflection)
        : emptySectionPlaceholderHtml(),
    },
  ];

  return sections
    .map((sec) =>
      sectionCardHtml({
        sectionNum: `Section ${sec.num}`,
        title: sec.title,
        stripe: sec.stripe,
        iconWrap: sec.iconWrap,
        iconSvg: `<span>${sec.icon}</span>`,
        body: sec.body,
      }),
    )
    .join('');
}

function renderStoryHtml(content: string, rawContent: unknown): string | null {
  const resolved = resolveStoryFromPayload(content, rawContent);
  if (resolved.mode === 'empty') return null;
  if (resolved.mode === 'stories') {
    return resolved.stories
      .map((story) => {
        let html = heroTitleCardHtml({
          eyebrow: 'Story & Passage Creator',
          title: story.title || 'Reading Passage',
          theme: 'blue',
          badge: 'Story / Passage Title',
        });
        html += renderTeacherStoryPassageSections(story);
        return html;
      })
      .join('<div class="h-4"></div>');
  }
  const bundle = resolved.bundle;
  let html = heroTitleCardHtml({
    eyebrow: 'Reading Practice',
    title: bundle.title || 'Passages',
    theme: 'blue',
  });
  for (const p of bundle.passages || []) {
    html += sectionCardHtml({
      sectionNum: `Passage ${p.passageNumber}`,
      title: 'Reading Passage',
      stripe: 'border-sky-300',
      iconWrap: 'bg-sky-100 text-sky-800',
      iconSvg: '<span>📖</span>',
      body: richTextHtml(p.paragraph),
    });
    if (p.questions?.length) {
      html += sectionCardHtml({
        sectionNum: `Questions ${p.passageNumber}`,
        title: 'Comprehension Questions',
        stripe: 'border-indigo-300',
        iconWrap: 'bg-indigo-100 text-indigo-800',
        iconSvg: '<span>❓</span>',
        body: numberedStepsHtml(p.questions),
      });
    }
  }
  return html;
}

function conceptSectionBody(text: string, list?: string[]): string {
  if (list?.length) return bulletListHtml(list, 'text-violet-600');
  if (text?.trim()) return richTextHtml(text);
  return emptySectionPlaceholderHtml();
}

function renderConceptMasterySections(concept: NormalizedConcept): string {
  const sections: {
    num: number;
    title: string;
    stripe: string;
    iconWrap: string;
    body: string;
  }[] = [
    {
      num: 1,
      title: 'Simple definition',
      stripe: 'border-fuchsia-300',
      iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
      body: conceptSectionBody(concept.simpleDefinition),
    },
    {
      num: 2,
      title: 'Why this concept is important',
      stripe: 'border-violet-300',
      iconWrap: 'bg-violet-100 text-violet-800',
      body: conceptSectionBody(concept.whyImportant),
    },
    {
      num: 3,
      title: 'Prior knowledge needed',
      stripe: 'border-purple-300',
      iconWrap: 'bg-purple-100 text-purple-800',
      body: conceptSectionBody(concept.priorKnowledge),
    },
    {
      num: 4,
      title: 'Step-by-step explanation',
      stripe: 'border-indigo-300',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      body: conceptSectionBody(concept.explanation),
    },
    {
      num: 5,
      title: 'Diagram / visualisation suggestion',
      stripe: 'border-blue-300',
      iconWrap: 'bg-blue-100 text-blue-800',
      body: conceptSectionBody(concept.diagramSuggestion),
    },
    {
      num: 6,
      title: 'Real-life examples',
      stripe: 'border-cyan-300',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      body: conceptSectionBody(concept.realLifeExamples),
    },
    {
      num: 7,
      title: 'Common misconceptions and corrections',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-900',
      body: concept.misconceptions.length
        ? bulletListHtml(concept.misconceptions, 'text-amber-700')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 8,
      title: 'Concept check questions',
      stripe: 'border-amber-300',
      iconWrap: 'bg-amber-100 text-amber-800',
      body: concept.conceptCheckQuestions.length
        ? numberedStepsHtml(concept.conceptCheckQuestions, 'bg-amber-100 text-amber-800')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 9,
      title: 'Key points to remember',
      stripe: 'border-emerald-300',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      body: concept.keyPoints.length
        ? checkListHtml(concept.keyPoints)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 10,
      title: 'Exam tips',
      stripe: 'border-sky-300',
      iconWrap: 'bg-sky-100 text-sky-800',
      body: conceptSectionBody(concept.examTips),
    },
    {
      num: 11,
      title: 'Higher-order thinking question',
      stripe: 'border-pink-300',
      iconWrap: 'bg-pink-100 text-pink-800',
      body: conceptSectionBody(concept.hotsQuestion),
    },
    {
      num: 12,
      title: 'Quick self-reflection prompt',
      stripe: 'border-fuchsia-300',
      iconWrap: 'bg-fuchsia-50 text-fuchsia-900',
      body: conceptSectionBody(concept.reflectionPrompt),
    },
  ];

  return sections
    .map((sec) =>
      sectionCardHtml({
        sectionNum: `Section ${sec.num}`,
        title: sec.title,
        stripe: sec.stripe,
        iconWrap: sec.iconWrap,
        iconSvg: sectionNumberIconSvg(sec.num),
        borderColor: 'border-fuchsia-200/80',
        body: sec.body,
      })
    )
    .join('');
}

function renderConceptMasteryHtml(content: string, rawContent: unknown): string | null {
  const { concepts, markdownFallback } = resolveConceptsFromPayload(content, rawContent);
  if (markdownFallback || !concepts.length) return null;
  return concepts
    .map((concept) => {
      let html = heroTitleCardHtml({
        eyebrow: 'Concept Mastery',
        title: concept.conceptName || 'Concept',
        theme: 'violet',
        badge: concept.difficulty || undefined,
      });
      html += renderConceptMasterySections(concept);
      return html;
    })
    .join('<div class="h-4"></div>');
}

const STRUCTURED_RENDERERS: Record<
  string,
  (content: string, rawContent: unknown, variant: Variant) => string | null
> = {
  'concept-breakdown-explainer': (c, r) => renderConceptBreakdownHtml(c, r),
  'chapter-summary-creator': (c, r) => renderChapterSummaryHtml(c, r),
  'key-points-formula-extractor': (c, r) => renderKeyPointsHtml(c, r),
  'smart-qa-practice-generator': (c, r) => renderPracticeQaHtml(c, r),
  'quick-assignment-builder': (c, r) => renderQuickAssignmentHtml(c, r),
  'mock-test-builder': (c, r) => renderMockTestHtml(c, r),
  'exam-question-paper-generator': (c, r) => renderExamPaperHtml(c, r),
  'lesson-planner': renderLessonPlannerHtml,
  'study-schedule-maker': renderLessonPlannerHtml,
  'daily-class-plan-maker': (c, r) => renderDailyClassPlanHtml(c, r),
  'homework-creator': (c, r) => renderHomeworkHtml(c, r),
  'worksheet-mcq-generator': (c, r) => renderWorksheetHtml(c, r),
  'story-passage-creator': (c, r) => renderStoryHtml(c, r),
  'reading-practice-room': (c, r) => renderStoryHtml(c, r),
  'concept-mastery-helper': (c, r) => renderConceptMasteryHtml(c, r),
  'activity-project-generator': renderActivityProjectHtml,
  'project-idea-lab': renderActivityProjectHtml,
  'flashcard-generator': renderFlashcardHtml,
  'my-study-decks': renderFlashcardHtml,
};

const FULL_STRUCTURED_MARKDOWN_TOOLS = new Set([
  'worksheet-mcq-generator',
  'concept-mastery-helper',
  'homework-creator',
  'story-passage-creator',
  'reading-practice-room',
  'activity-project-generator',
  'project-idea-lab',
  'lesson-planner',
  'daily-class-plan-maker',
  'exam-question-paper-generator',
  'flashcard-generator',
  'my-study-decks',
]);

export function tryRenderStructuredAiToolHtml(
  toolType: string,
  content: string,
  rawContent?: unknown,
  variant: Variant = 'student'
): string | null {
  const display = resolveRichDisplayContent(content, rawContent);
  if (
    contentHasNumberedTemplateSections(display) &&
    !FULL_STRUCTURED_MARKDOWN_TOOLS.has(toolType)
  ) {
    return null;
  }

  const renderer = STRUCTURED_RENDERERS[toolType];
  if (!renderer) return null;
  try {
    const body = renderer(display, rawContent ?? null, variant);
    if (!body?.trim()) return null;
    return body;
  } catch {
    return null;
  }
}
