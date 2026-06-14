import { useWindowDimensions } from 'react-native';
import { ADMIN_SIDEBAR_WIDTH, useIsTablet } from '../../../src/hooks/useIsTablet';

export const ADMIN_LIST_GRID_COLUMNS = 3;
export const ADMIN_LIST_GRID_GAP = 12;
/** Matches AdminScreenShell horizontal padding (spacing.md × 2). */
const SHELL_HORIZONTAL_PADDING = 32;

/** Tablet-only list grid; mobile keeps single-column layout. */
export function useAdminListLayout() {
  const { width } = useWindowDimensions();
  const isTablet = useIsTablet();
  const contentWidth = width - (isTablet ? ADMIN_SIDEBAR_WIDTH : 0);
  const modalMaxWidth = isTablet ? Math.min(560, contentWidth - 48) : undefined;
  const gridGap = ADMIN_LIST_GRID_GAP;
  const gridColumns = ADMIN_LIST_GRID_COLUMNS;
  const listWidth = Math.max(0, contentWidth - SHELL_HORIZONTAL_PADDING);
  const gridCellWidth = isTablet
    ? (listWidth - gridGap * (gridColumns - 1)) / gridColumns
    : listWidth;

  return {
    isTablet,
    modalMaxWidth,
    gridColumns,
    gridGap,
    gridCellWidth,
  };
}
