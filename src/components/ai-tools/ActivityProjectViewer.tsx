import { useMemo, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  cleanReflectionProse,
  dedupeStringLines,
  normalizeParsedActivityFields,
  resolveActivitiesFromPayload,
  studentActivitySectionsComplete,
  teacherActivitySectionsComplete,
  type ParsedActivity,
} from '../../lib/parse-activity-markdown';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { stripAiToolGenerationLabel } from '../../lib/strip-ai-tool-generation-label';

type NormalizedActivity = {
  sl: number;
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

type SectionDef = {
  num: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe: string;
  hasContent: (a: NormalizedActivity) => boolean;
  render: (a: NormalizedActivity) => ReactNode;
};

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
};

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coalesceLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => stripOrderedPrefix(String(x ?? ''))).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v.split(/\n+/).map(stripOrderedPrefix).filter(Boolean);
  }
  return [];
}

function firstNonEmptyFromActivity(...values: unknown[]): string {
  for (const v of values) {
    if (Array.isArray(v)) {
      const joined = v.map((x) => String(x ?? '').trim()).filter(Boolean).join('\n');
      if (joined.trim()) return joined.trim();
    } else {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  return '';
}

function normalizeActivity(raw: ParsedActivity, idx: number, mode: 'student' | 'teacher'): NormalizedActivity {
  const a = normalizeParsedActivityFields((raw || {}) as ParsedActivity);
  const ncfRaw = a.ncf_competency_alignment;
  const ncf = dedupeStringLines(
    Array.isArray(ncfRaw)
      ? ncfRaw.map((x) => String(x).trim()).filter(Boolean)
      : String(ncfRaw || '')
          .split(/[;\n]+/)
          .map((x) => x.trim())
          .filter(Boolean)
  );
  const studentSteps = coalesceLines(a.student_instructions);
  const procedureSteps = coalesceLines(a.step_by_step_procedure || a.steps || a.instructions);
  const steps = mode === 'teacher' ? procedureSteps : studentSteps.length ? studentSteps : procedureSteps;

  return {
    sl: Number(a.sl_no) || idx + 1,
    title: stripAiToolGenerationLabel(String(a.title || a.name || ''), 'Activity'),
    subtopicLink: firstNonEmptyFromActivity(a.subtopic_link_prior_knowledge),
    learningObjectives: dedupeStringLines(coalesceLines(a.learning_objectives || a.learningObjectives)),
    ncfAlignment: ncf,
    materials: dedupeStringLines(coalesceLines(a.materials_required || a.materials)),
    steps,
    teacherInstructions: coalesceLines(a.teacher_instructions || a.teacherInstructions),
    studentInstructions: studentSteps.length
      ? studentSteps
      : coalesceLines(a.student_instructions || a.studentInstructions),
    differentiation: String(a.differentiation_support_extension || a.differentiation || '').trim(),
    assessmentRubric: dedupeStringLines(
      coalesceLines(a.assessment_criteria_rubric || a.assessment || a.evaluation)
    ),
    expectedOutcomes: firstNonEmptyFromActivity(
      a.expected_learning_outcomes,
      a.learning_outcome,
      a.learning_outcomes,
      a.expected_outcome
    ),
    realLife: String(a.real_life_application || '').trim(),
    reflection: cleanReflectionProse(String(a.reflection_exit_ticket || a.reflection || '')),
  };
}

const TEACHER_SECTIONS: SectionDef[] = [
  {
    num: 2,
    title: 'Subtopic link and prior knowledge required',
    icon: 'book-outline',
    stripe: '#7dd3fc',
    hasContent: (a) => !!a.subtopicLink,
    render: (a) => <Text style={styles.preWrap}>{a.subtopicLink}</Text>,
  },
  {
    num: 3,
    title: 'Learning objectives',
    icon: 'radio-button-on-outline',
    stripe: '#c4b5fd',
    hasContent: (a) => a.learningObjectives.length > 0,
    render: (a) => <CheckList items={a.learningObjectives} />,
  },
  {
    num: 4,
    title: 'NCF competency / learning outcome alignment',
    icon: 'school-outline',
    stripe: '#93c5fd',
    hasContent: (a) => a.ncfAlignment.length > 0,
    render: (a) => <BulletList items={a.ncfAlignment} />,
  },
  {
    num: 5,
    title: 'Materials required',
    icon: 'cube-outline',
    stripe: '#fcd34d',
    hasContent: (a) => a.materials.length > 0,
    render: (a) => <NumberedMaterials items={a.materials} />,
  },
  {
    num: 6,
    title: 'Step-by-step procedure',
    icon: 'list-outline',
    stripe: '#6ee7b7',
    hasContent: (a) => a.steps.length > 0,
    render: (a) => <NumberedSteps items={a.steps} color="#d1fae5" />,
  },
  {
    num: 7,
    title: 'Teacher instructions',
    icon: 'people-outline',
    stripe: '#a5b4fc',
    hasContent: (a) => a.teacherInstructions.length > 0,
    render: (a) => <BulletList items={a.teacherInstructions} />,
  },
  {
    num: 8,
    title: 'Student instructions',
    icon: 'school-outline',
    stripe: '#5eead4',
    hasContent: (a) => a.studentInstructions.length > 0,
    render: (a) => <BulletList items={a.studentInstructions} />,
  },
  {
    num: 9,
    title: 'Differentiation',
    icon: 'git-branch-outline',
    stripe: '#f9a8d4',
    hasContent: (a) => !!a.differentiation,
    render: (a) => <Text style={styles.preWrap}>{a.differentiation}</Text>,
  },
  {
    num: 10,
    title: 'Assessment rubric',
    icon: 'clipboard-outline',
    stripe: '#fcd34d',
    hasContent: (a) => a.assessmentRubric.length > 0,
    render: (a) => <BulletList items={a.assessmentRubric} />,
  },
  {
    num: 11,
    title: 'Expected learning outcomes',
    icon: 'trophy-outline',
    stripe: '#67e8f9',
    hasContent: (a) => !!a.expectedOutcomes,
    render: (a) => <Text style={styles.preWrap}>{a.expectedOutcomes}</Text>,
  },
  {
    num: 12,
    title: 'Real-life application',
    icon: 'sparkles-outline',
    stripe: '#e879f9',
    hasContent: (a) => !!a.realLife,
    render: (a) => <Text style={styles.preWrap}>{a.realLife}</Text>,
  },
  {
    num: 13,
    title: 'Reflection / exit ticket',
    icon: 'bulb-outline',
    stripe: '#fdba74',
    hasContent: (a) => !!a.reflection,
    render: (a) => <Text style={styles.preWrap}>{a.reflection}</Text>,
  },
];

const SECTION_CARD_THEMES = [
  { stripe: '#a5b4fc', border: '#c7d2fe', bg: '#eef2ff', label: '#6366f1', title: '#312e81' },
  { stripe: '#c4b5fd', border: '#ddd6fe', bg: '#f5f3ff', label: '#7c3aed', title: '#4c1d95' },
  { stripe: '#6ee7b7', border: '#a7f3d0', bg: '#ecfdf5', label: '#059669', title: '#064e3b' },
  { stripe: '#7dd3fc', border: '#bae6fd', bg: '#f0f9ff', label: '#0284c7', title: '#0c4a6e' },
  { stripe: '#fcd34d', border: '#fde68a', bg: '#fffbeb', label: '#d97706', title: '#78350f' },
  { stripe: '#5eead4', border: '#99f6e4', bg: '#f0fdfa', label: '#0d9488', title: '#134e4a' },
];

function SectionCard({
  sectionNum,
  title,
  icon,
  themeIndex = 0,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe?: string;
  themeIndex?: number;
  children: ReactNode;
}) {
  const theme = SECTION_CARD_THEMES[themeIndex % SECTION_CARD_THEMES.length];
  const accent = theme.stripe;
  return (
    <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
      <View style={[styles.sectionHeader, { borderLeftColor: accent, backgroundColor: theme.bg }]}>
        <View style={[styles.sectionIcon, { backgroundColor: theme.border }]}>
          <Ionicons name={icon} size={14} color={theme.label} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={[styles.sectionNum, { color: theme.label }]}>{sectionNum}</Text>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>{title}</Text>
        </View>
      </View>
      <View style={[styles.sectionBody, { backgroundColor: theme.bg }]}>{children}</View>
    </View>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <View style={styles.checkList}>
      {items.map((line, i) => (
        <View key={`${line}-${i}`} style={styles.checkRow}>
          <Ionicons name="checkmark-circle" size={16} color="#7c3aed" style={styles.checkIcon} />
          <Text style={styles.checkText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((line, i) => (
        <View key={`${line}-${i}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function NumberedMaterials({ items }: { items: string[] }) {
  return (
    <View style={styles.matList}>
      {items.map((m, i) => (
        <View key={`${m}-${i}`} style={styles.matRow}>
          <View style={styles.matBadge}>
            <Text style={styles.matBadgeText}>{i + 1}</Text>
          </View>
          <Text style={styles.matText}>{m}</Text>
        </View>
      ))}
    </View>
  );
}

function NumberedSteps({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={styles.stepList}>
      {items.map((step, i) => (
        <View key={`${step}-${i}`} style={styles.stepRow}>
          <View style={[styles.stepBadge, { backgroundColor: color }]}>
            <Text style={styles.stepBadgeText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const STUDENT_SECTIONS: SectionDef[] = [
  {
    num: 2,
    title: 'Subtopic link and prior knowledge required',
    icon: 'book-outline',
    stripe: '#7dd3fc',
    hasContent: (a) => !!a.subtopicLink,
    render: (a) => <Text style={styles.preWrap}>{a.subtopicLink}</Text>,
  },
  {
    num: 3,
    title: "Learning Objectives - Bloom's Taxonomy Aligned",
    icon: 'radio-button-on-outline',
    stripe: '#c4b5fd',
    hasContent: (a) => a.learningObjectives.length > 0,
    render: (a) => <CheckList items={a.learningObjectives} />,
  },
  {
    num: 6,
    title: 'Step-by-step Student Procedure',
    icon: 'list-outline',
    stripe: '#6ee7b7',
    hasContent: (a) => a.steps.length > 0,
    render: (a) => <NumberedSteps items={a.steps} color="#d1fae5" />,
  },
];

function StudentActivityCard({ activity }: { activity: NormalizedActivity }) {
  return (
    <View style={styles.activityBody}>
      <View style={[styles.heroCard, styles.heroCardStudent]}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIconWrap, styles.heroIconWrapStudent]}>
            <Ionicons name="flask-outline" size={28} color="#ea580c" />
          </View>
          <View style={styles.heroContent}>
            <Text style={[styles.heroEyebrow, styles.heroEyebrowStudent]}>Project / Activity Title</Text>
            <Text style={styles.heroTitle}>{activity.title}</Text>
          </View>
        </View>
      </View>
      {STUDENT_SECTIONS.filter((s) => s.hasContent(activity)).map((sec, index) => (
        <SectionCard
          key={sec.num}
          sectionNum={`Section ${sec.num}`}
          title={sec.title}
          icon={sec.icon}
          stripe={sec.stripe}
          themeIndex={index}
        >
          {sec.render(activity)}
        </SectionCard>
      ))}
    </View>
  );
}

function TeacherActivityCard({ activity }: { activity: NormalizedActivity }) {
  return (
    <View style={styles.activityBody}>
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="flask-outline" size={28} color="#4f46e5" />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Title of activity / project</Text>
            <Text style={styles.heroTitle}>{activity.title}</Text>
          </View>
        </View>
      </View>

      {TEACHER_SECTIONS.filter((sec) => sec.hasContent(activity)).map((sec, index) => (
        <SectionCard
          key={sec.num}
          sectionNum={`Section ${sec.num}`}
          title={sec.title}
          icon={sec.icon}
          stripe={sec.stripe}
          themeIndex={index}
        >
          {sec.render(activity)}
        </SectionCard>
      ))}
    </View>
  );
}

function activitiesFromRaw(rawContent: unknown): ParsedActivity[] | undefined {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities as ParsedActivity[];
  return undefined;
}

export default function ActivityProjectViewer({ content, rawContent, variant = 'teacher' }: Props) {
  const parsedContent = useMemo(() => stripStructuredAiToolMetadata(String(content || '')), [content]);
  const mode = variant === 'student' ? 'student' : 'teacher';

  const resolved = useMemo(() => {
    const rows = resolveActivitiesFromPayload(activitiesFromRaw(rawContent), parsedContent).filter((row) =>
      mode === 'student' ? studentActivitySectionsComplete(row) : teacherActivitySectionsComplete(row),
    );
    return rows.map((a, i) => normalizeActivity(a, i, mode));
  }, [parsedContent, rawContent, mode]);

  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(activeIdx, Math.max(0, resolved.length - 1));
  const current = resolved[safeIdx];

  if (!resolved.length) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="flask-outline" size={40} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Complete activity content is not available</Text>
        <Text style={styles.emptyHint}>
          All template sections must be filled. Try generating again or ask Super Admin to add full content.
        </Text>
      </View>
    );
  }

  const isTeacher = mode === 'teacher';

  return (
    <View style={[styles.shell, isTeacher ? styles.shellTeacher : styles.shellStudent]}>
      <View style={[styles.shellHeader, isTeacher ? styles.shellHeaderTeacher : styles.shellHeaderStudent]}>
        <View style={styles.shellHeaderIcon}>
          <Ionicons name="flask-outline" size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.shellEyebrow}>
            {isTeacher ? 'Activity & Project Generator' : 'Lab journal'}
          </Text>
          <Text style={styles.shellTitle}>{isTeacher ? 'Teacher lesson kit' : 'Project Idea Lab'}</Text>
        </View>
      </View>

      {resolved.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
          {resolved.map((act, idx) => (
            <Pressable
              key={act.sl}
              onPress={() => setActiveIdx(idx)}
              style={[styles.tab, idx === safeIdx && styles.tabActive]}
            >
              <Text style={[styles.tabText, idx === safeIdx && styles.tabTextActive]} numberOfLines={1}>
                {act.title?.trim() ? act.title.slice(0, 28) : 'Activity'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView style={styles.scrollBody} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {isTeacher ? <TeacherActivityCard activity={current} /> : <StudentActivityCard activity={current} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  shellTeacher: { borderColor: '#c7d2fe' },
  shellStudent: { borderColor: '#fed7aa' },
  shellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  shellHeaderTeacher: { backgroundColor: '#eef2ff', borderBottomWidth: 1, borderBottomColor: '#c7d2fe' },
  shellHeaderStudent: { backgroundColor: '#fff7ed', borderBottomWidth: 1, borderBottomColor: '#fed7aa' },
  shellHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#64748b',
  },
  shellTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  tabScroll: { maxHeight: 44, backgroundColor: '#eef2ff' },
  tabRow: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79,70,229,0.12)',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#4f46e5', maxWidth: 140 },
  tabTextActive: { color: '#312e81' },
  scrollBody: { maxHeight: 720 },
  activityBody: { padding: 10, gap: 10 },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#6366f1',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroCardStudent: { borderColor: '#fed7aa', shadowColor: '#f97316' },
  heroRow: { flexDirection: 'row', gap: 14 },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconWrapStudent: { backgroundColor: '#ffedd5' },
  heroContent: { flex: 1 },
  sectionsBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  sectionsBadgeText: { fontSize: 10, fontWeight: '700', color: '#4338ca' },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#4f46e5',
    marginBottom: 4,
  },
  heroEyebrowStudent: { color: '#ea580c' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  progressWrap: { marginTop: 14 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#e0e7ff', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#a5b4fc' },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionNum: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  sectionBody: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6 },
  preWrap: { fontSize: 14, lineHeight: 22, color: '#334155' },
  checkList: { gap: 8 },
  checkRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  checkIcon: { marginTop: 2 },
  checkText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#334155' },
  bulletList: { gap: 6 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { color: '#64748b', fontSize: 14, marginTop: 2 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#334155' },
  matList: { gap: 8 },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  matBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matBadgeText: { fontSize: 11, fontWeight: '800', color: '#92400e' },
  matText: { flex: 1, fontSize: 14, color: '#334155' },
  stepList: { gap: 10 },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 22, color: '#334155', paddingTop: 4 },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  emptyTitle: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#334155' },
  emptyHint: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'center' },
  emptySectionHint: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#a8a29e',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
