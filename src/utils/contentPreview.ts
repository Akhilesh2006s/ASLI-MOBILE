import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../lib/api-config';

const STREAMABLE_MEDIA_EXT =
  /\.(mp4|webm|ogg|mov|avi|mkv|mp3|wav|m4a|aac|flac|jpg|jpeg|png|gif|webp|svg|bmp)(\?|#|$)/i;

export type PreviewKind = 'youtube' | 'video' | 'pdf' | 'drive' | 'image' | 'audio' | 'unknown';

export function resolveContentUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/${trimmed}`;
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const short = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (short) return short[1];
  const watch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);
  if (watch) return watch[1];
  const embed = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/i);
  if (embed) return embed[1];
  const shorts = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i);
  if (shorts) return shorts[1];
  return null;
}

/** Origin sent as Referer for YouTube embeds in WebView (must match app bundle id). */
export const YOUTUBE_EMBED_ORIGIN = 'https://com.aslilearn.mobile';

export function getYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function buildYouTubeEmbedHtml(videoId: string): string {
  const origin = encodeURIComponent(YOUTUBE_EMBED_ORIGIN);
  const embedSrc =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` +
    `?playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="${embedSrc}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>
</body>
</html>`;
}

export function getYoutubeEmbedWebViewSource(url: string): { html: string; baseUrl: string } | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return {
    html: buildYouTubeEmbedHtml(id),
    baseUrl: YOUTUBE_EMBED_ORIGIN,
  };
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const origin = encodeURIComponent(YOUTUBE_EMBED_ORIGIN);
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function shouldFetchDirectly(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const directDomains = ['ncert.nic.in', 'ncertbooks.prashanthellina.com'];
    return directDomains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Proxy URL that returns PDF bytes for inline viewing (PDF.js / WebView). */
export async function getPdfJsFetchUrl(fileUrl: string, title?: string): Promise<string> {
  const absolute = resolveContentUrl(fileUrl);
  if (!absolute) return '';
  if (shouldFetchDirectly(absolute)) return absolute;

  const token = (await SecureStore.getItemAsync('authToken')) || '';
  return (
    `${API_BASE_URL}/api/student/content-preview` +
    `?url=${encodeURIComponent(absolute)}` +
    `&filename=${encodeURIComponent(title || 'preview.pdf')}` +
    `&token=${encodeURIComponent(token)}` +
    `&forceProxy=1`
  );
}

export function buildPdfJsPreviewHtml(pdfUrl: string): string {
  const safeUrl = JSON.stringify(pdfUrl);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #525659; min-height: 100%; }
    #status {
      color: #fff;
      text-align: center;
      padding: 32px 16px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
    }
    #pages { padding: 8px 0 24px; }
    canvas {
      display: block;
      margin: 0 auto 12px;
      max-width: calc(100% - 16px);
      height: auto;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    #error { color: #fca5a5; padding: 24px; text-align: center; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="status">Loading PDF…</div>
  <div id="pages"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const url = ${safeUrl};
    (async function () {
      const statusEl = document.getElementById('status');
      const container = document.getElementById('pages');
      try {
        const pdf = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        if (statusEl) statusEl.remove();
        const pageCount = pdf.numPages;
        for (let num = 1; num <= pageCount; num++) {
          const page = await pdf.getPage(num);
          const baseViewport = page.getViewport({ scale: 1 });
          const containerWidth = Math.max(document.documentElement.clientWidth - 16, 280);
          const scale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          container.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
      } catch (err) {
        if (statusEl) statusEl.remove();
        const errEl = document.createElement('div');
        errEl.id = 'error';
        errEl.textContent = 'Could not display this PDF. Please try again.';
        document.body.appendChild(errEl);
      }
    })();
  <\/script>
</body>
</html>`;
}

export function isPdfPreviewContent(fileUrl: string, contentType?: string | null): boolean {
  const absolute = resolveContentUrl(fileUrl).toLowerCase();
  if (!absolute) return false;
  if (absolute.includes('.pdf')) return true;
  if (STREAMABLE_MEDIA_EXT.test(absolute)) return false;
  if (absolute.includes('youtube.com') || absolute.includes('youtu.be')) return false;

  const type = (contentType || '').trim();
  if (type === 'TextBook' || type === 'Workbook' || type === 'PDF') return true;
  if (type === 'Material' || type === 'Homework') return true;
  if (/\/uploads\//i.test(absolute)) return true;

  return false;
}

export function getPreviewKind(
  fileUrl: string,
  contentType?: string | null,
  youtubeUrl?: string,
): PreviewKind {
  const resolved = resolveContentUrl(fileUrl);
  const yt = youtubeUrl || resolved;
  if (isYouTubeUrl(yt)) return 'youtube';
  if (contentType === 'Video' || /\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(resolved)) return 'video';
  if (contentType === 'Audio' || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(resolved)) return 'audio';
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|#|$)/i.test(resolved)) return 'image';
  if (isPdfPreviewContent(resolved, contentType)) return 'pdf';
  if (/drive\.google\.com|docs\.google\.com/i.test(resolved)) return 'drive';
  return 'unknown';
}

export function getDrivePreviewUrl(link: string): string {
  const trimmed = link.trim();
  let extractedId = '';

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    extractedId = fileMatch[1];
  } else {
    const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      extractedId = openMatch[1];
    } else {
      const docMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      if (docMatch) {
        extractedId = docMatch[1];
      } else {
        const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (sheetMatch) {
          extractedId = sheetMatch[1];
        } else {
          const slideMatch = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
          if (slideMatch) {
            extractedId = slideMatch[1];
          }
        }
      }
    }
  }

  if (!extractedId) return trimmed;

  if (trimmed.includes('document')) {
    return `https://docs.google.com/document/d/${extractedId}/preview`;
  }
  if (trimmed.includes('spreadsheet')) {
    return `https://docs.google.com/spreadsheets/d/${extractedId}/preview`;
  }
  if (trimmed.includes('presentation')) {
    return `https://docs.google.com/presentation/d/${extractedId}/preview`;
  }
  return `https://drive.google.com/file/d/${extractedId}/preview`;
}

export async function getPdfPreviewUrl(fileUrl: string, title?: string): Promise<string> {
  return getPdfJsFetchUrl(fileUrl, title);
}

export async function getAuthHeaders(url: string): Promise<Record<string, string> | undefined> {
  if (url.includes('content-preview') && url.includes('token=')) return undefined;
  if (!url.includes(API_BASE_URL) && !url.includes('/uploads/')) return undefined;
  const token = await SecureStore.getItemAsync('authToken');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}
