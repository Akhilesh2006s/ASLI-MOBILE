import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../../src/services/api/api';
import { LoadingState, EmptyState } from '../../../src/components/ui';
import AdminModalShell from '../_ui/AdminModalShell';
import AdminScalePressable from '../_ui/AdminScalePressable';
import { useAdminTheme } from '../_ui/useAdminTheme';

type Batch = {
  _id: string;
  testTitle: string;
  testNo?: string;
  rowCount: number;
  assignedCount: number;
};

type Row = {
  _id: string;
  candidateId: string;
  percentage: number;
  finalRank?: number | null;
  userId?: string | null;
  student?: { fullName?: string; classNumber?: string; section?: string } | null;
};

type Student = { _id: string; fullName: string; email?: string; classNumber?: string; section?: string };

export default function OmrResultsView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBatches = useCallback(async () => {
    const res = await api.get('/api/admin/omr-results/batches');
    const list = Array.isArray(res?.data?.data) ? res.data.data : [];
    setBatches(list);
  }, []);

  const loadStudents = useCallback(async () => {
    const res = await api.get('/api/admin/students');
    const raw = res?.data?.data || res?.data?.students || res?.data || [];
    setStudents(
      (Array.isArray(raw) ? raw : []).map((s: any) => ({
        _id: String(s._id || s.id),
        fullName: s.fullName || s.name || '',
        email: s.email || '',
        classNumber: s.classNumber || '',
        section: s.section || '',
      })),
    );
  }, []);

  const loadBatch = useCallback(async (id: string) => {
    const res = await api.get(`/api/admin/omr-results/batches/${id}`);
    setRows(Array.isArray(res?.data?.data?.rows) ? res.data.data.rows : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBatches(), loadStudents()])
      .catch(() => Alert.alert('Results', 'Could not load OMR batches.'))
      .finally(() => setLoading(false));
  }, [loadBatches, loadStudents]);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    loadBatch(selectedId).catch(() => Alert.alert('Results', 'Could not load batch.'));
  }, [selectedId, loadBatch]);

  const unassigned = useMemo(() => rows.filter((r) => !r.userId).length, [rows]);

  const pickAndUpload = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setUploading(true);
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.name || 'scores.csv',
        type: asset.mimeType || 'text/csv',
      } as any);
      const res = await api.post('/api/admin/omr-results/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const batchId = res?.data?.data?.batch?._id;
      Alert.alert('Imported', res?.data?.message || 'OMR scores uploaded');
      await loadBatches();
      if (batchId) setSelectedId(batchId);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message || e?.message || 'Try again');
    } finally {
      setUploading(false);
    }
  };

  const assignStudent = async (userId: string) => {
    if (!selectedId || !activeRow) return;
    setSaving(true);
    try {
      await api.post(`/api/admin/omr-results/batches/${selectedId}/assign`, {
        assignments: [{ rowId: activeRow._id, userId }],
      });
      setAssignOpen(false);
      setActiveRow(null);
      await Promise.all([loadBatches(), loadBatch(selectedId)]);
    } catch (e: any) {
      Alert.alert('Assign failed', e?.response?.data?.message || e?.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading OMR results…" />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { paddingHorizontal: spacing.md }]}>
        <AdminScalePressable
          onPress={pickAndUpload}
          disabled={uploading}
          style={[styles.uploadBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.uploadText}>{uploading ? 'Uploading…' : 'Upload OMR CSV'}</Text>
        </AdminScalePressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12, paddingBottom: 40 }}>
        <Text style={[styles.section, { color: colors.text }]}>Uploaded tests</Text>
        {batches.length === 0 ? (
          <EmptyState title="No OMR uploads" description="Upload a Score List CSV from OMR scanning." />
        ) : (
          batches.map((b) => {
            const active = selectedId === b._id;
            const left = Math.max(0, (b.rowCount || 0) - (b.assignedCount || 0));
            return (
              <Pressable
                key={b._id}
                onPress={() => setSelectedId(b._id)}
                style={[
                  styles.batchCard,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <Text style={[styles.batchTitle, { color: colors.text }]} numberOfLines={2}>
                  {b.testTitle}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  #{b.testNo || '—'} · {b.rowCount} rows · {left} unassigned
                </Text>
              </Pressable>
            );
          })
        )}

        {selectedId ? (
          <>
            <Text style={[styles.section, { color: colors.text, marginTop: 8 }]}>
              Candidates ({unassigned} unassigned)
            </Text>
            {rows.map((r) => (
              <Pressable
                key={r._id}
                onPress={() => {
                  setActiveRow(r);
                  setAssignOpen(true);
                }}
                style={[
                  styles.rowCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{r.candidateId}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {r.student?.fullName
                      ? `${r.student.fullName}${r.student.classNumber ? ` · ${r.student.classNumber}${r.student.section || ''}` : ''}`
                      : 'Tap to assign student'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: colors.primary }}>{r.percentage}%</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Rank {r.finalRank ?? '—'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>

      <AdminModalShell
        visible={assignOpen}
        title={`Assign ${activeRow?.candidateId || ''}`}
        onClose={() => {
          setAssignOpen(false);
          setActiveRow(null);
        }}
      >
        <ScrollView style={{ maxHeight: 360 }}>
          {students.map((s) => (
            <Pressable
              key={s._id}
              disabled={saving}
              onPress={() => void assignStudent(s._id)}
              style={[styles.studentRow, { borderBottomColor: colors.border }]}
            >
              <Text style={{ fontWeight: '600', color: colors.text }}>{s.fullName || s.email}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {s.classNumber ? `${s.classNumber}${s.section || ''}` : s.email}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </AdminModalShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { paddingTop: 8, paddingBottom: 4 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  uploadText: { color: '#fff', fontWeight: '700' },
  section: { fontSize: 14, fontWeight: '800' },
  batchCard: { borderWidth: 1, padding: 12 },
  batchTitle: { fontSize: 14, fontWeight: '700' },
  rowCard: {
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
