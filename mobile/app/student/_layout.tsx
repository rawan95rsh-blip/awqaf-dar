import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useRoleGuard } from "@/src/hooks/useRoleGuard";
import { colors } from "@/src/theme";

/** واجهة الطالبة */
export default function StudentLayout() {
  const allowed = useRoleGuard("student");
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
      <Stack.Screen name="session/[id]" />
    </Stack>
  );
}
