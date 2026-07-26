import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { isStoredSessionValid } from "@/src/api/auth";

/** مؤقتاً: true = تجاوز الترحيب وتسجيل الدخول والذهاب مباشرة للصفحات الداخلية */
const SKIP_LOGIN_FOR_DEV = false;

function getHomeRoute(role?: string): Href {
  if (role === "student") {
    return "/(auth)/student-home" as Href;
  }
  return "/main" as Href;
}

export default function IndexScreen() {
  const router = useRouter();
  const { token, user, isLoading } = useAuth();

  useEffect(() => {
    if (SKIP_LOGIN_FOR_DEV) {
      router.replace("/main" as Href);
      return;
    }
    if (isLoading) return;
    if (isStoredSessionValid(token, user)) {
      router.replace(getHomeRoute(user?.role));
    } else {
      router.replace("/(auth)/welcome" as Href);
    }
  }, [isLoading, token, user, router]);

  return null;
}
