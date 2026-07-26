import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { isStoredSessionValid } from "@/src/api/auth";

/** مؤقتاً: true = عدم طلب تسجيل الدخول للعمل على الصفحات الداخلية */
const SKIP_AUTH_CHECK_FOR_DEV = false;

export default function MainLayout() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const sessionValid = isStoredSessionValid(token, user);

  useEffect(() => {
    if (SKIP_AUTH_CHECK_FOR_DEV) return;
    if (isLoading) return;
    if (!sessionValid) {
      router.replace("/(auth)/welcome" as import("expo-router").Href);
      return;
    }
    if (user?.role === "student") {
      router.replace("/(auth)/student-home" as import("expo-router").Href);
    }
  }, [sessionValid, isLoading, router, user?.role]);

  if (!SKIP_AUTH_CHECK_FOR_DEV && (isLoading || !sessionValid)) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="add-class" />
      <Stack.Screen name="add-course" />
      <Stack.Screen name="add-level" />
      <Stack.Screen name="add-student" />
      <Stack.Screen name="level/[id]" />
      <Stack.Screen name="course/[id]" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="subject/[levelId]/[subjectIndex]" />
      <Stack.Screen name="attendance/[levelId]/[subjectIndex]" />
      <Stack.Screen name="grades/[levelId]/[subjectIndex]" />
      <Stack.Screen name="student-profile/[id]" />
    </Stack>
  );
}
