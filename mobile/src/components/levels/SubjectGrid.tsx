import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, motion, radius, space } from "@/src/theme";
import { Text } from "@/src/ui";
import { SUBJECT_ICONS, SUBJECT_NAMES } from "@/src/constants/domain";
import type { ClassOfferItem } from "@/src/types/classOffer";

/** شبكة المواد السبع — كل مادة تفتح صفحة التحضير والدرجات */
export default function SubjectGrid({
  offers,
  onOpen,
}: {
  offers: ClassOfferItem[];
  onOpen: (subjectIndex: number) => void;
}) {
  return (
    <View style={styles.grid}>
      {SUBJECT_NAMES.map((name, index) => {
        const subjectOffers = offers.filter((o) => o.subjectIndex === index);
        const teachers = Array.from(new Set(subjectOffers.map((o) => o.teacherName).filter(Boolean)));
        const meta = teachers.length ? teachers.join("، ") : "لا فصل مجدول";
        return (
          <Pressable
            key={name}
            onPress={() => onOpen(index)}
            accessibilityRole="button"
            accessibilityLabel={`مادة ${name} — ${meta}`}
            accessibilityHint="يفتح كشف التحضير وسجل الدرجات"
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <MaterialCommunityIcons name={SUBJECT_ICONS[index] ?? "book-outline"} size={22} color={colors.primary} />
            </View>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="micro" color={teachers.length ? "textSecondary" : "textMuted"} numberOfLines={1}>
              {meta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  tile: {
    flexBasis: "30%",
    flexGrow: 1,
    gap: 2,
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken, transform: [{ scale: motion.pressScale }] },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[1],
  },
});
