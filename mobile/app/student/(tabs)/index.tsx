import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { colors, space } from "@/src/theme";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  Section,
  Skeleton,
  SkeletonList,
  StatTile,
  Text,
  useToast,
} from "@/src/ui";
import { useAuth } from "@/src/context/AuthContext";
import { TRANSFER_STATUS_LABELS } from "@/src/api/transfers";
import { TRACK_LABELS, trackRequiresLevel } from "@/src/constants/domain";
import { addDays, formatDateLong, formatTime, greeting, percent, toDateKey } from "@/src/utils/format";
import {
  useMarkNotificationsRead,
  useMyAttendance,
  useMyNotifications,
  useMyProfile,
  useMySessions,
  useMyTransfers,
  useNow,
  useRefetchNotificationsOnFocus,
} from "@/src/components/student/hooks";
import NextSessionHero from "@/src/components/student/NextSessionHero";
import NotificationItem, { notificationSessionId } from "@/src/components/student/NotificationItem";
import { dayLabel } from "@/src/components/student/sessionTiming";

const NOTIFICATIONS_PREVIEW = 4;
/** نبحث عن الحصة القادمة خلال أسبوعين (الخادم يولّد الحصص المتكررة لهذا النطاق) */
const LOOKAHEAD_DAYS = 14;

export default function StudentHomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const now = useNow();
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  const attendanceQuery = useMyAttendance(profile?.id);
  const notificationsQuery = useMyNotifications();
  const transfersQuery = useMyTransfers();
  const markRead = useMarkNotificationsRead();
  useRefetchNotificationsOnFocus(notificationsQuery.refetch);

  // النطاق يتجدد مع تغيّر اليوم فقط (لا مع كل نبضة ساعة)
  const todayKey = toDateKey(now);
  const range = useMemo(() => {
    const start = new Date(`${todayKey}T00:00:00`);
    return { from: start.toISOString(), to: addDays(start, LOOKAHEAD_DAYS).toISOString() };
  }, [todayKey]);
  const sessionsQuery = useMySessions(range);

  const mySessions = useMemo(
    () => (sessionsQuery.data ?? []).filter((s) => s.isMyLevel).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [sessionsQuery.data]
  );
  const nextSession = mySessions.find((s) => s.status === "scheduled" && new Date(s.endAt) > now) ?? null;
  const soonCancelled = mySessions.filter(
    (s) =>
      s.status === "cancelled" &&
      new Date(s.endAt) > now &&
      new Date(s.startAt).getTime() - now.getTime() < 48 * 3600_000
  );

  const openTransfer = (transfersQuery.data ?? []).find(
    (t) => t.status === "pending_source" || t.status === "pending_destination"
  );

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
  const visibleNotifications = showAllNotifications ? notifications : notifications.slice(0, NOTIFICATIONS_PREVIEW);

  const displayName = profile?.fullName ?? user?.studentProfile?.fullName ?? "";
  const firstName = displayName.trim().split(/\s+/)[0] || "طالبتنا";
  const centerName = profile?.center?.nameAr ?? profile?.centerName ?? user?.centerProfile?.nameAr;
  const levelLabel = profile?.level?.shortName || profile?.levelShortName || profile?.levelName;
  const hasLevel = !!profile?.levelId;
  const attendancePercent = attendanceQuery.data?.attendancePercent ?? profile?.attendancePercent ?? null;
  const absentDays = attendanceQuery.data?.absentDays ?? profile?.absentDays ?? 0;

  const openSession = (id: string) => router.push(`/student/session/${id}` as Href);
  const goGrades = () => router.navigate("/student/grades" as Href);
  const goProfile = () => router.navigate("/student/profile" as Href);

  const banners: ReactNode[] = [];
  if (profile?.enrollmentStatus === "graduated") {
    banners.push(
      <Banner key="graduated" tone="accent" icon="school-outline" title="مبارك التخرّج!">
        أتممتِ مساركِ الدراسي — بارك الله فيكِ ونفع بكِ.
      </Banner>
    );
  }
  if (profile?.enrollmentStatus === "suspended") {
    banners.push(
      <Banner key="suspended" tone="danger" title="قيدكِ موقوف حالياً">
        تواصلي مع إدارة المركز لإعادة تفعيل القيد.
      </Banner>
    );
  }
  if (profile && profile.enrollmentStatus === "enrolled" && !hasLevel && trackRequiresLevel(profile.track)) {
    banners.push(
      <Banner key="no-level" tone="warning" icon="layers-off-outline" title="لم يُحدَّد مستواكِ بعد">
        ستظهر حصصكِ ودرجاتكِ بعد أن يضيفكِ المركز إلى مستوى.
      </Banner>
    );
  }
  if (openTransfer) {
    banners.push(
      <Banner
        key="transfer"
        tone="info"
        icon="swap-horizontal"
        title={`طلب نقلكِ إلى ${openTransfer.toCenterName}`}
        action={
          <Button variant="ghost" size="sm" onPress={goProfile} style={styles.bannerAction}>
            عرض الطلب
          </Button>
        }
      >
        {TRANSFER_STATUS_LABELS[openTransfer.status]}
      </Banner>
    );
  }
  for (const s of soonCancelled) {
    banners.push(
      <Banner
        key={`cancelled-${s.id}`}
        tone="danger"
        icon="calendar-remove-outline"
        title={`أُلغيت حصة ${s.title} — ${dayLabel(s.startAt, now)} ${formatTime(s.startAt)}`}
        action={
          <Button variant="ghost" size="sm" onPress={() => openSession(s.id)} style={styles.bannerAction}>
            التفاصيل
          </Button>
        }
      >
        {s.cancelReason ? `اعتذار المعلمة: ${s.cancelReason}` : "اعتذرت المعلمة عن هذه الحصة"}
      </Banner>
    );
  }

  const refreshing =
    profileQuery.isRefetching || sessionsQuery.isRefetching || notificationsQuery.isRefetching || attendanceQuery.isRefetching;

  return (
    <Screen
      withTabBar
      refreshing={refreshing}
      onRefresh={() => {
        void profileQuery.refetch();
        void sessionsQuery.refetch();
        void notificationsQuery.refetch();
        void transfersQuery.refetch();
        if (profile?.id) void attendanceQuery.refetch();
      }}
      header={
        <Header
          large
          eyebrow={greeting(now)}
          title={`أهلاً ${firstName}`}
          subtitle={formatDateLong(now)}
          actions={
            <Pressable
              onPress={goProfile}
              accessibilityRole="button"
              accessibilityLabel="حسابي"
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Avatar name={displayName} uri={profile?.photoUrl} size={44} />
            </Pressable>
          }
        />
      }
    >
      {/* المركز والمستوى */}
      {profileQuery.isLoading ? (
        <View style={styles.badges}>
          <Skeleton width={120} height={24} radiusSize={12} />
          <Skeleton width={90} height={24} radiusSize={12} />
        </View>
      ) : profile ? (
        <View style={styles.badges}>
          {centerName ? <Badge label={centerName} tone="accent" icon="home-city-outline" /> : null}
          {levelLabel ? (
            <Badge label={levelLabel} tone="primary" icon="layers-outline" />
          ) : profile.track ? (
            <Badge label={TRACK_LABELS[profile.track]} tone="primary" icon="map-marker-path" />
          ) : null}
        </View>
      ) : null}

      {banners.length ? <View style={styles.banners}>{banners}</View> : null}

      {/* الحصة القادمة */}
      <View style={styles.block}>
        <NextSessionHero
          session={nextSession}
          now={now}
          loading={sessionsQuery.isLoading || profileQuery.isLoading}
          error={sessionsQuery.isError ? (sessionsQuery.error as Error).message : null}
          onRetry={() => void sessionsQuery.refetch()}
          onOpen={openSession}
          hasLevel={hasLevel}
        />
      </View>

      {/* المؤشرات */}
      {profileQuery.isError ? (
        <Card padding={2} style={styles.block}>
          <ErrorState compact message={(profileQuery.error as Error).message} onRetry={() => void profileQuery.refetch()} />
        </Card>
      ) : (
        <View style={[styles.stats, styles.block]}>
          <StatTile
            label="الحضور"
            value={profileQuery.isLoading ? "…" : percent(attendancePercent)}
            icon="calendar-check"
            tone={attendancePercent == null || attendancePercent >= 85 ? "success" : "warning"}
            onPress={goGrades}
          />
          <StatTile
            label="المعدل"
            value={profileQuery.isLoading ? "…" : (profile?.gradeAverage ?? "—")}
            icon="star-outline"
            tone="accent"
            onPress={goGrades}
          />
          <StatTile
            label="أيام الغياب"
            value={profileQuery.isLoading ? "…" : absentDays}
            icon="calendar-remove"
            tone={absentDays > 0 ? "danger" : "success"}
            onPress={goGrades}
          />
        </View>
      )}

      {/* الإشعارات */}
      <Section
        title="الإشعارات"
        subtitle={unreadIds.length ? `${unreadIds.length} غير مقروءة` : undefined}
        action={
          unreadIds.length > 1
            ? {
                label: "تعليم الكل كمقروءة",
                icon: "check-all",
                onPress: () =>
                  markRead.mutate(unreadIds, {
                    onSuccess: () => toast.success("تم تعليم الإشعارات كمقروءة"),
                    onError: (err) => toast.error((err as Error).message),
                  }),
              }
            : undefined
        }
      >
        {notificationsQuery.isLoading ? (
          <Card padding={4}>
            <SkeletonList rows={2} />
          </Card>
        ) : notificationsQuery.isError ? (
          <Card padding={2}>
            <ErrorState
              compact
              message={(notificationsQuery.error as Error).message}
              onRetry={() => void notificationsQuery.refetch()}
            />
          </Card>
        ) : notifications.length === 0 ? (
          <Card padding={2}>
            <EmptyState
              compact
              icon="bell-check-outline"
              title="لا إشعارات بعد"
              description="ستصلكِ هنا تنبيهات المركز مثل قبول التسجيل واعتذار المعلمة عن حصة"
            />
          </Card>
        ) : (
          <Card padding={0} style={styles.listCard}>
            {visibleNotifications.map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                divider={i < visibleNotifications.length - 1}
                onPress={() => {
                  if (!n.readAt) markRead.mutate([n.id]);
                  const sessionId = notificationSessionId(n);
                  if (sessionId) openSession(sessionId);
                }}
              />
            ))}
            {notifications.length > NOTIFICATIONS_PREVIEW ? (
              <Button
                variant="ghost"
                size="sm"
                icon={showAllNotifications ? "chevron-up" : "chevron-down"}
                onPress={() => setShowAllNotifications((v) => !v)}
                style={styles.moreBtn}
              >
                {showAllNotifications ? "عرض أقل" : `عرض الكل (${notifications.length})`}
              </Button>
            ) : null}
          </Card>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  banners: { gap: space[3], marginTop: space[4] },
  bannerAction: { alignSelf: "flex-start", paddingHorizontal: 0, minHeight: 32 },
  block: { marginTop: space[4] },
  stats: { flexDirection: "row", gap: space[3] },
  listCard: { overflow: "hidden" },
  moreBtn: { borderRadius: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
});
