import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { centerColors } from "@/constants";

const CENTER_NAME = "مركز محمد الوزان";

const MAIN_ITEMS = [
  { path: "/main", label: "الرئيسية", icon: "🏠" },
  { path: "/main/classes", label: "الفصول", icon: "🎓" },
  { path: "/main/requests", label: "طلبات التسجيل", icon: "📥" },
  { path: "/main/students", label: "الطالبات", icon: "👩‍🎓" },
  { path: "/main/reports", label: "التقارير", icon: "📊" },
];

const SETTINGS_ITEMS = [
  { path: "/main/settings", label: "الإعدادات", icon: "⚙️" },
  { path: "/main/account", label: "الحساب", icon: "👤" },
];

export default function CustomDrawerContent(
  props: DrawerContentComponentProps,
) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (path: string) => {
    props.navigation.closeDrawer();
    router.push(path as import("expo-router").Href);
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotGreen]} />
          <View style={[styles.dot, styles.dotYellow]} />
          <View style={[styles.dot, styles.dotRed]} />
        </View>
        <Text style={styles.centerName}>{CENTER_NAME}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>مطور</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MAIN</Text>
      {MAIN_ITEMS.map((item) => {
        const isActive =
          item.path === "/main"
            ? pathname === "/main" || pathname === "/main/" || pathname === "/"
            : pathname === item.path || pathname?.startsWith(item.path + "/");
        return (
          <Pressable
            key={item.path}
            style={[styles.item, isActive && styles.itemActive]}
            onPress={() => navigate(item.path)}
          >
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemIcon}>{item.icon}</Text>
          </Pressable>
        );
      })}

      <Text style={styles.sectionLabel}>SETTINGS</Text>
      {SETTINGS_ITEMS.map((item) => {
        const isActive =
          pathname === item.path || pathname?.startsWith(item.path + "/");
        return (
          <Pressable
            key={item.path}
            style={[styles.item, isActive && styles.itemActive]}
            onPress={() => navigate(item.path)}
          >
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemIcon}>{item.icon}</Text>
          </Pressable>
        );
      })}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: centerColors.background,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: centerColors.dots.green },
  dotYellow: { backgroundColor: centerColors.dots.yellow },
  dotRed: { backgroundColor: centerColors.dots.red },
  centerName: {
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: centerColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: centerColors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: centerColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: centerColors.accent,
  },
  itemLabel: {
    fontSize: 16,
    color: centerColors.text,
    fontWeight: "500",
  },
  itemIcon: {
    fontSize: 18,
  },
});
