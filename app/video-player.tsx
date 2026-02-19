import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';

const { width, height } = Dimensions.get('window');

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
  const { videoId, isContentItem, contentData } = useLocalSearchParams<{ 
    videoId: string;
    isContentItem?: string;
    contentData?: string;
  }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'mindmap' | 'qa'>('notes');
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const [isPlaying, setIsPlaying] = useState(false);
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
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, [videoId, isContentItem, contentData]);

  useBackNavigation(dashboardPath, false);

  const fetchVideo = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      
      // Try fetching from videos endpoint first
      let response = await fetch(`${API_BASE_URL}/api/student/videos/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const videoData = data.data || data;
        setVideo(videoData);
        return;
      }

      // If not found, try fetching from asli-prep-content list and find by ID
      // Try admin endpoint first
      response = await fetch(`${API_BASE_URL}/api/admin/asli-prep-content?type=Video`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const contentsList = data.data || data || [];
        const contentArray = Array.isArray(contentsList) ? contentsList : [];
        
        // Find the content item by ID
        const contentData = contentArray.find((item: any) => 
          (item._id === videoId) || (item.id === videoId)
        );
        
        if (contentData) {
          // Transform asli-prep-content to video format
          const videoFileUrl = contentData.fileUrl || contentData.videoUrl || '';
          const isYouTube = !!contentData.youtubeUrl || (videoFileUrl && (
            videoFileUrl.includes('youtube.com') ||
            videoFileUrl.includes('youtu.be')
          ));

          const transformedVideo = {
            _id: contentData._id || contentData.id,
            title: contentData.title || 'Untitled Video',
            description: contentData.description || '',
            duration: contentData.duration ? (contentData.duration > 100 ? contentData.duration : contentData.duration * 60) : 0,
            views: contentData.views || 0,
            createdAt: contentData.createdAt || new Date().toISOString(),
            videoUrl: videoFileUrl,
            youtubeUrl: contentData.youtubeUrl || (isYouTube ? videoFileUrl : ''),
            isYouTubeVideo: isYouTube,
            thumbnailUrl: contentData.thumbnailUrl || null,
            subject: contentData.subject?.name || contentData.subject || 'Unknown',
            aiFeatures: {
              hasNotes: false,
              hasMindMap: false,
              hasVoiceQA: false
            }
          };
          
          setVideo(transformedVideo);
          return;
        }
      }

      // If still not found, try student asli-prep-content endpoint
      response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Video`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const contentsList = data.data || data || [];
        const contentArray = Array.isArray(contentsList) ? contentsList : [];
        
        // Find the content item by ID
        const contentData = contentArray.find((item: any) => 
          (item._id === videoId) || (item.id === videoId)
        );
        
        if (contentData) {
          // Transform asli-prep-content to video format
          const videoFileUrl = contentData.fileUrl || contentData.videoUrl || '';
          const isYouTube = !!contentData.youtubeUrl || (videoFileUrl && (
            videoFileUrl.includes('youtube.com') ||
            videoFileUrl.includes('youtu.be')
          ));

          const transformedVideo = {
            _id: contentData._id || contentData.id,
            title: contentData.title || 'Untitled Video',
            description: contentData.description || '',
            duration: contentData.duration ? (contentData.duration > 100 ? contentData.duration : contentData.duration * 60) : 0,
            views: contentData.views || 0,
            createdAt: contentData.createdAt || new Date().toISOString(),
            videoUrl: videoFileUrl,
            youtubeUrl: contentData.youtubeUrl || (isYouTube ? videoFileUrl : ''),
            isYouTubeVideo: isYouTube,
            thumbnailUrl: contentData.thumbnailUrl || null,
            subject: contentData.subject?.name || contentData.subject || 'Unknown',
            aiFeatures: {
              hasNotes: false,
              hasMindMap: false,
              hasVoiceQA: false
            }
          };
          
          setVideo(transformedVideo);
          return;
        }
      }

      // If all endpoints fail, video not found
      console.error('Video not found in any endpoint');
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            onPress={() => router.replace(dashboardPath)}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const youtubeId = video.isYouTubeVideo && video.youtubeUrl 
    ? extractYouTubeId(video.youtubeUrl) 
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
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
        {youtubeId ? (
          <TouchableOpacity
            style={styles.videoPlaceholder}
            onPress={() => {
              const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
              Linking.openURL(youtubeUrl).catch(() => {
                Alert.alert('Error', 'Could not open YouTube video');
              });
            }}
          >
            {video.thumbnailUrl ? (
              <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnailFull} />
            ) : (
              <View style={styles.thumbnailPlaceholder} />
            )}
            <View style={styles.playButtonLarge}>
              <Ionicons name="play" size={48} color="#fff" />
            </View>
            <Text style={styles.playButtonText}>Tap to play on YouTube</Text>
          </TouchableOpacity>
        ) : video.videoUrl ? (
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              source={{ uri: video.videoUrl }}
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

