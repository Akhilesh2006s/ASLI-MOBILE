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
import { GlassPanel } from '../../src/components/ui';

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

export default function SubjectContent() {
  const router = useRouter();
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
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
    if (!id || programLoading) return;
    void fetchSubjectData();
  }, [id, programLoading, fetchSubjectData]);

  const openContentItem = (item: LearningPathContentItem) => {
    const previewOpts = returnTo === 'learning' ? { returnTo: 'learning' as const } : undefined;
    openContentPreview(router, item, previewOpts);
  };

  if (isLoading || programLoading) {
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
      <GlassPanel style={styles.header} radius={0} bordered={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => void goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{subject?.name || 'Subject'}</Text>
            <Text style={styles.headerSubtitle}>{subject?.description || 'Learning content'}</Text>
          </View>
        </View>
      </GlassPanel>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No content available</Text>
          </View>
        ) : (
          content.map((item, index) => (
            <TouchableOpacity
              key={String(item._id || item.id || index)}
              onPress={() => openContentItem(item)}
              activeOpacity={0.7}
            >
              <GlassPanel style={styles.contentCard} radius={16}>
                <View style={styles.contentHeader}>
                  <View
                    style={[
                      styles.contentIcon,
                      { backgroundColor: isVideoContent(item) ? '#dbeafe' : '#e8e3fa' },
                    ]}
                  >
                    {isVideoContent(item) ? (
                      <Ionicons name="videocam" size={24} color="#3b82f6" />
                    ) : (
                      <Ionicons name="document-text" size={24} color="#6d5bd0" />
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
              </GlassPanel>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // Row layout lives on an inner view because GlassPanel wraps its children.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
