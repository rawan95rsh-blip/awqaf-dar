import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { backIcon, colors, layout, space } from "@/src/theme";
import { goBack } from "@/src/utils/navigation";
import IconButton from "./IconButton";
import Text from "./Text";

export type HeaderProps = {
  title?: string;
  subtitle?: string;
  /** زر الرجوع — يعود للخلف أو للمسار البديل */
  back?: boolean | Href;
  onBack?: () => void;
  /** عناصر في الطرف الآخر (أيقونات / أزرار) */
  actions?: ReactNode;
  /** عنوان كبير تحت الشريط (لشاشات التبويب الرئيسية) */
  large?: boolean;
  eyebrow?: string;
  border?: boolean;
};

export default function Header({
  title,
  subtitle,
  back,
  onBack,
  actions,
  large = false,
  eyebrow,
  border = false,
}: HeaderProps) {
  const router = useRouter();
  const fallback = typeof back === "string" || typeof back === "object" ? (back as Href) : ("/" as Href);

  const backButton = back || onBack ? (
    <IconButton
      icon={backIcon()}
      accessibilityLabel="رجوع"
      onPress={() => (onBack ? onBack() : goBack(router, fallback))}
    />
  ) : null;

  if (large) {
    return (
      <View style={[styles.largeWrap, border && styles.border]}>
        <View style={styles.largeTopRow}>
          {backButton}
          <View style={styles.flex} />
          <View style={styles.actions}>{actions}</View>
        </View>
        {eyebrow ? (
          <Text variant="eyebrow" color="accentStrong">
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.bar, border && styles.border]}>
      <View style={styles.side}>{backButton}</View>
      <View style={styles.center}>
        {title ? (
          <Text variant="headline" numberOfLines={1} align="center" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1} align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideEnd]}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: space[2],
  },
  side: {
    minWidth: layout.minTouch * 2,
    flexDirection: "row",
    alignItems: "center",
  },
  sideEnd: {
    justifyContent: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  largeWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[2],
    paddingBottom: space[3],
    gap: 2,
  },
  largeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.minTouch,
    marginHorizontal: -space[2],
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
  },
});
