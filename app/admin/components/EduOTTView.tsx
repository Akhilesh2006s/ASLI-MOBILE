import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  views: number;
  createdAt: string;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  fileUrl?: string;
  fileUrls?: string[];
}

export default function EduOTTView() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        console.error('No auth token found');
        setIsLoading(false);
        return;
      }

      // Try multiple endpoints
      let response = await fetch(`${API_BASE_URL}/api/admin/asli-prep-content?type=Video`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to videos endpoint
        response = await fetch(`${API_BASE_URL}/api/admin/videos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Videos API response:', data);
        
        // Handle different response formats
        let videosData = [];
        if (data.success && data.data) {
          videosData = Array.isArray(data.data) ? data.data : [];
        } else if (Array.isArray(data)) {
          videosData = data;
        } else if (data.videos && Array.isArray(data.videos)) {
          videosData = data.videos;
        }
        
         // Map content to video format
         const mappedVideos = videosData.map((item: any) => {
           // Get video URL - check fileUrl, fileUrls array, or videoUrl
           const videoFileUrl = item.fileUrls && item.fileUrls.length > 0 
             ? item.fileUrls[0] 
             : (item.fileUrl || item.videoUrl || '');
           
           // Check if it's a YouTube URL
           const isYouTube = !!item.youtubeUrl || (videoFileUrl && (
             videoFileUrl.includes('youtube.com') || 
             videoFileUrl.includes('youtu.be') ||
             videoFileUrl.includes('youtube.com/watch')
           ));
           
           return {
             _id: item._id || item.id,
             title: item.title || 'Untitled Video',
             description: item.description || '',
             duration: item.duration || 0,
             views: item.views || 0,
             createdAt: item.createdAt || new Date().toISOString(),
             videoUrl: videoFileUrl,
             youtubeUrl: item.youtubeUrl || (isYouTube ? videoFileUrl : ''),
             isYouTubeVideo: isYouTube,
             fileUrl: videoFileUrl,
             fileUrls: item.fileUrls || []
           };
         });
        
        setVideos(mappedVideos);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch videos:', response.status, errorData);
        setVideos([]);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoPress = (video: Video) => {
    // Navigate to video player instead of showing modal
    router.push({
      pathname: '/video-player',
      params: { 
        videoId: video._id,
        isContentItem: 'true',
        contentData: JSON.stringify({
          _id: video._id,
          title: video.title,
          description: video.description,
          fileUrl: video.fileUrl || video.videoUrl,
          videoUrl: video.videoUrl || video.fileUrl,
          youtubeUrl: video.youtubeUrl,
          duration: video.duration,
          isYouTubeVideo: video.isYouTubeVideo
        })
      }
    });
  };

  const handlePlayVideo = async (video: Video) => {
    // Navigate to video player
    router.push({
      pathname: '/video-player',
      params: { 
        videoId: video._id,
        isContentItem: 'true',
        contentData: JSON.stringify({
          _id: video._id,
          title: video.title,
          description: video.description,
          fileUrl: video.fileUrl || video.videoUrl,
          videoUrl: video.videoUrl || video.fileUrl,
          youtubeUrl: video.youtubeUrl,
          duration: video.duration,
          isYouTubeVideo: video.isYouTubeVideo
        })
      }
    });
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="play" size={32} color="#fb923c" />
          <View>
            <Text style={styles.headerTitle}>EduOTT</Text>
            <Text style={styles.headerSubtitle}>Manage educational OTT content</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : filteredVideos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="play-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No videos found</Text>
        </View>
      ) : (
         <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
           {filteredVideos.map((video) => (
             <TouchableOpacity
               key={video._id}
               style={styles.videoCard}
               onPress={() => handleVideoPress(video)}
               activeOpacity={0.7}
             >
               <View style={styles.videoHeader}>
                 <View style={styles.videoIcon}>
                   <Ionicons name="play-circle" size={32} color="#fb923c" />
                 </View>
                 <View style={styles.videoInfo}>
                   <Text style={styles.videoTitle}>{video.title}</Text>
                   {video.description && (
                     <Text style={styles.videoDescription} numberOfLines={2}>
                       {video.description}
                     </Text>
                   )}
                 </View>
               </View>
               <View style={styles.videoStats}>
                 <View style={styles.statItem}>
                   <Ionicons name="time" size={16} color="#6b7280" />
                   <Text style={styles.statText}>{formatDuration(video.duration)}</Text>
                 </View>
                 <View style={styles.statItem}>
                   <Ionicons name="eye" size={16} color="#6b7280" />
                   <Text style={styles.statText}>{video.views} views</Text>
                 </View>
                 {video.isYouTubeVideo && (
                   <View style={styles.statItem}>
                     <Ionicons name="logo-youtube" size={16} color="#ef4444" />
                     <Text style={styles.statText}>YouTube</Text>
                   </View>
                 )}
               </View>
             </TouchableOpacity>
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
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoIcon: {
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  videoStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
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
