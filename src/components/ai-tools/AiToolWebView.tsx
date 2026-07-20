import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderAiToolOutputHtml } from '../../lib/render-ai-tool-output-html';
import { resolveRichDisplayContent, coalesceAiToolRawContent } from '../../lib/ai-tool-display-content';
import { AI_TOOL_OUTPUT_STYLES } from '../../lib/ai-tool-output-styles';
import { AI_TOOL_QUEST_STYLES, wrapQuestExperience } from '../../lib/ai-tool-quest-experience';
import { renderMarkdown } from '../../lib/render-teacher-markdown';
import { simpleContentFingerprint } from '../../lib/ai-tool-rotation-label';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
};

const MIN_HEIGHT = 240;
const INITIAL_HEIGHT = 520;
const MAX_HEIGHT = 20000;

function buildHeightScript(lockInternalScroll: boolean): string {
  const scrollLock = lockInternalScroll
    ? `
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.height = 'auto';
  document.body.style.height = 'auto';
  document.documentElement.style.webkitOverflowScrolling = 'auto';
`
    : `
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';
`;

  return `
(function() {
  function sendHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    if (window.ReactNativeWebView && h > 0) {
      window.ReactNativeWebView.postMessage(String(Math.ceil(h)));
    }
  }
  ${scrollLock}
  sendHeight();
  [50, 150, 350, 700, 1200, 2000, 3500, 5000].forEach(function(ms) {
    setTimeout(sendHeight, ms);
  });
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);
    ro.observe(document.documentElement);
  }
})();
true;
`;
}

function estimateWebViewHeight(content: string, rawContent?: unknown): number {
  const display = resolveRichDisplayContent(content, rawContent);
  const fromLength = Math.ceil(display.length * 0.72);
  return Math.min(MAX_HEIGHT, Math.max(INITIAL_HEIGHT, fromLength));
}

export default function AiToolWebView({ toolType, content, rawContent, variant = 'student' }: Props) {
  const mergedRaw = useMemo(() => coalesceAiToolRawContent(content, rawContent), [content, rawContent]);

  const html = useMemo(() => {
    try {
      return renderAiToolOutputHtml(toolType, content, mergedRaw, variant);
    } catch {
      const display = resolveRichDisplayContent(content, mergedRaw);
      const body = renderMarkdown(display.slice(0, 80000));
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${AI_TOOL_OUTPUT_STYLES}${AI_TOOL_QUEST_STYLES}</style></head><body>${wrapQuestExperience(body)}</body></html>`;
    }
  }, [toolType, content, mergedRaw, variant]);

  const contentKey = useMemo(() => {
    const display = resolveRichDisplayContent(content, mergedRaw);
    return `${toolType}:${simpleContentFingerprint(display)}:${simpleContentFingerprint(html)}`;
  }, [toolType, content, mergedRaw, html]);

  const estimatedHeight = useMemo(
    () => estimateWebViewHeight(content, mergedRaw),
    [content, mergedRaw]
  );

  const webViewRef = useRef<WebView>(null);
  const [height, setHeight] = useState(estimatedHeight);
  const heightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHeight(estimatedHeight);
  }, [contentKey, estimatedHeight]);

  const applyHeight = useCallback((next: number) => {
    const target = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next, estimatedHeight * 0.85));
    setHeight((prev) => {
      if (target > prev + 8) return target;
      if (Math.abs(target - prev) < 12) return prev;
      return target;
    });
  }, [estimatedHeight]);

  const webViewHeight = Math.max(height, estimatedHeight, MIN_HEIGHT);
  const needsInternalScroll = webViewHeight >= MAX_HEIGHT * 0.95;
  const heightScript = useMemo(
    () => buildHeightScript(!needsInternalScroll),
    [needsInternalScroll]
  );

  const measureHeight = useCallback(() => {
    webViewRef.current?.injectJavaScript(heightScript);
  }, [heightScript]);

  useEffect(() => {
    const timers = [40, 200, 600, 1200, 2500, 4500].map((ms) => setTimeout(measureHeight, ms));
    return () => {
      timers.forEach(clearTimeout);
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
    };
  }, [html, measureHeight]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const next = Number(event.nativeEvent.data);
      if (!Number.isFinite(next) || next <= 0) return;
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
      heightDebounceRef.current = setTimeout(() => applyHeight(next), 80);
    },
    [applyHeight]
  );

  return (
    <View style={[styles.wrap, { minHeight: MIN_HEIGHT, height: webViewHeight }]} collapsable={false}>
      <WebView
        key={contentKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={[
          styles.webView,
          { height: webViewHeight },
          Platform.OS === 'android' ? styles.webViewAndroid : null,
        ]}
        containerStyle={styles.webViewContainer}
        scrollEnabled={needsInternalScroll}
        nestedScrollEnabled={needsInternalScroll}
        overScrollMode={needsInternalScroll ? 'always' : 'never'}
        showsVerticalScrollIndicator={needsInternalScroll}
        bounces={needsInternalScroll}
        onMessage={onMessage}
        onLoadEnd={measureHeight}
        injectedJavaScript={heightScript}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        collapsable={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
      />
    </View>
  );
}

const WEB_BG = '#F7F9FF';

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: WEB_BG,
  },
  webViewContainer: {
    backgroundColor: WEB_BG,
    borderRadius: 16,
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    backgroundColor: WEB_BG,
    opacity: 0.99,
    borderRadius: 16,
  },
  webViewAndroid: { backgroundColor: WEB_BG },
});
