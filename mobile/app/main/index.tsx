import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";

const QUICK_ACTIONS = [
  {
    id: "add-class",
    title: "إضافة فصل جديد",
    description: "تكوين فصل من الأول للثامن",
    icon: "plus" as const,
    iconColor: centerColors.textSecondary,
  },
  {
    id: "review-request",
    title: "استعراض طلب طالبة",
    description: "مراجعة البيانات والمرفقات",
    icon: "clipboard-text-outline" as const,
    iconColor: centerColors.accentYellow,
  },
  {
    id: "grades",
    title: "تعديل توزيع الدرجات",
    description: "ضبط نسب الحضور والاختبارات",
    icon: "pencil-outline" as const,
    iconColor: centerColors.accentYellow,
  },
  {
    id: "send-invite",
    title: "إرسال دعوة / قراءات / دورات",
    description: "بناءً على بيانات المطور المكتملة",
    icon: "send-outline" as const,
    iconColor: "#60a5fa",
    highlight: true,
  },
];

export default function MainScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>إجراءات سريعة</Text>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={24}
              color={centerColors.accentYellow}
              style={styles.titleIcon}
            />
          </View>
          <View style={styles.headerMenuSpacer}>
            <DrawerTrigger />
          </View>
        </View>

        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={[styles.card, action.highlight && styles.cardHighlight]}
            onPress={() => {}}
          >
            <View style={styles.cardRight}>
              <MaterialCommunityIcons
                name={action.icon}
                size={28}
                color={action.iconColor}
                style={styles.cardIcon}
              />
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{action.title}</Text>
                <Text
                  style={[
                    styles.cardDescription,
                    action.highlight && styles.cardDescriptionHighlight,
                  ]}
                >
                  {action.description}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={centerColors.accent}
            />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: centerColors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
    justifyContent: "center",
  },
  menuButton: {
    padding: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    position: "relative",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerMenuSpacer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: centerColors.text,
  },
  titleIcon: {
    marginRight: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardHighlight: {
    borderColor: centerColors.cardHighlight,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIcon: {
    marginLeft: spacing.md,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: centerColors.textSecondary,
  },
  cardDescriptionHighlight: {
    color: centerColors.accentGreen,
  },
});
