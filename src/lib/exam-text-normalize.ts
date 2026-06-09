/** Normalize exam question/option text (aligned with asli-frontend exam-text-normalize). */

const MOJIBAKE: Record<string, string> = {
  'âˆš': '√',
  'â‰¥': '≥',
  'â‰¤': '≤',
  'â‰ ': '≠',
  'âˆž': '∞',
  'âˆ†': '∆',
  'â€²': "'",
  'â€³': '"',
  'â€“': '-',
  'â€”': '-',
  'â€˜': "'",
  'â€™': "'",
  'â€œ': '"',
  'â€': '"',
  'Â°': '°',
};

export function repairLossyMathSymbols(text: string): string {
  let s = text;
  s = s.replace(/\bv(\d+)\/(\d+)/g, '√$1/$2');
  s = s.replace(/\bv\((\d+)\)/g, '√($1)');
  s = s.replace(/(?<![A-Za-z])(sin|cos|tan|cot|sec|cosec|csc)([²³\u00B2\u00B3])\?/gi, '$1$2 θ');
  s = s.replace(/\band\s+\?\s+is\s+(acute|obtuse|right)\b/gi, 'and θ is $1');
  s = s.replace(/(?<![A-Za-z])(sin|cos|tan|cot|sec|cosec|csc)\s*\?/gi, '$1 θ');
  s = s.replace(/\?\s*(\^?\d+)/g, 'θ$1');
  return s;
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function normalizeExamDisplayText(value: unknown): string {
  if (value === undefined || value === null) return '';
  let text = String(value);
  if (text.includes('&')) text = decodeBasicEntities(text);

  Object.entries(MOJIBAKE).forEach(([from, to]) => {
    text = text.split(from).join(to);
  });

  text = repairLossyMathSymbols(text);

  const monthToNumber: Record<string, string> = {
    jan: '1', feb: '2', mar: '3', apr: '4', may: '5', jun: '6',
    jul: '7', aug: '8', sep: '9', oct: '10', nov: '11', dec: '12',
  };
  text = text.replace(
    /^(\d{1,2})\s*-\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i,
    (_m, day, mon) => `${String(day)}-${monthToNumber[String(mon).toLowerCase()] || mon}`
  );

  text = text
    .replace(/(^|[\s,(=])\?(?=\d)/g, '$1-')
    .replace(/(^|[\s,(=])\uFFFD(?=\d)/g, '$1-');

  text = text.replace(/[\uFFFD]/g, '?');
  text = text.replace(/\s{2,}/g, ' ').trim();
  return text;
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

export function formatChemistryDisplayText(text: string, subject?: string): string {
  const s = text === null || text === undefined ? '' : String(text);
  if (String(subject || '').trim().toLowerCase() !== 'chemistry') return s;
  return s.replace(/([A-Za-z\)])(\d+)/g, (_match, prefix: string, digits: string) => {
    const subscript = digits.split('').map((d) => SUBSCRIPT_DIGITS[d] ?? d).join('');
    return `${prefix}${subscript}`;
  });
}

export function normalizeAndFormatExamDisplayText(value: unknown, subject?: string): string {
  return formatChemistryDisplayText(normalizeExamDisplayText(value), subject);
}
