import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

/** مؤقتاً: true = تجاوز الترحيب وتسجيل الدخول والذهاب مباشرة للصفحات الداخلية */
const SKIP_LOGIN_FOR_DEV = false;

export default function IndexScreen() {
  const router = useRouter();
  const { token, user, isLoading } = useAuth();

  useEffect(() => {
    if (SKIP_LOGIN_FOR_DEV) {
      router.replace("/main" as import("expo-router").Href);
      return;
    }
    if (isLoading) return;
    if (token && user) {
      router.replace("/main" as import("expo-router").Href);
    } else {
      router.replace("/(auth)/welcome" as import("expo-router").Href);
    }
  }, [isLoading, token, user, router]);

  return null;
}
