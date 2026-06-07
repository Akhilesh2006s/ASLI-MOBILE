import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getSubjectName } from '../../../../src/lib/todays-tasks-helpers';

type Props = {
  allContent: any[];
  homeworkSubmissions: any[];
  isLoading?: boolean;
};

function MyHomeworkSectionComponent({ allContent, homeworkSubmissions, isLoading }: Props) {
  const assignedHomework = useMemo(() => {
    return allContent
      .filter((c) => String(c.type || '').toLowerCase() === 'homework')
      .sort((a, b) => {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : 0;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : 0;
        return aTime - bTime;
      });
  }, [allContent]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, any>();
    homeworkSubmissions.forEach((sub) => {
      const homeworkId =
        typeof sub.homeworkId === 'object' ? sub.homeworkId?._id : sub.homeworkId || sub.homework?._id;
      if (homeworkId) map.set(String(homeworkId), sub);
    });
    return map;
  }, [homeworkSubmissions]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <LinearGradient colors={['#f97316', '#fb923c']} style={styles.icon}>
          <Ionicons name="document-text" size={20} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>My Homework</Text>
      </View>

      {isLoading && assignedHomework.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.loadingText}>Loading homework...</Text>
        </View>
      ) : assignedHomework.length === 0 ? (
        <Text style={styles.empty}>No assigned homework right now.</Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Assigned Homework ({assignedHomework.length})</Text>
          {assignedHomework.slice(0, 10).map((homework) => {
            const id = String(homework._id || homework.id);
            const submitted = submissionMap.has(id);
            return (
              <View
                key={id}
                style={[styles.row, submitted ? styles.rowSubmitted : styles.rowPending]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.hwTitle} numberOfLines={2}>
                    {homework.title || 'Untitled Homework'}
                  </Text>
                  <Text style={styles.hwMeta} numberOfLines={1}>
                    {getSubjectName(homework)}
                    {homework.deadline
                      ? ` · Due ${new Date(homework.deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`
                      : ''}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <View style={[styles.statusBadge, submitted ? styles.statusDone : styles.statusPending]}>
                    <Text style={[styles.statusText, submitted ? styles.statusTextDone : styles.statusTextPending]}>
                      {submitted ? 'Submitted' : 'Pending'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => router.push('/assignments')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>{submitted ? 'Update' : 'Submit'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { fontSize: 13, color: '#6b7280' },
  empty: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  rowPending: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  rowSubmitted: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  hwTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  hwMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusDone: { backgroundColor: '#d1fae5' },
  statusPending: { backgroundColor: '#ffedd5' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextDone: { color: '#047857' },
  statusTextPending: { color: '#c2410c' },
  submitBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  submitBtnText: { fontSize: 11, fontWeight: '700', color: '#374151' },
});

export default memo(MyHomeworkSectionComponent);
