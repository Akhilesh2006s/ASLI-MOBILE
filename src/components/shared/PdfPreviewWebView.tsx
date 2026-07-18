import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  buildPdfInjectScript,
  buildPdfUrlInjectScript,
  fetchPdfPreviewLoadInfo,
  PDF_JS_VIEWER_SHELL_HTML,
  resolvePdfUrlTarget,
  shouldInjectPdfAsBase64,
  YOUTUBE_EMBED_ORIGIN,
  type PdfPreviewLoadInfo,
  type PdfUrlLoadTarget,
} from '../../utils/contentPreview';

type Props = {
  fileUrl: string;
  title?: string;
  style?: ViewStyle;
  onBusyChange?: (busy: boolean) => void;
};

export default function PdfPreviewWebView({ fileUrl, title, style, onBusyChange }: Props) {
  const webRef = useRef<WebView>(null);
  const webReadyRef = useRef(false);
  const [webReady, setWebReady] = useState(false);
  const [urlTarget, setUrlTarget] = useState<PdfUrlLoadTarget | null>(null);
  const [base64Payload, setBase64Payload] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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
    const run = () => {
      if (!mountedRef.current) return;
      if (webRef.current && webReadyRef.current) {
        injectedRef.current = true;
        setRendering(true);
        webRef.current.injectJavaScript(script);
        return;
      }
      setTimeout(run, 20);
    };
    run();
  }, []);

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
        <TouchableOpacity style={styles.retryBtn} onPress={() => setReloadKey((k) => k + 1)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} collapsable={false}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ html: PDF_JS_VIEWER_SHELL_HTML, baseUrl: YOUTUBE_EMBED_ORIGIN }}
        style={styles.viewer}
        pointerEvents={busy ? 'none' : 'auto'}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        onMessage={onWebMessage}
      />
      {busy && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Opening preview…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#525659',
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
});
