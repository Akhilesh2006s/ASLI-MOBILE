import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';

type TopicRow = {
  _id: string;
  board?: string;
  classLabel?: string;
  subject?: string;
  label?: string;
  topicName?: string;
  subTopic?: string;
};

export default function AiToolTopicsView() {
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get('/api/super-admin/ai-tool-topics');
      const data = response?.data;
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.topics)
          ? data.topics
          : Array.isArray(data)
            ? data
            : [];
      setRows(list);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load AI tool topics.');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      [row.topicName, row.subTopic, row.subject, row.classLabel, row.label, row.board]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const handleDelete = (row: TopicRow) => {
    Alert.alert('Delete topic', 'Remove this AI tool topic?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/super-admin/ai-tool-topics/${row._id}`);
            fetchTopics();
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage || 'Delete failed.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Tool Topics</Text>
        <Text style={styles.headerSubtitle}>Manage curriculum topics for AI tool generation</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search topics..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading ? (
        <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ellipse-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No topics found</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {filtered.map((row) => (
            <View key={row._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="ellipse-outline" size={22} color="#f97316" />
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {row.topicName || row.label || 'Untitled topic'}
                </Text>
              </View>
              {row.subTopic ? (
                <Text style={styles.cardLine} numberOfLines={2}>
                  Sub-topic: {row.subTopic}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                {row.classLabel ? <Text style={styles.metaChip}>{row.classLabel}</Text> : null}
                {row.subject ? <Text style={styles.metaChip}>{row.subject}</Text> : null}
                {row.board ? <Text style={styles.metaChip}>{row.board}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <Text style={styles.deleteBtn} onPress={() => handleDelete(row)}>
                  Delete
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  errorText: { color: '#dc2626', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  cardLine: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardActions: { marginTop: 10, alignItems: 'flex-end' },
  deleteBtn: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 16 },
});
