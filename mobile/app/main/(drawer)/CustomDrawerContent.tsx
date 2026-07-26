import React from "react";
import { View, Text, StyleSheet, Pressable, I18nManager } from "react-native";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { useRouter, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { centerColors, spacing, colors } from "@/constants";
import {
  DRAWER_ICON_SIZE,
  CenterBrandIcon,
  DrawerXIcon,
  type DrawerIconType,
} from "@/src/components/icons/DrawerXIcons";

type DrawerItem = {
  path: string;
  label: string;
  icon: DrawerIconType;
};

const MAIN_ITEMS: DrawerItem[] = [
  { path: "/main", label: "الرئيسية", icon: "home" },
  { path: "/main/classes", label: "المستويات", icon: "classes" },
  { path: "/main/requests", label: "الطلبات", icon: "requests" },
  { path: "/main/students", label: "الطلاب", icon: "students" },
  { path: "/main/reports", label: "التقارير", icon: "reports" },
];

const SETTINGS_ITEMS: DrawerItem[] = [
  { path: "/main/settings", label: "الإعدادات", icon: "settings" },
  { path: "/main/account", label: "الحساب", icon: "account" },
];

function DrawerNavItem({
  item,
  isActive,
  onPress,
}: {
  item: DrawerItem;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.itemIconBox}>
        <DrawerXIcon type={item.icon} active={isActive} />
      </View>
      <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export default function CustomDrawerContent(
  props: DrawerContentComponentProps,
) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const centerName = user?.centerProfile?.nameAr ?? "مركز الأوقاف";

  const navigate = (path: string) => {
    props.navigation.closeDrawer();
    router.navigate(path as Href);
  };

  const handleLogout = () => {
    props.navigation.closeDrawer();
    logout(() => {
      router.replace("/(auth)/welcome" as Href);
    });
  };

  const isMainActive = (path: string) =>
    path === "/main"
      ? pathname === "/main" || pathname === "/main/" || pathname === "/"
      : pathname === path || pathname?.startsWith(path + "/");

  return (
    <DrawerContentScrollView
      {...props}
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + spacing.xl },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerBrandRow}>
          <View style={styles.brandIconBox}>
            <CenterBrandIcon />
          </View>
          <Text style={styles.centerName} numberOfLines={2}>
            {centerName}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>مطور</Text>
        </View>
      </View>

      {MAIN_ITEMS.map((item) => (
        <DrawerNavItem
          key={item.path}
          item={item}
          isActive={isMainActive(item.path)}
          onPress={() => navigate(item.path)}
        />
      ))}

      <View style={styles.sectionDivider} />

      {SETTINGS_ITEMS.map((item) => (
        <DrawerNavItem
          key={item.path}
          item={item}
          isActive={
            pathname === item.path || pathname?.startsWith(item.path + "/")
          }
          onPress={() => navigate(item.path)}
        />
      ))}

      <View style={styles.sectionDivider} />

      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="تسجيل الخروج"
      >
        <MaterialCommunityIcons
          name="logout"
          size={DRAWER_ICON_SIZE}
          color={colors.error}
        />
        <Text style={styles.logoutLabel}>تسجيل الخروج</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: centerColors.background,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  header: {
    marginBottom: 12,
    paddingTop: spacing.sm,
    paddingBottom: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: centerColors.cardBorder,
  },
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  brandIconBox: {
    width: DRAWER_ICON_SIZE,
    height: DRAWER_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  centerName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: centerColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  badgeText: {
    color: centerColors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: centerColors.cardBorder,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 0,
    gap: 20,
    minHeight: 50,
  },
  itemIconBox: {
    width: DRAWER_ICON_SIZE,
    height: DRAWER_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    color: centerColors.text,
    fontWeight: "400",
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  itemLabelActive: {
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 20,
    minHeight: 50,
    marginTop: spacing.sm,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    color: colors.error,
    fontWeight: "600",
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
});
