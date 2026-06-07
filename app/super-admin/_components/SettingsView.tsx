import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCurrentUser } from '../../../src/lib/vidya-admin';
import type { SuperAdminView } from './SuperAdminNavDrawer';

const VIDYA_PREFS_KEY = 'superAdminVidyaPrefs';

type ExplainDepth = 'concise' | 'balanced' | 'detailed';

type SettingsViewProps = {
  onNavigate: (view: SuperAdminView) => void;
  onLogout: () => void;
};

const QUICK_LINKS: { view: SuperAdminView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { view: 'vidya-ai', label: 'Vidya AI preferences', icon: 'sparkles-outline' },
  { view: 'calendar', label: 'School Calendar', icon: 'calendar-outline' },
  { view: 'exams', label: 'Exam Management', icon: 'document-text-outline' },
  { view: 'admins', label: 'School Management', icon: 'shield-outline' },
  { view: 'subjects-and-content', label: 'Subject & Content', icon: 'list-outline' },
  { view: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { view: 'subscriptions', label: 'Subscriptions', icon: 'card-outline' },
];

const DEPTH_OPTIONS: { value: ExplainDepth; label: string }[] = [
  { value: 'concise', label: 'Concise — short answers' },
  { value: 'balanced', label: 'Balanced — recommended' },
  { value: 'detailed', label: 'Detailed — step-by-step' },
];

export default function SettingsView({ onNavigate, onLogout }: SettingsViewProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ fullName?: string; email?: string; role?: string } | null>(
    null
  );
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>('balanced');
  const [depthPickerOpen, setDepthPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [user, prefsRaw] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        AsyncStorage.getItem(VIDYA_PREFS_KEY),
      ]);
      setProfile(user);
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw) as { explainDepth?: ExplainDepth };
        if (prefs.explainDepth) setExplainDepth(prefs.explainDepth);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveVidyaPrefs = async () => {
    await AsyncStorage.setItem(
      VIDYA_PREFS_KEY,
      JSON.stringify({ explainDepth, updatedAt: Date.now() })
    );
    Alert.alert('Saved', 'Vidya AI display preferences saved on this device.');
  };

  const depthLabel = DEPTH_OPTIONS.find((o) => o.value === explainDepth)?.label || 'Balanced';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Settings</Text>
        <Text style={styles.headerSubtitle}>
          Shortcuts to main modules. Secrets and database URLs are set on the server, not here.
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={22} color="#f97316" />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{profile?.fullName || profile?.email || 'Super Admin'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || '—'}</Text>
          {profile?.role ? <Text style={styles.profileRole}>{profile.role}</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vidya AI preferences</Text>
        <Text style={styles.sectionHint}>
          Model choice and API credentials are configured on the server. Set tutor display preferences here.
        </Text>
        <Pressable style={styles.pickerRow} onPress={() => setDepthPickerOpen(true)}>
          <Text style={styles.pickerLabel}>Default explanation depth</Text>
          <Text style={styles.pickerValue}>{depthLabel}</Text>
        </Pressable>
        <TouchableOpacity style={styles.saveButton} onPress={saveVidyaPrefs}>
          <Text style={styles.saveButtonText}>Save preferences</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick links</Text>
        <View style={styles.linksGrid}>
          {QUICK_LINKS.map((link) => (
            <TouchableOpacity
              key={link.view}
              style={styles.linkButton}
              onPress={() => onNavigate(link.view)}
            >
              <Ionicons name={link.icon} size={18} color="#374151" />
              <Text style={styles.linkButtonText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.envNote}>
        To change AI provider keys, JWT secrets, or database URLs, update the backend .env and redeploy.
      </Text>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Modal visible={depthPickerOpen} transparent animationType="slide" onRequestClose={() => setDepthPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Explanation depth</Text>
            {DEPTH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.modalItem}
                onPress={() => {
                  setExplainDepth(opt.value);
                  setDepthPickerOpen(false);
                }}
              >
                <Text style={styles.modalItemText}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalClose} onPress={() => setDepthPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profileRole: { fontSize: 11, color: '#f97316', fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sectionHint: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  pickerValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#fb923c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  linksGrid: { gap: 8 },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkButtonText: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 },
  envNote: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 15, color: '#111827' },
  modalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
