import { useAdminResponsiveLayout } from './useAdminResponsiveLayout';

export const ADMIN_LIST_GRID_COLUMNS = 3;
export { ADMIN_GRID_GAP as ADMIN_LIST_GRID_GAP } from './useAdminResponsiveLayout';

/** Tablet list/card grid — delegates to useAdminResponsiveLayout. */
export function useAdminListLayout() {
  const layout = useAdminResponsiveLayout();
  return {
    isTablet: layout.isTablet,
    modalMaxWidth: layout.modalMaxWidth,
    gridColumns: layout.gridColumns,
    gridGap: layout.gridGap,
  };
}
