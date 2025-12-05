import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

const CONTENT_TYPES = [
  { id: 'TextBook', label: 'TextBook', icon: 'book' as keyof typeof Ionicons.glyphMap },
  { id: 'Workbook', label: 'Workbook', icon: 'document-text' as keyof typeof Ionicons.glyphMap },
  { id: 'Material', label: 'Material', icon: 'document' as keyof typeof Ionicons.glyphMap },
  { id: 'Video', label: 'Video', icon: 'videocam' as keyof typeof Ionicons.glyphMap },
  { id: 'Audio', label: 'Audio', icon: 'headset' as keyof typeof Ionicons.glyphMap },
  { id: 'Homework', label: 'Homework', icon: 'clipboard' as keyof typeof Ionicons.glyphMap },
];

export default function BrowseView() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [content, setContent] = useState<any[]>([]);
  const [contentTypeCounts, setContentTypeCounts] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  useEffect(() => {
    fetchContentCounts();
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchFilteredContent();
    } else {
      setContent([]);
    }
  }, [selectedType]);

  const fetchContentCounts = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedContent = data.data || data || [];
        
        const counts: { [key: string]: number } = {};
        CONTENT_TYPES.forEach(type => {
          counts[type.id] = fetchedContent.filter((c: any) => 
            c.type && c.type.toLowerCase() === type.id.toLowerCase()
          ).length;
        });
        
        setContentTypeCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch content counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilteredContent = async () => {
    try {
      setIsLoadingContent(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedContent = data.data || data || [];
        const filtered = fetchedContent.filter((c: any) => 
          c.type && c.type.toLowerCase() === selectedType?.toLowerCase()
        );
        setContent(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch filtered content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleOpenContent = async (contentItem: any) => {
    if (contentItem.fileUrl) {
      let url = contentItem.fileUrl;
      if (!url.startsWith('http') && !url.startsWith('//')) {
        url = url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
      }
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }
  };

  const getContentIcon = (contentItem: any) => {
    if (contentItem.type === 'Video') return 'videocam';
    if (contentItem.fileUrl) {
      const url = contentItem.fileUrl.toLowerCase();
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
      if (url.endsWith('.pdf') || url.includes('pdf')) return 'document';
    }
    return 'document-text';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Library</Text>
      <Text style={styles.subtitle}>Browse by Type</Text>

      {/* Content Type Cards */}
      <View style={styles.typesGrid}>
        {CONTENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeCard,
              selectedType === type.id && styles.typeCardActive
            ]}
            onPress={() => setSelectedType(selectedType === type.id ? null : type.id)}
          >
            <View style={styles.typeIconContainer}>
              <Ionicons name={type.icon} size={40} color="#fff" />
            </View>
            <Text style={styles.typeLabel}>{type.label}</Text>
            <Text style={styles.typeCount}>
              {isLoading ? '...' : `${contentTypeCounts[type.id] || 0} files`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtered Content */}
      {selectedType && (
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>
              {selectedType} ({content.length} {content.length === 1 ? 'file' : 'files'})
            </Text>
            <TouchableOpacity onPress={() => setSelectedType(null)}>
              <Ionicons name="close-circle" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {isLoadingContent ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : content.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No content found for this type.</Text>
            </View>
          ) : (
            <View style={styles.contentList}>
              {content.map((item: any) => {
                const iconName = getContentIcon(item);
                return (
                  <TouchableOpacity
                    key={item._id || item.id}
                    style={styles.contentCard}
                    onPress={() => handleOpenContent(item)}
                  >
                    <View style={styles.contentIconContainer}>
                      <Ionicons name={iconName as any} size={24} color="#fff" />
                    </View>
                    <View style={styles.contentInfo}>
                      <Text style={styles.contentCardTitle}>{item.title || 'Untitled'}</Text>
                      {item.description && (
                        <Text style={styles.contentCardDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      {item.subjectId && typeof item.subjectId === 'object' && item.subjectId.name && (
                        <View style={styles.subjectBadge}>
                          <Text style={styles.subjectBadgeText}>{item.subjectId.name}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="open-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 20,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  typeCardActive: {
    borderWidth: 2,
    borderColor: '#fb923c',
  },
  typeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  typeCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  contentSection: {
    marginTop: 24,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
  },
  contentList: {
    gap: 12,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fb923c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
    gap: 4,
  },
  contentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  contentCardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  subjectBadgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

