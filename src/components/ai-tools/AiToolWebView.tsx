import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
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

const MIN_HEIGHT = 80;
const INITIAL_HEIGHT = 160;
const MAX_HEIGHT = 20000;
/** Tiny breath after the last section — nothing more. */
const BOTTOM_PAD = 8;

/**
 * Measure ONLY real content bottom (last quest node / last child).
 * Never use documentElement.scrollHeight — that mirrors the WebView viewport
 * and creates the huge empty region after the last section.
 */
function buildHeightScript(): string {
  return `
(function() {
  function measure() {
    var html = document.documentElement;
    var body = document.body;
    html.style.height = 'auto';
    html.style.minHeight = '0';
    html.style.overflow = 'hidden';
    body.style.minHeight = '0';
    body.style.overflow = 'hidden';
    body.style.margin = '0';

    // Measure from the top of the document to the bottom of the last section.
    // Includes exam-paper hero title cards that sit above .quest-node list.
    var bodyTop = body.getBoundingClientRect().top;
    var bottom = bodyTop;
    var nodes = document.querySelectorAll('.quest-node');
    if (nodes.length) {
      bottom = nodes[nodes.length - 1].getBoundingClientRect().bottom;
    } else {
      var root = document.querySelector('.quest-field') || document.querySelector('.ai-tool-root') || body;
      var kids = root.children;
      for (var i = 0; i < kids.length; i++) {
        bottom = Math.max(bottom, kids[i].getBoundingClientRect().bottom);
      }
    }

    var bodyPad = 0;
    try {
      bodyPad = parseFloat(getComputedStyle(body).paddingBottom) || 0;
    } catch (e) {}

    var h = Math.ceil(bottom - bodyTop + bodyPad);
    if (h < 40) {
      body.style.height = '1px';
      h = Math.ceil(body.scrollHeight || 0);
      body.style.height = 'auto';
    } else {
      body.style.height = 'auto';
    }
    return h;
  }
  function sendHeight() {
    var h = measure();
    if (window.ReactNativeWebView && h > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', h: h }));
    }
  }
  window.__aiToolSendHeight = sendHeight;
  sendHeight();
  [60, 200, 500, 1000, 2000].forEach(function(ms) { setTimeout(sendHeight, ms); });
  if (!window.__aiToolHeightBound) {
    window.__aiToolHeightBound = true;
    var roTimer = null;
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function() {
        if (roTimer) clearTimeout(roTimer);
        roTimer = setTimeout(sendHeight, 80);
      });
      ro.observe(document.body);
      var field = document.querySelector('.quest-field');
      if (field) ro.observe(field);
    }
    document.addEventListener('toggle', function() { setTimeout(sendHeight, 30); }, true);
  }
})();
true;
`;
}

function jumpToQuestScript(index: number): string {
  return `
(function(){
  var nodes = document.querySelectorAll('.quest-node');
  var n = nodes[${index}];
  if (!n) return true;
  n.open = true;
  if (window.__aiToolSendHeight) setTimeout(window.__aiToolSendHeight, 30);
  true;
})();
true;
`;
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

  const webViewRef = useRef<WebView>(null);
  const orbitScrollRef = useRef<ScrollView>(null);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const [orbitTabs, setOrbitTabs] = useState<string[]>([]);
  const [activeOrbit, setActiveOrbit] = useState(0);
  const heightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Always start short — never seed with a content-length guess (that was the empty gap).
    setHeight(INITIAL_HEIGHT);
    setOrbitTabs([]);
    setActiveOrbit(0);
  }, [contentKey]);

  const applyHeight = useCallback((next: number) => {
    const target = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next + BOTTOM_PAD));
    setHeight((prev) => (Math.abs(target - prev) < 4 ? prev : target));
  }, []);

  const webViewHeight = Math.max(height, MIN_HEIGHT);
  const needsInternalScroll = webViewHeight >= MAX_HEIGHT * 0.95;
  const heightScript = useMemo(() => buildHeightScript(), []);

  const measureHeight = useCallback(() => {
    webViewRef.current?.injectJavaScript(heightScript);
  }, [heightScript]);

  useEffect(() => {
    const timers = [80, 300, 800, 1600].map((ms) => setTimeout(measureHeight, ms));
    return () => {
      timers.forEach(clearTimeout);
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
    };
  }, [html, measureHeight]);

  const onOrbitPress = useCallback((index: number) => {
    setActiveOrbit(index);
    webViewRef.current?.injectJavaScript(jumpToQuestScript(index));
    orbitScrollRef.current?.scrollTo({ x: Math.max(0, index * 72 - 40), animated: true });
  }, []);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const raw = event.nativeEvent.data;
      try {
        const msg = JSON.parse(raw) as {
          type?: string;
          h?: number;
          tabs?: string[];
          index?: number;
        };
        if (msg.type === 'height' && typeof msg.h === 'number' && msg.h > 0) {
          if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
          heightDebounceRef.current = setTimeout(() => applyHeight(msg.h as number), 30);
          return;
        }
        if (msg.type === 'orbit' && Array.isArray(msg.tabs) && msg.tabs.length > 0) {
          setOrbitTabs(msg.tabs.map((t) => String(t || '').trim()).filter(Boolean));
          setActiveOrbit(0);
          // Orbit means quest DOM is ready — remasure tightly to last section.
          setTimeout(measureHeight, 40);
          return;
        }
        if (msg.type === 'orbit-active' && typeof msg.index === 'number') {
          setActiveOrbit(msg.index);
          return;
        }
      } catch {
        // Legacy plain-number height
      }
      const next = Number(raw);
      if (!Number.isFinite(next) || next <= 0) return;
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
      heightDebounceRef.current = setTimeout(() => applyHeight(next), 30);
    },
    [applyHeight, measureHeight]
  );

  return (
    <View style={styles.root} collapsable={false}>
      {orbitTabs.length > 1 ? (
        <ScrollView
          ref={orbitScrollRef}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.orbitWrap}
          contentContainerStyle={styles.orbitContent}
          decelerationRate="fast"
          keyboardShouldPersistTaps="handled"
        >
          {orbitTabs.map((title, index) => {
            const active = index === activeOrbit;
            return (
              <Pressable
                key={`${index}-${title}`}
                onPress={() => onOrbitPress(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Section ${index + 1}: ${title}`}
                style={[styles.orbitBtn, active && styles.orbitBtnActive]}
              >
                <Text style={[styles.orbitBtnText, active && styles.orbitBtnTextActive]} numberOfLines={1}>
                  {index + 1} · {title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={[styles.wrap, { height: webViewHeight }]} collapsable={false}>
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
    </View>
  );
}

const WEB_BG = '#FFFFFF';

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  orbitWrap: {
    width: '100%',
    maxHeight: 44,
    marginBottom: 8,
  },
  orbitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 2,
    paddingRight: 20,
    paddingVertical: 2,
  },
  orbitBtn: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 220,
  },
  orbitBtnActive: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  orbitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#0F172A',
  },
  orbitBtnTextActive: {
    color: '#0F172A',
  },
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
