import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../../src/theme/student';
import { GlassPanel } from '../../../src/components/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import Header from './eduott/Header';
import SearchBar from './eduott/SearchBar';
import StudentFilterDropdown from '../../../src/components/student/StudentFilterDropdown';
import EduOTTVideoCard from '../../../src/components/eduott/EduOTTVideoCard';
import { resolveContentDurationSeconds, canJoinLiveSession } from '../../../src/utils/eduottVideoUtils';
import { dedupeLibraryContents } from '../../../src/lib/dedupe-library-content';
import { getVideoDisplayTitle } from '../../../src/lib/video-chapter-schedule';
import {
  extractPlainSubjectName,
  getSubjectClassLabel,
} from '../../../src/lib/subject-names';
import { useEduOTTFilters } from '../../../src/contexts/edu-ott-filter-context';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eduOttListScrollBottomPad, isTabletLayout } from '../../../src/lib/responsive-layout';

export type EduOTTRole = 'student' | 'teacher' | 'admin';

const DASHBOARD_LABELS: Record<EduOTTRole, string> = {
  student: 'Student Dashboard',
  teacher: 'Teacher Dashboard',
  admin: 'Admin Dashboard',
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function buildVideosUrl(
  role: EduOTTRole,
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams({ type: 'Video' });
  if (role === 'student') {
    if (selectedClass) params.set('class', selectedClass);
    if (selectedSubject) params.set('subject', selectedSubject);
  }
  return `${API_BASE_URL}/api/${role}/asli-prep-content?${params.toString()}`;
}

function buildStreamsUrl(
  role: EduOTTRole,
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams();
  if (role === 'student') {
    if (selectedClass) params.set('class', selectedClass);
    if (selectedSubject) params.set('subject', selectedSubject);
  }
  const q = params.toString();
  return `${API_BASE_URL}/api/${role}/streams${q ? `?${q}` : ''}`;
}

async function fetchRoleVideos(token: string, role: EduOTTRole): Promise<VideoItem[]> {
  const headers = authHeaders(token);
  let response = await fetch(buildVideosUrl(role, null, null), { headers });
  if (role === 'admin' && !response.ok) {
    response = await fetch(`${API_BASE_URL}/api/admin/videos`, { headers });
  }
  if (!response.ok) return [];
  const data = await response.json();
  return mapAndDedupeVideos(data.data || data || []);
}

function matchesClassSubject(
  subjectName: string | undefined,
  classNumber: string | undefined,
  selectedClass: string | null,
  selectedSubject: string | null
): boolean {
  const classLabel = getSubjectClassLabel({ name: subjectName, classNumber });
  const plainSubject = extractPlainSubjectName(subjectName || '').trim();
  if (selectedClass && classLabel !== selectedClass) return false;
  if (selectedSubject && plainSubject !== selectedSubject) return false;
  return true;
}

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  topic?: string;
  chapter?: string;
  module?: string;
  notes?: string;
  autoNotes?: string;
  aiFeatures?: {
    hasAutoNotes?: boolean;
    hasVisualMaps?: boolean;
    hasVoiceQA?: boolean;
    hasNotes?: boolean;
    hasMindMap?: boolean;
  };
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
  playbackUrl?: string;
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
  scheduledTime?: string;
  scheduledStartTime?: string;
  subject?: { _id: string; name: string };
  classNumber?: string;
  viewerCount?: number;
  visibility?: 'teacher' | 'student' | 'both';
}

interface EduOTTViewProps {
  username?: string;
  role?: EduOTTRole;
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
    title: getVideoDisplayTitle({ ...content, type: 'Video' }),
    description: content.description || '',
    topic: content.topic || '',
    chapter: content.chapter || '',
    module: content.module || '',
    notes: content.notes || content.autoNotes || '',
    autoNotes: content.autoNotes || content.notes || '',
    aiFeatures: content.aiFeatures,
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

function mapAndDedupeVideos(list: unknown[]): VideoItem[] {
  return dedupeLibraryContents(Array.isArray(list) ? list : []).map(mapContentToVideoItem);
}

const EDUOTT_EDGE_PAD = STUDENT_SPACING.sm;

function useEduOTTGridLayout() {
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const isGrid = numColumns > 1;
  const columnGap = STUDENT_SPACING.md;
  const listContentWidth = screenWidth - EDUOTT_EDGE_PAD * 2;
  const gridCardWidth = isGrid
    ? (listContentWidth - columnGap * (numColumns - 1)) / numColumns
    : undefined;

  return { numColumns, isGrid, gridCardWidth };
}

export default function EduOTTView({ username = 'Student', role = 'student' }: EduOTTViewProps) {
  const { numColumns, isGrid, gridCardWidth } = useEduOTTGridLayout();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = isTabletLayout(width, height);
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const useClientSideFilters = role !== 'student';
  const dashboardLabel = DASHBOARD_LABELS[role];
  const listScrollBottomPad = eduOttListScrollBottomPad(
    role,
    isTablet,
    STUDENT_SPACING.md,
    insets.bottom,
  );
  const {
    selectedClass,
    selectedSubject,
    listEpoch,
    setSelectedClass,
    setSelectedSubject,
  } = useEduOTTFilters();

  type EduOTTTab = 'videos' | 'live-sessions';
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
    if (!programLoading && !isAsliPrepExclusive && activeTab === 'videos') {
      setActiveTab('live-sessions');
    }
  }, [programLoading, isAsliPrepExclusive, activeTab]);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;
      try {
        const [videoList, sRes] = await Promise.all([
          isAsliPrepExclusive ? fetchRoleVideos(token, role) : Promise.resolve([]),
          fetch(buildStreamsUrl(role, null, null), { headers: authHeaders(token) }),
        ]);
        if (cancelled) return;
        setVideoCatalog(videoList);
        if (sRes.ok) {
          const data = await sRes.json();
          setSessionCatalog(data.data || data || []);
        } else {
          setSessionCatalog([]);
        }
      } catch {
        if (!cancelled) {
          setVideoCatalog([]);
          setSessionCatalog([]);
        }
      }
    }
    if (!programLoading) {
      loadCatalog();
    }
    return () => {
      cancelled = true;
    };
  }, [isAsliPrepExclusive, programLoading, role]);

  useEffect(
    () => setVisibleCount(10),
    [searchTerm, listEpoch]
  );

  useEffect(() => {
    if (activeTab !== 'videos') {
      setLoading(false);
      return;
    }
    if (!isAsliPrepExclusive) {
      setVideos([]);
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

        const response = useClientSideFilters
          ? null
          : await fetch(buildVideosUrl(role, selectedClass, selectedSubject), {
              headers: authHeaders(token),
            });

        if (cancelled) return;

        if (useClientSideFilters) {
          const list = await fetchRoleVideos(token, role);
          if (!cancelled) setVideos(list);
        } else if (response?.ok) {
          const data = await response.json();
          const videosList = data.data || data || [];
          setVideos(mapAndDedupeVideos(videosList));
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
  }, [
    activeTab,
    isAsliPrepExclusive,
    role,
    useClientSideFilters,
    listEpoch,
    ...(useClientSideFilters ? [] : [selectedClass, selectedSubject]),
  ]);

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

        const response = await fetch(
          useClientSideFilters ? buildStreamsUrl(role, null, null) : buildStreamsUrl(role, selectedClass, selectedSubject),
          {
            headers: authHeaders(token),
          }
        );

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
  }, [
    activeTab,
    role,
    useClientSideFilters,
    listEpoch,
    ...(useClientSideFilters ? [] : [selectedClass, selectedSubject]),
  ]);

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

  const classSubjectFilteredVideos = useMemo(
    () =>
      useClientSideFilters
        ? videos.filter((video) =>
            matchesClassSubject(video.subjectName, video.classNumber, selectedClass, selectedSubject)
          )
        : videos,
    [videos, selectedClass, selectedSubject, useClientSideFilters]
  );

  const classSubjectFilteredSessions = useMemo(
    () =>
      useClientSideFilters
        ? liveSessions.filter((session) =>
            matchesClassSubject(session.subject?.name, session.classNumber, selectedClass, selectedSubject)
          )
        : liveSessions,
    [liveSessions, selectedClass, selectedSubject, useClientSideFilters]
  );

  const filteredVideos = useMemo(() => {
    return classSubjectFilteredVideos.filter((video) => {
      const matchesSearch =
        !searchTerm ||
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [classSubjectFilteredVideos, searchTerm]);

  const filteredSessions = useMemo(() => {
    return classSubjectFilteredSessions.filter((session) => {
      const matchesSearch =
        !sessionSearchTerm ||
        session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
        (session.description || '').toLowerCase().includes(sessionSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [classSubjectFilteredSessions, sessionSearchTerm]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  const classDropdownOptions = useMemo(
    () => [
      { value: 'all', label: 'All Classes' },
      ...globalClassOptions.map((c) => ({ value: c, label: `Class ${c}` })),
    ],
    [globalClassOptions]
  );

  const subjectDropdownOptions = useMemo(
    () => [
      { value: 'all', label: 'All Subjects' },
      ...globalSubjectOptions.map((n) => ({ value: n, label: n })),
    ],
    [globalSubjectOptions]
  );

  const handlePlayVideo = useCallback((video: VideoItem) => {
    if (!video._id) return;
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
          type: 'Video',
          subject: video.subjectName,
          topic: video.topic,
          chapter: video.chapter,
          module: video.module,
          aiFeatures: video.aiFeatures,
          notes: video.notes,
          autoNotes: video.autoNotes,
        }),
        returnTo: 'eduott',
      },
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
      const [videoList, sRes] = await Promise.all([
        isAsliPrepExclusive ? fetchRoleVideos(token, role) : Promise.resolve([]),
        fetch(buildStreamsUrl(role, null, null), { headers: authHeaders(token) }),
      ]);
      if (isAsliPrepExclusive) {
        setVideoCatalog(videoList);
        if (useClientSideFilters) {
          setVideos(videoList);
        } else {
          const v2 = await fetch(buildVideosUrl(role, selectedClass, selectedSubject), {
            headers: authHeaders(token),
          });
          if (v2.ok) {
            const data = await v2.json();
            setVideos(mapAndDedupeVideos(data.data || data || []));
          }
        }
      } else {
        setVideoCatalog([]);
        setVideos([]);
      }
      if (sRes.ok) {
        const data = await sRes.json();
        const allSessions = data.data || data || [];
        setSessionCatalog(allSessions);
        if (useClientSideFilters) {
          setLiveSessions(allSessions);
        } else {
          const s2 = await fetch(buildStreamsUrl(role, selectedClass, selectedSubject), {
            headers: authHeaders(token),
          });
          if (s2.ok) {
            const sData = await s2.json();
            setLiveSessions(sData.data || sData || []);
          }
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedClass, selectedSubject, isAsliPrepExclusive, role, useClientSideFilters]);

  const onEndReached = useCallback(() => {
    if (visibleCount < filteredVideos.length) {
      setVisibleCount(prev => prev + 10);
    }
  }, [visibleCount, filteredVideos.length]);

  const clearAllFilters = useCallback(() => {
    setSelectedClass(null);
    setSelectedSubject(null);
    setSearchTerm('');
    setSessionSearchTerm('');
  }, [setSelectedClass, setSelectedSubject]);

  const hasVideoFilters = Boolean(selectedClass || selectedSubject || searchTerm.trim());
  const hasSessionFilters = Boolean(selectedClass || selectedSubject || sessionSearchTerm.trim());

  const videoEmptyContent = useMemo(() => {
    if (!isAsliPrepExclusive) {
      return {
        icon: 'school-outline' as const,
        title: 'Videos not available',
        subtitle:
          'On-demand videos are included with Asli Prep schools. You can still join live classes from the Live tab.',
        actionLabel: 'View live sessions',
        onAction: () => setActiveTab('live-sessions'),
      };
    }
    if (searchTerm.trim() && classSubjectFilteredVideos.length > 0) {
      return {
        icon: 'search-outline' as const,
        title: 'No matching videos',
        subtitle: `Nothing matched “${searchTerm.trim()}”. Try a different keyword or clear your search.`,
        actionLabel: 'Clear search',
        onAction: () => setSearchTerm(''),
      };
    }
    if (hasVideoFilters && videoCatalog.length > 0) {
      const parts: string[] = [];
      if (selectedClass) parts.push(`Class ${selectedClass}`);
      if (selectedSubject) parts.push(selectedSubject);
      return {
        icon: 'filter-outline' as const,
        title: 'No videos for these filters',
        subtitle:
          parts.length > 0
            ? `No videos found for ${parts.join(' · ')}. Try another class or subject, or clear filters to browse all videos.`
            : 'No videos match your current filters. Clear filters to see everything available.',
        actionLabel: 'Clear filters',
        onAction: clearAllFilters,
      };
    }
    if (videoCatalog.length === 0) {
      return {
        icon: 'videocam-outline' as const,
        title: 'No videos yet',
        subtitle: 'Your school has not published any videos yet. Pull down to refresh, or check live sessions for upcoming classes.',
        actionLabel: 'Refresh',
        onAction: () => void onRefresh(),
      };
    }
    return {
      icon: 'videocam-outline' as const,
      title: 'No videos found',
      subtitle: 'Try another class, subject, or search term—or clear filters to see all available videos.',
      actionLabel: hasVideoFilters ? 'Clear filters' : undefined,
      onAction: hasVideoFilters ? clearAllFilters : undefined,
    };
  }, [
    isAsliPrepExclusive,
    searchTerm,
    classSubjectFilteredVideos.length,
    hasVideoFilters,
    videoCatalog.length,
    selectedClass,
    selectedSubject,
    clearAllFilters,
    onRefresh,
  ]);

  const sessionEmptyContent = useMemo(() => {
    if (sessionSearchTerm.trim() && classSubjectFilteredSessions.length > 0) {
      return {
        icon: 'search-outline' as const,
        title: 'No matching sessions',
        subtitle: `Nothing matched “${sessionSearchTerm.trim()}”. Try another keyword or clear your search.`,
        actionLabel: 'Clear search',
        onAction: () => setSessionSearchTerm(''),
      };
    }
    if (hasSessionFilters && sessionCatalog.length > 0) {
      return {
        icon: 'filter-outline' as const,
        title: 'No sessions for these filters',
        subtitle: 'Try another class or subject, or clear filters to see all scheduled live classes.',
        actionLabel: 'Clear filters',
        onAction: clearAllFilters,
      };
    }
    if (sessionCatalog.length === 0) {
      return {
        icon: 'radio-outline' as const,
        title: 'No live sessions right now',
        subtitle: 'When your teachers schedule a class, it will show up here. Pull down to refresh.',
        actionLabel: 'Refresh',
        onAction: () => void onRefresh(),
      };
    }
    return {
      icon: 'radio-outline' as const,
      title: 'No sessions match filters',
      subtitle: 'Try another search or clear filters to browse all live sessions.',
      actionLabel: hasSessionFilters ? 'Clear filters' : undefined,
      onAction: hasSessionFilters ? clearAllFilters : undefined,
    };
  }, [
    sessionSearchTerm,
    classSubjectFilteredSessions.length,
    hasSessionFilters,
    sessionCatalog.length,
    clearAllFilters,
    onRefresh,
  ]);

  const renderEmptyStateCard = (content: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <GlassPanel style={styles.emptyCard} radius={STUDENT_RADIUS.card}>
      {/* Child centering lives on this inner view — GlassPanel wraps children itself. */}
      <View style={styles.emptyCardInner}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={content.icon} size={32} color={STUDENT.primaryDark} />
        </View>
        <Text style={styles.emptyTitle}>{content.title}</Text>
        <Text style={styles.emptyText}>{content.subtitle}</Text>
        {content.actionLabel && content.onAction ? (
          <TouchableOpacity style={styles.emptyActionBtn} activeOpacity={0.85} onPress={content.onAction}>
            <Text style={styles.emptyActionText}>{content.actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </GlassPanel>
  );

  const renderVideoItem = useCallback(({ item: video }: { item: VideoItem }) => (
    <EduOTTVideoCard
      variant="student"
      style={gridCardWidth != null ? { width: gridCardWidth } : undefined}
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
  ), [handlePlayVideo, gridCardWidth]);

  const renderSessionItem = useCallback(({ item }: { item: LiveSession }) => {
    const statusColor = getStatusColor(item.status);
    const joinable = canJoinLiveSession(item);
    return (
      <GlassPanel style={styles.sessionCard} radius={STUDENT_RADIUS.inner}>
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
              const plain = extractPlainSubjectName(item.subject?.name || 'Live Session');
              const cl = getSubjectClassLabel({
                name: item.subject?.name,
                classNumber: item.classNumber,
              });
              return cl ? `${plain} · Class ${cl}` : plain;
            })()}
          </Text>
        </View>
        {joinable ? (
          <TouchableOpacity
            style={styles.joinSessionButton}
            activeOpacity={0.9}
            onPress={() => handleJoinLive(item)}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.joinSessionButtonText}>Join Session</Text>
          </TouchableOpacity>
        ) : null}
      </GlassPanel>
    );
  }, [handleJoinLive]);

  const videoKeyExtractor = useCallback((item: VideoItem) => item._id, []);

  const listHeader = (
    <>
      <Header username={username} dashboardLabel={dashboardLabel} />

      <GlassPanel style={styles.summaryCard} radius={STUDENT_RADIUS.inner}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <Ionicons name="videocam" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>EduOTT</Text>
            <Text style={styles.summarySubtitle}>
              {isAsliPrepExclusive ? 'Videos & Live Classes' : 'Live Classes'}
            </Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          {isAsliPrepExclusive && (
            <TouchableOpacity
              style={[styles.statChip, activeTab === 'videos' && styles.statChipActive]}
              activeOpacity={0.85}
              onPress={() => setActiveTab('videos')}
            >
              <Text style={[styles.statChipText, activeTab === 'videos' && styles.statChipTextActive]}>
                🎥 {classSubjectFilteredVideos.length} Videos
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.statChip, activeTab === 'live-sessions' && styles.statChipActive]}
            activeOpacity={0.85}
            onPress={() => setActiveTab('live-sessions')}
          >
            <Text style={[styles.statChipText, activeTab === 'live-sessions' && styles.statChipTextActive]}>
              🔴 {classSubjectFilteredSessions.filter((x) => x.status === 'live').length} Live
            </Text>
          </TouchableOpacity>
        </View>
      </GlassPanel>

      <View style={styles.filterRow}>
        <StudentFilterDropdown
          label="Class"
          value={selectedClass ?? 'all'}
          placeholder="All Classes"
          options={classDropdownOptions}
          onChange={(v) => setSelectedClass(v === 'all' ? null : v)}
        />
        <StudentFilterDropdown
          label="Subject"
          value={selectedSubject ?? 'all'}
          placeholder="All Subjects"
          options={subjectDropdownOptions}
          onChange={(v) => setSelectedSubject(v === 'all' ? null : v)}
        />
      </View>
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
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          {listHeader}
          {renderSkeletons()}
        </View>
      );
    }

    return (
      <FlatList
        key={`eduott-videos-${numColumns}`}
        data={visibleVideos}
        keyExtractor={videoKeyExtractor}
        renderItem={renderVideoItem}
        numColumns={numColumns}
        columnWrapperStyle={isGrid ? styles.columnWrapper : undefined}
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar value={searchTerm} onChangeText={setSearchTerm} />
            {filteredVideos.length > 0 ? (
              <Text style={styles.resultsCount}>
                Showing {visibleVideos.length} of {filteredVideos.length}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={renderEmptyStateCard(videoEmptyContent)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: listScrollBottomPad },
          isGrid && styles.listContainerGrid,
          filteredVideos.length === 0 && styles.listContainerEmpty,
        ]}
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
        ListEmptyComponent={renderEmptyStateCard(sessionEmptyContent)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: listScrollBottomPad },
          filteredSessions.length === 0 && styles.listContainerEmpty,
        ]}
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
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
    paddingTop: STUDENT_SPACING.sm,
  },
  listContainer: {
    paddingHorizontal: EDUOTT_EDGE_PAD,
    paddingBottom: STUDENT_SPACING.xl,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: EDUOTT_EDGE_PAD,
  },
  listContainerGrid: {
    width: '100%',
  },
  columnWrapper: {
    gap: STUDENT_SPACING.md,
  },
  summaryCard: {
    // Fill comes from GlassPanel's blur + white rim.
    borderRadius: STUDENT_RADIUS.inner,
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
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: STUDENT_RADIUS.full,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    alignItems: 'center',
  },
  statChipActive: {
    backgroundColor: STUDENT.navActiveBg,
    borderColor: STUDENT.primary,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.text,
  },
  statChipTextActive: {
    color: STUDENT.primaryDark,
  },
  filterRow: {
    flexDirection: 'row',
    gap: STUDENT_SPACING.sm,
    marginBottom: STUDENT_SPACING.md,
  },
  resultsCount: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    marginBottom: STUDENT_SPACING.sm,
  },
  emptyCard: {
    marginTop: STUDENT_SPACING.lg,
    marginBottom: STUDENT_SPACING.xl,
    paddingVertical: STUDENT_SPACING.xxl,
    paddingHorizontal: STUDENT_SPACING.lg,
    borderRadius: STUDENT_RADIUS.card,
    ...STUDENT.shadow.sm,
  },
  emptyCardInner: {
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: STUDENT.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: STUDENT_SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: STUDENT.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: STUDENT_SPACING.sm,
    fontSize: 14,
    lineHeight: 21,
    color: STUDENT.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  emptyActionBtn: {
    marginTop: STUDENT_SPACING.lg,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.primary,
    ...STUDENT.shadow.sm,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.textOnPrimary,
  },
  sessionCard: {
    // Fill comes from GlassPanel's blur + white rim.
    borderRadius: STUDENT_RADIUS.inner,
    padding: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.sm,
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
  joinSessionLabel: {
    color: '#dc2626',
    fontWeight: '700',
  },
  joinSessionButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  joinSessionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  skeletonWrap: {
    marginTop: STUDENT_SPACING.md,
    gap: STUDENT_SPACING.sm,
  },
});

