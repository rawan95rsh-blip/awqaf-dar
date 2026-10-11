import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import { Button, Skeleton, Text, useToast } from "@/src/ui";
import {
  checkInToSession,
  fetchMySessionAttendance,
  sessionAttendanceQueryKeys,
} from "@/src/api/sessionAttendance";
import { studentQueryKeys } from "@/src/api/students";
import { ATTENDANCE_STATUS_LABELS } from "@/src/types/attendance";
import type { SessionItem } from "@/src/types/session";
import { formatTime } from "@/src/utils/format";
import { heroGlass } from "./tokens";
import { CHECK_IN_EARLY_MINUTES, isCheckInWindowOpen, sessionPhase } from "./sessionTiming";
import { useNow } from "./hooks";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * تحضير الطالبة الذاتي لحصة واحدة — يعرض حالتها أو زر «سجّلي حضوركِ» داخل نافذة التحضير.
 * appearance="hero" للعرض فوق البطاقة الخضراء في الرئيسية.
 */
export default function SessionCheckIn({
  session,
  appearance = "card",
}: {
  session: SessionItem;
  appearance?: "card" | "hero";
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const now = useNow(20_000);
  const onHero = appearance === "hero";
  const phase = sessionPhase(session, now);
  const windowOpen = isCheckInWindowOpen(session, now);
  const eligible = !!session.levelId && session.isMyLevel !== false && session.status !== "cancelled";

  const attendanceQuery = useQuery({
    queryKey: sessionAttendanceQueryKeys.mine(session.id),
    queryFn: () => fetchMySessionAttendance(session.id),
    enabled: eligible,
  });
  const { refetch } = attendanceQuery;

  // عند فتح/إغلاق نافذة التحضير أثناء بقاء الشاشة مفتوحة نحدّث الحالة من الخادم
  useEffect(() => {
    if (eligible) void refetch();
  }, [windowOpen, eligible, refetch]);

  const checkIn = useMutation({
    mutationFn: () => checkInToSession(session.id, "present"),
    onSuccess: (result) => {
      toast.success(result.message || "تم تسجيل حضوركِ");
      void queryClient.invalidateQueries({ queryKey: sessionAttendanceQueryKeys.mine(session.id) });
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.me() });
      void queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      void refetch();
    },
  });

  const fg = onHero ? colors.onPrimary : colors.textSecondary;

  const note = (icon: IconName, text: string) => (
    <View style={styles.noteRow}>
      <MaterialCommunityIcons name={icon} size={18} color={onHero ? colors.primaryMuted : colors.textMuted} />
      <Text variant="caption" style={[styles.flex, { color: fg }]}>
        {text}
      </Text>
    </View>
  );

  if (session.status === "cancelled") return null;
  if (!session.levelId) return note("information-outline", "التحضير الذاتي غير متاح لهذه الحصة");
  if (session.isMyLevel === false) {
    return note("account-multiple-outline", "هذه الحصة لمستوى آخر — التحضير لطالبات المستوى فقط");
  }

  if (attendanceQuery.isLoading) {
    return <Skeleton height={48} radiusSize={radius.md} style={onHero ? styles.heroSkeleton : undefined} />;
  }

  if (attendanceQuery.isError) {
    return (
      <View style={styles.noteRow}>
        <MaterialCommunityIcons name="wifi-alert" size={18} color={onHero ? colors.primaryMuted : colors.danger} />
        <Text variant="caption" style={[styles.flex, { color: onHero ? colors.onPrimary : colors.danger }]}>
          تعذّر تحميل حالة الحضور
        </Text>
        <Button size="sm" variant={onHero ? "secondary" : "ghost"} onPress={() => void refetch()}>
          إعادة المحاولة
        </Button>
      </View>
    );
  }

  const record = attendanceQuery.data;

  if (record?.status) {
    const late = record.status === "late";
    return (
      <View
        style={[styles.recorded, onHero ? styles.recordedHero : late ? styles.recordedLate : styles.recordedOk]}
        accessibilityLiveRegion="polite"
      >
        <MaterialCommunityIcons
          name={late ? "clock-alert-outline" : "check-decagram"}
          size={22}
          color={onHero ? colors.onPrimary : late ? colors.accentStrong : colors.success}
        />
        <View style={styles.flex}>
          <Text variant="bodyStrong" style={{ color: onHero ? colors.onPrimary : late ? colors.accentStrong : colors.success }}>
            {`تم تسجيل حضوركِ: ${ATTENDANCE_STATUS_LABELS[record.status]}`}
          </Text>
          {record.checkedInAt ? (
            <Text variant="micro" style={{ color: onHero ? colors.primaryMuted : colors.textSecondary }}>
              {`الساعة ${formatTime(record.checkedInAt)}`}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (record?.canCheckIn) {
    return (
      <View style={styles.actionWrap}>
        <Button
          fullWidth
          size="lg"
          variant={onHero ? "accent" : "primary"}
          icon="hand-back-right-outline"
          loading={checkIn.isPending}
          onPress={() => checkIn.mutate()}
          accessibilityLabel="سجّلي حضوركِ في هذه الحصة"
          accessibilityHint="يُسجَّل حضوركِ في كشف التحضير"
        >
          سجّلي حضوركِ
        </Button>
        <Text variant="micro" align="center" style={{ color: onHero ? colors.primaryMuted : colors.textMuted }}>
          {`متاح من قبل الحصة بـ ${CHECK_IN_EARLY_MINUTES} دقيقة وحتى نهايتها`}
        </Text>
      </View>
    );
  }

  if (phase === "upcoming") {
    const opensAt = new Date(new Date(session.startAt).getTime() - CHECK_IN_EARLY_MINUTES * 60_000);
    return note("clock-outline", `يُفتح التحضير الساعة ${formatTime(opensAt)} (قبل الحصة بـ ${CHECK_IN_EARLY_MINUTES} دقيقة)`);
  }
  if (phase === "ended") {
    return note("calendar-clock", "انتهت الحصة ولم يُسجَّل حضور — راجعي المعلمة إن كنتِ حاضرة");
  }
  return note("information-outline", record?.checkInMessage ?? "التسجيل غير متاح الآن");
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  actionWrap: { gap: space[2] },
  recorded: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.md,
  },
  recordedOk: { backgroundColor: colors.successSoft },
  recordedLate: { backgroundColor: colors.accentSoft },
  recordedHero: { backgroundColor: heroGlass },
  heroSkeleton: { backgroundColor: heroGlass },
});
