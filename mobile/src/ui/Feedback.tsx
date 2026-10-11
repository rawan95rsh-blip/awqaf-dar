import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space, toneColors, type Tone } from "@/src/theme";
import Button from "./Button";
import Text from "./Text";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** حالة فارغة مع إرشاد للخطوة التالية */
export function EmptyState({
  icon = "inbox-outline",
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={compact ? 24 : 30} color={colors.primary} />
      </View>
      <Text variant={compact ? "bodyStrong" : "headline"} align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="caption" color="textSecondary" align="center" style={styles.emptyDesc}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="tonal" size="sm" onPress={onAction} style={styles.emptyAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyState
      icon="wifi-alert"
      title="تعذّر التحميل"
      description={message ?? "تحقّقي من الاتصال ثم أعيدي المحاولة"}
      actionLabel={onRetry ? "إعادة المحاولة" : undefined}
      onAction={onRetry}
      compact={compact}
    />
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** هيكل تحميل نابض بدل الدوّارة في القوائم */
export function Skeleton({
  height = 16,
  width = "100%",
  radiusSize = radius.sm,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radiusSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ height, width, borderRadius: radiusSize, backgroundColor: colors.surfaceSunken, opacity }, style]}
    />
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={44} height={44} radiusSize={22} />
          <View style={styles.skeletonText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** شريط تنبيه داخل الصفحة */
export function Banner({
  tone = "info",
  icon,
  title,
  children,
  action,
}: {
  tone?: Tone;
  icon?: IconName;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const t = toneColors[tone];
  const defaultIcon: IconName =
    tone === "danger" ? "alert-circle-outline" : tone === "warning" ? "alert-outline" : tone === "success" ? "check-circle-outline" : "information-outline";
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <MaterialCommunityIcons name={icon ?? defaultIcon} size={20} color={t.fg} style={styles.bannerIcon} />
      <View style={styles.bannerBody}>
        {title ? (
          <Text variant="bodyStrong" style={{ color: t.fg }}>
            {title}
          </Text>
        ) : null}
        {typeof children === "string" ? (
          <Text variant="caption" style={{ color: t.fg }}>
            {children}
          </Text>
        ) : (
          children
        )}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    paddingVertical: space[10],
    paddingHorizontal: space[6],
    gap: space[2],
  },
  emptyCompact: {
    paddingVertical: space[6],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[2],
  },
  emptyDesc: { maxWidth: 320 },
  emptyAction: { marginTop: space[3] },
  loading: {
    paddingVertical: space[10],
    alignItems: "center",
    gap: space[3],
  },
  skeletonList: { gap: space[4], paddingVertical: space[2] },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  skeletonText: { flex: 1, gap: space[2] },
  banner: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space[3],
    gap: space[3],
  },
  bannerIcon: { marginTop: 2 },
  bannerBody: { flex: 1, gap: 2 },
});
