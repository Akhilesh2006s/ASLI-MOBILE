import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { filterVisibleStudentTools, type StudentAiTool } from '../../../src/lib/student-ai-tools';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import AiToolCard from '../../../src/components/ai-tools/AiToolCard';
import { GlassPanel } from '../../../src/components/ui';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../../src/theme/ai';
import {
  STUDENT_ANIMATION,
  STUDENT_SPACING,
} from '../../../src/theme/student';

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

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
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
        setIsLoading(false);
      }
    })();
  }, []);

  const visibleTools = useMemo(() => filterVisibleStudentTools(subjectNames), [subjectNames]);

  const openTool = (tool: StudentAiTool) => {
    router.push({
      pathname: `/student/tools/${tool.id}` as any,
      params: { returnTab: 'vidya' },
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(50)}>
        <GlassPanel radius={AI_RADIUS.lg} tone="strong" style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>VIDYA AI STUDIO</Text>
          </View>
          <Text style={styles.sectionTitle}>What would you like to learn?</Text>
          <Text style={styles.sectionSubtitle}>{STUDENT_TOOLS_SUBTITLE}</Text>
        </GlassPanel>
      </Animated.View>

      {isLoading ? (
        <View
          style={[styles.toolsList, gridColumns > 1 && styles.toolsListGrid]}
          onLayout={(event) => {
            const nextWidth = Math.floor(event.nativeEvent.layout.width);
            if (nextWidth > 0 && nextWidth !== toolsListWidth) {
              setToolsListWidth(nextWidth);
            }
          }}
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
          onLayout={(event) => {
            const nextWidth = Math.floor(event.nativeEvent.layout.width);
            if (nextWidth > 0 && nextWidth !== toolsListWidth) {
              setToolsListWidth(nextWidth);
            }
          }}
        >
          {visibleTools.map((tool, index) => (
            <Animated.View
              key={tool.id}
              entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(80 + index * 45)}
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
            </Animated.View>
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
