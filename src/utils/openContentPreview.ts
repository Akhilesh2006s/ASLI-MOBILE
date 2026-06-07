import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import { getPreviewKind, isYouTubeUrl, resolveContentUrl } from './contentPreview';

type ContentLike = {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
  fileUrl?: string;
  fileUrls?: string[];
  youtubeUrl?: string;
  driveLink?: string;
  videoUrl?: string;
};

import type { ContentReturnTarget } from '../hooks/useBackNavigation';

export function openContentPreview(
  router: Router,
  item: ContentLike,
  options?: { returnTo?: ContentReturnTarget }
) {
  const rawUrl =
    item.fileUrls?.[0] ||
    item.fileUrl ||
    item.videoUrl ||
    item.driveLink ||
    item.youtubeUrl ||
    '';
  const contentId = item._id || item.id;

  const isVideoType =
    item.type === 'Video' ||
    isYouTubeUrl(item.youtubeUrl || '') ||
    isYouTubeUrl(rawUrl) ||
    getPreviewKind(rawUrl, item.type, item.youtubeUrl) === 'video' ||
    getPreviewKind(rawUrl, item.type, item.youtubeUrl) === 'youtube';

  if (isVideoType) {
    const returnParams = options?.returnTo ? { returnTo: options.returnTo } : {};
    if (contentId) {
      router.push({
        pathname: '/video-player',
        params: { videoId: String(contentId), ...returnParams },
      });
      return;
    }

    router.push({
      pathname: '/video-player',
      params: {
        isContentItem: 'true',
        contentData: JSON.stringify({
          _id: 'preview',
          title: item.title || 'Video',
          fileUrl: resolveContentUrl(rawUrl),
          youtubeUrl: item.youtubeUrl,
          type: item.type || 'Video',
        }),
        ...returnParams,
      },
    });
    return;
  }

  const link = item.driveLink || rawUrl;
  if (!link) {
    Alert.alert('Content', item.title || 'No preview available for this item.');
    return;
  }

  router.push({
    pathname: '/drive-viewer',
    params: {
      driveLink: encodeURIComponent(link),
      title: item.title || 'Preview',
      contentType: item.type || '',
      ...returnParams,
    },
  });
}
