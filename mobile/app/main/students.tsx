import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";

const COURSE_TITLE = "القران";
const STUDENT_COUNT = 32;

const STATUS_CONFIG = {
  regular: { label: "منتظمة", bg: "#22c55e", text: "#fff" },
  warning: { label: "تحذير", bg: "#eab308", text: "#000" },
  frequent_absence: { label: "غياب متكرر", bg: "#ef4444", text: "#fff" },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const MOCK_STUDENTS = [
  {
    name: "نورة العتيبي",
    idNumber: "1234567890",
    attendance: "85%",
    grade: "92",
    status: "regular" as StatusKey,
  },
  {
    name: "سارة الشمري",
    idNumber: "1234567891",
    attendance: "92%",
    grade: "88",
    status: "regular" as StatusKey,
  },
  {
    name: "مريم الحربي",
    idNumber: "1234567892",
    attendance: "78%",
    grade: "76",
    status: "warning" as StatusKey,
  },
  {
    name: "لطيفة القدسي",
    idNumber: "1234567893",
    attendance: "65%",
    grade: "70",
    status: "warning" as StatusKey,
  },
  {
    name: "هند المطيري",
    idNumber: "1234567894",
    attendance: "45%",
    grade: "62",
    status: "frequent_absence" as StatusKey,
  },
  {
    name: "فاطمة الدوسري",
    idNumber: "1234567895",
    attendance: "95%",
    grade: "95",
    status: "regular" as StatusKey,
  },
  {
    name: "عائشة الراشد",
    idNumber: "1234567896",
    attendance: "88%",
    grade: "84",
    status: "regular" as StatusKey,
  },
];

const TABLE_HEADERS = [
  "#",
  "اسم الطالبة",
  "رقم الهوية",
  "الحضور",
  "الدرجة",
  "الحالة",
];

export default function StudentsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <DrawerTrigger />
        </View>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>قائمة الطالبات</Text>
            <Text style={styles.titleIcon}>🎓</Text>
          </View>
          <Text style={styles.subtitle}>
            مادة {COURSE_TITLE} ({STUDENT_COUNT} طالبة)
          </Text>
        </View>

        <Pressable style={styles.exportButton}>
          <MaterialCommunityIcons
            name="microsoft-excel"
            size={20}
            color="#fff"
          />
          <Text style={styles.exportButtonText}>تصدير Excel</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.tableScroll}
        >
          <View style={styles.tableWrap}>
            <View style={styles.tableRow}>
              {TABLE_HEADERS.map((h) => (
                <View
                  key={h}
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    h === "#" && styles.cellNum,
                    h === "الحالة" && styles.cellStatus,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>{h}</Text>
                </View>
              ))}
            </View>
            {MOCK_STUDENTS.map((row, i) => {
              const status = STATUS_CONFIG[row.status];
              return (
                <View key={row.idNumber} style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.cellNum]}>
                    <Text style={styles.cellText}>{i + 1}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.cellName]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {row.name}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.cellId]}>
                    <Text style={styles.cellText}>{row.idNumber}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.cellAtt]}>
                    <Text style={styles.cellText}>{row.attendance}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.cellGrade]}>
                    <Text style={styles.cellText}>{row.grade}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.cellStatus]}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: status.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusPillText, { color: status.text }]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.text,
  },
  titleIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: centerColors.textSecondary,
    marginTop: 4,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  tableScroll: {
    marginHorizontal: -spacing.lg,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 420,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: centerColors.cardBorder,
  },
  tableCell: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  tableHeaderCell: {
    backgroundColor: centerColors.accent,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  cellNum: {
    width: 36,
    minWidth: 36,
  },
  cellName: {
    flex: 1.2,
    minWidth: 90,
  },
  cellId: {
    width: 100,
    minWidth: 100,
  },
  cellAtt: {
    width: 56,
    minWidth: 56,
  },
  cellGrade: {
    width: 48,
    minWidth: 48,
  },
  cellStatus: {
    width: 88,
    minWidth: 88,
  },
  cellText: {
    fontSize: 13,
    color: centerColors.text,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
