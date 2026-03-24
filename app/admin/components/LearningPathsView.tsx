import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../src/services/api/api';
import {
  isVideoContent as lpIsVideo,
  type LearningPathContentItem,
} from '../../../src/lib/learningPathContent';

interface ContentItem extends LearningPathContentItem {
  title: string;
  type: string;
  subject?: string;
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

function parseSubjectsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.subjects)) return data.subjects;
  return [];
}

export default function LearningPathsView() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsWithContent, setSubjectsWithContent] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/subjects');
      const raw = response?.data;
      const subjectsArray = parseSubjectsPayload(raw);

      setSubjects(
        subjectsArray.map((subject: any) => ({
          _id: String(subject._id || subject.id || ''),
          id: String(subject._id || subject.id || ''),
          name: subject.name || 'Unknown Subject',
          description: subject.description || '',
          board: subject.board || '',
          totalContent: 0,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const fetchSubjectsWithContent = useCallback(async () => {
    if (subjects.length === 0) return;
    try {
      setIsLoadingContent(true);

      const subjectsWithContentResults = await Promise.allSettled(
        subjects.map(async (subject: Subject) => {
          try {
            const subjectId = subject._id || subject.id;
            let asliPrepContent: ContentItem[] = [];
            try {
              const contentResponse = await api.get('/api/admin/asli-prep-content', {
                params: { subject: subjectId },
              });
              const contentData = contentResponse?.data;
              const raw = contentData?.data ?? contentData;
              asliPrepContent = Array.isArray(raw) ? raw : [];
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
              asliPrepContent,
              totalContent: asliPrepContent.length,
            };
          } catch (error) {
            console.error('Error processing subject:', subject, error);
            return null;
          }
        })
      );

      const validSubjects = subjectsWithContentResults
        .filter(
          (result): result is PromiseFulfilledResult<Subject> =>
            result.status === 'fulfilled' && result.value !== null
        )
        .map((result) => result.value);

      setSubjectsWithContent(validSubjects);
    } catch (error) {
      console.error('Failed to fetch subjects with content:', error);
      setSubjectsWithContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  }, [subjects]);

  useEffect(() => {
    if (subjects.length > 0) {
      fetchSubjectsWithContent();
    }
  }, [subjects, fetchSubjectsWithContent]);

  const openContentItem = (content: ContentItem) => {
    if (lpIsVideo(content)) {
      const id = content._id || content.id;
      if (id) {
        router.push({
          pathname: '/video-player',
          params: { videoId: String(id) },
        });
        return;
      }
      const fallback = content.youtubeUrl || content.fileUrl;
      if (fallback) {
        Linking.openURL(fallback).catch(() => {});
      }
      return;
    }

    const link = content.driveLink || content.fileUrl;
    if (link) {
      router.push({
        pathname: '/drive-viewer',
        params: { driveLink: encodeURIComponent(link) },
      });
      return;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="map" size={26} color="#fb923c" />
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Learning Paths</Text>
            <Text style={styles.headerSubtitle}>Manage learning paths for students</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {isLoading || isLoadingContent ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fb923c" />
          </View>
        ) : subjectsWithContent.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyText}>No learning paths found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {subjectsWithContent.map((subject) => {
              const isExpanded = expandedSubjectId === subject.id;
              return (
                <View key={subject.id} style={styles.pathCard}>
                  <TouchableOpacity
                    style={styles.pathHeaderRow}
                    onPress={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pathHeader}>
                      <View style={styles.pathIcon}>
                        <Ionicons name="book" size={20} color="#fb923c" />
                      </View>
                      <View style={styles.pathInfo}>
                        <Text style={styles.pathName}>{subject.name}</Text>
                        {subject.description ? (
                          <Text style={styles.pathDescription} numberOfLines={2}>
                            {subject.description}
                          </Text>
                        ) : null}
                        {subject.board ? (
                          <Text style={styles.pathBoard}>Board: {subject.board}</Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#9ca3af"
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.pathFooter}>
                    <View style={styles.pathStat}>
                      <Ionicons name="document-text" size={15} color="#6b7280" />
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
                          onPress={() => openContentItem(content)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={lpIsVideo(content) ? 'videocam' : 'document-text'}
                            size={18}
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
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
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
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  pathHeaderRow: {
    borderRadius: 8,
  },
  pathCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pathIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pathInfo: {
    flex: 1,
    minWidth: 0,
  },
  pathName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  pathDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  pathBoard: {
    fontSize: 12,
    color: '#9ca3af',
  },
  pathFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  contentList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  contentListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  contentItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contentItemType: {
    fontSize: 12,
    color: '#6b7280',
  },
  noContentContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
    paddingVertical: 12,
  },
  noContentText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pathStatText: {
    fontSize: 13,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
});
