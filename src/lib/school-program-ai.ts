const CURRICULUM_BOARDS = ['CBSE', 'STATE', 'SSC', 'ICSE', 'IB', 'CAMBRIDGE'] as const;

function isCurriculumBoardCode(code: string): boolean {
  return (CURRICULUM_BOARDS as readonly string[]).includes(code as (typeof CURRICULUM_BOARDS)[number]);
}

export function resolveIsAsliPrepExclusive(user?: {
  isAsliPrepExclusive?: boolean;
  board?: string;
  assignedAdmin?: { isAsliPrepExclusive?: boolean; board?: string };
} | null): boolean {
  if (!user) return false;
  if (user.isAsliPrepExclusive === true) return true;
  if (user.assignedAdmin?.isAsliPrepExclusive === true) return true;
  if (user.board === 'ASLI_EXCLUSIVE_SCHOOLS') return true;
  if (user.assignedAdmin?.board === 'ASLI_EXCLUSIVE_SCHOOLS') return true;
  return false;
}

export function resolveCurriculumBoardForAiTools(user?: {
  curriculumBoard?: string;
  board?: string;
  assignedAdmin?: { curriculumBoard?: string; board?: string };
} | null): string {
  const candidates = [
    user?.curriculumBoard,
    user?.assignedAdmin?.curriculumBoard,
    user?.board,
    user?.assignedAdmin?.board,
  ];
  for (const value of candidates) {
    const raw = String(value || '').toUpperCase().trim();
    if (isCurriculumBoardCode(raw)) return raw;
  }
  return 'CBSE';
}

export function getAiToolBoardOptions(isAsliPrepExclusive: boolean, curriculumBoard: string): string[] {
  const curriculum = resolveCurriculumBoardForAiTools({ curriculumBoard });
  const options = [curriculum];
  if (isAsliPrepExclusive && !options.includes('IIT')) {
    options.push('IIT');
  }
  return options;
}

export function getDefaultAiToolBoard(_isAsliPrepExclusive: boolean, curriculumBoard: string): string {
  return resolveCurriculumBoardForAiTools({ curriculumBoard });
}

export function mapGradeLevelForIitBoard(
  board: string | undefined,
  gradeLevel: string | undefined
): string | undefined {
  if (String(board || '').toUpperCase() !== 'IIT') return gradeLevel;
  return 'IIT-6';
}
