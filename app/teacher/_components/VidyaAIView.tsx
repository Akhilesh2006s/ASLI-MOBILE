import { useEffect, useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  useWindowDimensions,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { isTvOrBoardDisplay } from '../../../src/hooks/useIsTablet';
import {
  filterVisibleTeacherTools,
  TEACHER_AI_TOOLS_SUBTITLE,
} from '../../../src/lib/teacher-ai-tools';
import AiToolCard from '../../../src/components/ai-tools/AiToolCard';
import { TEACHER_SPACING } from '../../../src/theme/teacher';
import { AI, AI_TYPE } from '../../../src/theme/ai';

const CONTENT_MAX = 1080;
const BOARD_MIN_WIDTH = 1024;
const GRID_GAP = TEACHER_SPACING.lg;
const TAB_BAR_CLEARANCE = 16;

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 1) return items.map((item) => [item]);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function useVidyaAILayout() {
  const { width, height } = useWindowDimensions();
  const isTvView = isTvOrBoardDisplay(width, height);
  const isBoard = width >= BOARD_MIN_WIDTH;
  const columns = width >= 1040 ? 3 : width >= 700 ? 2 : 1;
  const shellWidth = isBoard || isTvView ? width : Math.min(width, CONTENT_MAX);
  return { isGrid: columns > 1, columns, shellWidth, isTvView };
}

export default function VidyaAIView({ chatEnabled: _chatEnabled = true }: { chatEnabled?: boolean }) {
  const insets = useSafeAreaInsets();
  const { isGrid, columns, shellWidth, isTvView } = useVidyaAILayout();
  const scrollBottomPad =
    TAB_BAR_CLEARANCE + Math.max(insets.bottom, 12) + TEACHER_SPACING.xl;
  const [subjectNames, setSubjectNames] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        const names = rows
          .map((subj: any) => String(subj?.name || subj?.displayName || '').trim())
          .filter(Boolean);
        setSubjectNames(names);
      } catch {
        /* optional */
      }
    })();
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void import('../../../src/lib/ai-tool-generate');
    });
    return () => task.cancel();
  }, []);

  const visibleTools = useMemo(
    () => filterVisibleTeacherTools(subjectNames),
    [subjectNames],
  );
  const toolRows = useMemo(
    () => chunkItems(visibleTools, isGrid ? columns : 1),
    [visibleTools, isGrid, columns],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.innerShell, { width: shellWidth }]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Your Next Classroom Resource</Text>
          <Text style={styles.sectionSubtitle}>{TEACHER_AI_TOOLS_SUBTITLE}</Text>

          <View style={styles.toolsGrid}>
            {toolRows.map((row, rowIndex) => (
              <View
                key={`tools-row-${rowIndex}`}
                style={[styles.toolsRow, isGrid && styles.toolsRowGrid]}
              >
                {row.map((tool) => (
                  <View key={tool.id} style={isGrid ? styles.toolCell : styles.toolCellFull}>
                    <AiToolCard
                      title={tool.title}
                      description={tool.description}
                      icon={tool.icon as keyof typeof Ionicons.glyphMap}
                      accent={tool.color || AI.primary}
                      badge="Teacher"
                      compact={isGrid}
                      evenHeight={isTvView}
                      glass
                      onPress={() => {
                        requestAnimationFrame(() => {
                          router.push({
                            pathname: tool.route as any,
                            params: { returnTab: 'vidya-ai' },
                          });
                        });
                      }}
                    />
                  </View>
                ))}
                {isGrid
                  ? Array.from({ length: columns - row.length }, (_, spacerIndex) => (
                      <View key={`tools-spacer-${rowIndex}-${spacerIndex}`} style={styles.toolCell} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: scrollBottomPad }} accessibilityElementsHidden />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    alignItems: 'center',
  },
  innerShell: {
    alignSelf: 'center',
  },
  section: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.sm,
  },
  sectionTitle: {
    ...AI_TYPE.hero,
    color: AI.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...AI_TYPE.body,
    color: AI.textSecondary,
    marginBottom: 20,
  },
  toolsGrid: {
    width: '100%',
    gap: GRID_GAP,
  },
  toolsRow: {
    width: '100%',
  },
  toolsRowGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: GRID_GAP,
  },
  toolCell: {
    flex: 1,
    minWidth: 0,
  },
  toolCellFull: {
    width: '100%',
  },
});
