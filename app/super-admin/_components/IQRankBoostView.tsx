import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import IQRankBoostQuestionGenerator from './IQRankBoostQuestionGenerator';
import {
  type IQActivity,
  CLASS_NUMBERS,
  getClassStats,
  normalizeActivitiesResponse,
} from '../../../src/lib/iq-rank-boost';

export default function IQRankBoostView() {
  const [activities, setActivities] = useState<IQActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get('/api/super-admin/iq-rank-activities');
      setActivities(normalizeActivitiesResponse(response?.data));
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  if (selectedClass !== null) {
    return (
      <IQRankBoostQuestionGenerator
        classNumber={selectedClass}
        onBack={() => {
          setSelectedClass(null);
          fetchActivities();
        }}
      />
    );
  }

  return (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>IQ/Rank Boost Activities</Text>
        <Text style={styles.headerSubtitle}>Manage IQ tests and rank boost activities by class</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <View style={styles.classGrid}>
          {CLASS_NUMBERS.map((classNum) => {
            const stats = getClassStats(activities, classNum);
            return (
              <View key={classNum} style={styles.classCard}>
                <LinearGradient
                  colors={['#3b82f6', '#ec4899']}
                  style={styles.classCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.classCardHeader}>
                    <View style={styles.classNumberBadge}>
                      <Text style={styles.classNumberText}>{classNum}</Text>
                    </View>
                    <View>
                      <Text style={styles.classCardTitle}>Class {classNum}</Text>
                      <Text style={styles.classCardDesc}>IQ/Rank Activities</Text>
                    </View>
                  </View>

                  <View style={styles.statsList}>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Activities:</Text>
                      <View style={styles.statBadge}>
                        <Text style={styles.statBadgeText}>{stats.total}</Text>
                      </View>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Active:</Text>
                      <View style={styles.statBadge}>
                        <Text style={styles.statBadgeText}>{stats.active}</Text>
                      </View>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Questions:</Text>
                      <Text style={styles.statValue}>{stats.questions}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Participants:</Text>
                      <Text style={styles.statValue}>{stats.participants}</Text>
                    </View>
                  </View>

                  <Pressable style={styles.addQuestionsBtn} onPress={() => setSelectedClass(classNum)}>
                    <Ionicons name="add" size={18} color="#2563eb" />
                    <Text style={styles.addQuestionsText}>Add Questions</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#6b7280' },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  classGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  classCard: { width: '47%', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  classCardGradient: { padding: 14 },
  classCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  classNumberBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  classNumberText: { fontSize: 18, fontWeight: '800', color: '#3b82f6' },
  classCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  classCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  statsList: { gap: 8, marginBottom: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 13, color: '#fff' },
  statBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  statBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  addQuestionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12 },
  addQuestionsText: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
});
