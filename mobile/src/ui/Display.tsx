import { type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, radius, space, toneColors, type Tone } from "@/src/theme";
import { useAuthImageSource } from "@/src/hooks/useAuthImage";
import Text from "./Text";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** شارة حالة صغيرة */
export function Badge({
  label,
  tone = "neutral",
  icon,
  size = "md",
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
  size?: "sm" | "md";
}) {
  const t = toneColors[tone];
  return (
    <View style={[styles.badge, size === "sm" && styles.badgeSm, { backgroundColor: t.bg }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={size === "sm" ? 12 : 14} color={t.fg} /> : null}
      <Text variant="micro" style={{ color: t.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** عنوان قسم + رابط إجراء */
export function Section({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          <View style={styles.flex}>
            {title ? (
              <Text variant="headline" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="caption" color="textSecondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action ? (
            <Pressable
              onPress={action.onPress}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.6 }]}
            >
              {action.icon ? (
                <MaterialCommunityIcons name={action.icon} size={16} color={colors.primary} />
              ) : null}
              <Text variant="label" color="primary">
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** صف قائمة موحّد */
export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  leadingIcon,
  leadingTone = "primary",
  trailing,
  onPress,
  chevron,
  destructive,
  disabled,
  divider = false,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  leading?: ReactNode;
  leadingIcon?: IconName;
  leadingTone?: Tone;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
}) {
  const t = toneColors[destructive ? "danger" : leadingTone];
  const content = (
    <>
      {leading ??
        (leadingIcon ? (
          <View style={[styles.leadingIcon, { backgroundColor: t.bg }]}>
            <MaterialCommunityIcons name={leadingIcon} size={20} color={t.fg} />
          </View>
        ) : null)}
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1} color={destructive ? "danger" : "text"}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta}
      </View>
      {trailing}
      {(chevron ?? !!onPress) ? (
        <MaterialCommunityIcons name={forwardIcon()} size={20} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.listItem, divider && styles.listDivider]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.listItem,
        divider && styles.listDivider,
        pressed && styles.listPressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      {content}
    </Pressable>
  );
}

/** صف معلومة: عنوان / قيمة */
export function InfoRow({
  label,
  value,
  icon,
  last,
  selectable,
}: {
  label: string;
  value?: string | null;
  icon?: IconName;
  last?: boolean;
  selectable?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <View style={styles.infoLabel}>
        {icon ? <MaterialCommunityIcons name={icon} size={16} color={colors.textMuted} /> : null}
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
      <Text variant="bodyStrong" style={styles.infoValue} selectable={selectable}>
        {value && value.trim() ? value : "—"}
      </Text>
    </View>
  );
}

/** بطاقة رقم/مؤشر */
export function StatTile({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  onPress,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  tone?: Tone;
  hint?: string;
  onPress?: () => void;
}) {
  const t = toneColors[tone];
  const body = (
    <>
      <View style={styles.statTop}>
        {icon ? (
          <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
            <MaterialCommunityIcons name={icon} size={18} color={t.fg} />
          </View>
        ) : null}
      </View>
      <Text variant="number" tabular>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text variant="micro" style={{ color: t.fg }} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.stat}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.stat, pressed && styles.listPressed]}
    >
      {body}
    </Pressable>
  );
}

function initials(name?: string | null): string {
  if (!name) return "؟";
  // تجاهل الرموز والأقواس (مثل «مركز تجريبي (للعرض)»)
  const parts = name
    .replace(/[^\u0600-\u06FFA-Za-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "؟";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last ? ` ${last}` : ""}`;
}

/** صورة شخصية (مرفوعة) أو أول حروف الاسم */
export function Avatar({
  name,
  uri,
  size = 44,
  tone = "primary",
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
  tone?: Tone;
}) {
  const source = useAuthImageSource(uri);
  const t = toneColors[tone];
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg },
      ]}
    >
      {source ? (
        <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text
          variant={size >= 64 ? "title" : "label"}
          style={{ color: t.fg, fontSize: size * 0.34, lineHeight: size * 0.5 }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export function Divider({ spacing = 3 }: { spacing?: keyof typeof space }) {
  return <View style={[styles.divider, { marginVertical: space[spacing] }]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 1 },
  section: { marginTop: space[6], gap: space[3] },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: space[3] },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  listPressed: { backgroundColor: colors.surfaceSunken },
  leadingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: space[3],
    gap: space[4],
  },
  infoDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  infoLabel: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 2 },
  infoValue: { flexShrink: 1, textAlign: "auto" },
  stat: {
    flex: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    padding: space[4],
    gap: 2,
  },
  statTop: { flexDirection: "row", marginBottom: space[2] },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
});
