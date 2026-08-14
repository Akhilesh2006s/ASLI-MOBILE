import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Android TV boxes often have a broken Keystore. Calling expo-secure-store
 * there can abort the process ("keeps stopping"). Use AsyncStorage on TV and
 * fall back if SecureStore throws.
 */
function useAsyncOnly(): boolean {
  return Platform.OS === 'android' && Platform.isTV === true;
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
  if (!useAsyncOnly()) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      /* fall through */
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
