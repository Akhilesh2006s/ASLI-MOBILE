import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AiToolWebView from './AiToolWebView';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveStudyGuideFromPayload,
  studyGuideViewerPayloadFromRecord,
  getMissingStudyGuideSections,
  isStudyGuideComplete,
  studyGuideHasVisibleBody,
  type StudyGuideContent,
  type StudyGuidePracticeQuestion,
} from '../../lib/parse-smart-study-guide';

type Props = {
  content: string;
  rawContent?: unknown;
};

function BulletList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <View style={styles.bulletList}>
      {items.map((line, i) => (
        <View key={`${line}-${i}`} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color }]}>•</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function RichTextBlock({ text }: { text: string }) {
  if (!text.trim()) return null;
  return <Text style={styles.bodyText}>{text}</Text>;
}

function PracticeQuestionCard({ q, index }: { q: StudyGuidePracticeQuestion; index: number }) {
  const isMcq = q.type === 'objective' && q.options.length >= 2;
  return (
    <View style={styles.practiceCard}>
      <View style={styles.practiceHeader}>
        <View style={styles.practiceBadge}>
          <Text style={styles.practiceBadgeText}>Q{index + 1}</Text>
        </View>
        <View style={[styles.typeBadge, isMcq ? styles.typeBadgeMcq : styles.typeBadgeSubjective]}>
          <Text style={[styles.typeBadgeText, isMcq ? styles.typeBadgeTextMcq : styles.typeBadgeTextSubjective]}>
            {isMcq ? 'MCQ' : 'Subjective'}
          </Text>
        </View>
      </View>
      <Text style={styles.practiceQuestion}>{q.question}</Text>
      {isMcq ? (
        <View style={styles.optionsGrid}>
          {q.options.map((opt, i) => {
            const label = opt.match(/^([A-D])\)/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + i);
            const text = opt.replace(/^[A-D]\)\s*/i, '').trim();
            return (
              <View key={`${opt}-${i}`} style={styles.optionRow}>
                <View style={styles.optionLabel}>
                  <Text style={styles.optionLabelText}>{label}</Text>
                </View>
                <Text style={styles.optionText}>{text}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {q.answer ? (
        <View style={styles.answerBox}>
          <Text style={styles.answerText}>
            <Text style={styles.answerLabel}>Answer: </Text>
            {q.answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function GuideSectionCard({
  sectionNum,
  title,
  icon,
  stripe,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={[styles.sectionCardHeader, { borderLeftColor: stripe }]}>
        <View style={[styles.sectionIconWrap, { backgroundColor: `${stripe}18` }]}>
          <Ionicons name={icon} size={14} color={stripe} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionNumLabel}>{sectionNum}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function buildBodySections(guide: StudyGuideContent) {
  const sections: ReactNode[] = [];

  if (guide.chapterOverview.trim()) {
    sections.push(
      <GuideSectionCard key="2" sectionNum="Section 2" title="Chapter and Subtopic Overview" icon="book-outline" stripe="#2563eb">
        <RichTextBlock text={guide.chapterOverview} />
      </GuideSectionCard>
    );
  }
  if (guide.learningObjectives.length > 0) {
    sections.push(
      <GuideSectionCard key="3" sectionNum="Section 3" title="Learning Objectives" icon="flag-outline" stripe="#7c3aed">
        <BulletList items={guide.learningObjectives} color="#7c3aed" />
      </GuideSectionCard>
    );
  }
  if (guide.priorKnowledge.length > 0) {
    sections.push(
      <GuideSectionCard key="4" sectionNum="Section 4" title="Prior Knowledge Required" icon="school-outline" stripe="#0891b2">
        <BulletList items={guide.priorKnowledge} color="#0891b2" />
      </GuideSectionCard>
    );
  }
  if (guide.keyConcepts.length > 0) {
    sections.push(
      <GuideSectionCard key="5" sectionNum="Section 5" title="Key Concepts Explained" icon="bulb-outline" stripe="#4f46e5">
        <View style={styles.conceptList}>
          {guide.keyConcepts.map((c, i) => (
            <View key={`${c.name}-${i}`} style={styles.conceptCard}>
              <Text style={styles.conceptName}>{c.name}</Text>
              <Text style={styles.conceptExplanation}>{c.explanation}</Text>
            </View>
          ))}
        </View>
      </GuideSectionCard>
    );
  }
  if (guide.definitions.length > 0 || guide.formulae.length > 0) {
    sections.push(
      <GuideSectionCard key="6" sectionNum="Section 6" title="Important Definitions and Formulae" icon="calculator-outline" stripe="#d97706">
        {guide.definitions.map((d, i) => (
          <View key={`def-${i}`} style={styles.definitionRow}>
            <Text style={styles.definitionTerm}>{d.term}</Text>
            <Text style={styles.definitionText}>{d.definition}</Text>
          </View>
        ))}
        {guide.formulae.map((f, i) => (
          <View key={`fm-${i}`} style={styles.formulaRow}>
            <Text style={styles.formulaName}>{f.name}</Text>
            <Text style={styles.formulaText}>{f.formula}</Text>
            {f.note ? <Text style={styles.formulaNote}>{f.note}</Text> : null}
          </View>
        ))}
      </GuideSectionCard>
    );
  }
  if (guide.conceptFlow.trim()) {
    sections.push(
      <GuideSectionCard key="7" sectionNum="Section 7" title="Concept Flow / Mind Map" icon="git-network-outline" stripe="#0d9488">
        <RichTextBlock text={guide.conceptFlow} />
      </GuideSectionCard>
    );
  }
  if (guide.realLifeExamples.length > 0) {
    sections.push(
      <GuideSectionCard key="8" sectionNum="Section 8" title="Real-life Examples" icon="leaf-outline" stripe="#65a30d">
        <BulletList items={guide.realLifeExamples} color="#65a30d" />
      </GuideSectionCard>
    );
  }
  if (guide.quickRevisionNotes.length > 0) {
    sections.push(
      <GuideSectionCard key="9" sectionNum="Section 9" title="Quick Revision Notes" icon="flash-outline" stripe="#ea580c">
        <BulletList items={guide.quickRevisionNotes} color="#ea580c" />
      </GuideSectionCard>
    );
  }
  if (guide.practiceQuestions.length > 0) {
    sections.push(
      <GuideSectionCard key="10" sectionNum="Section 10" title="Practice Questions" icon="help-circle-outline" stripe="#4f46e5">
        <View style={styles.practiceList}>
          {guide.practiceQuestions.map((q, i) => (
            <PracticeQuestionCard key={`${q.question}-${i}`} q={q} index={i} />
          ))}
        </View>
      </GuideSectionCard>
    );
  }
  if (guide.improvementTips.length > 0) {
    sections.push(
      <GuideSectionCard key="11" sectionNum="Section 11" title="Tips for Further Improvement" icon="sparkles-outline" stripe="#c026d3">
        <BulletList items={guide.improvementTips} color="#c026d3" />
      </GuideSectionCard>
    );
  }

  return sections;
}

export default function SmartStudyGuideViewer({ content, rawContent }: Props) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return studyGuideViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { guide, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveStudyGuideFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <View style={styles.markdownWrap}>
        <AiToolWebView
          toolType="smart-study-guide-generator"
          content={markdownFallback}
          variant="student"
        />
      </View>
    );
  }

  const bodySections = buildBodySections(guide);
  const missingSections = getMissingStudyGuideSections(guide);
  const complete = isStudyGuideComplete(guide);
  const mcqCount = guide.practiceQuestions.filter((q) => q.type === 'objective' && q.options.length >= 2).length;

  if (!bodySections.length && !studyGuideHasVisibleBody(guide)) {
    return (
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Study guide incomplete</Text>
        <Text style={styles.warningText}>
          No study guide sections could be loaded. Ask your Super Admin to regenerate with all 11 sections filled.
          {missingSections.length > 0 ? ` Missing: ${missingSections.join(', ')}.` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!complete && missingSections.length > 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Some sections are incomplete</Text>
          <Text style={styles.warningText}>
            Showing available content below. Missing: {missingSections.join(', ')}.
          </Text>
        </View>
      ) : null}

      <View style={styles.guideShell}>
        <LinearGuideHeader
          title={guide.title}
          conceptCount={guide.keyConcepts.length}
          practiceCount={guide.practiceQuestions.length}
          mcqCount={mcqCount}
        />

        <View style={styles.guideBody}>
          <View style={styles.titleSection}>
            <Text style={styles.titleSectionNum}>Section 1</Text>
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>Study Guide Title</Text>
            </View>
            <Text style={styles.guideTitle}>{guide.title}</Text>
          </View>
          {bodySections}
        </View>
      </View>
    </View>
  );
}

function LinearGuideHeader({
  title,
  conceptCount,
  practiceCount,
  mcqCount,
}: {
  title: string;
  conceptCount: number;
  practiceCount: number;
  mcqCount: number;
}) {
  return (
    <View style={styles.heroHeader}>
      <View style={styles.heroIcon}>
        <Ionicons name="bookmark" size={20} color="#fff" />
      </View>
      <View style={styles.heroText}>
        <Text style={styles.heroEyebrow}>Smart Study Guide</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.heroBadges}>
          <Text style={styles.heroBadge}>{conceptCount} concepts</Text>
          <Text style={styles.heroBadge}>{practiceCount} practice Qs</Text>
          {mcqCount > 0 ? <Text style={styles.heroBadge}>{mcqCount} MCQs</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  markdownWrap: { borderRadius: 18, overflow: 'hidden' },
  warningBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 12,
  },
  warningTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  warningText: { marginTop: 4, fontSize: 13, lineHeight: 20, color: '#b45309' },
  guideShell: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#4338ca',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  heroTitle: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#fff' },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  guideBody: { padding: 10, gap: 8 },
  titleSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
    padding: 12,
  },
  titleSectionNum: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#4338ca',
  },
  titleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  titleBadgeText: { fontSize: 11, fontWeight: '700', color: '#312e81' },
  guideTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionNumLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: '#818cf8' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  sectionBody: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4 },
  bulletList: { gap: 8 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { marginTop: 2, fontSize: 14, fontWeight: '800' },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22, color: '#334155' },
  bodyText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  conceptList: { gap: 8 },
  conceptCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  conceptName: { fontSize: 14, fontWeight: '800', color: '#312e81' },
  conceptExplanation: { marginTop: 4, fontSize: 13, lineHeight: 20, color: '#475569' },
  definitionRow: { marginBottom: 8 },
  definitionTerm: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  definitionText: { marginTop: 2, fontSize: 13, lineHeight: 20, color: '#475569' },
  formulaRow: { marginBottom: 8 },
  formulaName: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  formulaText: { marginTop: 2, fontSize: 13, lineHeight: 20, color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  formulaNote: { marginTop: 2, fontSize: 12, color: '#64748b' },
  practiceList: { gap: 8 },
  practiceCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  practiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  practiceBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  practiceBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeMcq: { backgroundColor: '#ede9fe' },
  typeBadgeSubjective: { backgroundColor: '#e0f2fe' },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadgeTextMcq: { color: '#5b21b6' },
  typeBadgeTextSubjective: { color: '#0369a1' },
  practiceQuestion: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: '#0f172a' },
  optionsGrid: { marginTop: 8, gap: 6 },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  optionLabel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: { fontSize: 11, fontWeight: '800', color: '#312e81' },
  optionText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#475569', paddingTop: 2 },
  answerBox: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  answerText: { fontSize: 12, lineHeight: 18, color: '#065f46' },
  answerLabel: { fontWeight: '800' },
});
