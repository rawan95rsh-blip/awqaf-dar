import { useState } from "react";
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

const SUBJECT_NAMES = [
  "السيرة",
  "العقيدة",
  "الحديث",
  "التجويد",
  "القران",
  "التفسير",
  "النحو",
] as const;

const LEVELS = [
  { name: "المستوى الأول مطور", students: 32 },
  { name: "المستوى الثاني مطور", students: 30 },
  { name: "المستوى الثالث مطور", students: 28 },
  { name: "المستوى الرابع مطور", students: 31 },
  { name: "المستوى الخامس مطور", students: 31 },
  { name: "المستوى السادس مطور", students: 26 },
  { name: "المستوى السابع مطور", students: 29 },
  { name: "المستوى الثامن مطور", students: 27 },
] as const;

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const TIME_SLOTS = ["08:00", "09:30", "11:00", "12:30"];

const PILL_COLORS = [
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#e0e7ff", text: "#3730a3" },
];

/** Mock schedule: [dayIndex][timeIndex] = subjectIndex (0..6) or -1 for empty */
function getMockSchedule(): number[][] {
  return [
    [0, 1, 2, 3],
    [4, 0, 5, -1],
    [1, 2, 6, 0],
    [3, 4, -1, 1],
    [-1, 5, 2, 4],
  ];
}

const STUDENT_STATUS = {
  regular: { label: "منتظمة", bg: "#22c55e", text: "#fff" },
  warning: { label: "تحذير", bg: "#eab308", text: "#000" },
  frequent_absence: { label: "غياب متكرر", bg: "#ef4444", text: "#fff" },
} as const;
const MOCK_STUDENTS = [
  {
    name: "نورة العتيبي",
    idNumber: "1234567890",
    attendance: "85%",
    grade: "92",
    status: "regular" as keyof typeof STUDENT_STATUS,
  },
  {
    name: "سارة الشمري",
    idNumber: "1234567891",
    attendance: "92%",
    grade: "88",
    status: "regular" as keyof typeof STUDENT_STATUS,
  },
  {
    name: "مريم الحربي",
    idNumber: "1234567892",
    attendance: "78%",
    grade: "76",
    status: "warning" as keyof typeof STUDENT_STATUS,
  },
  {
    name: "لطيفة القدسي",
    idNumber: "1234567893",
    attendance: "65%",
    grade: "70",
    status: "warning" as keyof typeof STUDENT_STATUS,
  },
  {
    name: "هند المطيري",
    idNumber: "1234567894",
    attendance: "45%",
    grade: "62",
    status: "frequent_absence" as keyof typeof STUDENT_STATUS,
  },
];
const STUDENT_TABLE_HEADERS = [
  "#",
  "اسم الطالبة",
  "رقم الهوية",
  "الحضور",
  "الدرجة",
  "الحالة",
];

export default function ClassesScreen() {
  const [selectedLevel, setSelectedLevel] = useState(0);
  const schedule = getMockSchedule();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
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
        <Pressable style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>إضافة مادة</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.levelsScroll}
          contentContainerStyle={styles.levelsScrollContent}
        >
          {LEVELS.map((level, i) => (
            <Pressable
              key={level.name}
              style={[
                styles.levelButton,
                selectedLevel === i && styles.levelButtonActive,
              ]}
              onPress={() => setSelectedLevel(i)}
            >
              <Text
                style={[
                  styles.levelButtonText,
                  selectedLevel === i && styles.levelButtonTextActive,
                ]}
                numberOfLines={1}
              >
                {level.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.levelHeading}>{LEVELS[selectedLevel].name}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 المواد الدراسية (7 مواد)</Text>
          <View style={styles.cardsGrid}>
            {SUBJECT_NAMES.map((name, i) => (
              <View key={name} style={styles.subjectCard}>
                <Text style={styles.subjectCardName}>{name}</Text>
                <Text style={styles.subjectCardTeacher}>أ. —</Text>
                <Text style={styles.subjectCardCount}>30 طالبة مسجلة</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🗓️ الجدول الأسبوعي - {LEVELS[selectedLevel].name}
          </Text>
          <View style={styles.tableWrap}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableHeader]}>
                <Text style={styles.tableHeaderText}>الوقت</Text>
              </View>
              {DAYS.map((day) => (
                <View
                  key={day}
                  style={[
                    styles.tableCell,
                    styles.tableHeader,
                    styles.tableDayCell,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>{day}</Text>
                </View>
              ))}
            </View>
            {TIME_SLOTS.map((time, timeIdx) => (
              <View key={time} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.timeCell]}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
                {DAYS.map((_, dayIdx) => {
                  const subIdx = schedule[dayIdx][timeIdx];
                  const isEmpty = subIdx < 0;
                  const colors = isEmpty
                    ? {
                        bg: centerColors.cardBg,
                        text: centerColors.textSecondary,
                      }
                    : PILL_COLORS[subIdx % PILL_COLORS.length];
                  return (
                    <View
                      key={`${dayIdx}-${timeIdx}`}
                      style={[styles.tableCell, styles.tableDayCell]}
                    >
                      <View
                        style={[styles.pill, { backgroundColor: colors.bg }]}
                      >
                        <Text style={[styles.pillText, { color: colors.text }]}>
                          {isEmpty ? "—" : SUBJECT_NAMES[subIdx]}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.studentListHeader}>
            <Text style={styles.sectionTitle}>
              🎓 قائمة الطالبات - {LEVELS[selectedLevel].name} (
              {LEVELS[selectedLevel].students} طالبة)
            </Text>
            <Pressable style={styles.exportButton}>
              <MaterialCommunityIcons
                name="microsoft-excel"
                size={18}
                color="#fff"
              />
              <Text style={styles.exportButtonText}>تصدير Excel</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.studentTableScroll}
          >
            <View style={styles.studentTableWrap}>
              <View style={styles.tableRow}>
                {STUDENT_TABLE_HEADERS.map((h) => (
                  <View
                    key={h}
                    style={[
                      styles.studentTableCell,
                      styles.studentTableHeaderCell,
                      h === "#" && styles.studentCellNum,
                      h === "الحالة" && styles.studentCellStatus,
                    ]}
                  >
                    <Text style={styles.tableHeaderText}>{h}</Text>
                  </View>
                ))}
              </View>
              {MOCK_STUDENTS.map((row, i) => {
                const status = STUDENT_STATUS[row.status];
                return (
                  <View key={row.idNumber} style={styles.tableRow}>
                    <View
                      style={[styles.studentTableCell, styles.studentCellNum]}
                    >
                      <Text style={styles.studentCellText}>{i + 1}</Text>
                    </View>
                    <View
                      style={[styles.studentTableCell, styles.studentCellName]}
                    >
                      <Text style={styles.studentCellText} numberOfLines={1}>
                        {row.name}
                      </Text>
                    </View>
                    <View
                      style={[styles.studentTableCell, styles.studentCellId]}
                    >
                      <Text style={styles.studentCellText}>{row.idNumber}</Text>
                    </View>
                    <View
                      style={[styles.studentTableCell, styles.studentCellAtt]}
                    >
                      <Text style={styles.studentCellText}>
                        {row.attendance}
                      </Text>
                    </View>
                    <View
                      style={[styles.studentTableCell, styles.studentCellGrade]}
                    >
                      <Text style={styles.studentCellText}>{row.grade}</Text>
                    </View>
                    <View
                      style={[
                        styles.studentTableCell,
                        styles.studentCellStatus,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusPillStudent,
                          { backgroundColor: status.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillStudentText,
                            { color: status.text },
                          ]}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: centerColors.background,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#dc2626",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  levelsScroll: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.lg,
  },
  levelsScrollContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
  },
  levelButton: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: centerColors.cardBg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  levelButtonActive: {
    backgroundColor: centerColors.accent,
    borderColor: centerColors.accent,
  },
  levelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: centerColors.text,
  },
  levelButtonTextActive: {
    color: "#fff",
  },
  levelHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.md,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  subjectCard: {
    width: "48%",
    minWidth: 140,
    marginHorizontal: "1%",
    marginBottom: spacing.md,
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  subjectCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 4,
  },
  subjectCardTeacher: {
    fontSize: 12,
    color: centerColors.textSecondary,
    marginBottom: 2,
  },
  subjectCardCount: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  tableHeader: {
    backgroundColor: centerColors.accent,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  tableDayCell: {
    flex: 1,
    minWidth: 72,
  },
  timeCell: {
    width: 56,
    backgroundColor: centerColors.cardBg,
  },
  timeText: {
    fontSize: 12,
    color: centerColors.textSecondary,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  studentListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#166534",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    gap: spacing.xs,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  studentTableScroll: {
    marginHorizontal: -spacing.lg,
  },
  studentTableWrap: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 400,
  },
  studentTableCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  studentTableHeaderCell: {
    backgroundColor: centerColors.accent,
  },
  studentCellNum: { width: 32, minWidth: 32 },
  studentCellName: { flex: 1.2, minWidth: 88 },
  studentCellId: { width: 92, minWidth: 92 },
  studentCellAtt: { width: 52, minWidth: 52 },
  studentCellGrade: { width: 44, minWidth: 44 },
  studentCellStatus: { width: 82, minWidth: 82 },
  studentCellText: {
    fontSize: 12,
    color: centerColors.text,
  },
  statusPillStudent: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusPillStudentText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
