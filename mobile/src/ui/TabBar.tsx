import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { colors, radius, space } from "@/src/theme";
import Text from "./Text";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type TabMeta = Record<string, { label: string; icon: IconName; iconActive: IconName; badge?: number }>;

/** شريط تبويب سفلي بتصميم التطبيق — يدعم شارة عدد */
export function makeTabBar(meta: TabMeta) {
  return function TabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    return (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space[2]) }]}>
        {state.routes.map((route, index) => {
          const info = meta[route.name];
          if (!info) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={info.label}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  void Haptics.selectionAsync().catch(() => undefined);
                  navigation.navigate(route.name);
                }
              }}
              style={styles.item}
            >
              <View style={[styles.pill, focused && styles.pillOn]}>
                <MaterialCommunityIcons
                  name={focused ? info.iconActive : info.icon}
                  size={22}
                  color={focused ? colors.primary : colors.textMuted}
                />
                {info.badge ? (
                  <View style={styles.badge}>
                    <Text variant="micro" style={styles.badgeText}>
                      {info.badge > 99 ? "99+" : String(info.badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="micro" color={focused ? "primary" : "textMuted"} weight={focused ? "semibold" : "medium"}>
                {info.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space[2],
  },
  item: { flex: 1, alignItems: "center", gap: 2 },
  pill: {
    width: 56,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pillOn: { backgroundColor: colors.primarySoft },
  badge: {
    position: "absolute",
    top: -2,
    end: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { color: colors.onPrimary, fontSize: 10, lineHeight: 12 },
});
