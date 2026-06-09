import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import api from '../src/services/api/api';
import YouTubeEmbedWebView from '../src/components/shared/YouTubeEmbedWebView';
import { useBackNavigation, useContentViewerBack } from '../src/hooks/useBackNavigation';
import {
  extractYouTubeId,
  getAuthHeaders,
  resolveContentUrl,
} from '../src/utils/contentPreview';

const { width, height } = Dimensions.get('window');

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

function extractApiList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.videos)) return obj.videos;
  }
  return [];
}

function findByIdInList(list: unknown, videoId: string) {
  const id = String(videoId);
  return extractApiList(list).find(
    (item: any) => String(item?._id) === id || String(item?.id) === id
  );
}

function transformLibraryVideo(videoData: any) {
  const videoFileUrl = videoData.videoUrl || videoData.fileUrl || '';
  const isYouTube =
    !!videoData.isYouTubeVideo ||
    !!videoData.youtubeUrl ||
    (videoFileUrl &&
      (videoFileUrl.includes('youtube.com') || videoFileUrl.includes('youtu.be')));
  return {
    _id: videoData._id || videoData.id,
    title: videoData.title || 'Untitled Video',
    description: videoData.description || '',
    duration: videoData.duration
      ? videoData.duration > 100
        ? videoData.duration
        : videoData.duration * 60
      : 0,
    views: videoData.views || 0,
    createdAt: videoData.createdAt || new Date().toISOString(),
    videoUrl: videoFileUrl,
    youtubeUrl: videoData.youtubeUrl || (isYouTube ? videoFileUrl : ''),
    isYouTubeVideo: isYouTube,
    thumbnailUrl: videoData.thumbnailUrl || null,
    subject: videoData.subject?.name || videoData.subject || 'Unknown',
    difficulty: videoData.difficulty,
    language: videoData.language,
    aiFeatures: videoData.aiFeatures || {
      hasAutoNotes: !!videoData.aiFeatures?.hasNotes,
      hasVisualMaps: !!videoData.aiFeatures?.hasMindMap,
      hasVoiceQA: !!videoData.aiFeatures?.hasVoiceQA,
    },
  };
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  difficulty?: string;
  language?: string;
  subjectId?: string;
  aiFeatures?: {
    hasAutoNotes?: boolean;
    hasVisualMaps?: boolean;
    hasVoiceQA?: boolean;
  };
}

export default function VideoPlayer() {
  const params = useLocalSearchParams<{
    videoId?: string | string[];
    isContentItem?: string;
    contentData?: string;
    returnTo?: string | string[];
  }>();
  const videoId = pickParam(params.videoId);
  const returnTo = pickParam(params.returnTo);
  const { isContentItem, contentData } = params;
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'mindmap' | 'qa'>('notes');
  const goBack = useContentViewerBack(returnTo || undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoHeaders, setVideoHeaders] = useState<Record<string, string> | undefined>();
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (videoId) {
      // If content data is passed directly, use it
      if (isContentItem === 'true' && contentData) {
        try {
          const parsedContent = JSON.parse(contentData);
          const videoFileUrl = parsedContent.fileUrl || parsedContent.videoUrl || '';
          const isYouTube = !!parsedContent.youtubeUrl || (videoFileUrl && (
            videoFileUrl.includes('youtube.com') ||
            videoFileUrl.includes('youtu.be')
          ));

          const transformedVideo: Video = {
            _id: parsedContent._id,
            title: parsedContent.title || 'Untitled Video',
            description: parsedContent.description || '',
            duration: parsedContent.duration ? (parsedContent.duration > 100 ? parsedContent.duration : parsedContent.duration * 60) : 0,
            views: 0,
            createdAt: new Date().toISOString(),
            videoUrl: videoFileUrl,
            youtubeUrl: parsedContent.youtubeUrl || (isYouTube ? videoFileUrl : ''),
            isYouTubeVideo: isYouTube,
            thumbnailUrl: null,
            subject: parsedContent.subject || 'Unknown',
            aiFeatures: {
              hasNotes: false,
              hasMindMap: false,
              hasVoiceQA: false
            }
          };
          
          setVideo(transformedVideo);
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing content data:', error);
          // Fall through to fetchVideo
        }
      }
      
      fetchVideo();
    }
  }, [videoId, isContentItem, contentData]);

  const fetchVideo = async () => {
    if (!videoId) return;
    try {
      setIsLoading(true);

      const libraryAttempts: Array<() => Promise<{ data: any }>> = [
        () => api.get('/api/teacher/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/teacher/asli-prep-content'),
        () => api.get('/api/student/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/student/asli-prep-content'),
        () => api.get('/api/admin/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/admin/asli-prep-content'),
        () => api.get('/api/teacher/videos'),
        () => api.get('/api/student/videos'),
      ];

      for (const run of libraryAttempts) {
        try {
          const { data } = await run();
          const match = findByIdInList(data, videoId);
          if (match) {
            setVideo(transformLibraryVideo(match));
            return;
          }
        } catch {
          // try next source
        }
      }

      console.error('Video not found in any endpoint');
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resolvedVideoUrl = resolveContentUrl(video?.videoUrl || '');
  const isDirectVideo =
    !!resolvedVideoUrl && !/youtube\.com|youtu\.be/i.test(resolvedVideoUrl);

  useEffect(() => {
    if (!isDirectVideo) {
      setVideoHeaders(undefined);
      return;
    }
    getAuthHeaders(resolvedVideoUrl).then(setVideoHeaders);
  }, [isDirectVideo, resolvedVideoUrl]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Video not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => void goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const youtubeSourceUrl = (video.youtubeUrl || video.videoUrl || '').trim();
  const youtubeVideoId = extractYouTubeId(youtubeSourceUrl);
  const isYouTube = !!youtubeVideoId || !!video.isYouTubeVideo;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => void goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{video.title}</Text>
            <View style={styles.headerBadges}>
              {video.difficulty && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{video.difficulty}</Text>
                </View>
              )}
              {video.language && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{video.language}</Text>
                </View>
              )}
              <View style={styles.badge}>
                <Ionicons name="time" size={12} color="#fff" />
                <Text style={styles.badgeText}>{formatDuration(video.duration || 0)}</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        {isYouTube && youtubeSourceUrl ? (
          <View style={styles.videoWrapper}>
            <YouTubeEmbedWebView videoUrl={youtubeSourceUrl} style={styles.video} />
          </View>
        ) : isDirectVideo ? (
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              source={{ uri: resolvedVideoUrl, headers: videoHeaders }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={(status) => {
                setIsPlaying(status.isPlaying);
              }}
            />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="videocam-off" size={64} color="#9ca3af" />
            <Text style={styles.placeholderText}>Video not available</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {video.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{video.description}</Text>
        </View>
      )}

      {/* AI Features Tabs */}
      {video.aiFeatures && (
        <View style={styles.tabsContainer}>
          <View style={styles.tabsHeader}>
            {video.aiFeatures.hasAutoNotes && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
                onPress={() => setActiveTab('notes')}
              >
                <Ionicons name="document-text" size={20} color={activeTab === 'notes' ? '#fff' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
                  Notes
                </Text>
              </TouchableOpacity>
            )}
            {video.aiFeatures.hasVisualMaps && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'mindmap' && styles.tabActive]}
                onPress={() => setActiveTab('mindmap')}
              >
                <Ionicons name="map" size={20} color={activeTab === 'mindmap' ? '#fff' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'mindmap' && styles.tabTextActive]}>
                  Mind Map
                </Text>
              </TouchableOpacity>
            )}
            {video.aiFeatures.hasVoiceQA && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'qa' && styles.tabActive]}
                onPress={() => setActiveTab('qa')}
              >
                <Ionicons name="chatbubbles" size={20} color={activeTab === 'qa' ? '#fff' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'qa' && styles.tabTextActive]}>
                  Q&A
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'notes' && (
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Auto-Generated Notes</Text>
                <Text style={styles.featureText}>
                  AI-generated notes will appear here. Key concepts and formulas are automatically extracted from the video.
                </Text>
              </View>
            )}
            {activeTab === 'mindmap' && (
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Visual Mind Map</Text>
                <Text style={styles.featureText}>
                  Interactive mind maps showing relationships between concepts will appear here.
                </Text>
              </View>
            )}
            {activeTab === 'qa' && (
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Voice-Enabled Q&A</Text>
                <Text style={styles.featureText}>
                  Ask questions about the lecture using voice or text input. AI will provide detailed explanations.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  headerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  videoContainer: {
    width: '100%',
    height: height * 0.35,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    position: 'relative',
  },
  thumbnailFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1f2937',
  },
  playButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  playButtonText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    zIndex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: '#111827',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  tabsContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  featureContent: {
    gap: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
});

