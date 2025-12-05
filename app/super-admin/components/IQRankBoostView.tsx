import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface IQActivity {
  _id: string;
  title: string;
  description: string;
  type: 'iq-test' | 'rank-boost' | 'challenge' | 'quiz';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  points: number;
  duration: number;
  classNumber?: string;
  questions: number;
  isActive: boolean;
  participants?: number;
  averageScore?: number;
}

export default function IQRankBoostView() {
  const [activities, setActivities] = useState<IQActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/iq-rank-activities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data.data || []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    if (selectedClass !== null) {
      filtered = filtered.filter(a => a.classNumber === selectedClass.toString());
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [activities, selectedClass, searchQuery]);

  const classStats = useMemo(() => {
    const stats: Record<number, { total: number; active: number; questions: number; participants: number }> = {};
    for (let i = 1; i <= 10; i++) {
      const classActivities = activities.filter(a => a.classNumber === i.toString());
      stats[i] = {
        total: classActivities.length,
        active: classActivities.filter(a => a.isActive).length,
        questions: classActivities.reduce((sum, a) => sum + (a.questions || 0), 0),
        participants: classActivities.reduce((sum, a) => sum + (a.participants || 0), 0)
      };
    }
    return stats;
  }, [activities]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'iq-test': return 'brain';
      case 'rank-boost': return 'trophy';
      case 'challenge': return 'target';
      case 'quiz': return 'star';
      default: return 'star';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      case 'expert': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (selectedClass !== null) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedClass(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class {selectedClass} Activities</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search activities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Activities List */}
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No activities for this class</Text>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {filteredActivities.map((activity) => (
              <View key={activity._id} style={styles.activityCard}>
                <View style={styles.activityCardHeader}>
                  <View style={styles.activityCardHeaderLeft}>
                    <Ionicons name={getTypeIcon(activity.type)} size={24} color="#f97316" />
                    <View style={styles.activityCardInfo}>
                      <Text style={styles.activityCardTitle}>{activity.title}</Text>
                      <Text style={styles.activityCardDescription} numberOfLines={2}>
                        {activity.description}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.activityCardDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{activity.duration} min</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="help-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{activity.questions} questions</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="trophy-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{activity.points} points</Text>
                  </View>
                </View>
                <View style={styles.activityCardFooter}>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(activity.difficulty) + '20' }]}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(activity.difficulty) }]}>
                      {activity.difficulty.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, activity.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                    <Text style={styles.statusBadgeText}>
                      {activity.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>IQ/Rank Boost Activities</Text>
          <Text style={styles.headerSubtitle}>Manage IQ tests and rank boost activities by class</Text>
        </View>
      </View>

      {/* Class Cards Grid */}
      <View style={styles.classGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((classNum) => {
          const stats = classStats[classNum] || { total: 0, active: 0, questions: 0, participants: 0 };
          return (
            <TouchableOpacity
              key={classNum}
              style={styles.classCard}
              onPress={() => setSelectedClass(classNum)}
              activeOpacity={0.8}
            >
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
                  <Ionicons name="school" size={32} color="#fff" />
                </View>
                <View style={styles.classCardStats}>
                  <View style={styles.classStatItem}>
                    <Text style={styles.classStatValue}>{stats.total}</Text>
                    <Text style={styles.classStatLabel}>Activities</Text>
                  </View>
                  <View style={styles.classStatItem}>
                    <Text style={styles.classStatValue}>{stats.active}</Text>
                    <Text style={styles.classStatLabel}>Active</Text>
                  </View>
                </View>
                <View style={styles.classCardFooter}>
                  <Text style={styles.classCardFooterText}>
                    {stats.questions} questions • {stats.participants} participants
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  backButton: {
    marginBottom: 16,
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  classCard: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  classCardGradient: {
    padding: 16,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  classNumberBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classNumberText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3b82f6',
  },
  classCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  classStatItem: {
    flex: 1,
  },
  classStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  classStatLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  classCardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  classCardFooterText: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
  },
  activitiesList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activityCardHeader: {
    marginBottom: 12,
  },
  activityCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityCardInfo: {
    flex: 1,
  },
  activityCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  activityCardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  activityCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activityCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#10b981',
  },
  statusBadgeInactive: {
    backgroundColor: '#6b7280',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
});

