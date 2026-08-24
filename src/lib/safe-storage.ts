import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { isAndroidTv } from './device';

/**
 * On some Android devices expo-secure-store can hit a broken Keystore and abort
 * before JS can recover, so Android uses AsyncStorage. iOS keeps SecureStore,
 * while values over its safe size are also stored in AsyncStorage.
 */
const SECURE_STORE_MAX_BYTES = 2048;

function useAsyncOnly(): boolean {
  return Platform.OS === 'android' || isAndroidTv();
}

export async function storageGetItem(key: string): Promise<string | null> {
  if (!useAsyncOnly()) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value != null) return value;
    } catch {
      /* fall through to AsyncStorage */
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
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* never crash the app on storage write */
  }
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
