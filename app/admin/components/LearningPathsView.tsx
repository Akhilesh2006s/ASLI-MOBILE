import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface ContentItem {
  _id?: string;
  id?: string;
  title: string;
  type: string;
  subject?: string;
  fileUrl?: string;
  driveLink?: string;
  description?: string;
}

interface Subject {
  _id: string;
  id: string;
  name: string;
  description?: string;
  board?: string;
  totalContent?: number;
  asliPrepContent?: ContentItem[];
}

export default function LearningPathsView() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsWithContent, setSubjectsWithContent] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (subjects.length > 0) {
      fetchSubjectsWithContent();
    }
  }, [subjects]);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        console.error('No auth token found');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Learning paths subjects API response:', data);
        
        // Handle different response formats
        let subjectsArray = [];
        if (Array.isArray(data)) {
          subjectsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          subjectsArray = data.data;
        } else if (data.subjects && Array.isArray(data.subjects)) {
          subjectsArray = data.subjects;
        }
        
        setSubjects(subjectsArray.map((subject: any) => ({
          _id: subject._id || subject.id,
          id: subject._id || subject.id,
          name: subject.name || 'Unknown Subject',
          description: subject.description || '',
          board: subject.board || '',
          totalContent: 0
        })));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch subjects:', response.status, errorData);
        setSubjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjectsWithContent = async () => {
    try {
      setIsLoadingContent(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setIsLoadingContent(false);
        return;
      }

      const subjectsWithContentResults = await Promise.allSettled(
        subjects.map(async (subject: any) => {
          try {
            const subjectId = subject._id || subject.id;
            
            // Fetch Asli Prep content for this subject
            let asliPrepContent: ContentItem[] = [];
            try {
              const contentResponse = await fetch(
                `${API_BASE_URL}/api/admin/asli-prep-content?subject=${encodeURIComponent(subjectId)}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                asliPrepContent = contentData.data || contentData || [];
                if (!Array.isArray(asliPrepContent)) asliPrepContent = [];
              }
            } catch (contentError) {
              console.error('Error fetching content for subject:', subjectId, contentError);
              asliPrepContent = [];
            }

            return {
              _id: subject._id || subject.id,
              id: subject._id || subject.id,
              name: subject.name || 'Unknown Subject',
              description: subject.description || '',
              board: subject.board || '',
              asliPrepContent: asliPrepContent,
              totalContent: asliPrepContent.length
            };
          } catch (error) {
            console.error('Error processing subject:', subject, error);
            return null;
          }
        })
      );

      // Filter out failed results
      const validSubjects = subjectsWithContentResults
        .filter((result): result is PromiseFulfilledResult<Subject> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      setSubjectsWithContent(validSubjects);
    } catch (error) {
      console.error('Failed to fetch subjects with content:', error);
      setSubjectsWithContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="target" size={32} color="#fb923c" />
          <View>
            <Text style={styles.headerTitle}>Learning Paths</Text>
            <Text style={styles.headerSubtitle}>Manage learning paths for students</Text>
          </View>
        </View>
      </View>

      {isLoading || isLoadingContent ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : subjectsWithContent.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="target-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No learning paths found</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {subjectsWithContent.map((subject) => {
            const isExpanded = expandedSubjectId === subject.id;
            return (
              <TouchableOpacity 
                key={subject.id} 
                style={styles.pathCard}
                onPress={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                activeOpacity={0.7}
              >
                <View style={styles.pathHeader}>
                  <View style={styles.pathIcon}>
                    <Ionicons name="book" size={24} color="#fb923c" />
                  </View>
                  <View style={styles.pathInfo}>
                    <Text style={styles.pathName}>{subject.name}</Text>
                    {subject.description && (
                      <Text style={styles.pathDescription}>{subject.description}</Text>
                    )}
                    {subject.board && (
                      <Text style={styles.pathBoard}>Board: {subject.board}</Text>
                    )}
                  </View>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#9ca3af" 
                  />
                </View>
                
                <View style={styles.pathFooter}>
                  <View style={styles.pathStat}>
                    <Ionicons name="document-text" size={16} color="#6b7280" />
                    <Text style={styles.pathStatText}>
                      {subject.totalContent || 0} content items
                    </Text>
                  </View>
                </View>

                {isExpanded && subject.asliPrepContent && subject.asliPrepContent.length > 0 && (
                  <View style={styles.contentList}>
                    <Text style={styles.contentListTitle}>Content Items:</Text>
                    {subject.asliPrepContent.map((content, index) => (
                      <TouchableOpacity
                        key={content._id || content.id || `content-${index}`}
                        style={styles.contentItem}
                        onPress={() => {
                          if (content.type === 'video' || content.type === 'Video') {
                            // Navigate to video player with content data
                            router.push({
                              pathname: '/video-player',
                              params: { 
                                videoId: content._id || content.id,
                                isContentItem: 'true',
                                contentData: JSON.stringify({
                                  _id: content._id || content.id,
                                  title: content.title,
                                  description: content.description,
                                  fileUrl: content.fileUrl,
                                  videoUrl: content.fileUrl,
                                  youtubeUrl: content.youtubeUrl,
                                  duration: content.duration,
                                  subject: subject.name
                                })
                              }
                            });
                          } else if (content.driveLink || content.fileUrl) {
                            // Navigate to drive viewer for documents
                            router.push({
                              pathname: '/drive-viewer',
                              params: { 
                                fileId: content._id || content.id,
                                driveLink: content.driveLink || content.fileUrl
                              }
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={content.type === 'video' || content.type === 'Video' ? 'videocam' : 'document-text'} 
                          size={20} 
                          color="#fb923c" 
                        />
                        <View style={styles.contentItemInfo}>
                          <Text style={styles.contentItemTitle} numberOfLines={1}>
                            {content.title || 'Untitled'}
                          </Text>
                          <Text style={styles.contentItemType}>
                            Type: {content.type || 'Unknown'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {isExpanded && (!subject.asliPrepContent || subject.asliPrepContent.length === 0) && (
                  <View style={styles.noContentContainer}>
                    <Text style={styles.noContentText}>No content items available</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    minHeight: 0,
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  pathCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pathInfo: {
    flex: 1,
  },
  pathName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pathDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  pathBoard: {
    fontSize: 12,
    color: '#9ca3af',
  },
  pathFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  contentList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  contentListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentItemInfo: {
    flex: 1,
  },
  contentItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contentItemType: {
    fontSize: 12,
    color: '#6b7280',
  },
  noContentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
    paddingVertical: 16,
  },
  noContentText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pathStatText: {
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
