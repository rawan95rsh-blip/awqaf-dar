import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, layout, palette, radius, space } from "@/src/theme";
import { Button, Text } from "@/src/ui";
import BrandMark from "@/src/components/BrandMark";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const FEATURES: Array<{ icon: IconName; label: string }> = [
  { icon: "calendar-check-outline", label: "جدولكِ وحضوركِ" },
  { icon: "chart-box-outline", label: "درجاتكِ أولاً بأول" },
  { icon: "bell-ring-outline", label: "إشعارات المركز" },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.pattern} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternRing,
              { width: 160 + i * 110, height: 160 + i * 110, borderRadius: (160 + i * 110) / 2, opacity: 0.5 - i * 0.08 },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.hero,
          { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
        ]}
      >
        <BrandMark size={84} />
        <Text variant="eyebrow" color="accentStrong" style={styles.eyebrow}>
          دولة الكويت
        </Text>
        <Text variant="display" align="center">
          دور القرآن الكريم
        </Text>
        <Text variant="bodyLarge" color="textSecondary" align="center" style={styles.tagline}>
          رحلتكِ مع كتاب الله في مكان واحد — التسجيل، الجدول، الحضور والدرجات.
        </Text>
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.feature}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons name={f.icon} size={20} color={colors.primary} />
              </View>
              <Text variant="micro" color="textSecondary" align="center">
                {f.label}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <Button size="lg" fullWidth onPress={() => router.push("/(auth)/login" as Href)}>
          تسجيل الدخول
        </Button>
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          icon="account-plus-outline"
          onPress={() => router.push("/(auth)/register-student" as Href)}
        >
          تسجيل طالبة جديدة
        </Button>
        <Pressable
          onPress={() => router.push("/(auth)/register-center" as Href)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.centerLink, pressed && { opacity: 0.6 }]}
        >
          <MaterialCommunityIcons name="domain" size={18} color={colors.primary} />
          <Text variant="label" color="primary">
            إدارة مركز؟ أنشئي حساب المركز
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  pattern: {
    position: "absolute",
    top: -120,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    height: 620,
    overflow: "hidden",
  },
  patternRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: palette.gold100,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
    gap: space[2],
  },
  eyebrow: { marginTop: space[4] },
  tagline: { maxWidth: 320, marginTop: space[1] },
  features: { flexDirection: "row", gap: space[3], marginTop: space[6] },
  feature: { alignItems: "center", gap: space[2], width: 96 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: space[4],
    gap: space[3],
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  centerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    paddingVertical: space[3],
  },
});
