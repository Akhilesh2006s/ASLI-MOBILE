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
import { resolveStoryFromPayload } from './parse-story-content';
import { resolveConceptsFromPayload } from './parse-concept-mastery';
import {
  bulletListHtml,
  conceptGridHtml,
  escapeHtml,
  heroTitleCardHtml,
  numberedStepsHtml,
  richTextHtml,
  sectionCardHtml,
  termGridHtml,
} from './ai-tool-html-primitives';

type Variant = 'student' | 'teacher';

function renderConceptBreakdownHtml(content: string, rawContent: unknown): string | null {
  const { concepts, markdownFallback } = resolveConceptBreakdownFromPayload(content, rawContent);
  if (markdownFallback || !concepts.length) return null;
  return concepts
    .map((concept, idx) => {
      let html = heroTitleCardHtml({
        eyebrow: concepts.length > 1 ? `Concept ${idx + 1} of ${concepts.length}` : 'Section 1 · Concept Title',
        title: concept.conceptTitle,
        theme: 'violet',
      });
      if (concept.simpleDefinition) {
        html += sectionCardHtml({
          sectionNum: 'Section 2',
          title: 'Simple Definition',
          stripe: 'border-violet-500',
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
          stripe: 'border-indigo-500',
          iconWrap: 'bg-indigo-100 text-indigo-800',
          iconSvg: '<span>📋</span>',
          borderColor: 'border-violet-200/90',
          body: numberedStepsHtml(concept.breakdownSteps, 'bg-indigo-600'),
        });
      }
      if (concept.realLifeExamples.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 4',
          title: 'Real-life and Indian Context Examples',
          stripe: 'border-emerald-500',
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
          stripe: 'border-amber-500',
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
          stripe: 'border-violet-600',
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
      stripe: 'border-sky-500',
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
      stripe: 'border-indigo-500',
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
      stripe: 'border-violet-500',
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
      stripe: 'border-violet-500',
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
      stripe: 'border-amber-500',
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
      stripe: 'border-violet-500',
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
      stripe: 'border-emerald-500',
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
      stripe: 'border-emerald-500',
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
      stripe: 'border-orange-500',
      iconWrap: 'bg-orange-100 text-orange-800',
      iconSvg: '<span>📋</span>',
      body: richTextHtml(assignment.instructions),
    });
  }
  if (assignment.applicationTasks?.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 3',
      title: 'Application Tasks',
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-800',
      iconSvg: '<span>✓</span>',
      body: numberedStepsHtml(assignment.applicationTasks),
    });
  }
  if (assignment.conceptQuestions?.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 4',
      title: 'Concept Questions',
      stripe: 'border-emerald-500',
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
      stripe: 'border-violet-500',
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
      stripe: 'border-blue-500',
      iconWrap: 'bg-blue-100 text-blue-800',
      iconSvg: '<span>📄</span>',
      body,
    });
  }
  return html;
}

function renderLessonPlannerHtml(content: string, rawContent: unknown): string | null {
  const { lessons, markdownFallback } = resolveLessonsFromPayload(content, rawContent);
  if (markdownFallback || !lessons.length) return null;
  return lessons
    .map((lesson) => {
      let html = heroTitleCardHtml({
        eyebrow: 'Lesson Plan',
        title: lesson.lessonName || 'Lesson',
        theme: 'amber',
      });
      if (lesson.learningObjectives?.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 2',
          title: 'Learning Objectives',
          stripe: 'border-amber-500',
          iconWrap: 'bg-amber-100 text-amber-800',
          iconSvg: '<span>🎯</span>',
          body: bulletListHtml(lesson.learningObjectives),
        });
      }
      const procedure = lesson.studyPlanTable?.length
        ? lesson.studyPlanTable
        : lesson.classroomActivities?.length
          ? lesson.classroomActivities
          : lesson.timeline;
      if (procedure?.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 4',
          title: 'Procedure / Schedule',
          stripe: 'border-emerald-500',
          iconWrap: 'bg-emerald-100 text-emerald-800',
          iconSvg: '<span>📋</span>',
          body: numberedStepsHtml(procedure),
        });
      }
      return html;
    })
    .join('<div class="h-4"></div>');
}

function renderDailyClassPlanHtml(content: string, rawContent: unknown): string | null {
  const { plans, markdownFallback } = resolveDailyPlansFromPayload(content, rawContent);
  if (markdownFallback || !plans.length) return null;
  return plans
    .map((plan) => {
      let html = heroTitleCardHtml({
        eyebrow: 'Daily Class Plan',
        title: plan.title || 'Class Plan',
        theme: 'indigo',
      });
      if (plan.objectives?.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 2',
          title: 'Learning Objectives',
          stripe: 'border-indigo-500',
          iconWrap: 'bg-indigo-100 text-indigo-800',
          iconSvg: '<span>🎯</span>',
          body: bulletListHtml(plan.objectives),
        });
      }
      if (plan.classroomActivities?.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 3',
          title: 'Classroom Activities',
          stripe: 'border-violet-500',
          iconWrap: 'bg-violet-100 text-violet-800',
          iconSvg: '<span>⏱</span>',
          body: numberedStepsHtml(plan.classroomActivities),
        });
      }
      return html;
    })
    .join('<div class="h-4"></div>');
}

function renderHomeworkHtml(content: string, rawContent: unknown): string | null {
  const { homework, markdownFallback } = resolveHomeworkFromPayload(content, rawContent);
  if (markdownFallback || !homework) return null;
  let html = heroTitleCardHtml({
    eyebrow: 'Homework',
    title: homework.title || 'Homework Assignment',
    theme: 'orange',
  });
  if (homework.instructions) {
    html += sectionCardHtml({
      sectionNum: 'Section 2',
      title: 'Instructions',
      stripe: 'border-orange-500',
      iconWrap: 'bg-orange-100 text-orange-800',
      iconSvg: '<span>📋</span>',
      body: richTextHtml(homework.instructions),
    });
  }
  if (homework.practiceQuestions?.length) {
    html += sectionCardHtml({
      sectionNum: 'Section 3',
      title: 'Practice Questions',
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-800',
      iconSvg: '<span>❓</span>',
      body: homework.practiceQuestions
        .map(
          (q, i) =>
            `<div class="mb-2 rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2 text-sm"><span class="font-bold text-orange-800">Q${i + 1}. </span>${escapeHtml(q.question)}</div>`
        )
        .join(''),
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
  });
  for (const sec of worksheet.sections || []) {
    const qs = sec.questions || [];
    if (!qs.length) continue;
    html += sectionCardHtml({
      sectionNum: sec.displayLabel || sec.label || 'Section',
      title: sec.label || 'Questions',
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      iconSvg: '<span>✓</span>',
      body: qs
        .map((q, i) => {
          const opts = (q.options || [])
            .map((o) => `<div class="rounded border border-slate-200 bg-white px-2 py-1 text-xs mt-1">${escapeHtml(o)}</div>`)
            .join('');
          return `<div class="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
            <p class="text-xs font-bold text-emerald-800">Q${i + 1}</p>
            <p class="text-sm text-slate-800 mt-1">${escapeHtml(q.question || '')}</p>${opts}
          </div>`;
        })
        .join(''),
    });
  }
  return html;
}

function renderStoryHtml(content: string, rawContent: unknown): string | null {
  const resolved = resolveStoryFromPayload(content, rawContent);
  if (resolved.mode === 'empty') return null;
  if (resolved.mode === 'stories') {
    return resolved.stories
      .map((story) => {
        let html = heroTitleCardHtml({
          eyebrow: 'Story & Passage',
          title: story.title || 'Reading Passage',
          theme: 'blue',
        });
        if (story.passage) {
          html += sectionCardHtml({
            sectionNum: 'Section 2',
            title: 'Passage',
            stripe: 'border-sky-500',
            iconWrap: 'bg-sky-100 text-sky-800',
            iconSvg: '<span>📖</span>',
            body: richTextHtml(story.passage),
          });
        }
        const questions = [
          ...story.readRecallQuestions.map((q) => q.question),
          ...story.thinkInferQuestions.map((q) => q.question),
          ...story.applyConnectQuestions.map((q) => q.question),
        ].filter(Boolean);
        if (questions.length) {
          html += sectionCardHtml({
            sectionNum: 'Section 3',
            title: 'Comprehension Questions',
            stripe: 'border-indigo-500',
            iconWrap: 'bg-indigo-100 text-indigo-800',
            iconSvg: '<span>❓</span>',
            body: numberedStepsHtml(questions),
          });
        }
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
      stripe: 'border-sky-500',
      iconWrap: 'bg-sky-100 text-sky-800',
      iconSvg: '<span>📖</span>',
      body: richTextHtml(p.paragraph),
    });
    if (p.questions?.length) {
      html += sectionCardHtml({
        sectionNum: `Questions ${p.passageNumber}`,
        title: 'Comprehension Questions',
        stripe: 'border-indigo-500',
        iconWrap: 'bg-indigo-100 text-indigo-800',
        iconSvg: '<span>❓</span>',
        body: numberedStepsHtml(p.questions),
      });
    }
  }
  return html;
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
      });
      if (concept.explanation) {
        html += sectionCardHtml({
          sectionNum: 'Section 2',
          title: 'Explanation',
          stripe: 'border-violet-500',
          iconWrap: 'bg-violet-100 text-violet-800',
          iconSvg: '<span>🧠</span>',
          body: richTextHtml(concept.explanation),
        });
      }
      if (concept.conceptCheckQuestions?.length) {
        html += sectionCardHtml({
          sectionNum: 'Section 5',
          title: 'Concept Check Questions',
          stripe: 'border-emerald-500',
          iconWrap: 'bg-emerald-100 text-emerald-800',
          iconSvg: '<span>❓</span>',
          body: numberedStepsHtml(concept.conceptCheckQuestions),
        });
      }
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
};

export function tryRenderStructuredAiToolHtml(
  toolType: string,
  content: string,
  rawContent?: unknown,
  variant: Variant = 'student'
): string | null {
  const renderer = STRUCTURED_RENDERERS[toolType];
  if (!renderer) return null;
  try {
    const body = renderer(content, rawContent ?? null, variant);
    if (!body?.trim()) return null;
    return body;
  } catch {
    return null;
  }
}
