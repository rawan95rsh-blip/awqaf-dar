import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Skeleton, Text, useToast } from "@/src/ui";
import { listSessions, sessionsQueryKeys } from "@/src/api/sessions";
import { classOffersQueryKeys, listClassOffers } from "@/src/api/classOffers";
import { SESSION_MODE_LABELS, type SessionItem } from "@/src/types/session";
import { SUBJECT_ICONS, WEEKDAYS, WEEKDAYS_SHORT } from "@/src/constants/domain";
import { addDays, formatDateShort, formatTime, startOfWeek, toDateKey } from "@/src/utils/format";
import { exportWorkbook, weeklyScheduleSheets } from "@/src/utils/excel";
import { useAuth } from "@/src/context/AuthContext";

const SUBJECT_TINTS = ["#E8F1EC", "#F4ECDD", "#E7EEF6", "#F3E8EE", "#ECEAF6", "#E9F2F2", "#F5EDE3"];

/**
 * الجدول الأسبوعي — أسبوع × يوم، بقائمة حصص لليوم المختار (أوضح من شبكة صغيرة على الجوال).
 * يعتمد على الفصول المتكررة؛ الخادم يولّد حصص كل أسبوع تلقائياً.
 */
export default function WeeklySchedule({
  levelId,
  title = "الجدول الأسبوعي",
  scopeLabel,
}: {
  levelId?: string;
  title?: string;
  scopeLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [exporting, setExporting] = useState(false);

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const range = useMemo(
    () => ({ from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString(), levelId }),
    [weekStart, levelId]
  );

  const sessionsQuery = useQuery({
    queryKey: sessionsQueryKeys.list(range),
    queryFn: () => listSessions(range),
  });

  const offersQuery = useQuery({
    queryKey: classOffersQueryKeys.list(levelId ? { levelId } : {}),
    queryFn: () => listClassOffers(levelId ? { levelId } : undefined),
  });

  const byDay = useMemo(() => {
    const map = new Map<number, SessionItem[]>();
    for (const session of sessionsQuery.data ?? []) {
      const day = new Date(session.startAt).getDay();
      map.set(day, [...(map.get(day) ?? []), session]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [sessionsQuery.data]);

  const todayKey = toDateKey(new Date());
  const daySessions = byDay.get(selectedDay) ?? [];

  const handleExport = async () => {
    const offers = offersQuery.data ?? [];
    if (!offers.length) {
      toast.error("لا توجد فصول لتصديرها");
      return;
    }
    setExporting(true);
    try {
      await exportWorkbook(
        weeklyScheduleSheets(offers, user?.centerProfile?.nameAr ?? "المركز", scopeLabel ?? "جميع المستويات"),
        `الجدول_الأسبوعي_${scopeLabel ?? "المركز"}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر التصدير");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card padding={4} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="headline">{title}</Text>
          <Text variant="caption" color="textSecondary">
            {`${formatDateShort(weekStart)} – ${formatDateShort(addDays(weekStart, 6))}`}
          </Text>
        </View>
        <IconButton icon="chevron-right" accessibilityLabel="الأسبوع السابق" variant="surface" size={20} onPress={() => setWeekOffset((v) => v - 1)} />
        <IconButton icon="chevron-left" accessibilityLabel="الأسبوع التالي" variant="surface" size={20} onPress={() => setWeekOffset((v) => v + 1)} />
      </View>

      <View style={styles.days}>
        {WEEKDAYS.map((label, day) => {
          const date = addDays(weekStart, day);
          const isSelected = selectedDay === day;
          const isToday = toDateKey(date) === todayKey;
          const count = byDay.get(day)?.length ?? 0;
          return (
            <Pressable
              key={label}
              onPress={() => setSelectedDay(day)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label} ${formatDateShort(date)} — ${count} حصص`}
              style={[styles.day, isSelected && styles.daySelected]}
            >
              <Text variant="micro" color={isSelected ? "onPrimary" : "textSecondary"} numberOfLines={1} adjustsFontSizeToFit>
                {WEEKDAYS_SHORT[day]}
              </Text>
              <Text variant="bodyStrong" color={isSelected ? "onPrimary" : isToday ? "primary" : "text"} tabular>
                {String(date.getDate())}
              </Text>
              <View style={[styles.dot, count > 0 && (isSelected ? styles.dotOnSelected : styles.dotOn)]} />
            </Pressable>
          );
        })}
      </View>

      {sessionsQuery.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={64} radiusSize={radius.md} />
          <Skeleton height={64} radiusSize={radius.md} />
        </View>
      ) : sessionsQuery.isError ? (
        <ErrorState compact message={(sessionsQuery.error as Error).message} onRetry={() => sessionsQuery.refetch()} />
      ) : daySessions.length === 0 ? (
        <EmptyState
          compact
          icon="calendar-blank-outline"
          title={`لا حصص يوم ${WEEKDAYS[selectedDay]}`}
          description={(offersQuery.data?.length ?? 0) === 0 ? "أضيفي فصلاً ليظهر في الجدول كل أسبوع" : undefined}
          actionLabel={(offersQuery.data?.length ?? 0) === 0 ? "إضافة فصل" : undefined}
          onAction={() => router.push((levelId ? `/main/add-class?levelId=${levelId}` : "/main/add-class") as Href)}
        />
      ) : (
        <View style={styles.list}>
          {daySessions.map((session) => {
            const cancelled = session.status === "cancelled";
            return (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/main/session/${session.id}` as Href)}
                accessibilityRole="button"
                accessibilityLabel={`${session.title} ${formatTime(session.startAt)}`}
                style={({ pressed }) => [
                  styles.session,
                  { backgroundColor: SUBJECT_TINTS[session.subjectIndex % SUBJECT_TINTS.length] },
                  cancelled && styles.sessionCancelled,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.time}>
                  <Text variant="bodyStrong" tabular>
                    {formatTime(session.startAt)}
                  </Text>
                  <Text variant="micro" color="textSecondary" tabular>
                    {formatTime(session.endAt)}
                  </Text>
                </View>
                <View style={styles.timeRule} />
                <MaterialCommunityIcons
                  name={SUBJECT_ICONS[session.subjectIndex] ?? "book-outline"}
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.flex}>
                  <Text
                    variant="bodyStrong"
                    numberOfLines={1}
                    style={cancelled ? styles.strike : undefined}
                  >
                    {session.title}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {[session.teacherName, SESSION_MODE_LABELS[session.mode]].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                {cancelled ? <Badge label="ملغاة" tone="danger" size="sm" /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Button
        variant="secondary"
        size="sm"
        icon="microsoft-excel"
        loading={exporting}
        onPress={handleExport}
        style={styles.export}
      >
        تصدير الجدول Excel
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space[4] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  days: { flexDirection: "row", gap: 4 },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space[2],
    borderRadius: radius.md,
    gap: 2,
  },
  daySelected: { backgroundColor: colors.primary },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" },
  dotOn: { backgroundColor: colors.accent },
  dotOnSelected: { backgroundColor: colors.onPrimary },
  list: { gap: space[2] },
  session: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.md,
  },
  sessionCancelled: { opacity: 0.7 },
  time: { alignItems: "center", minWidth: 56 },
  timeRule: { width: 2, alignSelf: "stretch", borderRadius: 1, backgroundColor: colors.primaryMuted },
  strike: { textDecorationLine: "line-through" },
  export: { alignSelf: "flex-start" },
});
