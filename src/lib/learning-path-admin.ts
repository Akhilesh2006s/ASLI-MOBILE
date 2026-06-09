import {
  extractPlainSubjectName,
  getLearningPathClassLabel,
  isActiveCatalogSubject,
  isSoftDeletedSubjectName,
} from './subject-names';
import type { SubjectWithPathContent } from './learningPathCatalog';

function getContentSubjectId(content: any): string | null {
  const subj = content?.subject;
  if (subj == null) return null;
  if (typeof subj === 'object' && subj._id != null) return String(subj._id);
  if (typeof subj === 'string' && subj.trim()) return subj.trim();
  return null;
}

function isActiveCatalogContent(item: {
  isActive?: boolean;
  subject?: { name?: string; isActive?: boolean } | string;
}): boolean {
  if (item?.isActive === false) return false;
  const subj = item.subject;
  if (subj != null && typeof subj === 'object') {
    if (subj.isActive === false) return false;
    if (isSoftDeletedSubjectName(subj.name || '')) return false;
  }
  return true;
}

function normalizeSubjectNameForMerge(name: string): string {
  const plain = extractPlainSubjectName(name || '').trim().toLowerCase();
  if (/^bio(logy)?$/.test(plain) || plain === 'bio') return 'biology';
  return plain;
}

function groupKeyForSubjectRow(row: SubjectWithPathContent): string {
  const classLabel =
    getLearningPathClassLabel(row) ||
    String(row.classNumber || '').trim() ||
    'none';
  return `${classLabel}::${normalizeSubjectNameForMerge(row.name || '')}`;
}

/** Collapse duplicate subject rows (e.g. BIO vs Biology) for the same class. */
export function consolidateLearningPathSubjects(
  rows: SubjectWithPathContent[]
): SubjectWithPathContent[] {
  const byKey = new Map<string, SubjectWithPathContent & { mergedSubjectIds?: string[] }>();

  for (const row of rows) {
    if (!isActiveCatalogSubject(row)) continue;
    const key = groupKeyForSubjectRow(row);
    const rowId = String(row._id || row.id);
    const incoming = [...(row.asliPrepContent || [])].filter((c) => isActiveCatalogContent(c));

    if (!byKey.has(key)) {
      byKey.set(key, { ...row, mergedSubjectIds: [rowId], asliPrepContent: incoming });
      continue;
    }

    const agg = byKey.get(key)!;
    const idSet = new Set<string>(agg.mergedSubjectIds || [String(agg._id || agg.id)]);
    idSet.add(rowId);
    agg.mergedSubjectIds = Array.from(idSet);

    const seen = new Set((agg.asliPrepContent || []).map((c: any) => String(c._id)));
    for (const c of incoming) {
      const cid = String(c._id);
      if (!seen.has(cid)) {
        seen.add(cid);
        agg.asliPrepContent.push(c);
      }
    }

    if ((row.classNumber != null && String(row.classNumber).trim() !== '') && !agg.classNumber) {
      agg.classNumber = row.classNumber;
    }
  }

  return Array.from(byKey.values()).map((agg) => {
    const contents = (agg.asliPrepContent || []).slice().sort((a: any, b: any) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    const ids =
      agg.mergedSubjectIds && agg.mergedSubjectIds.length > 0
        ? agg.mergedSubjectIds
        : [String(agg._id || agg.id)];

    const countBySubject = new Map<string, number>();
    for (const c of contents) {
      const sid = getContentSubjectId(c);
      if (!sid) continue;
      countBySubject.set(sid, (countBySubject.get(sid) || 0) + 1);
    }

    let primaryId = String(agg._id || agg.id);
    let max = -1;
    for (const sid of ids) {
      const n = countBySubject.get(sid) || 0;
      if (n > max) {
        max = n;
        primaryId = sid;
      }
    }
    if (max <= 0) primaryId = ids[0];

    const inferredClass =
      (agg.classNumber != null && String(agg.classNumber).trim() !== ''
        ? String(agg.classNumber).trim()
        : null) || getLearningPathClassLabel({ ...agg, asliPrepContent: contents });

    const plainName = extractPlainSubjectName(agg.name || '');

    return {
      ...agg,
      _id: primaryId,
      id: primaryId,
      name: plainName,
      description:
        agg.description?.trim() ||
        `Structured content for ${plainName}${inferredClass ? ` · Class ${inferredClass}` : ''}`,
      mergedSubjectIds: ids,
      asliPrepContent: contents,
      totalContent: contents.length,
      ...(inferredClass ? { classNumber: inferredClass } : {}),
    };
  });
}

export function subjectMatchesClassFilter(
  row: SubjectWithPathContent,
  classFilter: string
): boolean {
  if (classFilter === 'all') return true;
  const label = getLearningPathClassLabel(row);
  return label === classFilter;
}

export function subjectMatchesSubjectFilter(
  row: SubjectWithPathContent,
  subjectFilter: string
): boolean {
  if (subjectFilter === 'all') return true;
  return (
    extractPlainSubjectName(row.name || '').toLowerCase() === subjectFilter.toLowerCase()
  );
}

export function sortClassLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function buildClassFilterOptions(rows: SubjectWithPathContent[]): string[] {
  const classSet = new Set<string>();
  for (const row of rows) {
    const label = getLearningPathClassLabel(row);
    if (label) classSet.add(label);
  }
  return sortClassLabels(Array.from(classSet));
}

export function buildSubjectFilterOptions(
  rows: SubjectWithPathContent[],
  classFilter: string
): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    if (!subjectMatchesClassFilter(row, classFilter)) continue;
    const plain = extractPlainSubjectName(row.name || '').trim();
    if (plain) names.add(plain);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function filterLearningPathSubjects(
  rows: SubjectWithPathContent[],
  classFilter: string,
  subjectFilter: string
): SubjectWithPathContent[] {
  return rows.filter(
    (row) =>
      subjectMatchesClassFilter(row, classFilter) &&
      subjectMatchesSubjectFilter(row, subjectFilter)
  );
}

export type ClassSubjectGroup = {
  classKey: string;
  subjects: SubjectWithPathContent[];
};

export function groupLearningPathsByClass(
  rows: SubjectWithPathContent[]
): ClassSubjectGroup[] {
  const grouped = new Map<string, SubjectWithPathContent[]>();

  for (const row of rows) {
    const classLabel = getLearningPathClassLabel(row) || 'Unassigned';
    if (!grouped.has(classLabel)) grouped.set(classLabel, []);
    grouped.get(classLabel)!.push(row);
  }

  return sortClassLabels(Array.from(grouped.keys())).map((classKey) => ({
    classKey,
    subjects: (grouped.get(classKey) || [])
      .slice()
      .sort((a, b) =>
        extractPlainSubjectName(a.name || '').localeCompare(
          extractPlainSubjectName(b.name || ''),
          undefined,
          { sensitivity: 'base' }
        )
      ),
  }));
}
