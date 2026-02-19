import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';

const { width, height } = Dimensions.get('window');

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  playbackUrl?: string;
  hlsUrl?: string;
  rtmpUrl?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewerCount?: number;
  scheduledTime?: string;
  streamer?: {
    fullName: string;
    email: string;
  };
  subject?: {
    _id: string;
    name: string;
  } | string;
  chatEnabled?: boolean;
}

export default function LiveStream() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, [sessionId]);

  useBackNavigation(false, dashboardPath);

  const fetchSession = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/live-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.data || data);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !sessionId) return;

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/live-sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: chatInput.trim() })
      });

      if (response.ok) {
        setChatInput('');
        // Refresh chat messages
        fetchChatMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const fetchChatMessages = async () => {
    if (!sessionId) return;

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/live-sessions/${sessionId}/chat`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  useEffect(() => {
    if (session?.chatEnabled && sessionId) {
      fetchChatMessages();
      const interval = setInterval(fetchChatMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionId, session?.chatEnabled]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Stream not found</Text>
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

  const streamUrl = session.hlsUrl || session.playbackUrl;
  const isLive = session.status === 'live';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.liveIndicator}>
              {isLive && (
                <>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </>
              )}
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>{session.title}</Text>
            {session.viewerCount !== undefined && (
              <View style={styles.viewerCount}>
                <Ionicons name="people" size={14} color="#fff" />
                <Text style={styles.viewerCountText}>{session.viewerCount} viewers</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          {isLive && streamUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: streamUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isPlaying}
              isMuted={isMuted}
              onPlaybackStatusUpdate={(status) => {
                setIsPlaying(status.isPlaying);
              }}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="videocam-off" size={64} color="#9ca3af" />
              <Text style={styles.placeholderText}>
                {session.status === 'scheduled' 
                  ? `Stream starts at ${session.scheduledTime ? new Date(session.scheduledTime).toLocaleString() : 'TBD'}`
                  : 'Stream not available'}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {session.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this stream</Text>
            <Text style={styles.descriptionText}>{session.description}</Text>
          </View>
        )}

        {/* Chat */}
        {session.chatEnabled && isLive && (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Live Chat</Text>
            </View>
            <ScrollView style={styles.chatMessages} showsVerticalScrollIndicator={false}>
              {chatMessages.length === 0 ? (
                <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
              ) : (
                chatMessages.map((message, index) => (
                  <View key={index} style={styles.chatMessage}>
                    <Text style={styles.chatMessageUser}>{message.user?.fullName || 'User'}:</Text>
                    <Text style={styles.chatMessageText}>{message.message || message.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerCountText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    height: height * 0.4,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 32,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
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
  chatContainer: {
    flex: 1,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  noMessagesText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
  chatMessage: {
    marginBottom: 12,
  },
  chatMessageUser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  chatMessageText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


