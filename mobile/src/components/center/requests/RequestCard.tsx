import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, radius, space, type Tone } from "@/src/theme";
import { Avatar, Card, Text } from "@/src/ui";
import { relativeTime } from "@/src/utils/format";

type RequestCardProps = {
  name: string;
  subtitle?: string;
  createdAt?: string;
  avatarTone?: Tone;
  badges?: ReactNode;
  children?: ReactNode;
  /** أزرار الإجراء أسفل البطاقة */
  actions?: ReactNode;
  /** بدون أزرار: البطاقة كلها قابلة للضغط. مع أزرار: رأس البطاقة فقط */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** بطاقة طلب موحّدة (تسجيل / نقل / وقف قيد / حذف) */
export default function RequestCard({
  name,
  subtitle,
  createdAt,
  avatarTone = "primary",
  badges,
  children,
  actions,
  onPress,
  accessibilityLabel,
}: RequestCardProps) {
  const header = (
    <View style={styles.header}>
      <Avatar name={name} size={44} tone={avatarTone} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {createdAt ? (
          <Text variant="micro" color="textMuted">
            {relativeTime(createdAt)}
          </Text>
        ) : null}
        {onPress ? <MaterialCommunityIcons name={forwardIcon()} size={20} color={colors.textMuted} /> : null}
      </View>
    </View>
  );

  const body = (
    <>
      {badges ? <View style={styles.badges}>{badges}</View> : null}
      {children}
    </>
  );

  if (onPress && !actions) {
    return (
      <Card onPress={onPress} accessibilityLabel={accessibilityLabel ?? name} style={styles.card}>
        {header}
        {body}
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? name}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
      {body}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

/** نص سبب الطلب داخل البطاقة */
export function ReasonNote({ label = "السبب", text }: { label?: string; text?: string | null }) {
  if (!text?.trim()) return null;
  return (
    <View style={styles.reason}>
      <Text variant="micro" color="textMuted">
        {label}
      </Text>
      <Text variant="body">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space[3] },
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  trailing: { flexDirection: "row", alignItems: "center", gap: space[1] },
  pressed: { opacity: 0.7 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  reason: {
    gap: 2,
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  actions: { flexDirection: "row", gap: space[2] },
});
