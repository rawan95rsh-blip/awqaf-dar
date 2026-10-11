import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space, toneColors } from "@/src/theme";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  Section,
  Skeleton,
  StatTile,
  Text,
} from "@/src/ui";
import AttendanceCalendar from "@/src/components/AttendanceCalendar";
import { getGradeLabelInfo } from "@/src/constants/grades";
import { percent } from "@/src/utils/format";
import { useMyAttendance, useMyGrades, useMyProfile } from "@/src/components/student/hooks";
import { countLabel, DAY_FORMS, SUBJECT_FORMS } from "@/src/components/student/arabicCount";
import SubjectGradeCard, { gradeTone } from "@/src/components/student/SubjectGradeCard";

export default function StudentGradesScreen() {
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  const gradesQuery = useMyGrades(profile?.id);
  const attendanceQuery = useMyAttendance(profile?.id);

  const currentLevelId = profile?.levelId ?? gradesQuery.data?.levelId ?? null;
  const { current, previous } = useMemo(() => {
    const all = gradesQuery.data?.grades ?? [];
    const cur = all.filter((g) => !currentLevelId || g.levelId === currentLevelId);
    const prev = currentLevelId ? all.filter((g) => g.levelId !== currentLevelId) : [];
    return { current: cur, previous: prev };
  }, [gradesQuery.data, currentLevelId]);

  const average = useMemo(() => {
    if (profile?.gradeAverage != null) return profile.gradeAverage;
    if (!current.length) return null;
    return Math.round(current.reduce((sum, g) => sum + g.total, 0) / current.length);
  }, [profile?.gradeAverage, current]);

  const attendancePercent = attendanceQuery.data?.attendancePercent ?? profile?.attendancePercent ?? null;
  const absentDays = attendanceQuery.data?.absentDays ?? profile?.absentDays ?? 0;
  const calendar = attendanceQuery.data?.calendar ?? profile?.attendanceCalendar ?? [];
  const hasAttendance = calendar.some((d) => d.status);
  const presentDays = calendar.filter((d) => d.status === "present" || d.status === "late").length;

  const levelTitle = profile?.level?.fullName || profile?.levelName || "";
  const loadingProfile = profileQuery.isLoading;

  const refresh = () => {
    void profileQuery.refetch();
    if (profile?.id) {
      void gradesQuery.refetch();
      void attendanceQuery.refetch();
    }
  };

  if (profileQuery.isError) {
    return (
      <Screen withTabBar header={<Header large title="درجاتي" />}>
        <ErrorState message={(profileQuery.error as Error).message} onRetry={() => void profileQuery.refetch()} />
      </Screen>
    );
  }

  const avgTone = average == null ? null : toneColors[gradeTone(average)];

  return (
    <Screen
      withTabBar
      refreshing={profileQuery.isRefetching || gradesQuery.isRefetching || attendanceQuery.isRefetching}
      onRefresh={refresh}
      header={<Header large title="درجاتي" subtitle={levelTitle || undefined} />}
    >
      {/* الملخص */}
      {loadingProfile ? (
        <Skeleton height={132} radiusSize={radius.xl} />
      ) : (
        <Card padding={5} elevated style={styles.summary}>
          <View style={[styles.ring, avgTone ? { borderColor: avgTone.fg, backgroundColor: avgTone.bg } : null]}>
            <Text variant="display" tabular style={avgTone ? { color: avgTone.fg } : undefined}>
              {average == null ? "—" : String(average)}
            </Text>
          </View>
          <View style={styles.summaryText}>
            <Text variant="eyebrow" color="accentStrong">
              المعدل العام
            </Text>
            <Text variant="headline">
              {average == null ? "لم تُرصد درجات بعد" : getGradeLabelInfo(average).label}
            </Text>
            <Text variant="caption" color="textSecondary">
              {current.length
                ? `محسوب من ${countLabel(current.length, SUBJECT_FORMS)}${levelTitle ? ` في ${levelTitle}` : ""}`
                : "يظهر المعدل بعد أن ترصد المعلمات الدرجات"}
            </Text>
          </View>
        </Card>
      )}

      <View style={styles.stats}>
        <StatTile
          label="نسبة الحضور"
          value={loadingProfile ? "…" : percent(attendancePercent)}
          icon="calendar-check"
          tone={attendancePercent == null || attendancePercent >= 85 ? "success" : "warning"}
          hint={attendancePercent != null && attendancePercent < 85 ? "أقل من 85% — حافظي على الحضور" : undefined}
        />
        <StatTile
          label="أيام الغياب"
          value={loadingProfile ? "…" : absentDays}
          icon="calendar-remove"
          tone={absentDays > 0 ? "danger" : "success"}
        />
      </View>

      {/* المواد */}
      <Section title="درجات المواد" subtitle={levelTitle ? `مستوى ${levelTitle}` : undefined}>
        {loadingProfile || gradesQuery.isLoading ? (
          <View style={styles.list}>
            <Skeleton height={148} radiusSize={radius.lg} />
            <Skeleton height={148} radiusSize={radius.lg} />
          </View>
        ) : gradesQuery.isError ? (
          <Card padding={2}>
            <ErrorState compact message={(gradesQuery.error as Error).message} onRetry={() => void gradesQuery.refetch()} />
          </Card>
        ) : current.length === 0 ? (
          <Card padding={2}>
            <EmptyState
              compact
              icon="clipboard-text-clock-outline"
              title="لا توجد درجات مرصودة"
              description="ستظهر درجاتكِ في كل مادة هنا فور رصدها من المعلمة"
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {current.map((g) => (
              <SubjectGradeCard
                key={`${g.levelId}-${g.subjectIndex}`}
                subjectIndex={g.subjectIndex}
                total={g.total}
                label={g.label}
                breakdown={g.breakdown}
              />
            ))}
          </View>
        )}
      </Section>

      {/* الحضور */}
      <Section title="سجل الحضور" subtitle="آخر 30 يوماً">
        <Card padding={4} style={styles.attendanceCard}>
          {attendanceQuery.isLoading || loadingProfile ? (
            <Skeleton height={220} radiusSize={radius.md} />
          ) : attendanceQuery.isError && !calendar.length ? (
            <ErrorState
              compact
              message={(attendanceQuery.error as Error).message}
              onRetry={() => void attendanceQuery.refetch()}
            />
          ) : hasAttendance ? (
            <>
              <View style={styles.attendanceSummary}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
                <Text variant="label" style={styles.flex}>
                  {presentDays ? `حضرتِ ${countLabel(presentDays, DAY_FORMS)} خلال الشهر` : "لم يُسجَّل حضور خلال الشهر"}
                </Text>
                {absentDays > 0 ? <Badge label={`غياب ${absentDays}`} tone="danger" size="sm" /> : null}
              </View>
              <AttendanceCalendar days={calendar} />
            </>
          ) : (
            <EmptyState
              compact
              icon="calendar-blank-outline"
              title="لا يوجد تحضير بعد"
              description="سجّلي حضوركِ من بطاقة الحصة عند بدايتها ليظهر هنا"
            />
          )}
        </Card>
      </Section>

      {previous.length ? (
        <Section title="درجات مستويات سابقة">
          <View style={styles.list}>
            {previous.map((g) => (
              <SubjectGradeCard
                key={`${g.levelId}-${g.subjectIndex}`}
                subjectIndex={g.subjectIndex}
                total={g.total}
                label={g.label}
                breakdown={g.breakdown}
              />
            ))}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { flexDirection: "row", alignItems: "center", gap: space[4] },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: { flex: 1, gap: 2 },
  stats: { flexDirection: "row", gap: space[3], marginTop: space[4] },
  list: { gap: space[3] },
  attendanceCard: { gap: space[3] },
  attendanceSummary: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
