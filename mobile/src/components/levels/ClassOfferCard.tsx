import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, motion, radius, space } from "@/src/theme";
import { Badge, IconButton, Text } from "@/src/ui";
import { SUBJECT_ICONS, WEEKDAYS } from "@/src/constants/domain";
import { MODE_LABELS, type ClassOfferItem } from "@/src/types/classOffer";
import { timeRangeLabel } from "./helpers";

/** بطاقة فصل متكرر: المادة · اليوم والوقت · المعلمة — مع قائمة إجراءات */
export default function ClassOfferCard({
  offer,
  onPress,
  onMenu,
}: {
  offer: ClassOfferItem;
  onPress: () => void;
  onMenu: () => void;
}) {
  const hasNext = !!offer.nextSessionId;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onMenu}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${offer.subjectName}، ${WEEKDAYS[offer.weekday]} ${timeRangeLabel(offer.startTime, offer.endTime)}، ${offer.teacherName}`}
      accessibilityHint={hasNext ? "يفتح الحصة القادمة. اضغطي مطولاً لخيارات أكثر" : "اضغطي مطولاً لخيارات الفصل"}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={SUBJECT_ICONS[offer.subjectIndex] ?? "book-outline"}
          size={22}
          color={colors.primary}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flexShrink}>
            {offer.subjectName}
          </Text>
          <Badge label={MODE_LABELS[offer.mode]} tone={offer.mode === "online" ? "info" : "neutral"} size="sm" />
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={14} color={colors.textSecondary} />
          <Text variant="caption" color="textSecondary" tabular numberOfLines={1}>
            {`${WEEKDAYS[offer.weekday]} · ${timeRangeLabel(offer.startTime, offer.endTime)}`}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-tie-outline" size={14} color={colors.textSecondary} />
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {offer.teacherName}
          </Text>
        </View>
      </View>
      <IconButton
        icon="dots-vertical"
        accessibilityLabel={`خيارات فصل ${offer.subjectName}`}
        onPress={onMenu}
        size={20}
        color={colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingStart: space[3],
    paddingEnd: space[1],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken, transform: [{ scale: motion.pressScale }] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flexShrink: { flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
