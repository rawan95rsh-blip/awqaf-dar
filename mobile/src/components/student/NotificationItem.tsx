import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, radius, space, toneColors, type Tone } from "@/src/theme";
import { Text } from "@/src/ui";
import type { AppNotification } from "@/src/api/notifications";
import { relativeTime } from "@/src/utils/format";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const TYPE_META: Record<string, { icon: IconName; tone: Tone }> = {
  registration_approved: { icon: "check-decagram-outline", tone: "success" },
  session_cancelled: { icon: "calendar-remove-outline", tone: "danger" },
};

/** هل للإشعار وجهة داخل التطبيق؟ */
export function notificationSessionId(n: AppNotification): string | null {
  return n.type === "session_cancelled" && typeof n.data?.sessionId === "string" ? n.data.sessionId : null;
}

export default function NotificationItem({
  notification,
  onPress,
  divider,
}: {
  notification: AppNotification;
  onPress: () => void;
  divider?: boolean;
}) {
  const unread = !notification.readAt;
  const meta = TYPE_META[notification.type] ?? { icon: "bell-outline" as IconName, tone: "primary" as Tone };
  const t = toneColors[meta.tone];
  const navigable = !!notificationSessionId(notification);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "غير مقروء: " : ""}${notification.title}. ${notification.body}`}
      accessibilityHint={navigable ? "فتح الحصة" : unread ? "تعليم كمقروء" : undefined}
      style={({ pressed }) => [
        styles.row,
        unread && styles.unread,
        divider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name={meta.icon} size={20} color={t.fg} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant={unread ? "bodyStrong" : "label"} numberOfLines={1} style={styles.flex}>
            {notification.title}
          </Text>
          {notification.createdAt ? (
            <Text variant="micro" color="textMuted">
              {relativeTime(notification.createdAt)}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={3}>
          {notification.body}
        </Text>
      </View>
      {unread ? <View style={styles.dot} accessibilityElementsHidden /> : null}
      {navigable ? <MaterialCommunityIcons name={forwardIcon()} size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    backgroundColor: colors.surface,
  },
  unread: { backgroundColor: colors.primarySoft },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  pressed: { backgroundColor: colors.surfaceSunken },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
