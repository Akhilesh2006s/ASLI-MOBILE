import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

export default function TeachersView() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const teachersData = Array.isArray(data) ? data : (data.data || data.teachers || []);
        const mappedTeachers = teachersData.map((teacher: any) => ({
          id: teacher._id || teacher.id,
          fullName: teacher.fullName || 'Unknown Teacher',
          email: teacher.email || '',
          phone: teacher.phone || '',
          department: teacher.department || '',
          isActive: teacher.isActive !== false,
          createdAt: teacher.createdAt || new Date().toISOString()
        }));
        setTeachers(mappedTeachers);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={32} color="#fb923c" />
          <View>
            <Text style={styles.headerTitle}>Teachers Management</Text>
            <Text style={styles.headerSubtitle}>View and manage all teachers</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teachers..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : filteredTeachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No teachers found</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filteredTeachers.map((teacher) => (
            <View key={teacher.id} style={styles.teacherCard}>
              <View style={styles.teacherInfo}>
                <View style={styles.teacherHeader}>
                  <Text style={styles.teacherName}>{teacher.fullName}</Text>
                  <View style={[styles.statusBadge, teacher.isActive ? styles.statusActive : styles.statusInactive]}>
                    <Text style={styles.statusText}>{teacher.isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                <View style={styles.teacherDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{teacher.email}</Text>
                  </View>
                  {teacher.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{teacher.phone}</Text>
                    </View>
                  )}
                  {teacher.department && (
                    <View style={styles.detailRow}>
                      <Ionicons name="business" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{teacher.department}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  teacherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  teacherDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
});
