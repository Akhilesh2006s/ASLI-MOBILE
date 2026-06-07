import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../../src/theme/student';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import Header from './eduott/Header';
import TabSwitcher, { EduOTTTab } from './eduott/TabSwitcher';
import SearchBar from './eduott/SearchBar';
import FilterChips from './eduott/FilterChips';
import EduOTTVideoCard from '../../../src/components/eduott/EduOTTVideoCard';
import { resolveContentDurationSeconds } from '../../../src/utils/eduottVideoUtils';
import {
  extractPlainSubjectName,
  getSubjectClassLabel,
} from '../../../src/lib/subject-names';
import { useEduOTTFilters } from '../../../src/contexts/edu-ott-filter-context';

function buildVideosUrl(
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams({ type: 'Video' });
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  return `${API_BASE_URL}/api/student/asli-prep-content?${params.toString()}`;
}

function buildStreamsUrl(
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams();
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  const q = params.toString();
  return `${API_BASE_URL}/api/student/streams${q ? `?${q}` : ''}`;
}

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  fileUrl?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  isYouTubeVideo?: boolean;
  subjectId?: string;
  subjectName?: string;
  classNumber?: string;
  views?: number;
  watchProgress?: number;
}

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamUrl?: string;
  scheduledTime?: string;
  subject?: { _id: string; name: string };
  classNumber?: string;
  viewerCount?: number;
}

interface EduOTTViewProps {
  username?: string;
}

function mapContentToVideoItem(content: any): VideoItem {
  const subjectId = content.subject?._id || content.subject?.id || (typeof content.subject === 'string' ? content.subject : '');
  const subjectName = content.subject?.name || (typeof content.subject === 'string' ? content.subject : 'Unknown Subject');
  const durationInSeconds = resolveContentDurationSeconds({
    duration: content.duration,
    durationSeconds: content.durationSeconds,
  });

  let videoFileUrl = content.fileUrl || content.videoUrl;
  if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
    if (videoFileUrl.startsWith('/')) {
      videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
    } else {
      videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
    }
  }

  const classNum =
    content.classNumber != null && String(content.classNumber).trim() !== ''
      ? String(content.classNumber).trim()
      : content.subject?.classNumber != null && String(content.subject.classNumber).trim() !== ''
        ? String(content.subject.classNumber).trim()
        : undefined;

  return {
    _id: content._id,
    title: content.title || 'Untitled Video',
    description: content.description || '',
    videoUrl: videoFileUrl,
    fileUrl: videoFileUrl,
    youtubeUrl: content.youtubeUrl || undefined,
    thumbnailUrl: content.thumbnailUrl || undefined,
    duration: durationInSeconds,
    views: content.views || 0,
    subjectId: subjectId ? String(subjectId) : '',
    subjectName: subjectName,
    classNumber: classNum,
    watchProgress: Number(content.watchProgress || content.progress || 0),
    isYouTubeVideo: !!(
      videoFileUrl &&
      (videoFileUrl.includes('youtube.com') || videoFileUrl.includes('youtu.be'))
    ),
  };
}

export default function EduOTTView({ username = 'Student' }: EduOTTViewProps) {
  const {
    selectedClass,
    selectedSubject,
    listEpoch,
    setSelectedClass,
    setSelectedSubject,
    clearFilters,
    clearClass,
    clearSubject,
  } = useEduOTTFilters();

  const [activeTab, setActiveTab] = useState<EduOTTTab>('videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [videoCatalog, setVideoCatalog] = useState<VideoItem[]>([]);
  const [sessionCatalog, setSessionCatalog] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;
      try {
        const [vRes, sRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Video`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(`${API_BASE_URL}/api/student/streams`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
        ]);
        if (cancelled) return;
        if (vRes.ok) {
          const data = await vRes.json();
          const list = data.data || data || [];
          setVideoCatalog(list.map(mapContentToVideoItem));
        } else setVideoCatalog([]);
        if (sRes.ok) {
          const data = await sRes.json();
          const list = data.data || data || [];
          setSessionCatalog(list);
        } else setSessionCatalog([]);
      } catch {
        if (!cancelled) {
          setVideoCatalog([]);
          setSessionCatalog([]);
        }
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => setVisibleCount(10),
    [searchTerm, listEpoch]
  );

  useEffect(() => {
    if (activeTab !== 'videos') {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchVideos() {
      try {
        setLoading(true);
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(buildVideosUrl(selectedClass, selectedSubject), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const videosList = data.data || data || [];
          setVideos(videosList.map(mapContentToVideoItem));
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedClass, selectedSubject, listEpoch]);

  useEffect(() => {
    if (activeTab !== 'live-sessions') {
      setLoadingSessions(false);
      return;
    }
    let cancelled = false;

    async function fetchLiveSessions() {
      try {
        setLoadingSessions(true);
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
          setLoadingSessions(false);
          return;
        }

        const response = await fetch(buildStreamsUrl(selectedClass, selectedSubject), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const sessionsList = data.data || data || [];
          setLiveSessions(sessionsList);
        } else {
          setLiveSessions([]);
        }
      } catch (error) {
        console.error('Failed to fetch live sessions:', error);
        if (!cancelled) setLiveSessions([]);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }

    fetchLiveSessions();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedClass, selectedSubject, listEpoch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'scheduled':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'ended':
        return { bg: '#f3f4f6', text: '#6b7280' };
      case 'cancelled':
        return { bg: '#fed7aa', text: '#ea580c' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const globalClassOptions = useMemo(() => {
    const set = new Set<string>();
    videoCatalog.forEach((v) => {
      const l = getSubjectClassLabel({
        name: v.subjectName,
        classNumber: v.classNumber,
      });
      if (l) set.add(l);
    });
    sessionCatalog.forEach((session) => {
      const l = getSubjectClassLabel({
        name: session.subject?.name,
        classNumber: session.classNumber,
      });
      if (l) set.add(l);
    });
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [videoCatalog, sessionCatalog]);

  const globalSubjectOptions = useMemo(() => {
    const names = new Set<string>();
    videoCatalog.forEach((v) => {
      const l = getSubjectClassLabel({
        name: v.subjectName,
        classNumber: v.classNumber,
      });
      if (selectedClass && l !== selectedClass) return;
      names.add(extractPlainSubjectName(v.subjectName || '').trim());
    });
    sessionCatalog.forEach((session) => {
      const l = getSubjectClassLabel({
        name: session.subject?.name,
        classNumber: session.classNumber,
      });
      if (selectedClass && l !== selectedClass) return;
      names.add(extractPlainSubjectName(session.subject?.name || '').trim());
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [videoCatalog, sessionCatalog, selectedClass]);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch =
        !searchTerm ||
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [videos, searchTerm]);

  const filteredSessions = useMemo(() => {
    return liveSessions.filter((session) => {
      const matchesSearch =
        !sessionSearchTerm ||
        session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
        (session.description || '').toLowerCase().includes(sessionSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [liveSessions, sessionSearchTerm]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  const videoClassChipOptions = useMemo(
    () => globalClassOptions.map((c) => ({ value: c, label: `Class ${c}` })),
    [globalClassOptions]
  );
  const videoSubjectChipOptions = useMemo(
    () => globalSubjectOptions.map((n) => ({ value: n, label: n })),
    [globalSubjectOptions]
  );

  const classChipSelected = selectedClass ?? 'all';
  const subjectChipSelected = selectedSubject ?? 'all';

  const handlePlayVideo = useCallback((video: VideoItem) => {
    if (!video._id) return;
    router.push({
      pathname: '/video-player',
      params: { videoId: video._id, isContentItem: 'true' },
    });
  }, []);

  const handleJoinLive = useCallback((session: LiveSession) => {
    if (!session._id) return;
    router.push({
      pathname: '/live-stream',
      params: { sessionId: session._id },
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      setRefreshing(false);
      return;
    }
    try {
      const [vRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Video`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
        fetch(`${API_BASE_URL}/api/student/streams`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
      ]);
      if (vRes.ok) {
        const data = await vRes.json();
        setVideoCatalog((data.data || data || []).map(mapContentToVideoItem));
      }
      if (sRes.ok) {
        const data = await sRes.json();
        setSessionCatalog(data.data || data || []);
      }
      const vUrl = buildVideosUrl(selectedClass, selectedSubject);
      const v2 = await fetch(vUrl, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (v2.ok) {
        const data = await v2.json();
        setVideos((data.data || data || []).map(mapContentToVideoItem));
      }
      const sUrl = buildStreamsUrl(selectedClass, selectedSubject);
      const s2 = await fetch(sUrl, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (s2.ok) {
        const data = await s2.json();
        setLiveSessions(data.data || data || []);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedClass, selectedSubject]);

  const onEndReached = useCallback(() => {
    if (visibleCount < filteredVideos.length) {
      setVisibleCount(prev => prev + 10);
    }
  }, [visibleCount, filteredVideos.length]);

  const renderVideoItem = useCallback(({ item: video }: { item: VideoItem }) => (
    <EduOTTVideoCard
      variant="student"
      title={video.title}
      durationSeconds={video.duration}
      subjectLabel={extractPlainSubjectName(video.subjectName || '').trim() || undefined}
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
  ), [handlePlayVideo]);

  const renderSessionItem = useCallback(({ item }: { item: LiveSession }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity style={styles.sessionCard} activeOpacity={0.9} onPress={() => handleJoinLive(item)}>
        <View style={styles.sessionTopRow}>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.sessionStatus, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.sessionStatusText, { color: statusColor.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.sessionDescription} numberOfLines={2}>
          {item.description || 'Live class session'}
        </Text>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionMetaText}>
            {(() => {
              const plain = extractPlainSubjectName(item.subject?.name || 'General');
              const cl = getSubjectClassLabel({
                name: item.subject?.name,
                classNumber: item.classNumber,
              });
              return cl ? `${plain} · Class ${cl}` : plain;
            })()}
          </Text>
          <Text style={styles.sessionMetaText}>•</Text>
          <Text style={styles.sessionMetaText}>{item.viewerCount || 0} watching</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleJoinLive]);

  const videoKeyExtractor = useCallback((item: VideoItem) => item._id, []);

  const listHeader = (
    <>
      <Header username={username} />

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <Ionicons name="videocam" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>EduOTT</Text>
            <Text style={styles.summarySubtitle}>Videos & Live Classes</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <TouchableOpacity style={styles.statChip} activeOpacity={0.85} onPress={() => setActiveTab('videos')}>
            <Text style={styles.statChipText}>🎥 {videos.length} Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statChip} activeOpacity={0.85} onPress={() => setActiveTab('live-sessions')}>
            <Text style={styles.statChipText}>🔴 {liveSessions.filter(x => x.status === 'live').length} Live</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

      <FilterChips
        sectionLabel="Class"
        selected={classChipSelected}
        onSelect={(v) => setSelectedClass(v === 'all' ? null : v)}
        options={videoClassChipOptions}
      />
      <FilterChips
        sectionLabel="Subject"
        selected={subjectChipSelected}
        onSelect={(v) => setSelectedSubject(v === 'all' ? null : v)}
        options={videoSubjectChipOptions}
      />

      {(selectedClass != null || selectedSubject != null) && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersLabel}>Active:</Text>
          {selectedClass != null && (
            <TouchableOpacity style={styles.activeChip} onPress={clearClass}>
              <Text style={styles.activeChipText}>Class: {selectedClass} ✕</Text>
            </TouchableOpacity>
          )}
          {selectedSubject != null && (
            <TouchableOpacity style={styles.activeChipAlt} onPress={clearSubject}>
              <Text style={styles.activeChipText}>Subject: {selectedSubject} ✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearAllText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderSkeletons = () => (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map((n) => (
        <ShimmerCard key={n} />
      ))}
    </View>
  );

  const renderVideoContent = () => {
    if (loading) return renderSkeletons();
    if (filteredVideos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={52} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No videos found</Text>
          <Text style={styles.emptyText}>
            No content available for the selected filters, or try another keyword. Clear filters to see all items.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={visibleVideos}
        keyExtractor={videoKeyExtractor}
        renderItem={renderVideoItem}
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar value={searchTerm} onChangeText={setSearchTerm} />
            <Text style={styles.resultsCount}>Showing {visibleVideos.length} of {filteredVideos.length}</Text>
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        contentContainerStyle={styles.listContainer}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        windowSize={9}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderLiveContent = () => {
    if (loadingSessions) {
      return (
        <View style={styles.skeletonWrap}>
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </View>
      );
    }

    return (
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item._id}
        renderItem={renderSessionItem}
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar
              value={sessionSearchTerm}
              onChangeText={setSessionSearchTerm}
              placeholder="Search live sessions..."
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={52} color="#94a3b8" />
            <Text style={styles.emptyTitle}>
              {liveSessions.length === 0 ? 'No live sessions right now' : 'No sessions match filters'}
            </Text>
            <Text style={styles.emptyText}>
              {liveSessions.length === 0
                ? 'Upcoming classes will appear here.'
                : 'Try another search or class/subject filter.'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {activeTab === 'videos' ? renderVideoContent() : renderLiveContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STUDENT.bg,
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingTop: STUDENT_SPACING.sm,
  },
  listContainer: {
    paddingBottom: STUDENT_SPACING.xl,
  },
  summaryCard: {
    backgroundColor: STUDENT.accentSoft,
    borderRadius: STUDENT_RADIUS.inner,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    padding: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.md,
    ...STUDENT.shadow.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: STUDENT_RADIUS.md,
    backgroundColor: STUDENT.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 18,
    color: STUDENT.text,
  },
  summarySubtitle: {
    fontSize: 13,
    color: STUDENT.textMuted,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.full,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    alignItems: 'center',
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.text,
  },
  resultsCount: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    marginBottom: STUDENT_SPACING.sm,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  activeFiltersLabel: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
  },
  activeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.accentSoft,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  activeChipAlt: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.navActiveBg,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.text,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.accent,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    marginTop: 30,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: STUDENT.textSecondary,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: STUDENT.textMuted,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.inner,
    padding: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.sm,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    ...STUDENT.shadow.sm,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
    marginRight: 8,
  },
  sessionStatus: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sessionDescription: {
    fontSize: 13,
    color: STUDENT.textMuted,
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionMetaText: {
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  skeletonWrap: {
    marginTop: STUDENT_SPACING.md,
    gap: STUDENT_SPACING.sm,
  },
});

