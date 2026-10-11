import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, shadows, space } from "@/src/theme";
import { Avatar, Badge, Card, Header, ListItem, Screen, Section, StatTile, Text } from "@/src/ui";
import WeeklySchedule from "@/src/components/WeeklySchedule";
import { useAuth } from "@/src/context/AuthContext";
import { useCenterInbox } from "@/src/hooks/useCenterInbox";
import { fetchStudents, studentQueryKeys } from "@/src/api/students";
import { listSessions, sessionsQueryKeys } from "@/src/api/sessions";
import { addDays, formatDateLong, formatTime, greeting } from "@/src/utils/format";
import { SESSION_MODE_LABELS } from "@/src/types/session";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const QUICK_ACTIONS: Array<{ id: string; label: string; icon: IconName; href: string; tone: "primary" | "accent" }> = [
  { id: "class", label: "فصل جديد", icon: "calendar-plus", href: "/main/add-class", tone: "primary" },
  { id: "student", label: "طالبة جديدة", icon: "account-plus-outline", href: "/main/add-student", tone: "primary" },
  { id: "reports", label: "التقارير", icon: "file-chart-outline", href: "/main/reports", tone: "accent" },
  { id: "levels", label: "المستويات", icon: "layers-outline", href: "/main/classes", tone: "accent" },
];

export default function CenterHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const inbox = useCenterInbox();
  const centerName = user?.centerProfile?.nameAr ?? "المركز";

  const studentsQuery = useQuery({
    queryKey: studentQueryKeys.list({ enrollmentStatus: "enrolled" }),
    queryFn: () => fetchStudents({ enrollmentStatus: "enrolled" }),
  });

  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: addDays(start, 1).toISOString() };
  }, []);

  const todayQuery = useQuery({
    queryKey: sessionsQueryKeys.list(todayRange),
    queryFn: () => listSessions(todayRange),
  });

  const students = studentsQuery.data ?? [];
  const needsAttention = students.filter((s) => s.status === "frequent_absence" || s.status === "warning").length;
  const today = todayQuery.data ?? [];
  const nextSession = today.find((s) => s.status === "scheduled" && new Date(s.endAt) > new Date());

  const refreshing = studentsQuery.isRefetching || todayQuery.isRefetching || inbox.isRefetching;

  return (
    <Screen
      withTabBar
      refreshing={refreshing}
      onRefresh={() => {
        void studentsQuery.refetch();
        void todayQuery.refetch();
        void inbox.refetchAll();
      }}
      header={
        <Header
          large
          eyebrow={greeting()}
          title={centerName}
          subtitle={formatDateLong(new Date())}
          actions={
            <Pressable
              onPress={() => router.push("/main/account" as Href)}
              accessibilityRole="button"
              accessibilityLabel="الحساب"
            >
              <Avatar name={centerName} size={40} tone="accent" />
            </Pressable>
          }
        />
      }
    >
      {inbox.total > 0 ? (
        <Card tone="accent" onPress={() => router.navigate("/main/requests" as Href)} style={styles.inboxCard}>
          <View style={styles.inboxIcon}>
            <MaterialCommunityIcons name="inbox-arrow-down" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{`لديكِ ${inbox.total} طلبات بانتظار المراجعة`}</Text>
            <Text variant="caption" color="textSecondary">
              تسجيل · نقل · وقف قيد — راجعيها الآن
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.accentStrong} />
        </Card>
      ) : null}

      <View style={styles.stats}>
        <StatTile
          label="طالبة مسجّلة"
          value={studentsQuery.isLoading ? "…" : students.length}
          icon="account-group"
          onPress={() => router.navigate("/main/students" as Href)}
        />
        <StatTile
          label="حصص اليوم"
          value={todayQuery.isLoading ? "…" : today.filter((s) => s.status !== "cancelled").length}
          icon="calendar-today"
          tone="info"
        />
        <StatTile
          label="تحتاج متابعة"
          value={studentsQuery.isLoading ? "…" : needsAttention}
          icon="alert-outline"
          tone={needsAttention ? "warning" : "success"}
          onPress={() => router.navigate("/main/students?filter=attention" as Href)}
        />
      </View>

      {nextSession ? (
        <Section title="الحصة القادمة">
          <Card elevated onPress={() => router.push(`/main/session/${nextSession.id}` as Href)} style={styles.next}>
            <View style={styles.nextTime}>
              <Text variant="title" color="onPrimary" tabular>
                {formatTime(nextSession.startAt)}
              </Text>
              <Text variant="micro" style={styles.nextTimeSub}>
                {`حتى ${formatTime(nextSession.endAt)}`}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="headline" numberOfLines={1}>
                {nextSession.title}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {[nextSession.teacherName, SESSION_MODE_LABELS[nextSession.mode]].filter(Boolean).join(" · ")}
              </Text>
              <View style={styles.nextActions}>
                <Badge label="التحضير والاعتذار من هنا" tone="primary" icon="gesture-tap" size="sm" />
              </View>
            </View>
          </Card>
        </Section>
      ) : null}

      <Section title="إجراءات سريعة">
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => router.push(action.href as Href)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: action.tone === "accent" ? colors.accentSoft : colors.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={24}
                  color={action.tone === "accent" ? colors.accentStrong : colors.primary}
                />
              </View>
              <Text variant="label" align="center" numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section>
        <WeeklySchedule scopeLabel="جميع المستويات" />
      </Section>

      {needsAttention > 0 ? (
        <Section
          title="طالبات تحتاج متابعة"
          subtitle="حضور أقل من 85% أو معدل أقل من 70"
          action={{ label: "عرض الكل", onPress: () => router.navigate("/main/students?filter=attention" as Href) }}
        >
          <Card padding={0} style={styles.listCard}>
            {students
              .filter((s) => s.status === "frequent_absence" || s.status === "warning")
              .slice(0, 4)
              .map((s, i, arr) => (
                <ListItem
                  key={s.id}
                  title={s.fullName}
                  subtitle={`${s.levelShortName || "—"} · حضور ${s.attendancePercent ?? "—"}%`}
                  leading={<Avatar name={s.fullName} uri={s.photoUrl} size={40} tone={s.status === "frequent_absence" ? "danger" : "warning"} />}
                  onPress={() => router.push(`/main/student-profile/${s.id}` as Href)}
                  divider={i < arr.length - 1}
                />
              ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inboxCard: { flexDirection: "row", alignItems: "center", gap: space[3], marginBottom: space[4] },
  inboxIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: { flexDirection: "row", gap: space[3] },
  next: { flexDirection: "row", alignItems: "center", gap: space[4] },
  nextTime: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    alignItems: "center",
    minWidth: 84,
  },
  nextTimeSub: { color: colors.primaryMuted },
  nextActions: { flexDirection: "row", marginTop: space[2] },
  actions: { flexDirection: "row", gap: space[3] },
  action: {
    flex: 1,
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionPressed: { transform: [{ scale: 0.97 }], backgroundColor: colors.surfaceSunken },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  listCard: { overflow: "hidden" },
});
