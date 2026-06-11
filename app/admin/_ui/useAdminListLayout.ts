import { useWindowDimensions } from 'react-native';

export const ADMIN_LIST_GRID_COLUMNS = 3;
export const ADMIN_LIST_GRID_GAP = 12;
const TABLET_MIN_SHORT_SIDE = 600;
/** Matches AdminScreenShell horizontal padding (spacing.md × 2). */
const SHELL_HORIZONTAL_PADDING = 32;

/** Tablet-only list grid; mobile keeps single-column layout. */
export function useAdminListLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_MIN_SHORT_SIDE;
  const modalMaxWidth = isTablet ? Math.min(560, width - 48) : undefined;
  const gridGap = ADMIN_LIST_GRID_GAP;
  const gridColumns = ADMIN_LIST_GRID_COLUMNS;
  const listWidth = Math.max(0, width - SHELL_HORIZONTAL_PADDING);
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
