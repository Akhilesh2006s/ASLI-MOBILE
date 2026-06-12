import { StyleSheet, useWindowDimensions } from 'react-native';

export const AI_TOOL_TABLET_MIN = 768;
export const AI_TOOL_SPLIT_MAX_WIDTH = 1200;

export function useAiToolTabletLayout() {
  const { width } = useWindowDimensions();
  // Always use stacked form → output (phone layout). Digital boards / wide tablets
  // should not show parameters and preview side-by-side.
  const isTablet = false;
  const splitMaxWidth = Math.min(width, AI_TOOL_SPLIT_MAX_WIDTH);
  return { isTablet, splitMaxWidth };
}

export const aiToolTabletStyles = StyleSheet.create({
  tabletSplit: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: AI_TOOL_SPLIT_MAX_WIDTH,
    paddingHorizontal: 16,
    gap: 16,
    minHeight: 0,
  },
  tabletFormPane: {
    flex: 1,
    minWidth: 0,
  },
  tabletOutputPane: {
    flex: 1.1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.35)',
    paddingLeft: 16,
  },
  tabletPaneContent: {
    paddingVertical: 16,
    paddingBottom: 24,
    gap: 14,
  },
});
