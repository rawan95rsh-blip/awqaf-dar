import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { isStoredSessionValid } from "@/src/api/auth";

/**
 * يحمي مجموعة شاشات لدور معيّن — يعيد التوجيه إن لم تكن الجلسة صالحة أو الدور مختلفاً.
 * يُرجع true عندما يُسمح بالعرض.
 */
export function useRoleGuard(role: "center_admin" | "student"): boolean {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const valid = isStoredSessionValid(token, user);
  const allowed = !isLoading && valid && user?.role === role;

  useEffect(() => {
    if (isLoading) return;
    if (!valid) {
      router.replace("/(auth)/welcome" as Href);
      return;
    }
    if (user?.role !== role) {
      router.replace((user?.role === "student" ? "/student" : "/main") as Href);
    }
  }, [isLoading, valid, user?.role, role, router]);

  return allowed;
}
