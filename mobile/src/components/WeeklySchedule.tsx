import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import { listSessions, sessionsQueryKeys } from "@/src/api/sessions";
import {
  SESSION_MODE_LABELS,
  type SessionItem,
} from "@/src/types/session";

const WEEKDAY_LABELS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const TIME_COL_WIDTH = 56;
const DAY_COL_WIDTH = 96;
const PILL_COLORS = [
  { bg: "#e8f5fd", text: "#1d9bf0" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#e0e7ff", text: "#3730a3" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#fee2e2", text: "#b91c1c" },
  { bg: "#f3e8ff", text: "#7e22ce" },
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDay(date: Date): string {
  return date.toISOString();
}

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("ar-SA", opts)} – ${end.toLocaleDateString("ar-SA", opts)}`;
}

function shortTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 16)}…`;
}

/** جدول أسبوعي شبكة: أيام × أوقات */
export default function WeeklySchedule() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const end = addDays(weekStart, 7);
    end.setMilliseconds(-1);
    return end;
  }, [weekStart]);

  const sessionsQuery = useQuery({
    queryKey: sessionsQueryKeys.list({
      from: toIsoDay(weekStart),
      to: toIsoDay(weekEnd),
    }),
    queryFn: () =>
      listSessions({
        from: toIsoDay(weekStart),
        to: toIsoDay(weekEnd),
      }),
  });

  const sessions = sessionsQuery.data ?? [];

  const timeSlots = useMemo(() => {
    const set = new Set<string>();
    for (const session of sessions) {
      set.add(formatHHMM(session.startAt));
    }
    return Array.from(set).sort();
  }, [sessions]);

  const cellMap = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    for (const session of sessions) {
      const day = new Date(session.startAt).getDay();
      const time = formatHHMM(session.startAt);
      const key = `${day}|${time}`;
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const displaySlots = timeSlots.length > 0 ? timeSlots : ["—"];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>الجدول الأسبوعي</Text>
      <Text style={styles.subtitle}>حصص المركز لهذا الأسبوع</Text>

      <View style={styles.weekNav}>
        <Pressable
          style={styles.weekNavBtn}
          onPress={() => setWeekOffset((v) => v - 1)}
          accessibilityLabel="الأسبوع السابق"
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={centerColors.text}
          />
        </Pressable>
        <Text style={styles.weekLabel}>{formatWeekLabel(weekStart)}</Text>
        <Pressable
          style={styles.weekNavBtn}
          onPress={() => setWeekOffset((v) => v + 1)}
          accessibilityLabel="الأسبوع التالي"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={centerColors.text}
          />
        </Pressable>
      </View>

      <Pressable style={styles.resetWeek} onPress={() => setWeekOffset(0)}>
        <Text style={styles.resetWeekText}>هذا الأسبوع</Text>
      </Pressable>

      {sessionsQuery.isLoading ? (
        <ActivityIndicator size="large" color={centerColors.accent} />
      ) : sessionsQuery.isError ? (
        <Text style={styles.errorText}>
          {sessionsQuery.error instanceof Error
            ? sessionsQuery.error.message
            : "تعذر تحميل الجدول"}
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.tableScroll}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.cell, styles.timeHeaderCell]}>
                <Text style={styles.headerText}>الوقت</Text>
              </View>
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} style={[styles.cell, styles.dayHeaderCell]}>
                  <Text style={styles.headerText} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {displaySlots.map((time) => (
              <View key={time} style={styles.tableRow}>
                <View style={[styles.cell, styles.timeCell]}>
                  <Text style={styles.timeText}>{time === "—" ? "—" : time}</Text>
                </View>
                {WEEKDAY_LABELS.map((_, day) => {
                  if (time === "—") {
                    return (
                      <View key={`${day}-empty`} style={[styles.cell, styles.dayCell]}>
                        <Text style={styles.emptyCell}>—</Text>
                      </View>
                    );
                  }
                  const items = cellMap.get(`${day}|${time}`) ?? [];
                  const first = items[0];
                  const extra = items.length - 1;
                  const colors = first
                    ? PILL_COLORS[first.subjectIndex % PILL_COLORS.length]
                    : null;

                  return (
                    <Pressable
                      key={`${day}|${time}`}
                      style={[styles.cell, styles.dayCell]}
                      disabled={!first}
                      onPress={() => {
                        if (!first) return;
                        router.push(
                          `/main/session/${first.id}` as import("expo-router").Href
                        );
                      }}
                    >
                      {first && colors ? (
                        <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                          <Text
                            style={[styles.pillTitle, { color: colors.text }]}
                            numberOfLines={2}
                          >
                            {shortTitle(first.title)}
                          </Text>
                          <Text style={[styles.pillMeta, { color: colors.text }]}>
                            {SESSION_MODE_LABELS[first.mode]}
                            {extra > 0 ? ` · +${extra}` : ""}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.emptyCell}>—</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {!sessionsQuery.isLoading &&
      !sessionsQuery.isError &&
      sessions.length === 0 ? (
        <Text style={styles.emptyWeekHint}>لا توجد حصص مجدولة في هذا الأسبوع</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: centerColors.textSecondary,
    marginBottom: spacing.md,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  weekNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: centerColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: centerColors.text,
  },
  resetWeek: {
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  resetWeekText: {
    fontSize: 13,
    fontWeight: "600",
    color: centerColors.accent,
  },
  tableScroll: {
    marginHorizontal: -spacing.lg,
  },
  tableScrollContent: {
    paddingHorizontal: spacing.lg,
  },
  table: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: centerColors.cardBg,
  },
  tableRow: {
    flexDirection: "row",
  },
  cell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: centerColors.cardBorder,
    justifyContent: "center",
    minHeight: 64,
  },
  timeHeaderCell: {
    width: TIME_COL_WIDTH,
    backgroundColor: centerColors.accent,
    borderLeftWidth: 0,
    minHeight: 44,
  },
  dayHeaderCell: {
    width: DAY_COL_WIDTH,
    backgroundColor: centerColors.accent,
    minHeight: 44,
    alignItems: "center",
  },
  headerText: {
    color: centerColors.textOnAccent,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  timeCell: {
    width: TIME_COL_WIDTH,
    backgroundColor: centerColors.surfaceMuted,
    borderLeftWidth: 0,
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: centerColors.textSecondary,
  },
  dayCell: {
    width: DAY_COL_WIDTH,
    alignItems: "center",
  },
  emptyCell: {
    fontSize: 12,
    color: centerColors.textMuted,
    textAlign: "center",
  },
  pill: {
    width: "100%",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  pillTitle: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  pillMeta: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.9,
  },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
  },
  emptyWeekHint: {
    marginTop: spacing.md,
    fontSize: 13,
    color: centerColors.textSecondary,
    textAlign: "center",
  },
});
