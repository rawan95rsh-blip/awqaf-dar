import { Redirect, type Href } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { isStoredSessionValid } from "@/src/api/auth";

/** نقطة الدخول: توجيه حسب الجلسة والدور */
export default function IndexScreen() {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isStoredSessionValid(token, user)) return <Redirect href={"/(auth)/welcome" as Href} />;
  return <Redirect href={(user?.role === "student" ? "/student" : "/main") as Href} />;
}
