import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { colors, radius, space } from "@/src/theme";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  Screen,
  Segmented,
  Skeleton,
  Text,
} from "@/src/ui";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/src/constants/domain";
import type { SessionItem } from "@/src/types/session";
import { addDays, formatDateShort, startOfWeek, toDateKey } from "@/src/utils/format";
import { useMyProfile, useMySessions, useNow } from "@/src/components/student/hooks";
import { countLabel, SESSION_FORMS } from "@/src/components/student/arabicCount";
import SessionRow from "@/src/components/student/SessionRow";

type Scope = "mine" | "all";

export default function StudentScheduleScreen() {
  const router = useRouter();
  const now = useNow();
  const profileQuery = useMyProfile();
  const hasLevel = !!profileQuery.data?.levelId;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [selectedScope, setScope] = useState<Scope>("mine");
  // طالبة بلا مستوى: لا حصص «لمستواها» — نعرض جدول المركز كاملاً
  const scope: Scope = profileQuery.data && !profileQuery.data.levelId ? "all" : selectedScope;

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const range = useMemo(
    () => ({ from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() }),
    [weekStart]
  );
  const sessionsQuery = useMySessions(range);

  const all = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const visible = useMemo(() => (scope === "mine" ? all.filter((s) => s.isMyLevel) : all), [all, scope]);

  const byDay = useMemo(() => {
    const map = new Map<number, SessionItem[]>();
    for (const session of visible) {
      const day = new Date(session.startAt).getDay();
      map.set(day, [...(map.get(day) ?? []), session]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [visible]);

  const mineThisWeek = all.filter((s) => s.isMyLevel && s.status !== "cancelled").length;
  const cancelledMine = all.filter((s) => s.isMyLevel && s.status === "cancelled").length;
  const todayKey = toDateKey(now);
  const daySessions = byDay.get(selectedDay) ?? [];
  const selectedDate = addDays(weekStart, selectedDay);

  const jumpToToday = () => {
    setWeekOffset(0);
    setSelectedDay(new Date().getDay());
  };

  return (
    <Screen
      withTabBar
      refreshing={sessionsQuery.isRefetching}
      onRefresh={() => void sessionsQuery.refetch()}
      header={
        <Header
          large
          title="جدولي"
          subtitle={`${formatDateShort(weekStart)} – ${formatDateShort(addDays(weekStart, 6))}`}
          actions={
            weekOffset !== 0 ? (
              <Button variant="tonal" size="sm" icon="calendar-today" onPress={jumpToToday}>
                اليوم
              </Button>
            ) : null
          }
        />
      }
    >
      {/* شريط الأسبوع */}
      <Card padding={3} style={styles.weekCard}>
        <View style={styles.weekNav}>
          <IconButton
            icon="chevron-right"
            accessibilityLabel="الأسبوع السابق"
            variant="surface"
            size={20}
            onPress={() => setWeekOffset((v) => v - 1)}
          />
          <View style={styles.weekTitle}>
            <Text variant="bodyStrong" align="center">
              {weekOffset === 0
                ? "هذا الأسبوع"
                : weekOffset === 1
                  ? "الأسبوع القادم"
                  : weekOffset === -1
                    ? "الأسبوع الماضي"
                    : `${formatDateShort(weekStart)} – ${formatDateShort(addDays(weekStart, 6))}`}
            </Text>
            <Text variant="caption" color="textSecondary" align="center">
              {sessionsQuery.isLoading
                ? "جاري التحميل…"
                : hasLevel
                  ? mineThisWeek
                    ? `${countLabel(mineThisWeek, SESSION_FORMS)} لمستواكِ${cancelledMine ? ` · ${cancelledMine} ملغاة` : ""}`
                    : "لا حصص لمستواكِ"
                  : all.length
                    ? `${countLabel(all.length, SESSION_FORMS)} في المركز`
                    : "لا حصص في المركز"}
            </Text>
          </View>
          <IconButton
            icon="chevron-left"
            accessibilityLabel="الأسبوع التالي"
            variant="surface"
            size={20}
            onPress={() => setWeekOffset((v) => v + 1)}
          />
        </View>

        <View style={styles.days} accessibilityRole="tablist">
          {WEEKDAYS.map((label, day) => {
            const date = addDays(weekStart, day);
            const isSelected = selectedDay === day;
            const isToday = toDateKey(date) === todayKey;
            const daySet = byDay.get(day) ?? [];
            const hasMine = daySet.some((s) => s.isMyLevel && s.status !== "cancelled");
            const count = daySet.length;
            return (
              <Pressable
                key={label}
                onPress={() => setSelectedDay(day)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${label} ${formatDateShort(date)}${isToday ? "، اليوم" : ""} — ${count ? countLabel(count, SESSION_FORMS) : "لا حصص"}`}
                style={({ pressed }) => [
                  styles.day,
                  isToday && !isSelected && styles.dayToday,
                  isSelected && styles.daySelected,
                  pressed && !isSelected && styles.dayPressed,
                ]}
              >
                <Text
                  variant="micro"
                  color={isSelected ? "onPrimary" : "textSecondary"}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {WEEKDAYS_SHORT[day]}
                </Text>
                <Text variant="bodyStrong" color={isSelected ? "onPrimary" : isToday ? "primary" : "text"} tabular>
                  {String(date.getDate())}
                </Text>
                <View
                  style={[
                    styles.dot,
                    count > 0 && (isSelected ? styles.dotOnSelected : hasMine ? styles.dotMine : styles.dotOther),
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </Card>

      {hasLevel ? (
        <View style={styles.scope}>
          <Segmented<Scope>
            options={[
              { id: "mine", label: "مستواي", icon: "star-four-points-outline" },
              { id: "all", label: "كل حصص المركز", icon: "calendar-multiple" },
            ]}
            value={scope}
            onChange={setScope}
          />
        </View>
      ) : null}

      {/* حصص اليوم المختار */}
      <View style={styles.dayHeader}>
        <Text variant="headline" accessibilityRole="header">
          {toDateKey(selectedDate) === todayKey ? `اليوم · ${WEEKDAYS[selectedDay]}` : WEEKDAYS[selectedDay]}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatDateShort(selectedDate)}
        </Text>
      </View>

      {sessionsQuery.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={76} radiusSize={radius.lg} />
          <Skeleton height={76} radiusSize={radius.lg} />
          <Skeleton height={76} radiusSize={radius.lg} />
        </View>
      ) : sessionsQuery.isError ? (
        <Card padding={2}>
          <ErrorState compact message={(sessionsQuery.error as Error).message} onRetry={() => void sessionsQuery.refetch()} />
        </Card>
      ) : daySessions.length === 0 ? (
        <Card padding={2}>
          <EmptyState
            compact
            icon="calendar-blank-outline"
            title={scope === "mine" ? `لا حصص لمستواكِ يوم ${WEEKDAYS[selectedDay]}` : `لا حصص يوم ${WEEKDAYS[selectedDay]}`}
            description={
              scope === "mine" && (byDay.size > 0 || all.length > 0)
                ? "اختاري يوماً آخر من الشريط أعلاه، أو اعرضي كل حصص المركز"
                : "اختاري يوماً آخر أو انتقلي للأسبوع التالي"
            }
            actionLabel={scope === "mine" && all.some((s) => new Date(s.startAt).getDay() === selectedDay) ? "عرض كل حصص المركز" : undefined}
            onAction={() => setScope("all")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {daySessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              now={now}
              onPress={() => router.push(`/student/session/${session.id}` as Href)}
            />
          ))}
        </View>
      )}

      {scope === "all" && hasLevel && !sessionsQuery.isLoading ? (
        <Text variant="caption" color="textMuted" align="center" style={styles.legend}>
          الحصص المميّزة بـ «مستواي» تخصّكِ، والبقية لمستويات أخرى في المركز
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekCard: { gap: space[3] },
  weekNav: { flexDirection: "row", alignItems: "center", gap: space[2] },
  weekTitle: { flex: 1 },
  days: { flexDirection: "row", gap: 4 },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space[2],
    borderRadius: radius.md,
    gap: 2,
    minHeight: 64,
  },
  dayToday: { backgroundColor: colors.primarySoft },
  daySelected: { backgroundColor: colors.primary },
  dayPressed: { backgroundColor: colors.surfaceSunken },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "transparent" },
  dotMine: { backgroundColor: colors.primary },
  dotOther: { backgroundColor: colors.borderStrong },
  dotOnSelected: { backgroundColor: colors.onPrimary },
  scope: { marginTop: space[4] },
  dayHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: space[6],
    marginBottom: space[3],
  },
  list: { gap: space[2] },
  legend: { marginTop: space[4] },
});
