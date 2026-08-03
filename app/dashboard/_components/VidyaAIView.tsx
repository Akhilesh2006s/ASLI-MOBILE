import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, InteractionManager } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { filterVisibleStudentTools, type StudentAiTool } from '../../../src/lib/student-ai-tools';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import AiToolCard from '../../../src/components/ai-tools/AiToolCard';
import { GlassPanel } from '../../../src/components/ui';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../../src/theme/ai';
import { STUDENT_SPACING } from '../../../src/theme/student';

const LIST_GAP = STUDENT_SPACING.md;
const TOOLS_TABLET_MIN_WIDTH = 768;
const TOOLS_WIDE_MIN_WIDTH = 1024;
const STUDENT_TOOLS_SUBTITLE =
  'Choose a tool, add your curriculum details, and generate clear study content with Vidya AI.';

export default function VidyaAIView() {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= TOOLS_TABLET_MIN_WIDTH;
  const gridColumns = screenWidth >= TOOLS_WIDE_MIN_WIDTH ? 3 : isTablet ? 2 : 1;
  const [toolsListWidth, setToolsListWidth] = useState(0);
  const toolCardWidth =
    gridColumns > 1 && toolsListWidth > 0
      ? (toolsListWidth - LIST_GAP * (gridColumns - 1)) / gridColumns
      : undefined;

  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ready, setReady] = useState(false);

  // Let the Vidya tab paint first, then fetch — avoids a hitch on tab switch.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    const fallback = setTimeout(() => setReady(true), 200);
    return () => {
      task.cancel();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token || cancelled) return;
        const res = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const list = data.data || data.subjects || data || [];
          const names = (Array.isArray(list) ? list : [])
            .map((s: any) => (typeof s === 'object' ? s.name || '' : String(s)))
            .filter(Boolean);
          setSubjectNames(names);
        }
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  // Warm heavy modules while browsing tools so open feels snappy.
  useEffect(() => {
    if (!ready) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void import('../../../src/lib/ai-tool-generate');
      void import('../../student/tools/[toolType]');
    });
    return () => task.cancel();
  }, [ready]);

  const visibleTools = useMemo(() => filterVisibleStudentTools(subjectNames), [subjectNames]);

  const openTool = (tool: StudentAiTool) => {
    // Paint the press spring, then push — keeps the transition smooth.
    requestAnimationFrame(() => {
      router.push({
        pathname: `/student/tools/${tool.id}` as any,
        params: { returnTab: 'vidya' },
      });
    });
  };

  const onToolsLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== toolsListWidth) {
      setToolsListWidth(nextWidth);
    }
  };

  return (
    <View style={styles.container}>
      <GlassPanel radius={AI_RADIUS.lg} tone="strong" style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>VIDYA AI STUDIO</Text>
        </View>
        <Text style={styles.sectionTitle}>What would you like to learn?</Text>
        <Text style={styles.sectionSubtitle}>{STUDENT_TOOLS_SUBTITLE}</Text>
      </GlassPanel>

      {!ready || isLoading ? (
        <View
          style={[styles.toolsList, gridColumns > 1 && styles.toolsListGrid]}
          onLayout={onToolsLayout}
        >
          {Array.from({ length: gridColumns > 1 ? gridColumns * 2 : 4 }).map((_, index) => (
            <ShimmerCard
              key={`shimmer-${index}`}
              style={toolCardWidth != null ? { width: toolCardWidth, height: 96 } : styles.shimmerRow}
            />
          ))}
        </View>
      ) : (
        <View
          style={[styles.toolsList, gridColumns > 1 && styles.toolsListGrid]}
          onLayout={onToolsLayout}
        >
          {visibleTools.map((tool) => (
            <View
              key={tool.id}
              style={toolCardWidth != null ? { width: toolCardWidth } : styles.toolCardWrapFull}
            >
              <AiToolCard
                title={tool.name}
                description={tool.description}
                icon={tool.icon as any}
                accent={tool.color || AI.primary}
                badge="Student"
                compact={gridColumns > 1}
                glass
                onPress={() => openTool(tool)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  hero: {
    marginBottom: AI_SPACING.xl,
    overflow: 'hidden',
    borderRadius: AI_RADIUS.lg,
    padding: AI_SPACING.xl,
    ...AI_SHADOW,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginBottom: AI_SPACING.sm,
    borderRadius: AI_RADIUS.full,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: AI.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroBadgeText: {
    ...AI_TYPE.eyebrow,
    color: AI.primaryPressed,
  },
  sectionTitle: {
    ...AI_TYPE.hero,
    color: AI.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...AI_TYPE.body,
    color: AI.textSecondary,
  },
  toolsList: {
    gap: LIST_GAP,
    paddingBottom: STUDENT_SPACING.md,
  },
  toolsListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  toolCardWrapFull: {
    width: '100%',
  },
  shimmerRow: {
    height: 96,
  },
});
