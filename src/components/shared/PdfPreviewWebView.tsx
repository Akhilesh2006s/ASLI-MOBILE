import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { isTvOrBoardDisplay } from '../../hooks/useIsTablet';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  buildPdfInjectScript,
  buildPdfJsViewerShellHtml,
  buildPdfUrlInjectScript,
  fetchPdfPreviewLoadInfo,
  resolvePdfUrlTarget,
  shouldInjectPdfAsBase64,
  YOUTUBE_EMBED_ORIGIN,
  type PdfPreviewLoadInfo,
  type PdfUrlLoadTarget,
} from '../../utils/contentPreview';

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

type Props = {
  fileUrl: string;
  title?: string;
  style?: ViewStyle;
  onBusyChange?: (busy: boolean) => void;
};

export default function PdfPreviewWebView({ fileUrl, title, style, onBusyChange }: Props) {
  const { width, height } = useWindowDimensions();
  const isTvView = isTvOrBoardDisplay(width, height);
  const webRef = useRef<WebView>(null);
  const webReadyRef = useRef(false);
  const [webReady, setWebReady] = useState(false);
  const [urlTarget, setUrlTarget] = useState<PdfUrlLoadTarget | null>(null);
  const [base64Payload, setBase64Payload] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageDraft, setPageDraft] = useState('1');
  const [zoom, setZoom] = useState(1);
  const injectedRef = useRef(false);
  const mountedRef = useRef(true);
  const fallbackTriedRef = useRef(false);
  const prefetchedRef = useRef<PdfPreviewLoadInfo | null>(null);
  const prefetchPendingRef = useRef(true);
  const base64PayloadRef = useRef<string | null>(null);
  const fileUrlRef = useRef(fileUrl);
  const titleRef = useRef(title);

  fileUrlRef.current = fileUrl;
  titleRef.current = title;
  base64PayloadRef.current = base64Payload;

  const busy = rendering;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    webReadyRef.current = webReady;
  }, [webReady]);

  const injectWhenReady = useCallback((script: string) => {
    const wrapped = `window.__pdfViewerConfig=${JSON.stringify({ tv: isTvView })};${script}`;
    const run = () => {
      if (!mountedRef.current) return;
      if (webRef.current && webReadyRef.current) {
        injectedRef.current = true;
        setRendering(true);
        webRef.current.injectJavaScript(wrapped);
        return;
      }
      setTimeout(run, 20);
    };
    run();
  }, [isTvView]);

  const loadBase64Fallback = useCallback(async () => {
    if (fallbackTriedRef.current) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    fallbackTriedRef.current = true;
    injectedRef.current = false;
    setRendering(true);
    setError(null);

    const loaded =
      prefetchedRef.current ?? (await fetchPdfPreviewLoadInfo(fileUrlRef.current, titleRef.current));
    if (!mountedRef.current) return;

    if (!loaded) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    prefetchedRef.current = loaded;
    injectWhenReady(buildPdfInjectScript(loaded.base64));
  }, [injectWhenReady]);

  useEffect(() => {
    mountedRef.current = true;
    fallbackTriedRef.current = false;
    injectedRef.current = false;
    webReadyRef.current = false;
    prefetchedRef.current = null;
    prefetchPendingRef.current = true;
    base64PayloadRef.current = null;
    setWebReady(false);
    setRendering(true);
    setError(null);
    setUrlTarget(null);
    setBase64Payload(null);
    setPage(1);
    setPageCount(0);
    setPageDraft('1');
    setZoom(1);

    void resolvePdfUrlTarget(fileUrlRef.current, titleRef.current).then((target) => {
      if (!mountedRef.current || !target?.url) return;
      setUrlTarget(target);
    });

    void fetchPdfPreviewLoadInfo(fileUrlRef.current, titleRef.current).then((info) => {
      prefetchPendingRef.current = false;
      if (!mountedRef.current) return;
      if (!info) return;
      prefetchedRef.current = info;
      if (shouldInjectPdfAsBase64(info)) {
        base64PayloadRef.current = info.base64;
        setBase64Payload(info.base64);
      }
    });

    return () => {
      mountedRef.current = false;
      onBusyChange?.(false);
      webRef.current?.stopLoading();
    };
  }, [fileUrl, title, reloadKey, onBusyChange]);

  useEffect(() => {
    if (!webReady || injectedRef.current) return;

    if (base64Payload) {
      injectWhenReady(buildPdfInjectScript(base64Payload));
      return;
    }

    if (!urlTarget) return;

    let cancelled = false;
    const deadline = Date.now() + 180;

    const tryInjectUrl = () => {
      if (cancelled || injectedRef.current || !mountedRef.current) return;
      if (base64PayloadRef.current) return;
      injectWhenReady(buildPdfUrlInjectScript(urlTarget.url, urlTarget.headers));
    };

    const waitForPrefetch = () => {
      if (cancelled || injectedRef.current) return;
      if (base64PayloadRef.current) return;
      if (!prefetchPendingRef.current || Date.now() >= deadline) {
        tryInjectUrl();
        return;
      }
      setTimeout(waitForPrefetch, 25);
    };

    waitForPrefetch();
    return () => {
      cancelled = true;
    };
  }, [webReady, base64Payload, urlTarget, injectWhenReady]);

  const injectViewerCommand = useCallback((command: string) => {
    webRef.current?.injectJavaScript(
      `(function(){try{var v=window.__pdfViewer;if(v){${command}}}catch(e){}})();true;`
    );
  }, []);

  useEffect(() => {
    if (!webReadyRef.current || !injectedRef.current) return;
    webRef.current?.injectJavaScript(
      `window.__pdfViewerConfig=${JSON.stringify({ tv: isTvView })};if(typeof window.__pdfApplyConfig==='function'){window.__pdfApplyConfig();}true;`
    );
  }, [isTvView]);

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = event.nativeEvent.data;
      if (data === 'viewer-ready') {
        setWebReady(true);
        return;
      }
      if (data === 'pdf-ready') {
        setRendering(false);
        return;
      }
      if (data === 'pdf-error') {
        void loadBase64Fallback();
        return;
      }
      if (typeof data === 'string' && data.charAt(0) === '{') {
        try {
          const msg = JSON.parse(data) as {
            type?: string;
            page?: number;
            pages?: number;
            zoom?: number;
          };
          if (msg.type === 'pdf-state') {
            if (typeof msg.page === 'number') {
              setPage(msg.page);
              setPageDraft(String(msg.page));
            }
            if (typeof msg.pages === 'number') setPageCount(msg.pages);
            if (typeof msg.zoom === 'number') setZoom(msg.zoom);
          }
        } catch {
          /* ignore */
        }
      }
    },
    [loadBase64Fallback]
  );

  useEffect(() => {
    if (!rendering) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setRendering(false);
    }, 45000);
    return () => clearTimeout(timer);
  }, [rendering]);

  if (error) {
    return (
      <View style={[styles.centered, style]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => setReloadKey((k) => k + 1)}
          accessibilityRole="button"
          accessibilityLabel="Retry loading the document"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showTvControls = isTvView;
  const controlsReady = !busy && pageCount > 0;
  const canZoomOut = controlsReady && zoom > MIN_ZOOM + 0.01;
  const canZoomIn = controlsReady && zoom < MAX_ZOOM - 0.01;
  const isFitPage = controlsReady && Math.abs(zoom - 1) < 0.02;

  const jumpToDraftPage = useCallback(() => {
    if (!controlsReady) return;
    const parsed = Number.parseInt(String(pageDraft).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page));
      return;
    }
    const next = Math.min(Math.max(1, parsed), pageCount);
    setPageDraft(String(next));
    setPage(next);
    injectViewerCommand(`v.goToPage(${next})`);
  }, [controlsReady, pageDraft, page, pageCount, injectViewerCommand]);

  return (
    <View style={[styles.wrap, style]} collapsable={false}>
      <View style={styles.viewerWrap}>
        <WebView
          key={reloadKey}
          ref={webRef}
          source={{ html: buildPdfJsViewerShellHtml(isTvView), baseUrl: YOUTUBE_EMBED_ORIGIN }}
          style={styles.viewer}
          pointerEvents={busy ? 'none' : 'auto'}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          cacheEnabled
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          onMessage={onWebMessage}
        />
        {busy ? (
          <View style={styles.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Opening preview…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.pageBar}>
        <TouchableOpacity
          style={[styles.pageNavBtn, (!controlsReady || page <= 1) && styles.tvBtnDisabled]}
          onPress={() => injectViewerCommand('v.prevPage()')}
          disabled={!controlsReady || page <= 1}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageBarLabel}>Page</Text>
        <TextInput
          value={pageDraft}
          onChangeText={(text) => setPageDraft(text.replace(/[^\d]/g, ''))}
          onSubmitEditing={jumpToDraftPage}
          onBlur={jumpToDraftPage}
          keyboardType="number-pad"
          returnKeyType="go"
          selectTextOnFocus
          editable={controlsReady}
          style={styles.pageInput}
          accessibilityLabel="Go to page number"
        />
        <Text style={styles.pageBarLabel}>
          of {controlsReady ? pageCount : '—'}
        </Text>
        <TouchableOpacity
          style={[styles.goBtn, !controlsReady && styles.tvBtnDisabled]}
          onPress={jumpToDraftPage}
          disabled={!controlsReady}
          accessibilityRole="button"
          accessibilityLabel="Go to page"
        >
          <Text style={styles.goBtnText}>Go</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pageNavBtn, (!controlsReady || page >= pageCount) && styles.tvBtnDisabled]}
          onPress={() => injectViewerCommand('v.nextPage()')}
          disabled={!controlsReady || page >= pageCount}
          accessibilityRole="button"
          accessibilityLabel="Next page"
        >
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showTvControls ? (
        <View style={styles.tvBar}>
          <TouchableOpacity
            style={[styles.tvBtn, !canZoomOut && styles.tvBtnDisabled]}
            onPress={() => injectViewerCommand(`v.zoomBy(${1 / ZOOM_STEP})`)}
            disabled={!canZoomOut}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
          >
            <Ionicons name="remove" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tvFitBtn, isFitPage && styles.tvFitBtnActive, !controlsReady && styles.tvBtnDisabled]}
            onPress={() => injectViewerCommand('v.fitPage()')}
            disabled={!controlsReady}
            accessibilityRole="button"
            accessibilityLabel="Fit page to screen"
          >
            <Ionicons name="contract-outline" size={18} color="#fff" />
            <Text style={styles.tvFitText}>Fit page</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tvBtn, !canZoomIn && styles.tvBtnDisabled]}
            onPress={() => injectViewerCommand(`v.zoomBy(${ZOOM_STEP})`)}
            disabled={!canZoomIn}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.tvZoomLabel}>{Math.round(zoom * 100)}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#525659',
  },
  viewerWrap: {
    flex: 1,
    minHeight: 0,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#525659',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#525659',
    zIndex: 10,
    elevation: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#525659',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tvBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#3c4043',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  tvBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tvBtnDisabled: {
    opacity: 0.35,
  },
  tvFitBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tvFitBtnActive: {
    backgroundColor: '#6366F1',
  },
  tvFitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tvZoomLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
  },
  tvBarSpacer: {
    flex: 1,
  },
  tvPageLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#3c4043',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  pageNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pageBarLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  pageInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  goBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
  },
  goBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
