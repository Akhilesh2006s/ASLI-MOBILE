import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { filterVisibleStudentTools, type StudentAiTool } from '../../../src/lib/student-ai-tools';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';

const LIST_GAP = STUDENT_SPACING.md;
const TOOLS_TABLET_MIN_WIDTH = 768;
const TOOLS_WIDE_MIN_WIDTH = 1024;
const STUDENT_TOOLS_SUBTITLE =
  'Select A Tool To Get Started. All Tools Use Gemini AI To Generate Content Based On Your Input.';

const TOOL_THEMES: Record<string, { bg: string; border: string; iconBg: string }> = {
  '#3b82f6': { bg: '#EFF6FF', border: '#93C5FD', iconBg: '#DBEAFE' },
  '#2563eb': { bg: '#EFF6FF', border: '#93C5FD', iconBg: '#DBEAFE' },
  '#fb923c': { bg: '#FFF7ED', border: '#FDBA74', iconBg: '#FFEDD5' },
  '#ea580c': { bg: '#FFF7ED', border: '#FDBA74', iconBg: '#FFEDD5' },
  '#14b8a6': { bg: '#F0FDFA', border: '#5EEAD4', iconBg: '#CCFBF1' },
  '#0d9488': { bg: '#F0FDFA', border: '#5EEAD4', iconBg: '#CCFBF1' },
  '#ec4899': { bg: '#FDF2F8', border: '#F9A8D4', iconBg: '#FCE7F3' },
  '#db2777': { bg: '#FDF2F8', border: '#F9A8D4', iconBg: '#FCE7F3' },
  '#6366f1': { bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF' },
  '#eab308': { bg: '#FEFCE8', border: '#FDE047', iconBg: '#FEF9C3' },
  '#d97706': { bg: '#FFFBEB', border: '#FCD34D', iconBg: '#FEF3C7' },
  '#8b5cf6': { bg: '#F5F3FF', border: '#C4B5FD', iconBg: '#EDE9FE' },
  '#7c3aed': { bg: '#F5F3FF', border: '#C4B5FD', iconBg: '#EDE9FE' },
};

function getToolTheme(color: string) {
  return TOOL_THEMES[color] ?? { bg: '#F8FAFC', border: '#E2E8F0', iconBg: `${color}18` };
}

function usePressScale(to = 0.98) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withSpring(to, { damping: 14, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
  };
  return { style, onPressIn, onPressOut };
}

function ToolCard({
  tool,
  onPress,
  compact,
}: {
  tool: StudentAiTool;
  onPress: () => void;
  compact?: boolean;
}) {
  const press = usePressScale();
  const theme = getToolTheme(tool.color);

  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          styles.toolCard,
          compact && styles.toolCardCompact,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
            borderLeftColor: theme.border,
          },
          press.style,
        ]}
      >
        <View style={[styles.toolIcon, compact && styles.toolIconCompact, { backgroundColor: theme.iconBg }]}>
          <Ionicons
            name={tool.icon as keyof typeof Ionicons.glyphMap}
            size={compact ? 20 : 22}
            color={tool.color}
          />
        </View>

        <View style={styles.toolBody}>
          <Text style={[styles.toolTitle, compact && styles.toolTitleCompact]} numberOfLines={2}>
            {tool.name}
          </Text>
          <Text style={[styles.toolDescription, compact && styles.toolDescriptionCompact]} numberOfLines={compact ? 3 : 2}>
            {tool.description}
          </Text>
        </View>

        {!compact ? (
          <Ionicons name="chevron-forward" size={18} color={tool.color} style={styles.toolChevron} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

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
        <Text style={styles.sectionTitle}>Available Tools</Text>
        <Text style={styles.sectionSubtitle}>{STUDENT_TOOLS_SUBTITLE}</Text>
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
              <ToolCard
                tool={tool}
                compact={gridColumns > 1}
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
  container: { flex: 1 },
  sectionTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 20,
    color: STUDENT.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: STUDENT.textMuted,
    marginBottom: 20,
    lineHeight: 20,
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
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.md,
    width: '100%',
    padding: STUDENT_SPACING.lg,
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    minHeight: 96,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  toolCardCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 148,
    padding: STUDENT_SPACING.md,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  toolIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  toolBody: {
    flex: 1,
    minWidth: 0,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  toolTitleCompact: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  toolDescription: {
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
  toolDescriptionCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  toolChevron: {
    opacity: 0.55,
    flexShrink: 0,
  },
});
