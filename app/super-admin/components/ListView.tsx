import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface ListViewProps {
  title: string;
  endpoint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function ListView({ title, endpoint, icon }: ListViewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [endpoint]);

  const fetchItems = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.listContainer}>
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name={icon} size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id || item._id || index} style={styles.listItem}>
                <Ionicons name={icon} size={32} color="#f97316" />
                <View style={styles.listItemText}>
                  <Text style={styles.listItemTitle}>{item.title || item.name || 'Untitled'}</Text>
                  {item.description && <Text style={styles.listItemSubtitle} numberOfLines={2}>{item.description}</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  listContainer: { padding: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  listItemText: { flex: 1, marginLeft: 12 },
  listItemTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  listItemSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
});






