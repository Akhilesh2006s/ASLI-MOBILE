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

function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const h = new Uint8Array(buffer, 0, 5);
  return h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 && h[4] === 0x2d;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  try {
    const { Buffer } = require('buffer');
    return Buffer.from(bytes).toString('base64');
  } catch {
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    if (typeof globalThis.btoa === 'function') {
      return globalThis.btoa(binary);
    }
    return '';
  }
}

/** Fetch PDF bytes in the native layer (auth + proxy), not inside WebView. */
const pdfBytesCache = new Map<string, { bytes: Uint8Array; at: number }>();
const PDF_CACHE_TTL_MS = 15 * 60 * 1000;
const PDF_CACHE_MAX = 6;

function cachePdfBytes(key: string, bytes: Uint8Array) {
  if (pdfBytesCache.size >= PDF_CACHE_MAX) {
    const oldest = [...pdfBytesCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) pdfBytesCache.delete(oldest[0]);
  }
  pdfBytesCache.set(key, { bytes, at: Date.now() });
}

function racePdfAttempts<T>(attempts: Promise<T | null>[]): Promise<T | null> {
  if (attempts.length === 0) return Promise.resolve(null);
  return new Promise((resolve) => {
    let pending = attempts.length;
    let settled = false;

    const finish = (result: T | null) => {
      if (settled) return;
      if (result) {
        settled = true;
        resolve(result);
        return;
      }
      pending -= 1;
      if (pending === 0) {
        settled = true;
        resolve(null);
      }
    };

    for (const attempt of attempts) {
      attempt.then(finish, () => finish(null));
    }
  });
}

export type PdfPreviewSource = 'cache' | 'direct' | 'proxy' | 'external';

export type PdfPreviewLoadInfo = {
  base64: string;
  source: PdfPreviewSource;
  /** Human-readable origin (no auth token). */
  displaySource: string;
};

function formatPdfDisplaySource(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 48 ? `…${parsed.pathname.slice(-45)}` : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    const withoutQuery = url.split('?')[0] || url;
    return withoutQuery.length > 64 ? `…${withoutQuery.slice(-61)}` : withoutQuery;
  }
}

export function describePdfPreviewSource(info: Pick<PdfPreviewLoadInfo, 'source' | 'displaySource'>): string {
  switch (info.source) {
    case 'cache':
      return `Cached · ${info.displaySource}`;
    case 'direct':
      return `School library · ${info.displaySource}`;
    case 'proxy':
      return `Server stream · ${info.displaySource}`;
    case 'external':
      return `External · ${info.displaySource}`;
    default:
      return info.displaySource;
  }
}

type PdfBytesResult = { bytes: Uint8Array; source: Exclude<PdfPreviewSource, 'cache'>; fetchUrl: string };

export async function fetchPdfPreviewBytes(
  fileUrl: string,
  title?: string
): Promise<Uint8Array | null> {
  const loaded = await fetchPdfPreviewLoadInfo(fileUrl, title);
  return loaded ? uint8ArrayFromBase64(loaded.base64) : null;
}

function uint8ArrayFromBase64(base64: string): Uint8Array {
  try {
    const { Buffer } = require('buffer');
    return new Uint8Array(Buffer.from(base64, 'base64'));
  } catch {
    const raw = globalThis.atob ? globalThis.atob(base64) : '';
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
}

export async function fetchPdfPreviewLoadInfo(
  fileUrl: string,
  title?: string
): Promise<PdfPreviewLoadInfo | null> {
  const absolute = resolveContentUrl(fileUrl);
  if (!absolute) return null;

  const cacheKey = `${absolute}|${title || ''}`;
  const cached = pdfBytesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < PDF_CACHE_TTL_MS) {
    return {
      base64: uint8ArrayToBase64(cached.bytes),
      source: 'cache',
      displaySource: formatPdfDisplaySource(absolute),
    };
  }

  const token = (await SecureStore.getItemAsync('authToken')) || '';
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const isOurBackend =
    absolute.includes(API_BASE_URL) || absolute.includes('/uploads/');

  const tryFetch = async (url: string, headers?: Record<string, string>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return isPdfBuffer(buf) ? new Uint8Array(buf) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const tryFetchLabeled = async (
    url: string,
    source: Exclude<PdfPreviewSource, 'cache'>
  ): Promise<PdfBytesResult | null> => {
    const bytes = await tryFetch(url, source === 'direct' ? authHeaders : undefined);
    return bytes ? { bytes, source, fetchUrl: url.split('?')[0] || url } : null;
  };

  const attempts: Promise<PdfBytesResult | null>[] = [];

  if (isOurBackend && !shouldFetchDirectly(absolute)) {
    attempts.push(tryFetchLabeled(absolute, 'direct'));
  }

  const proxyUrlPromise = getPdfJsFetchUrl(fileUrl, title).then(async (proxyUrl) => {
    if (!proxyUrl) return null;
    const bytes = await tryFetch(proxyUrl);
    return bytes
      ? { bytes, source: 'proxy' as const, fetchUrl: absolute }
      : null;
  });
  attempts.push(proxyUrlPromise);

  if (shouldFetchDirectly(absolute)) {
    attempts.push(tryFetchLabeled(absolute, 'external'));
  }

  const winner = await racePdfAttempts(attempts);
  if (!winner) return null;

  cachePdfBytes(cacheKey, winner.bytes);
  return {
    base64: uint8ArrayToBase64(winner.bytes),
    source: winner.source,
    displaySource: formatPdfDisplaySource(winner.fetchUrl || absolute),
  };
}

export async function fetchPdfPreviewBase64(
  fileUrl: string,
  title?: string
): Promise<string | null> {
  const loaded = await fetchPdfPreviewLoadInfo(fileUrl, title);
  return loaded?.base64 ?? null;
}

export type PdfUrlLoadTarget = {
  url: string;
  headers?: Record<string, string>;
};

/** Resolve a streamable PDF URL for in-WebView loading (no native download). */
export async function resolvePdfUrlTarget(
  fileUrl: string,
  title?: string
): Promise<PdfUrlLoadTarget | null> {
  const absolute = resolveContentUrl(fileUrl);
  if (!absolute) return null;

  if (shouldFetchDirectly(absolute)) {
    return { url: absolute };
  }

  const proxyUrl = await getPdfJsFetchUrl(fileUrl, title);
  return { url: proxyUrl || absolute };
}

/** Lightweight shell — PDF opened via URL or injected base64 fallback. */
export const PDF_JS_VIEWER_SHELL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js"><\/script>
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
      width: auto;
      height: auto;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    #error { color: #fca5a5; padding: 24px; text-align: center; font-family: sans-serif; font-size: 14px; }
    #progress { color: #cbd5e1; text-align: center; font-size: 12px; padding: 8px; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="status">Preparing viewer…</div>
  <div id="progress"></div>
  <div id="pages"></div>
  <script>
    (function () {
      const statusEl = () => document.getElementById('status');
      const progressEl = () => document.getElementById('progress');
      const pagesEl = () => document.getElementById('pages');

      function showError(msg) {
        const s = statusEl();
        const p = progressEl();
        if (s) s.remove();
        if (p) p.remove();
        const errEl = document.createElement('div');
        errEl.id = 'error';
        errEl.textContent = msg || 'Could not display this PDF.';
        document.body.appendChild(errEl);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('pdf-error');
        }
      }

      async function renderPdf(pdf) {
        const container = pagesEl();
        const s = statusEl();
        const p = progressEl();
        if (!container) return false;

        async function renderPage(num) {
          const page = await pdf.getPage(num);
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          const containerWidth = Math.max(document.documentElement.clientWidth - 16, 280);
          const baseViewport = page.getViewport({ scale: 1 });
          const layoutScale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: layoutScale });
          const canvas = document.createElement('canvas');
          canvas.style.width = Math.floor(viewport.width) + 'px';
          canvas.style.height = Math.floor(viewport.height) + 'px';
          canvas.style.maxWidth = 'calc(100% - 16px)';
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) return;
          ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          container.appendChild(canvas);
          await page.render({
            canvasContext: ctx,
            viewport,
            intent: 'display',
          }).promise;
        }

        await renderPage(1);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('pdf-ready');
        }
        if (s) s.remove();
        if (pdf.numPages > 1) {
          const prog = p;
          if (prog) prog.textContent = 'Loading pages… 1 / ' + pdf.numPages;
          for (let num = 2; num <= pdf.numPages; num++) {
            await renderPage(num);
            if (prog) prog.textContent = 'Loading pages… ' + num + ' / ' + pdf.numPages;
            if (num % 2 === 0) await new Promise(function (r) { setTimeout(r, 0); });
          }
        }
        if (p) p.remove();
        return true;
      }

      async function openPdf(getDocumentParams) {
        if (typeof pdfjsLib === 'undefined') {
          showError('PDF viewer failed to load. Check your internet connection.');
          return false;
        }
        const s = statusEl();
        try {
          if (s) s.textContent = 'Opening document…';
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          const pdf = await pdfjsLib.getDocument(getDocumentParams).promise;
          return await renderPdf(pdf);
        } catch (err) {
          showError('Could not display this PDF. Please try again.');
          return false;
        }
      }

      window.__renderPdfFromUrl = async function (url, headers) {
        const params = { url: url, disableWorker: true, disableStream: false, disableAutoFetch: false };
        if (headers && Object.keys(headers).length) {
          params.httpHeaders = headers;
        }
        return openPdf(params);
      };

      window.__renderPdfBase64 = async function (b64) {
        const raw = atob(b64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return openPdf({ data: bytes, disableWorker: true });
      };
    })();
  <\/script>
</body>
</html>`;

export function buildPdfInjectScript(base64: string): string {
  return `(function(){
    var b64 = ${JSON.stringify(base64)};
    function run() {
      if (typeof window.__renderPdfBase64 === 'function') {
        window.__renderPdfBase64(b64);
      } else {
        setTimeout(run, 40);
      }
    }
    run();
  })();true;`;
}

export function buildPdfUrlInjectScript(
  url: string,
  headers?: Record<string, string>
): string {
  return `(function(){
    var url = ${JSON.stringify(url)};
    var headers = ${JSON.stringify(headers || {})};
    function run() {
      if (typeof window.__renderPdfFromUrl === 'function') {
        window.__renderPdfFromUrl(url, headers);
      } else {
        setTimeout(run, 40);
      }
    }
    run();
  })();true;`;
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
