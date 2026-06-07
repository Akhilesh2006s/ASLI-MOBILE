import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import api from '../../../src/services/api/api';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import EduOTTVideoCard from '../../../src/components/eduott/EduOTTVideoCard';
import { resolveContentDurationSeconds } from '../../../src/utils/eduottVideoUtils';
import { extractPlainSubjectName, getSubjectClassLabel } from '../../../src/lib/subject-names';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminFilterChips,
  AdminGlassCard,
  AdminEmptyState,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

type EduOTTSubTab = 'videos' | 'live-sessions';

interface EduVideo {
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
  subjectName?: string;
  classNumber?: string;
  thumbnailUrl?: string;
}

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function EduOTTView() {
  const { colors, spacing, radius } = useAdminTheme();
  const { isAsliPrepExclusive } = useSchoolProgram();
  const [activeSubTab, setActiveSubTab] = useState<EduOTTSubTab>('videos');
  const [videos, setVideos] = useState<EduVideo[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      let response;
      try {
        response = await api.get('/api/admin/asli-prep-content', { params: { type: 'Video' } });
      } catch {
        response = await api.get('/api/admin/videos');
      }

      const videosArray = asArray(response?.data);

      const mappedVideos = videosArray.map((content: any) => {
        const videoFileUrl =
          content.fileUrls && content.fileUrls.length > 0
            ? content.fileUrls[0]
            : content.fileUrl || content.videoUrl || '';

        const isYouTube =
          !!content.youtubeUrl ||
          (videoFileUrl &&
            (videoFileUrl.includes('youtube.com') || videoFileUrl.includes('youtu.be')));

        const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
        const classNumber =
          content.classNumber != null && String(content.classNumber).trim() !== ''
            ? String(content.classNumber).trim()
            : content.subject?.classNumber != null
              ? String(content.subject.classNumber).trim()
              : undefined;

        return {
          _id: content._id || content.id,
          title: content.title || 'Untitled Video',
          description: content.description || '',
          duration: resolveContentDurationSeconds({
            duration: content.duration,
            durationSeconds: content.durationSeconds,
          }),
          views: content.views || 0,
          createdAt: content.createdAt || new Date().toISOString(),
          videoUrl: videoFileUrl,
          youtubeUrl: content.youtubeUrl || (isYouTube ? videoFileUrl : ''),
          isYouTubeVideo: isYouTube,
          fileUrl: videoFileUrl,
          subjectName,
          classNumber,
          thumbnailUrl: content.thumbnailUrl,
        };
      });

      setVideos(mappedVideos);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      setVideos([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchLiveSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const response = await api.get('/api/admin/streams');
      setLiveSessions(asArray(response?.data));
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
      setLiveSessions([]);
    } finally {
      setIsLoadingSessions(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'videos') {
      if (isAsliPrepExclusive) {
        fetchVideos();
      } else {
        setVideos([]);
        setIsLoading(false);
      }
    } else if (activeSubTab === 'live-sessions') {
      fetchLiveSessions();
    }
  }, [activeSubTab, selectedSubject, isAsliPrepExclusive, fetchVideos, fetchLiveSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeSubTab === 'videos' && isAsliPrepExclusive) {
      fetchVideos();
    } else if (activeSubTab === 'live-sessions') {
      fetchLiveSessions();
    } else {
      setRefreshing(false);
    }
  }, [activeSubTab, isAsliPrepExclusive, fetchVideos, fetchLiveSessions]);

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || video.subjectName === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredSessions = liveSessions.filter((session) => {
    const matchesSearch =
      session.title?.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
      session.description?.toLowerCase().includes(sessionSearchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handlePlayVideo = (video: EduVideo) => {
    openContentPreview(
      router,
      {
        _id: video._id,
        title: video.title,
        type: 'Video',
        fileUrl: video.videoUrl || video.fileUrl,
        youtubeUrl: video.youtubeUrl,
      },
      { returnTo: 'eduott' }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return colors.danger;
      case 'scheduled':
        return colors.primary;
      case 'ended':
        return colors.textMuted;
      case 'cancelled':
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  const subjectOptions = [
    { id: 'all', label: 'All Subjects' },
    ...Array.from(new Set(videos.map((v) => v.subjectName).filter(Boolean))).map((name) => ({
      id: name as string,
      label: name as string,
    })),
  ];

  const statusChips = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'ended', label: 'Ended' },
  ];

  return (
    <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
      <AdminSectionHeader
        icon="play-circle"
        title="EduOTT"
        subtitle="Educational videos and live sessions"
      />

      <View style={[styles.subTabsContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
        <AdminScalePressable
          onPress={() => setActiveSubTab('videos')}
          style={[
            styles.subTab,
            {
              borderRadius: radius.sm,
              backgroundColor: activeSubTab === 'videos' ? colors.primaryMuted : colors.bgElevated,
              borderColor: activeSubTab === 'videos' ? colors.primary : 'transparent',
              borderWidth: activeSubTab === 'videos' ? 1 : 0,
            },
          ]}
        >
          <Ionicons
            name="play"
            size={16}
            color={activeSubTab === 'videos' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.subTabText,
              { color: activeSubTab === 'videos' ? colors.primary : colors.textMuted },
            ]}
          >
            Videos
          </Text>
        </AdminScalePressable>
        <AdminScalePressable
          onPress={() => setActiveSubTab('live-sessions')}
          style={[
            styles.subTab,
            {
              borderRadius: radius.sm,
              backgroundColor: activeSubTab === 'live-sessions' ? colors.primaryMuted : colors.bgElevated,
              borderColor: activeSubTab === 'live-sessions' ? colors.primary : 'transparent',
              borderWidth: activeSubTab === 'live-sessions' ? 1 : 0,
            },
          ]}
        >
          <Ionicons
            name="radio"
            size={16}
            color={activeSubTab === 'live-sessions' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.subTabText,
              { color: activeSubTab === 'live-sessions' ? colors.primary : colors.textMuted },
            ]}
          >
            Live Sessions
          </Text>
        </AdminScalePressable>
      </View>

      {activeSubTab === 'videos' && (
        <>
          <AdminSearchBar
            placeholder="Search videos by title..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
          />

          {subjectOptions.length > 1 ? (
            <AdminFilterChips
              chips={subjectOptions}
              selected={selectedSubject}
              onSelect={setSelectedSubject}
            />
          ) : null}

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredVideos.length === 0 ? (
            <AdminEmptyState
              icon="play-outline"
              title={
                !isAsliPrepExclusive
                  ? 'Asli Prep only'
                  : searchTerm
                    ? 'No matches'
                    : 'No videos found'
              }
              message={
                !isAsliPrepExclusive
                  ? 'Videos are available for Asli Prep schools only.'
                  : searchTerm
                    ? 'No videos match your search'
                    : 'No videos found'
              }
            />
          ) : (
            <View style={[styles.listSection, { marginTop: spacing.md }]}>
              {filteredVideos.map((video, index) => (
                <Animated.View
                  key={video._id}
                  entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}
                >
                  <EduOTTVideoCard
                    variant="teacher"
                    title={video.title}
                    durationSeconds={video.duration}
                    subjectLabel={
                      extractPlainSubjectName(video.subjectName || '').trim() || undefined
                    }
                    classLabel={
                      getSubjectClassLabel({
                        name: video.subjectName,
                        classNumber: video.classNumber,
                      }) || undefined
                    }
                    thumbnailUrl={video.thumbnailUrl}
                    youtubeUrl={video.youtubeUrl}
                    fileUrl={video.fileUrl}
                    videoUrl={video.videoUrl}
                    onPress={() => handlePlayVideo(video)}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </>
      )}

      {activeSubTab === 'live-sessions' && (
        <>
          <AdminSearchBar
            placeholder="Search live sessions..."
            value={sessionSearchTerm}
            onChangeText={setSessionSearchTerm}
            style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
          />

          <AdminFilterChips chips={statusChips} selected={filterStatus} onSelect={setFilterStatus} />

          {isLoadingSessions && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredSessions.length === 0 ? (
            <AdminEmptyState icon="radio-outline" title="No live sessions found" />
          ) : (
            <View style={[styles.listSection, { marginTop: spacing.md, gap: spacing.sm }]}>
              {filteredSessions.map((session, index) => (
                <AdminGlassCard key={session._id} delay={index * 50}>
                  <View style={styles.sessionCardHeader}>
                    <Text style={[styles.sessionTitle, { color: colors.text }]}>
                      {session.title || 'Untitled Session'}
                    </Text>
                    <View
                      style={[
                        styles.sessionStatusBadge,
                        { backgroundColor: getStatusColor(session.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.sessionStatusText, { color: getStatusColor(session.status) }]}
                      >
                        {session.status}
                      </Text>
                    </View>
                  </View>
                  {session.description ? (
                    <Text style={[styles.sessionDescription, { color: colors.textMuted }]}>
                      {session.description}
                    </Text>
                  ) : null}
                  <View style={styles.sessionDetails}>
                    {session.streamer ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="person" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          {session.streamer.fullName || session.streamer.email}
                        </Text>
                      </View>
                    ) : null}
                    {session.viewerCount !== undefined ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="eye" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          {session.viewerCount} viewers
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {(session.status === 'live' || session.status === 'Live') &&
                  (session.hlsUrl || session.playbackUrl || session.streamUrl) ? (
                    <AdminScalePressable
                      onPress={() => {
                        const url = session.hlsUrl || session.playbackUrl || session.streamUrl;
                        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open stream.'));
                      }}
                      style={[styles.watchLiveBtn, { backgroundColor: colors.danger, borderRadius: radius.sm }]}
                    >
                      <Ionicons name="radio" size={16} color={colors.textInverse} />
                      <Text style={[styles.watchLiveText, { color: colors.textInverse }]}>Watch Live</Text>
                    </AdminScalePressable>
                  ) : null}
                </AdminGlassCard>
              ))}
            </View>
          )}
        </>
      )}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  subTabsContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderWidth: 1,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  subTabText: { fontSize: 14, fontWeight: '600' },
  listSection: { gap: 16 },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sessionTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  sessionStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  sessionStatusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sessionDescription: { fontSize: 14, marginBottom: 12 },
  watchLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginTop: 8,
  },
  watchLiveText: { fontWeight: '700', fontSize: 14 },
  sessionDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14 },
  loadingContainer: { minHeight: 240, justifyContent: 'center', alignItems: 'center' },
});
