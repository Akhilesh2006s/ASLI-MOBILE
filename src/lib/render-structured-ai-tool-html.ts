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
  contentHasNumberedTemplateSections,
  resolveRichDisplayContent,
} from './ai-tool-display-content';
import {
  bulletListHtml,
  checkListHtml,
  conceptGridHtml,
  emptySectionPlaceholderHtml,
  escapeHtml,
  heroTitleCardHtml,
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
    badge: '1. Homework Title',
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
      stripe: 'border-orange-500',
      iconWrap: 'bg-orange-100 text-orange-800',
      icon: '📋',
      body: homework.instructions.trim()
        ? richTextHtml(homework.instructions)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 3,
      title: 'Practice Questions',
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '❓',
      body: homeworkPracticeQuestionsHtml(homework.practiceQuestions),
    },
    {
      num: 4,
      title: 'Application-based Tasks',
      stripe: 'border-yellow-500',
      iconWrap: 'bg-yellow-100 text-yellow-900',
      icon: '💡',
      body: homework.applicationTasks.length
        ? bulletListHtml(homework.applicationTasks, 'text-orange-600')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 5,
      title: 'One Creative / Thinking Question',
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      icon: '🧠',
      body: homework.creativeThinkingQuestion.trim()
        ? richTextHtml(homework.creativeThinkingQuestion)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 6,
      title: 'One Real-life Observation Task',
      stripe: 'border-cyan-500',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      icon: '👁',
      body: homework.realLifeObservationTask.trim()
        ? richTextHtml(homework.realLifeObservationTask)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 7,
      title: 'Challenge Question',
      stripe: 'border-rose-500',
      iconWrap: 'bg-rose-100 text-rose-800',
      icon: '✨',
      body: homework.challengeQuestion.trim()
        ? richTextHtml(homework.challengeQuestion)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 8,
      title: 'Support Hint for Struggling Learners',
      stripe: 'border-teal-500',
      iconWrap: 'bg-teal-100 text-teal-800',
      icon: '💬',
      body: homework.supportHint.trim()
        ? richTextHtml(homework.supportHint)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 9,
      title: 'Answer Hints / Key Points',
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      icon: '🔑',
      body: homework.answerHints.trim()
        ? richTextHtml(homework.answerHints)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 10,
      title: 'Parent Note',
      stripe: 'border-indigo-500',
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
    stripe: 'border-emerald-500',
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
    stripe: 'border-teal-500',
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
      stripe: 'border-emerald-500',
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
    stripe: 'border-sky-500',
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
    stripe: 'border-violet-500',
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
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${badgeClass} text-xs font-bold text-white">${i + 1}</span>
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
      stripe: 'border-cyan-500',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      icon: '🎯',
      body: story.topicSubtopicConnection?.trim()
        ? richTextHtml(story.topicSubtopicConnection)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 3,
      title: 'Prior Knowledge Required',
      stripe: 'border-sky-500',
      iconWrap: 'bg-sky-100 text-sky-800',
      icon: '📚',
      body: story.priorKnowledgeRequired?.trim()
        ? richTextHtml(story.priorKnowledgeRequired)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 4,
      title: "Learning Objectives – Bloom's Taxonomy Aligned",
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      icon: '🎯',
      body: story.learningObjectives.length
        ? bulletListHtml(story.learningObjectives, 'text-violet-600')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 5,
      title: 'NCF Competency / Learning Outcome Alignment',
      stripe: 'border-blue-500',
      iconWrap: 'bg-blue-100 text-blue-800',
      icon: '🎓',
      body: story.ncfAlignment?.trim()
        ? richTextHtml(story.ncfAlignment)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 6,
      title: 'Vocabulary Warm-up',
      stripe: 'border-teal-500',
      iconWrap: 'bg-teal-100 text-teal-800',
      icon: '📝',
      body: story.vocabulary.length
        ? bulletListHtml(story.vocabulary, 'text-teal-700')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 7,
      title: 'Pre-reading Thinking Prompt',
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '💡',
      body: story.preReadingPrompt?.trim()
        ? richTextHtml(story.preReadingPrompt)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 8,
      title: 'Story / Passage Content',
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-800',
      icon: '📖',
      body: story.passage?.trim()
        ? richTextHtml(story.passage)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 9,
      title: 'Read and Recall Questions',
      stripe: 'border-indigo-500',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      icon: '❓',
      body: storyQuestionsHtml(story.readRecallQuestions, 'bg-indigo-600'),
    },
    {
      num: 10,
      title: 'Think and Infer Questions',
      stripe: 'border-sky-500',
      iconWrap: 'bg-sky-100 text-sky-800',
      icon: '❓',
      body: storyQuestionsHtml(story.thinkInferQuestions, 'bg-sky-600'),
    },
    {
      num: 11,
      title: 'Apply and Connect Questions',
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      icon: '❓',
      body: storyQuestionsHtml(story.applyConnectQuestions, 'bg-emerald-600'),
    },
    {
      num: 12,
      title: 'Vocabulary and Grammar Practice',
      stripe: 'border-teal-500',
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
      stripe: 'border-purple-500',
      iconWrap: 'bg-purple-100 text-purple-800',
      icon: '✨',
      body: story.creativeResponseActivity?.trim()
        ? richTextHtml(story.creativeResponseActivity)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 14,
      title: 'Answer Key / Suggested Responses',
      stripe: 'border-yellow-500',
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
      stripe: 'border-rose-500',
      iconWrap: 'bg-rose-100 text-rose-800',
      icon: '⚠️',
      body: story.commonMistakesToAvoid?.trim()
        ? richTextHtml(story.commonMistakesToAvoid)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 16,
      title: 'Differentiation Support',
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      icon: '👥',
      body: story.differentiationSupport?.trim()
        ? richTextHtml(story.differentiationSupport)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 17,
      title: 'Expected Learning Outcomes',
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      icon: '🎓',
      body: story.expectedLearningOutcomes?.trim()
        ? richTextHtml(story.expectedLearningOutcomes)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 18,
      title: 'Real-life Application',
      stripe: 'border-orange-500',
      iconWrap: 'bg-orange-100 text-orange-800',
      icon: '🌍',
      body: story.realLifeApplication?.trim()
        ? richTextHtml(story.realLifeApplication)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 19,
      title: 'Reflection / Exit Ticket',
      stripe: 'border-fuchsia-500',
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
          badge: '1. Story / Passage Title',
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
      stripe: 'border-fuchsia-500',
      iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
      body: conceptSectionBody(concept.simpleDefinition),
    },
    {
      num: 2,
      title: 'Why this concept is important',
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      body: conceptSectionBody(concept.whyImportant),
    },
    {
      num: 3,
      title: 'Prior knowledge needed',
      stripe: 'border-purple-500',
      iconWrap: 'bg-purple-100 text-purple-800',
      body: conceptSectionBody(concept.priorKnowledge),
    },
    {
      num: 4,
      title: 'Step-by-step explanation',
      stripe: 'border-indigo-500',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      body: conceptSectionBody(concept.explanation),
    },
    {
      num: 5,
      title: 'Diagram / visualisation suggestion',
      stripe: 'border-blue-500',
      iconWrap: 'bg-blue-100 text-blue-800',
      body: conceptSectionBody(concept.diagramSuggestion),
    },
    {
      num: 6,
      title: 'Real-life examples',
      stripe: 'border-cyan-500',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      body: conceptSectionBody(concept.realLifeExamples),
    },
    {
      num: 7,
      title: 'Common misconceptions and corrections',
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-900',
      body: concept.misconceptions.length
        ? bulletListHtml(concept.misconceptions, 'text-amber-700')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 8,
      title: 'Concept check questions',
      stripe: 'border-rose-500',
      iconWrap: 'bg-rose-100 text-rose-800',
      body: concept.conceptCheckQuestions.length
        ? numberedStepsHtml(concept.conceptCheckQuestions, 'bg-rose-600')
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 9,
      title: 'Key points to remember',
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      body: concept.keyPoints.length
        ? checkListHtml(concept.keyPoints)
        : emptySectionPlaceholderHtml(),
    },
    {
      num: 10,
      title: 'Exam tips',
      stripe: 'border-sky-500',
      iconWrap: 'bg-sky-100 text-sky-800',
      body: conceptSectionBody(concept.examTips),
    },
    {
      num: 11,
      title: 'Higher-order thinking question',
      stripe: 'border-pink-500',
      iconWrap: 'bg-pink-100 text-pink-800',
      body: conceptSectionBody(concept.hotsQuestion),
    },
    {
      num: 12,
      title: 'Quick self-reflection prompt',
      stripe: 'border-fuchsia-600',
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
};

const FULL_STRUCTURED_MARKDOWN_TOOLS = new Set([
  'worksheet-mcq-generator',
  'concept-mastery-helper',
  'homework-creator',
  'story-passage-creator',
  'reading-practice-room',
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
    const body = renderer(content, rawContent ?? null, variant);
    if (!body?.trim()) return null;
    return body;
  } catch {
    return null;
  }
}
