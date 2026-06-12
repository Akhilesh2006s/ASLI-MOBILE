import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api/api';
import { useContentViewerBack } from '../../src/hooks/useBackNavigation';
import { openContentPreview } from '../../src/utils/openContentPreview';
import {
  isVideoContent,
  type LearningPathContentItem,
} from '../../src/lib/learningPathContent';
import { useSchoolProgram } from '../../src/hooks/useSchoolProgram';
import { prepareLibraryContents } from '../../src/lib/dedupe-library-content';

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

export default function SubjectContent() {
  const router = useRouter();
  const { isAsliPrepExclusive } = useSchoolProgram();
  const { id: idRaw, returnTo: returnToRaw } = useLocalSearchParams<{
    id?: string | string[];
    returnTo?: string | string[];
  }>();
  const id = pickParam(idRaw);
  const returnTo = pickParam(returnToRaw);
  const [subject, setSubject] = useState<any>(null);
  const [content, setContent] = useState<LearningPathContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const goBack = useContentViewerBack(returnTo || undefined);

  const fetchSubjectData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);

      try {
        const subRes = await api.get(`/api/subjects/${encodeURIComponent(id)}`);
        const sub = subRes.data?.subject ?? subRes.data;
        if (sub) setSubject(sub);
      } catch {
        setSubject({ name: 'Subject', description: '' });
      }

      const contentRes = await api.get('/api/student/asli-prep-content', {
        params: { subject: id },
      });
      const raw = contentRes.data?.data ?? contentRes.data;
      const list = Array.isArray(raw) ? raw : [];
      setContent(prepareLibraryContents(list, isAsliPrepExclusive));
    } catch (error) {
      console.error('Error fetching subject data:', error);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, [id, isAsliPrepExclusive]);

  useEffect(() => {
    if (id) {
      fetchSubjectData();
    }
  }, [id, fetchSubjectData]);

  const openContentItem = (item: LearningPathContentItem) => {
    const previewOpts = returnTo === 'learning' ? { returnTo: 'learning' as const } : undefined;
    openContentPreview(router, item, previewOpts);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => void goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{subject?.name || 'Subject'}</Text>
          <Text style={styles.headerSubtitle}>{subject?.description || 'Learning content'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No content available</Text>
          </View>
        ) : (
          content.map((item, index) => (
            <TouchableOpacity
              key={String(item._id || item.id || index)}
              style={styles.contentCard}
              onPress={() => openContentItem(item)}
              activeOpacity={0.7}
            >
              <View style={styles.contentHeader}>
                <View
                  style={[
                    styles.contentIcon,
                    { backgroundColor: isVideoContent(item) ? '#dbeafe' : '#d1fae5' },
                  ]}
                >
                  {isVideoContent(item) ? (
                    <Ionicons name="videocam" size={24} color="#3b82f6" />
                  ) : (
                    <Ionicons name="document-text" size={24} color="#10b981" />
                  )}
                </View>
                <View style={styles.contentInfo}>
                  <Text style={styles.contentTitle}>{item.title || 'Content'}</Text>
                  <Text style={styles.contentDescription} numberOfLines={2}>
                    {item.description || 'Learn more about this topic'}
                  </Text>
                </View>
                {item.completed && (
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                )}
              </View>
              {item.duration ? (
                <View style={styles.contentMeta}>
                  <Text style={styles.metaText}>{String(item.duration)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  contentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  contentMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
