import { useCallback, useState } from 'react';
import { LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { ADMIN_SIDEBAR_WIDTH, useIsTablet } from '../../../src/hooks/useIsTablet';

const CONTENT_MAX = 1080;
const GRID_GAP = 12;
const TABLET_MIN = 768;

export function useAdminTabletLayout(shellPaddingMd = 16) {
  const { width: windowWidth } = useWindowDimensions();
  const isTabletDevice = useIsTablet();
  const layoutWidth = isTabletDevice ? windowWidth - ADMIN_SIDEBAR_WIDTH : windowWidth;
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const onShellLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) {
      setMeasuredWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    }
  }, []);

  const contentWidth =
    measuredWidth > 0
      ? Math.min(measuredWidth, CONTENT_MAX)
      : Math.min(layoutWidth, CONTENT_MAX) - shellPaddingMd * 2;
  const isTablet = (measuredWidth > 0 ? measuredWidth : layoutWidth) >= TABLET_MIN;
  const gridColumns = isTablet ? 2 : 1;
  const gridInnerWidth = contentWidth;
  const cardWidth =
    gridColumns > 1
      ? (gridInnerWidth - GRID_GAP * (gridColumns - 1)) / gridColumns
      : gridInnerWidth;
  const statWidth =
    isTablet && gridInnerWidth > 0
      ? (gridInnerWidth - GRID_GAP * 3) / 4
      : undefined;
  const modalMaxWidth = isTablet ? Math.min(560, layoutWidth - 48) : undefined;

  return {
    isTablet,
    contentWidth,
    cardWidth,
    statWidth,
    modalMaxWidth,
    gridGap: GRID_GAP,
    contentMax: CONTENT_MAX,
    onShellLayout,
    layoutReady: measuredWidth > 0,
    measuredWidth,
  };
}

/** Multi-column grid for admin list/card views (e.g. EduOTT videos). */
export function useAdminGridLayout(
  shellPaddingMd = 16,
  itemCount = 0,
  options?: { columnsAt768?: number; columnsAt1024?: number },
) {
  const { width: windowWidth } = useWindowDimensions();
  const layout = useAdminTabletLayout(shellPaddingMd);
  const isTabletDevice = useIsTablet();
  const layoutWidth = isTabletDevice ? windowWidth - ADMIN_SIDEBAR_WIDTH : windowWidth;
  const columnsAt768 = options?.columnsAt768 ?? 2;
  const columnsAt1024 = options?.columnsAt1024 ?? 3;
  const maxColumns = !layout.isTablet ? 1 : layoutWidth >= 1024 ? columnsAt1024 : columnsAt768;
  const numColumns = itemCount > 0 ? Math.min(maxColumns, itemCount) : maxColumns;
  const cardWidth =
    numColumns > 1
      ? (layout.contentWidth - GRID_GAP * (numColumns - 1)) / numColumns
      : layout.contentWidth;

  return {
    ...layout,
    numColumns,
    cardWidth,
    isGrid: numColumns > 1,
  };
}
