import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, motion, radius, space } from "@/src/theme";
import { Badge, Text } from "@/src/ui";
import { SUBJECT_ICONS } from "@/src/constants/domain";
import { SESSION_MODE_LABELS, type SessionItem } from "@/src/types/session";
import { formatTime } from "@/src/utils/format";
import { sessionPhase } from "./sessionTiming";

/**
 * صف حصة في جدول الطالبة: حصص مستواها مميّزة بإطار أخضر وشارة «مستواي»،
 * والملغاة مشطوبة مع سبب اعتذار المعلمة.
 */
export default function SessionRow({
  session,
  now,
  onPress,
}: {
  session: SessionItem;
  now: Date;
  onPress: () => void;
}) {
  const mine = !!session.isMyLevel;
  const phase = sessionPhase(session, now);
  const cancelled = phase === "cancelled";
  const ended = phase === "ended";
  const live = phase === "live" || phase === "checkin";
  const meta = [session.teacherName, SESSION_MODE_LABELS[session.mode]].filter(Boolean).join(" · ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        session.title,
        `${formatTime(session.startAt)} إلى ${formatTime(session.endAt)}`,
        mine ? "حصة مستواي" : "حصة لمستوى آخر",
        cancelled ? "ملغاة" : "",
      ]
        .filter(Boolean)
        .join("، ")}
      accessibilityHint="عرض تفاصيل الحصة"
      style={({ pressed }) => [
        styles.row,
        mine ? styles.rowMine : styles.rowOther,
        (ended || cancelled) && styles.rowMuted,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.time}>
        <Text variant="bodyStrong" tabular color={mine && !cancelled ? "primary" : "text"}>
          {formatTime(session.startAt)}
        </Text>
        <Text variant="micro" color="textMuted" tabular>
          {formatTime(session.endAt)}
        </Text>
      </View>

      <View style={[styles.rule, mine && !cancelled ? styles.ruleMine : null, cancelled && styles.ruleCancelled]} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name={SUBJECT_ICONS[session.subjectIndex] ?? "book-outline"}
            size={18}
            color={mine ? colors.primary : colors.textMuted}
          />
          <Text
            variant="bodyStrong"
            numberOfLines={1}
            style={[styles.flex, cancelled && styles.strike]}
            color={cancelled ? "textSecondary" : "text"}
          >
            {session.title}
          </Text>
        </View>
        {meta ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {cancelled && session.cancelReason ? (
          <Text variant="caption" color="danger" numberOfLines={2}>
            {`اعتذار المعلمة: ${session.cancelReason}`}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {mine ? <Badge label="مستواي" tone="primary" icon="star-four-points-outline" size="sm" /> : null}
          {cancelled ? <Badge label="ملغاة" tone="danger" icon="calendar-remove-outline" size="sm" /> : null}
          {live && !cancelled ? <Badge label="الآن" tone="success" icon="record-circle-outline" size="sm" /> : null}
          {session.mode !== "in_person" && session.zoomUrl && !cancelled ? (
            <Badge label="Zoom" tone="info" icon="video-outline" size="sm" />
          ) : null}
        </View>
      </View>

      <MaterialCommunityIcons name={forwardIcon()} size={20} color={colors.textMuted} style={styles.chevron} />
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
    paddingHorizontal: space[3],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  rowMine: { backgroundColor: colors.surface, borderColor: colors.primaryMuted },
  rowOther: { backgroundColor: colors.surfaceSunken, borderColor: "transparent" },
  rowMuted: { opacity: 0.72 },
  pressed: { transform: [{ scale: motion.pressScale }], opacity: 0.85 },
  time: { alignItems: "center", minWidth: 60 },
  rule: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: colors.border },
  ruleMine: { backgroundColor: colors.primary },
  ruleCancelled: { backgroundColor: colors.danger },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[1], marginTop: space[1] },
  strike: { textDecorationLine: "line-through" },
  chevron: { alignSelf: "center" },
});
