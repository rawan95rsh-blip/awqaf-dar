import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * تخزين آمن: SecureStore على الجوال، و localStorage على الويب (للمعاينة فقط).
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // تجاهل
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // تجاهل
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
