import { Platform } from 'react-native';

/** Android TV / leanback devices (TOUCHLINE and similar smart TVs). */
export function isAndroidTv(): boolean {
  return Platform.OS === 'android' && Platform.isTV === true;
}
