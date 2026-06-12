import { activitiesPayloadIsComplete } from './parse-activity-markdown';
import { isStoryPassageLanguageSubject } from './student-ai-tools';

export type AiToolFieldConfig = {
  name: string;
  label: string;
  required?: boolean;
};

export type AiToolGenerationMeta = {
  source?: string;
  sourceLabel?: string;
  matchType?: string | null;
  totalCandidates?: number;
  selectedIndex?: number;
  aiUnavailable?: boolean;
  chunksUsed?: number;
  citations?: Array<{
    index: number;
    subject: string;
    classLabel: string;
    chapter: string;
    score: string;
    preview: string;
  }>;
};

export type AiToolGenerateSuccess = {
  ok: true;
  content: string;
  rawContent: unknown;
  metadata: AiToolGenerationMeta | null;
  fromAiFailure: boolean;
};

export type AiToolGenerateFailure = {
  ok: false;
  title: string;
  message: string;
  code?: string;
  fallbackMessage: string;
};

export type AiToolGenerateResult = AiToolGenerateSuccess | AiToolGenerateFailure;

const INLINE_ONLY_ERROR_CODES = new Set([
  'AI_TOOL_CONTENT_INCOMPLETE',
  'AI_TOOL_WRONG_TYPE',
  'AI_TOOL_DATA_NOT_FOUND',
]);

export function shouldShowAiToolErrorAlert(code?: string): boolean {
  return !code || !INLINE_ONLY_ERROR_CODES.has(code);
}

function activitiesFromRaw(rawContent: unknown) {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities;
  return undefined;
}

export function validateActivityToolDisplay(
  toolType: string,
  content: string,
  rawContent: unknown,
  variant: 'student' | 'teacher',
): string | null {
  if (toolType !== 'activity-project-generator' && toolType !== 'project-idea-lab') return null;
  const mode = toolType === 'project-idea-lab' ? 'student' : variant;
  if (activitiesPayloadIsComplete(activitiesFromRaw(rawContent), content, mode)) return null;
  return 'Complete activity content is not available for this selection. All template sections must be filled.';
}

type ValidateOptions = {
  config: { fields: AiToolFieldConfig[] };
  formParams: Record<string, unknown>;
  isReadingPractice?: boolean;
  requireBoard?: boolean;
};

export function validateAiToolForm({
  config,
  formParams,
  isReadingPractice = false,
  requireBoard = true,
}: ValidateOptions): string | null {
  const requiredFields = config.fields.filter((f) => f.required);
  const missingFields = requiredFields.filter((f) => !formParams[f.name]);

  if (missingFields.length > 0) {
    return `Please fill in: ${missingFields.map((f) => f.label).join(', ')}`;
  }

  if (requireBoard && !formParams.board) {
    return 'Please select a board.';
  }

  if (isReadingPractice && !isStoryPassageLanguageSubject(String(formParams.subject || ''))) {
    return 'Story & Passage Creator works only with English or Hindi subjects.';
  }

  return null;
}

function parseResponseBody(responseText: string): {
  success?: boolean;
  data?: {
    content?: string;
    rawData?: unknown;
    metadata?: AiToolGenerationMeta;
  };
  content?: string;
  message?: string;
  code?: string;
} {
  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {};
  }
}

function resolveApiError(data: ReturnType<typeof parseResponseBody>, response: Response, responseText: string) {
  const code = data?.code;
  const message = data.message || responseText || `Server error: ${response.status}`;

  if (
    code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    code === 'AI_TOOL_WRONG_TYPE' ||
    (response.status === 404 &&
      (code === 'AI_TOOL_DATA_NOT_FOUND' ||
        code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
        code === 'AI_TOOL_WRONG_TYPE'))
  ) {
    return {
      ok: false as const,
      title:
        code === 'AI_TOOL_WRONG_TYPE'
          ? 'Wrong tool content'
          : code === 'AI_TOOL_CONTENT_INCOMPLETE'
            ? 'Content incomplete'
            : 'No content found',
      message:
        message ||
        'No complete content is available for this class, subject, topic, and sub-topic.',
      code,
      fallbackMessage:
        message ||
        (code === 'AI_TOOL_WRONG_TYPE'
          ? 'Saved content belongs to a different AI tool. Super Admin must generate using this tool name only.'
          : code === 'AI_TOOL_CONTENT_INCOMPLETE'
            ? 'Saved content is incomplete or not in the correct tool format. Ask Super Admin to complete all sections.'
            : 'No content found for this selection. Ask Super Admin to add it in AI Tool Generations.'),
    };
  }

  if (response.status === 503 && code === 'AI_UNAVAILABLE_NO_FALLBACK') {
    return {
      ok: false as const,
      title: 'AI unavailable',
      message:
        message ||
        'No stored content matched. Ask your Super Admin to add content or fix the API quota.',
      code,
      fallbackMessage:
        message ||
        'AI service is unavailable and no previously generated content was found for this selection.',
    };
  }

  return {
    ok: false as const,
    title: 'Error',
    message: message || 'AI generation failed',
    code,
    fallbackMessage: message || 'Failed to generate content. Please try again.',
  };
}

const CLIENT_VALIDATION_ERROR =
  /invalid subject|topic is required|sub topic is required|class number and subject are required|only available for english and hindi|incomplete for|missing sections|not in the correct tool format/i;

export function isAiToolClientValidationError(message: string): boolean {
  return CLIENT_VALIDATION_ERROR.test(message);
}

export async function fetchAiToolGeneratedContentFallback({
  apiBaseUrl,
  token,
  classLabel,
  subject,
  topic,
  subTopic,
  toolType,
}: {
  apiBaseUrl: string;
  token: string;
  classLabel: string;
  subject: string;
  topic: string;
  subTopic: string;
  toolType: string;
}): Promise<AiToolGenerateResult> {
  const params = new URLSearchParams({
    class: classLabel,
    subject,
    topic,
    subTopic,
    toolType,
  });

  const response = await fetch(`${apiBaseUrl}/api/teacher/ai/generated-content?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      title: 'Error',
      message: 'Fallback lookup failed',
      fallbackMessage: 'Fallback lookup failed. Please try again.',
    };
  }

  const data = await response.json();
  const fallbackContent = data?.data?.generatedContent ?? data?.data?.content ?? '';

  if (
    data?.code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    data?.code === 'AI_TOOL_WRONG_TYPE' ||
    (data?.success && !data?.data)
  ) {
    return {
      ok: false,
      title: 'Content incomplete',
      message:
        data?.message ||
        'Saved content is incomplete or not in the correct tool format for this tool.',
      code: data?.code,
      fallbackMessage:
        data?.message ||
        'Ask your Super Admin to complete all sections before this can be shown.',
    };
  }

  if (data?.success && String(fallbackContent).trim().length > 0) {
    return {
      ok: true,
      content: String(fallbackContent),
      rawContent: null,
      metadata: {
        matchType: data?.data?.matchType,
        totalCandidates: data?.data?.totalCandidates,
        selectedIndex: data?.data?.selectedIndex,
        source: data?.data?.source,
        sourceLabel: data?.data?.sourceLabel,
      },
      fromAiFailure: false,
    };
  }

  return {
    ok: false,
    title: 'Generation failed',
    message: data?.message || 'No saved copy matched this selection.',
    fallbackMessage: data?.message || 'No saved copy matched this selection.',
  };
}

export async function executeAiToolGenerate({
  endpoint,
  token,
  requestBody,
}: {
  endpoint: string;
  token: string;
  requestBody: Record<string, unknown>;
}): Promise<AiToolGenerateResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  const data = parseResponseBody(responseText);

  if (!response.ok) {
    return resolveApiError(data, response, responseText);
  }

  const content = data.data?.content || data.content || '';
  if (!data.success || !String(content).trim()) {
    return {
      ok: false,
      title: 'Error',
      message: data.message || 'AI returned empty response',
      code: data.code,
      fallbackMessage: data.message || 'AI returned empty response. Please try again.',
    };
  }

  const fromAiFailure = !!data.data?.metadata?.aiUnavailable;

  return {
    ok: true,
    content: String(content),
    rawContent: data.data?.rawData ?? null,
    metadata: data.data?.metadata ?? null,
    fromAiFailure,
  };
}

const STUDENT_JSON_PAYLOAD_TOOLS = new Set([
  'short-notes-summaries-maker',
  'concept-mastery-helper',
  'study-schedule-maker',
  'lesson-planner',
  'my-study-decks',
  'flashcard-generator',
]);

const TEACHER_JSON_PAYLOAD_TOOLS = new Set([
  'short-notes-summaries-maker',
  'concept-mastery-helper',
  'lesson-planner',
  'flashcard-generator',
  'worksheet-mcq-generator',
  'homework-creator',
  'daily-class-plan-maker',
]);

export function storeAiToolSuccessPayload(
  toolType: string,
  content: string,
  rawContent: unknown,
  role: 'student' | 'teacher'
): { generatedContent: string; rawGeneratedContent: unknown } {
  const jsonTools = role === 'teacher' ? TEACHER_JSON_PAYLOAD_TOOLS : STUDENT_JSON_PAYLOAD_TOOLS;

  if (rawContent && jsonTools.has(toolType)) {
    return {
      generatedContent: JSON.stringify({ formatted: content, raw: rawContent }),
      rawGeneratedContent: rawContent,
    };
  }

  return {
    generatedContent: content,
    rawGeneratedContent: rawContent ?? null,
  };
}

export function buildTeacherAiRequestBody(
  toolType: string,
  formParams: Record<string, unknown>,
  selectedBoard: string,
  mapGradeLevel: (board: string | undefined, gradeLevel: string | undefined) => string | undefined
) {
  const selectedClass = mapGradeLevel(
    selectedBoard,
    typeof formParams.gradeLevel === 'string' ? formParams.gradeLevel : undefined
  );
  const selectedSubject = formParams.subject || formParams.subjects;
  const selectedTopic = formParams.topic || '';
  const selectedSubTopic = formParams.subTopic || '';
  const selectedSection = formParams.section || formParams.className || '';

  return {
    toolType,
    classNumber: selectedClass
      ? selectedClass === 'IIT-6' || selectedClass === 'Class-6-IIT'
        ? 'IIT-6'
        : parseInt(String(selectedClass).replace('Class ', ''), 10)
      : undefined,
    subject: selectedSubject,
    topic: selectedTopic,
    subTopic: selectedSubTopic,
    section: selectedSection,
    questionCount: formParams.questionCount ? parseInt(String(formParams.questionCount), 10) : undefined,
    duration: formParams.duration ? parseInt(String(formParams.duration), 10) : undefined,
    ...formParams,
    board: selectedBoard,
    gradeLevel: selectedClass,
  };
}

export function buildStudentAiRequestBody(
  apiToolType: string,
  formParams: Record<string, unknown>,
  selectedBoard: string,
  mapGradeLevel: (board: string | undefined, gradeLevel: string | undefined) => string | undefined
) {
  const mappedTopic =
    formParams.topic ||
    formParams.concept ||
    formParams.chapter ||
    formParams.projectTopic ||
    '';

  const gradeLevel = mapGradeLevel(
    selectedBoard,
    typeof formParams.gradeLevel === 'string' ? formParams.gradeLevel : undefined
  );

  return {
    toolType: apiToolType,
    ...formParams,
    board: selectedBoard,
    gradeLevel,
    subject: formParams.subject || formParams.subjects,
    topic: mappedTopic,
  };
}
