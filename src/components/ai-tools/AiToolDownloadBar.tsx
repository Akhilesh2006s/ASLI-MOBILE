import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  exportTeacherToolCsvDownload,
  exportTeacherToolDocument,
  isTeacherDownloadTool,
} from '../../lib/ai-tool-teacher-export';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../theme/teacher';

type Props = {
  toolType: string;
  toolLabel: string;
  content: string;
  rawContent: unknown;
  accent?: string;
};

export default function AiToolDownloadBar({ toolType, toolLabel, content, rawContent, accent = TEACHER.primary }: Props) {
  const [busy, setBusy] = useState<'csv' | 'doc' | null>(null);

  if (!isTeacherDownloadTool(toolType) || !content.trim()) return null;

  const run = async (kind: 'csv' | 'doc', fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (error) {
      console.error('Teacher tool export failed:', error);
      Alert.alert('Download failed', 'Could not export this content. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Download generated content</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, { borderColor: `${accent}55` }]}
          onPress={() =>
            run('doc', () => exportTeacherToolDocument(toolType, toolLabel, content, rawContent))
          }
          disabled={!!busy}
        >
          {busy === 'doc' ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name="document-text-outline" size={18} color={accent} />
          )}
          <Text style={[styles.btnText, { color: accent }]}>PDF / Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { borderColor: `${accent}55` }]}
          onPress={() =>
            run('csv', () => exportTeacherToolCsvDownload(toolType, toolLabel, content, rawContent))
          }
          disabled={!!busy}
        >
          {busy === 'csv' ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name="grid-outline" size={18} color={accent} />
          )}
          <Text style={[styles.btnText, { color: accent }]}>CSV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: TEACHER_SPACING.md,
    padding: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  label: {
    fontSize: TEACHER_TYPO.caption,
    fontWeight: '700',
    color: '#475569',
    marginBottom: TEACHER_SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    gap: TEACHER_SPACING.sm,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  btnText: {
    fontSize: TEACHER_TYPO.bodySm,
    fontWeight: '700',
  },
});
