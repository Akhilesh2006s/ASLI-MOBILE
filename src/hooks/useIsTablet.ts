import { useWindowDimensions } from 'react-native';

export const TABLET_MIN_SHORT_SIDE = 600;
export const ADMIN_SIDEBAR_WIDTH = 260;

/** True when the device short edge is tablet-sized (portrait or landscape). */
export function useIsTablet(threshold = TABLET_MIN_SHORT_SIDE): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) >= threshold;
}
