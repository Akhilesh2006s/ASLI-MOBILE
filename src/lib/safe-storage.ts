import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { isAndroidTv } from './device';

/**
 * Android TV boxes often have a broken Keystore. Calling expo-secure-store
 * there can abort the process ("keeps stopping"). Use AsyncStorage on TV and
 * fall back if SecureStore throws.
 *
 * Expo also warns (and will error) when a SecureStore value exceeds 2048 bytes.
 * JWTs and study-time JSON can exceed that, so large values go to AsyncStorage.
 */
const SECURE_STORE_MAX_BYTES = 2048;

function useAsyncOnly(): boolean {
  return isAndroidTv();
}

export async function storageGetItem(key: string): Promise<string | null> {
  if (!useAsyncOnly()) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value != null) return value;
    } catch {
      /* TV / OEM Keystore */
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  const tooLarge = value.length >= SECURE_STORE_MAX_BYTES;
  if (!useAsyncOnly() && !tooLarge) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      /* fall through */
    }
  } else if (!useAsyncOnly() && tooLarge) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function storageDeleteItem(key: string): Promise<void> {
  if (!useAsyncOnly()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
