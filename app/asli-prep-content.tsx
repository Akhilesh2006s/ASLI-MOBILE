import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio';
  subject: {
    _id: string;
    name: string;
  };
  topic?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
  views?: number;
  downloadCount?: number;
  createdAt: string;
}

export default function AsliPrepContent() {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: 'all',
    type: 'all',
    topic: ''
  });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    fetchSubjects();
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useEffect(() => {
    fetchContents();
  }, [filters]);

  useBackNavigation(dashboardPath, false);

  const fetchSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const board = userData.user?.board;
        
        if (board) {
          const subjectsResponse = await fetch(`${API_BASE_URL}/api/super-admin/boards/${board}/subjects`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (subjectsResponse.ok) {
            const data = await subjectsResponse.json();
            if (data.success) {
              setSubjects(data.data || []);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const queryParams = new URLSearchParams();
      if (filters.subject && filters.subject !== 'all') queryParams.append('subject', filters.subject);
      if (filters.type && filters.type !== 'all') queryParams.append('type', filters.type);
      if (filters.topic && filters.topic.trim()) queryParams.append('topic', filters.topic.trim());

      const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContents(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return 'videocam';
      case 'TextBook': return 'book';
      case 'Workbook': return 'document-text';
      case 'Material': return 'document';
      case 'Audio': return 'musical-notes';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Video': return '#ef4444';
      case 'TextBook': return '#3b82f6';
      case 'Workbook': return '#9333ea';
      case 'Material': return '#10b981';
      case 'Audio': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const filteredContents = useMemo(() => {
    return contents.filter(content => {
      const matchesSubject = filters.subject === 'all' || content.subject._id === filters.subject;
      const matchesType = filters.type === 'all' || content.type === filters.type;
      const matchesTopic = !filters.topic || content.topic?.toLowerCase().includes(filters.topic.toLowerCase());
      return matchesSubject && matchesType && matchesTopic;
    });
  }, [contents, filters]);

  const getFileExtension = useCallback((url: string): string => {
    const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    return match ? match[1] : 'pdf';
  }, []);

  const handleDownload = useCallback(async (content: Content) => {
    try {
      if (!content.fileUrl) {
        Alert.alert('Error', 'File URL not available');
        return;
      }

      // For videos, navigate to video player
      if (content.type === 'Video') {
        router.push({
          pathname: '/video-player',
          params: { videoId: content._id }
        });
        return;
      }

      // For other file types, download or open
      const fileUrl = content.fileUrl;
      
      // Check if it's a direct URL or needs authentication
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // Try to open in browser first (for PDFs, docs, etc.)
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          // For Google Drive links or direct file links, open in browser
          if (fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com')) {
            Alert.alert(
              'Open File',
              'This file will open in your browser. Would you like to continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open',
                  onPress: async () => {
                    await Linking.openURL(fileUrl);
                  }
                }
              ]
            );
          } else {
            // Direct file download
            Alert.alert(
              'Download File',
              `Would you like to download ${content.title}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Download',
                  onPress: async () => {
                    try {
                      // For direct file URLs, try to download
                      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                        const fileName = content.title.replace(/[^a-z0-9]/gi, '_') + '.' + getFileExtension(fileUrl);
                        const fileUri = FileSystem.documentDirectory + fileName;
                        
                        try {
                          const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);
                          Alert.alert(
                            'Download Complete',
                            `File saved: ${fileName}`,
                            [{ text: 'OK' }]
                          );
                        } catch (downloadError) {
                          console.error('Download error:', downloadError);
                          // Fallback to opening in browser
                          const canOpen = await Linking.canOpenURL(fileUrl);
                          if (canOpen) {
                            await Linking.openURL(fileUrl);
                          } else {
                            Alert.alert('Error', 'Cannot download or open this file');
                          }
                        }
                      } else {
                        Alert.alert('Error', 'Invalid file URL');
                      }
                    } catch (error) {
                      console.error('Error handling download:', error);
                      Alert.alert('Error', 'Failed to download file. Opening in browser...');
                      try {
                        await Linking.openURL(fileUrl);
                      } catch (linkError) {
                        Alert.alert('Error', 'Cannot open this file URL');
                      }
                    }
                  }
                }
              ]
            );
          }
        } else {
          Alert.alert('Error', 'Cannot open this file URL');
        }
      } else {
        Alert.alert('Error', 'Invalid file URL');
      }
    } catch (error) {
      console.error('Error handling download:', error);
      Alert.alert('Error', 'Failed to download file. Please try again.');
    }
  }, [getFileExtension]);

  const renderContentItem = useCallback(({ item: content }: { item: Content }) => {
    const typeColor = getTypeColor(content.type);
    return (
      <TouchableOpacity
        style={styles.contentCard}
        onPress={() => handleDownload(content)}
        activeOpacity={0.7}
      >
        <View style={[styles.contentIcon, { backgroundColor: typeColor + '20' }]}>
          <Ionicons name={getTypeIcon(content.type) as any} size={24} color={typeColor} />
        </View>
        
        <View style={styles.contentInfo}>
          <View style={styles.contentHeader}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {content.type}
              </Text>
            </View>
            {content.subject && (
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{content.subject.name}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.contentTitle} numberOfLines={2}>
            {content.title}
          </Text>
          
          {content.description && (
            <Text style={styles.contentDescription} numberOfLines={2}>
              {content.description}
            </Text>
          )}
          
          <View style={styles.contentMeta}>
            {content.duration && (
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{formatDuration(content.duration)}</Text>
              </View>
            )}
            {content.size && (
              <View style={styles.metaItem}>
                <Ionicons name="document" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{formatFileSize(content.size)}</Text>
              </View>
            )}
            {content.views !== undefined && (
              <View style={styles.metaItem}>
                <Ionicons name="eye" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{content.views} views</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.downloadButton, { backgroundColor: typeColor }]}
          onPress={(e) => {
            e.stopPropagation();
            handleDownload(content);
          }}
        >
          <Ionicons name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleDownload, getFileExtension]);

  const keyExtractor = useCallback((item: Content) => item._id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#9333ea', '#c026d3']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="book" size={24} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>AsliLearn Exclusive</Text>
            </View>
            <Text style={styles.headerSubtitle}>Premium study materials</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by topic..."
            placeholderTextColor="#9ca3af"
            value={filters.topic}
            onChangeText={(text) => setFilters({ ...filters, topic: text })}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filters.subject === 'all' && styles.filterChipActive]}
            onPress={() => setFilters({ ...filters, subject: 'all' })}
          >
            <Text style={[styles.filterChipText, filters.subject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id}
              style={[styles.filterChip, filters.subject === subject._id && styles.filterChipActive]}
              onPress={() => setFilters({ ...filters, subject: subject._id })}
            >
              <Text style={[styles.filterChipText, filters.subject === subject._id && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'TextBook', 'Workbook', 'Material', 'Video', 'Audio'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, filters.type === type && styles.filterChipActive]}
              onPress={() => setFilters({ ...filters, type })}
            >
              <Text style={[styles.filterChipText, filters.type === type && styles.filterChipTextActive]}>
                {type === 'all' ? 'All Types' : type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      ) : filteredContents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>No content found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContents}
          renderItem={renderContentItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.contentList}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 52,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#9333ea',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  contentList: {
    padding: 16,
    paddingBottom: 32,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e0e7ff',
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3730a3',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});

