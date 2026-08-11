import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api/api';
import { downloadWeeklyReportPdf } from '../../lib/weekly-report-pdf';
import GlassPanel from '../ui/GlassPanel';

type DigestMetrics = Record<string, any>;

type Digest = {
  title?: string;
  summary?: string;
  highlights?: string[];
  metrics?: DigestMetrics;
};

function n(v: unknown, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

function MetricTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={14} color="#0284C7" />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

export default function WeeklyDigestCard({
  apiBase = '/api/student',
}: {
  apiBase?: '/api/student' | '/api/teacher';
}) {
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const isStudent = apiBase === '/api/student';

  const load = useCallback(async (build = false) => {
    setLoading(true);
    try {
      const q = build ? '?build=1' : '';
      const { data } = await api.get(`${apiBase}/weekly-digest${q}`);
      setDigest(data?.data || null);
    } catch {
      setDigest(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load(isStudent);
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync('user');
        if (!raw) return;
        const user = JSON.parse(raw);
        setStudentName(String(user?.fullName || user?.name || '').trim());
        setSchoolName(String(user?.schoolName || user?.collegeName || user?.institutionName || '').trim());
      } catch {
        /* ignore */
      }
    })();
  }, [load, isStudent]);

  const m = digest?.metrics || {};
  const exams = Array.isArray(m.exams) ? m.exams : [];
  const omrResults = Array.isArray(m.omrResults) ? m.omrResults : [];

  const hasRichStudentMetrics = useMemo(() => {
    if (!isStudent || !digest?.metrics) return false;
    return (
      'loginCount' in digest.metrics ||
      'examAttempts' in digest.metrics ||
      'aiExplanations' in digest.metrics ||
      'topicsPractised' in digest.metrics
    );
  }, [digest, isStudent]);

  const handleDownload = async () => {
    if (!digest || downloading) return;
    setDownloading(true);
    try {
      await downloadWeeklyReportPdf({
        title: digest.title,
        summary: digest.summary,
        highlights: digest.highlights || [],
        studentName: studentName || undefined,
        schoolName: schoolName || undefined,
        metrics: (digest.metrics || {}) as Record<string, unknown>,
      });
    } catch (err) {
      console.error('Weekly PDF failed', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <GlassPanel tone="medium" elevated radius={18} style={styles.card} contentStyle={styles.cardInner}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text-outline" size={18} color="#0284C7" />
          <Text style={styles.headerTitle}>Weekly report</Text>
        </View>
        <View style={styles.headerActions}>
          {digest ? (
            <TouchableOpacity style={styles.downloadBtn} onPress={() => setPreviewOpen(true)}>
              <Ionicons name="download-outline" size={14} color="#0369A1" />
              <Text style={styles.downloadBtnText}>PDF</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => void load(true)} disabled={loading} hitSlop={8}>
            {loading ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <Ionicons name="refresh" size={18} color="#64748B" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading && !digest ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : !digest ? (
        <Text style={styles.muted}>
          Your weekly digest will appear here every Monday. Tap refresh to build one for this week.
        </Text>
      ) : hasRichStudentMetrics ? (
        <View style={styles.body}>
          <Text style={styles.title}>{digest.title}</Text>
          <Text style={styles.summary}>{digest.summary}</Text>

          <SectionTitle icon="log-in-outline" title="Adoption" />
          <View style={styles.grid}>
            <MetricTile label="Logins" value={n(m.loginCount)} hint="Days opened" />
            <MetricTile label="Last active" value={m.lastActiveDate || '—'} />
            <MetricTile label="Activation" value={m.activationDate || '—'} />
          </View>

          <SectionTitle icon="time-outline" title="Engagement" />
          <View style={styles.grid}>
            <MetricTile label="Sessions" value={n(m.sessions)} />
            <MetricTile label="Total time" value={m.totalTimeLabel || `${n(m.minutes)} min`} />
            <MetricTile
              label="Avg session"
              value={n(m.avgSessionMinutes) > 0 ? `${n(m.avgSessionMinutes)} min` : '—'}
            />
          </View>

          <SectionTitle icon="book-outline" title="Learning behaviour" />
          <View style={styles.grid}>
            <MetricTile label="Topics" value={n(m.topicsPractised)} />
            <MetricTile label="Repeated" value={n(m.topicsRepeated)} />
            <MetricTile label="Repeat %" value={`${n(m.repeatPracticePct)}%`} />
          </View>

          <SectionTitle icon="sparkles-outline" title="AI usage" />
          <View style={styles.grid}>
            <MetricTile
              label="AI uses"
              value={n(m.aiExplanations)}
              hint={`Vidya ${n(m.aiDoubts)} · Tools ${n(m.aiToolUses)}`}
            />
            <MetricTile label="Practice" value={n(m.practiceAttempts) + n(m.iqAttempts)} />
            <MetricTile
              label="Accuracy"
              value={n(m.practiceAttempts) > 0 ? `${n(m.practiceAccuracy)}%` : '—'}
            />
          </View>

          <SectionTitle icon="clipboard-outline" title="Exams" />
          <View style={styles.grid}>
            <MetricTile label="Written" value={n(m.examAttempts)} />
            <MetricTile label="Average" value={n(m.examAttempts) > 0 ? `${n(m.avgExamPct)}%` : '—'} />
            <MetricTile label="Best" value={n(m.examAttempts) > 0 ? `${n(m.bestExamPct)}%` : '—'} />
          </View>
          {exams.slice(0, 4).map((exam: any, idx: number) => (
            <View key={`${exam.title}-${idx}`} style={styles.listRow}>
              <Text style={styles.listTitle} numberOfLines={1}>{exam.title}</Text>
              <Text style={styles.listPct}>{n(exam.percentage)}%</Text>
            </View>
          ))}

          <SectionTitle icon="scan-outline" title="OMR results" />
          <View style={styles.grid}>
            <MetricTile label="OMR tests" value={n(m.omrAttempts)} />
            <MetricTile label="Average" value={n(m.omrAttempts) > 0 ? `${n(m.omrAvgPct)}%` : '—'} />
            <MetricTile label="Best" value={n(m.omrAttempts) > 0 ? `${n(m.omrBestPct)}%` : '—'} />
          </View>
          {omrResults.slice(0, 4).map((row: any, idx: number) => (
            <View key={`${row.title}-${idx}`} style={styles.listRow}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {row.title}
                {row.rank != null && Number(row.rank) > 0 ? ` · #${row.rank}` : ''}
              </Text>
              <Text style={styles.listPct}>{n(row.percentage)}%</Text>
            </View>
          ))}

          <SectionTitle icon="flame-outline" title="Content & progress" />
          <View style={styles.grid}>
            <MetricTile
              label="Top subjects"
              value={m.topSubjects?.length ? m.topSubjects.slice(0, 2).join(', ') : '—'}
            />
            <MetricTile label="Videos" value={n(m.videosWatched)} />
            <MetricTile label="Streak" value={n(m.streak) > 0 ? `${n(m.streak)}d` : '0'} />
            <MetricTile label="Mastery" value={`${n(m.masteryPct)}%`} />
            <MetricTile label="Homework" value={n(m.homeworkSubmissions)} />
            <MetricTile label="Chapters" value={n(m.chaptersCompleted)} />
          </View>

          {(digest.highlights || []).length > 0 ? (
            <View style={styles.highlights}>
              <Text style={styles.highlightsTitle}>This week at a glance</Text>
              {(digest.highlights || []).map((h) => (
                <Text key={h} style={styles.highlightItem}>• {h}</Text>
              ))}
            </View>
          ) : null}

          <TouchableOpacity style={styles.cta} onPress={() => setPreviewOpen(true)} activeOpacity={0.9}>
            <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.ctaGrad}>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Download PDF report</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.title}>{digest.title}</Text>
          <Text style={styles.summary}>{digest.summary}</Text>
          {(digest.highlights || []).map((h) => (
            <Text key={h} style={styles.highlightItem}>• {h}</Text>
          ))}
          <TouchableOpacity style={styles.cta} onPress={() => setPreviewOpen(true)} activeOpacity={0.9}>
            <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.ctaGrad}>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Download PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={previewOpen} animationType="slide" transparent onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#0EA5E9', '#0284C7', '#0F766E']} style={styles.modalHero}>
              <Text style={styles.modalBrand}>ASLILEARN · WEEKLY REPORT</Text>
              <Text style={styles.modalTitle}>{digest?.title || 'Weekly learning report'}</Text>
              <Text style={styles.modalSub}>{digest?.summary || 'Preview then share as PDF'}</Text>
            </LinearGradient>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 12 }}>
              <View style={styles.grid}>
                <MetricTile label="Logins" value={n(m.loginCount)} />
                <MetricTile label="Sessions" value={n(m.sessions)} />
                <MetricTile label="Exams" value={n(m.examAttempts)} />
                <MetricTile label="OMR" value={n(m.omrAttempts)} />
                <MetricTile label="AI uses" value={n(m.aiExplanations)} />
                <MetricTile label="Streak" value={n(m.streak) > 0 ? `${n(m.streak)}d` : '0'} />
              </View>
              {(digest?.highlights || []).slice(0, 4).map((h) => (
                <Text key={h} style={styles.highlightItem}>• {h}</Text>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable onPress={() => setPreviewOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
              <TouchableOpacity style={styles.modalDownload} onPress={() => void handleDownload()} disabled={downloading}>
                {downloading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={16} color="#fff" />
                    <Text style={styles.modalDownloadText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 4 },
  cardInner: { padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  downloadBtnText: { fontSize: 12, fontWeight: '700', color: '#0369A1' },
  muted: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  body: { gap: 8 },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  summary: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#475569',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tileLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  tileValue: { marginTop: 2, fontSize: 15, fontWeight: '800', color: '#0F172A' },
  tileHint: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  listTitle: { flex: 1, fontSize: 13, color: '#334155' },
  listPct: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  highlights: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    padding: 10,
    gap: 4,
  },
  highlightsTitle: { fontSize: 12, fontWeight: '800', color: '#0369A1', marginBottom: 2 },
  highlightItem: { fontSize: 13, color: '#334155', lineHeight: 18 },
  cta: { marginTop: 6, borderRadius: 12, overflow: 'hidden' },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  modalHero: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  modalBrand: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  modalSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  modalBody: { paddingHorizontal: 16, paddingTop: 14 },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  closeText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modalDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 140,
    justifyContent: 'center',
  },
  modalDownloadText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
