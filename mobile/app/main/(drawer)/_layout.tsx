import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "./CustomDrawerContent";
import { centerColors } from "@/constants";

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: "right",
        drawerStyle: { backgroundColor: centerColors.background, width: 280 },
      }}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: "الرئيسية" }} />
      <Drawer.Screen name="classes" options={{ drawerLabel: "المستويات" }} />
      <Drawer.Screen
        name="requests"
        options={{ drawerLabel: "الطلبات" }}
      />
      <Drawer.Screen name="students" options={{ drawerLabel: "الطلاب" }} />
      <Drawer.Screen name="reports" options={{ drawerLabel: "التقارير" }} />
      <Drawer.Screen name="settings" options={{ drawerLabel: "الإعدادات" }} />
      <Drawer.Screen name="account" options={{ drawerLabel: "الحساب" }} />
    </Drawer>
  );
}
