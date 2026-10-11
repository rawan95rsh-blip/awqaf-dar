import { useMemo } from "react";
import type { ImageSourcePropType } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { buildApiUrl } from "@/src/api/client";

/** مصدر صورة محمية (مرفقات الطالبات) — يرسل التوكن في الترويسة */
export function useAuthImageSource(path?: string | null): ImageSourcePropType | null {
  const { token } = useAuth();
  return useMemo(() => {
    if (!path) return null;
    if (/^(file|content|data|blob|ph):/.test(path)) return { uri: path };
    return {
      uri: buildApiUrl(path),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  }, [path, token]);
}
