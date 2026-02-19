import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "./CustomDrawerContent";

/** مؤقتاً: true = عدم طلب تسجيل الدخول للعمل على الصفحات الداخلية */
const SKIP_AUTH_CHECK_FOR_DEV = false;

export default function MainLayout() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (SKIP_AUTH_CHECK_FOR_DEV) return;
    if (isLoading) return;
    if (!token || !user) {
      router.replace("/(auth)/login" as import("expo-router").Href);
      return;
    }
  }, [user, token, isLoading, router]);

  if (!SKIP_AUTH_CHECK_FOR_DEV && (isLoading || !token || !user)) {
    return null;
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: "right",
        drawerStyle: { backgroundColor: "#1a1a1d", width: 280 },
      }}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: "الرئيسية" }} />
      <Drawer.Screen name="classes" options={{ drawerLabel: "الفصول" }} />
      <Drawer.Screen
        name="requests"
        options={{ drawerLabel: "طلبات التسجيل" }}
      />
      <Drawer.Screen name="students" options={{ drawerLabel: "الطالبات" }} />
      <Drawer.Screen name="reports" options={{ drawerLabel: "التقارير" }} />
      <Drawer.Screen name="settings" options={{ drawerLabel: "الإعدادات" }} />
      <Drawer.Screen name="account" options={{ drawerLabel: "الحساب" }} />
    </Drawer>
  );
}
