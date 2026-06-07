import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuperAdminVidyaChatPanel from './SuperAdminVidyaChatPanel';
import api from '../../../src/services/api/api';

const VIDYA_PREFS_KEY = 'superAdminVidyaPrefs';

type ExplainDepth = 'concise' | 'balanced' | 'detailed';

type Props = {
  onOpenAnalytics?: () => void;
  onOpenSettings?: () => void;
};

const QUICK_ACTIONS = [
  {
    title: 'View AI Usage Reports',
    description: 'Review adoption and query patterns by school',
    icon: 'bar-chart-outline' as const,
    prompt: 'Show AI usage statistics across schools',
  },
  {
    title: 'Monitor Active Sessions',
    description: 'Track live AI conversations across organizations',
    icon: 'desktop-outline' as const,
    prompt: 'Monitor active AI sessions and highlight spikes',
  },
  {
    title: 'Configure AI Models',
    description: 'Tune model behavior and global response controls',
    icon: 'hardware-chip-outline' as const,
    prompt: 'Configure model behavior and recommended guardrails',
  },
  {
    title: 'Risk & Compliance Insights',
    description: 'Audit policy exceptions and moderation signals',
    icon: 'shield-checkmark-outline' as const,
    prompt: 'Detect anomalies in AI responses and compliance risks',
  },
];

function VidyaAnalyticsCard() {
  const [story, setStory] = useState<any>(null);
  const [safety, setSafety] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('/api/vidya/admin/usage-story', { params: { days: 7 } }).catch(() => null),
      api.get('/api/vidya/admin/safety-blocks', { params: { days: 7 } }).catch(() => null),
    ]).then(([storyRes, safetyRes]) => {
      if (!mounted) return;
      setStory(storyRes?.data);
      setSafety(safetyRes?.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!story?.success) return null;

  const pct = story.totals?.fromLibraryPct ?? 0;

  return (
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsTitle}>Vidya AI — Last 7 Days</Text>
      <Text style={styles.analyticsStory}>{story.story}</Text>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Answered from your library</Text>
        <Text style={styles.progressValue}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]} />
      </View>
      {Array.isArray(story.topUnservedTopics) && story.topUnservedTopics.length > 0 && (
        <View style={styles.gapBlock}>
          <Text style={styles.gapTitle}>Content gaps (falling to Gemini):</Text>
          {story.topUnservedTopics.slice(0, 5).map((t: any, i: number) => (
            <Text key={i} style={styles.gapItem}>
              • {t._id?.subject} — Class {t._id?.classLabel} ({t.count} queries)
            </Text>
          ))}
        </View>
      )}
      {safety?.success && safety.totals?.safetyBlocks > 0 && (
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>⚠️ {safety.alert}</Text>
        </View>
      )}
    </View>
  );
}

export default function VidyaAIView({ onOpenAnalytics, onOpenSettings }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>('balanced');
  const [depthPickerOpen, setDepthPickerOpen] = useState(false);
  const sendRef = useRef<((message: string) => void) | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(VIDYA_PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw) as { explainDepth?: ExplainDepth };
        if (p.explainDepth) setExplainDepth(p.explainDepth);
      })
      .catch(() => null);
  }, []);

  const handleRegisterSend = useCallback((send: (message: string) => void) => {
    sendRef.current = send;
  }, []);

  const runQuickAction = (prompt: string) => {
    sendRef.current?.(prompt);
  };

  const savePreferences = async () => {
    await AsyncStorage.setItem(
      VIDYA_PREFS_KEY,
      JSON.stringify({ explainDepth, updatedAt: Date.now() })
    );
    setSettingsOpen(false);
  };

  const depthLabel =
    explainDepth === 'concise'
      ? 'Concise — short answers'
      : explainDepth === 'detailed'
        ? 'Detailed — step-by-step'
        : 'Balanced — recommended';

  return (
    <View style={styles.root}>
      <ScrollView style={styles.topScroll} contentContainerStyle={styles.topContent}>
        <LinearGradient colors={['#fb923c', '#f97316']} style={styles.hero}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>System Control</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>AI System Assistant</Text>
          <Text style={styles.heroSub}>Manage and monitor AI across all schools</Text>
        </LinearGradient>

        <VidyaAnalyticsCard />

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.title}
              style={styles.quickCard}
              onPress={() => runQuickAction(action.prompt)}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name={action.icon} size={20} color="#ea580c" />
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickDesc}>{action.description}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.opsPanel}>
          <View style={styles.opsHeader}>
            <Ionicons name="grid-outline" size={18} color="#f97316" />
            <Text style={styles.opsTitle}>AI Operations Panel</Text>
          </View>
          <View style={styles.opsRow}>
            <Text style={styles.opsLabel}>AI STATUS</Text>
            <View style={styles.opsValueRow}>
              <Text style={styles.opsValue}>Inference Service</Text>
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineBadgeText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.opsRow}>
            <Text style={styles.opsLabel}>MODEL VERSION</Text>
            <View style={styles.opsValueRow}>
              <Text style={styles.opsValue}>Primary Model</Text>
              <Text style={styles.opsMeta}>v3.2.1</Text>
            </View>
          </View>
          <View style={styles.opsRow}>
            <Text style={styles.opsLabel}>ACTIVE REQUESTS</Text>
            <View style={styles.opsValueRow}>
              <Text style={styles.opsValue}>Current Queue</Text>
              <Text style={styles.opsQueue}>124</Text>
            </View>
          </View>
          <Pressable style={styles.opsButton} onPress={() => setSettingsOpen(true)}>
            <Text style={styles.opsButtonText}>Open System Controls</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.chatWrap}>
        <SuperAdminVidyaChatPanel onRegisterSend={handleRegisterSend} />
      </View>

      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Vidya AI settings</Text>
            <Text style={styles.modalDesc}>
              Model choice and API credentials are configured on the server. Set tutor display preferences here.
            </Text>
            <Text style={styles.formLabel}>Default explanation depth</Text>
            <Pressable style={styles.pickerField} onPress={() => setDepthPickerOpen(true)}>
              <Text style={styles.pickerValue}>{depthLabel}</Text>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </Pressable>
            <Text style={styles.formHint}>Stored locally on this device.</Text>
            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                setSettingsOpen(false);
                onOpenAnalytics?.();
              }}
            >
              <Text style={styles.linkBtnText}>Open AI Analytics</Text>
            </Pressable>
            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                setSettingsOpen(false);
                onOpenSettings?.();
              }}
            >
              <Text style={styles.linkBtnText}>Open system settings</Text>
            </Pressable>
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setSettingsOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={savePreferences}>
                <Text style={styles.saveBtnText}>Save preferences</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={depthPickerOpen} transparent animationType="slide" onRequestClose={() => setDepthPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Explanation depth</Text>
            {(['concise', 'balanced', 'detailed'] as ExplainDepth[]).map((depth) => (
              <Pressable
                key={depth}
                style={styles.depthItem}
                onPress={() => {
                  setExplainDepth(depth);
                  setDepthPickerOpen(false);
                }}
              >
                <Text style={styles.depthItemText}>
                  {depth === 'concise'
                    ? 'Concise — short answers'
                    : depth === 'detailed'
                      ? 'Detailed — step-by-step'
                      : 'Balanced — recommended'}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.cancelBtn} onPress={() => setDepthPickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: '#f9fafb' },
  topScroll: { flexGrow: 0, maxHeight: '46%' },
  topContent: { padding: 16, paddingBottom: 8, gap: 12 },
  hero: { borderRadius: 16, padding: 16 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemBadge: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  systemBadgeText: { color: '#ea580c', fontWeight: '700', fontSize: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  analyticsTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  analyticsStory: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  progressLabel: { fontSize: 11, color: '#6b7280' },
  progressValue: { fontSize: 11, color: '#6b7280' },
  progressTrack: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 999, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#0ea5e9', borderRadius: 999 },
  gapBlock: { marginTop: 10 },
  gapTitle: { fontSize: 11, fontWeight: '600', color: '#b45309' },
  gapItem: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  safetyBox: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10 },
  safetyText: { fontSize: 11, color: '#b91c1c' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  quickDesc: { fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 15 },
  opsPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  opsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  opsTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  opsRow: { marginBottom: 10 },
  opsLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  opsValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  opsValue: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  opsMeta: { fontSize: 13, color: '#64748b' },
  opsQueue: { fontSize: 13, fontWeight: '700', color: '#ea580c' },
  onlineBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  onlineBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  opsButton: {
    marginTop: 6,
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  opsButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chatWrap: { flex: 1, minHeight: 280, paddingHorizontal: 16, paddingBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalDesc: { fontSize: 13, color: '#6b7280', marginTop: 8, marginBottom: 16, lineHeight: 18 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  pickerField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, backgroundColor: '#f9fafb' },
  pickerValue: { fontSize: 14, color: '#111827', flex: 1 },
  formHint: { fontSize: 11, color: '#9ca3af', marginTop: 6, marginBottom: 12 },
  linkBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelBtnText: { fontWeight: '600', color: '#374151' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f97316', alignItems: 'center' },
  saveBtnText: { fontWeight: '700', color: '#fff' },
  depthItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  depthItemText: { fontSize: 15, color: '#111827' },
});
