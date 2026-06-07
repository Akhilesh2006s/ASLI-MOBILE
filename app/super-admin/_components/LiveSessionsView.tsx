import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLiveSessions, streamAction, type LiveSession } from '../../../src/lib/live-sessions';

export default function LiveSessionsView() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      setSessions(await fetchLiveSessions());
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) => {
      const subjectName = typeof s.subject === 'string' ? s.subject : s.subject?.name || '';
      return s.title?.toLowerCase().includes(q) || subjectName.toLowerCase().includes(q);
    });
  }, [query, sessions]);

  const callAction = async (id: string, action: 'start' | 'end') => {
    try {
      await streamAction(id, action);
      load(true);
    } catch (error) {
      console.error(`Failed to ${action} stream:`, error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Live Sessions</Text>
        <Text style={styles.subtitle}>Start, monitor and end live classes</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by session or subject"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoading && !sessions.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="videocam-outline" size={52} color="#d1d5db" />
          <Text style={styles.empty}>No live sessions found</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((session) => {
            const subjectName =
              typeof session.subject === 'string' ? session.subject : session.subject?.name || 'General';
            const status = session.status || 'scheduled';
            return (
              <View key={session._id} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{session.title}</Text>
                    <Text style={styles.cardMeta}>{subjectName}</Text>
                    {session.scheduledAt ? (
                      <Text style={styles.cardMeta}>{new Date(session.scheduledAt).toLocaleString()}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.badge,
                      status === 'live' ? styles.live : status === 'ended' ? styles.ended : styles.scheduled,
                    ]}
                  >
                    <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => callAction(session._id, 'start')}>
                    <Ionicons name="play" size={14} color="#111827" />
                    <Text style={styles.actionTxt}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => callAction(session._id, 'end')}>
                    <Ionicons name="stop" size={14} color="#111827" />
                    <Text style={styles.actionTxt}>End</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  search: { flex: 1, paddingVertical: 10, marginLeft: 8, color: '#111827' },
  center: { alignItems: 'center', padding: 32, gap: 8 },
  empty: { color: '#9ca3af', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', gap: 8 },
  cardTitle: { fontWeight: '700', color: '#111827' },
  cardMeta: { color: '#6b7280', marginTop: 2, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  live: { backgroundColor: '#dcfce7' },
  ended: { backgroundColor: '#e5e7eb' },
  scheduled: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#111827' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionTxt: { fontSize: 12, fontWeight: '600', color: '#111827' },
});
