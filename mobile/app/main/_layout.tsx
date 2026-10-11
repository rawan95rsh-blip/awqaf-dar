import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useRoleGuard } from "@/src/hooks/useRoleGuard";
import { colors } from "@/src/theme";

/** واجهة المركز (المشرفة) */
export default function MainLayout() {
  const allowed = useRoleGuard("center_admin");
  if (!allowed) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: Platform.OS === "android" ? "slide_from_left" : "default",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-class" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="add-course" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="add-level" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="add-student" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}
