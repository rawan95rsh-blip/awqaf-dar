import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  I18nManager,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/src/components/Button";
import BiometricToggle from "@/src/components/BiometricToggle";
import { useAuth } from "@/src/context/AuthContext";
import { isStoredSessionValid } from "@/src/api/auth";
import { fetchCurrentStudent, studentQueryKeys } from "@/src/api/students";
import { listMySessions, sessionsQueryKeys } from "@/src/api/sessions";
import {
  fetchMyNotifications,
  markNotificationReadApi,
  notificationsQueryKeys,
} from "@/src/api/notifications";
import { submitAccountDeletionRequest } from "@/src/api/accountDeletionRequests";
import { submitSuspensionRequest } from "@/src/api/suspensionRequests";
import { colors, spacing } from "@/constants";
import type { AttendanceCalendarDay } from "@/src/types/student";
import {
  SESSION_MODE_LABELS,
  type SessionItem,
} from "@/src/types/session";

const WEEK_DAYS = ["أح", "اث", "ثل", "أر", "خم", "جم", "سب"];

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** نطاق أسبوع من الأحد (محلي) + 7 أيام لفلتر الجدول */
function getWeekRangeIso(anchor = new Date()): { from: string; to: string } {
  const start = startOfLocalDay(anchor);
  const day = start.getDay(); // 0 = Sunday
  start.setDate(start.getDate() - day);
  const end = addDays(start, 7);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function formatSessionWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function getCalendarCellColor(status: AttendanceCalendarDay["status"]): string {
  if (status === "present") return "#22c55e";
  if (status === "absent") return "#ef4444";
  if (status === "late") return "#f59e0b";
  return colors.border;
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const sessionValid = isStoredSessionValid(token, user);

  useEffect(() => {
    if (authLoading) return;
    if (!sessionValid) {
      router.replace("/(auth)/welcome" as Href);
      return;
    }
    if (user?.role !== "student") {
      router.replace("/main" as Href);
    }
  }, [authLoading, sessionValid, router, user?.role]);

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: studentQueryKeys.me(),
    queryFn: fetchCurrentStudent,
    enabled: sessionValid && user?.role === "student",
  });

  const weekRange = useMemo(() => getWeekRangeIso(), []);

  const {
    data: mySessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
    error: sessionsErrorObj,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: sessionsQueryKeys.mine(weekRange),
    queryFn: () => listMySessions(weekRange),
    enabled: sessionValid && user?.role === "student",
  });

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    isError: notificationsError,
    error: notificationsErrorObj,
    isFetching: notificationsFetching,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: notificationsQueryKeys.mine,
    queryFn: fetchMyNotifications,
    enabled: sessionValid && user?.role === "student",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.mine });
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (sessionValid && user?.role === "student") {
        void refetchNotifications();
      }
    }, [sessionValid, user?.role, refetchNotifications])
  );

  const handleLogout = () => {
    logout(() => {
      router.replace("/(auth)/welcome" as Href);
    });
  };

  const handleRequestDeletion = () => {
    Alert.alert(
      "طلب حذف كلي",
      "سيُرسل طلب لمركزك. بعد الموافقة يُعطَّل حسابك ويمكنك التسجيل في مركز آخر لاحقاً.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إرسال الطلب",
          style: "destructive",
          onPress: () => {
            void submitAccountDeletionRequest()
              .then((res) => Alert.alert("تم", res.message))
              .catch((err: Error) => Alert.alert("خطأ", err.message));
          },
        },
      ]
    );
  };

  const handleRequestSuspension = () => {
    Alert.alert(
      "طلب وقف قيد",
      "سيُرسل طلب لمركزك. بعد الموافقة لن تتمكنين من تسجيل الدخول حتى تعيد الإدارة تفعيل القيد.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إرسال الطلب",
          onPress: () => {
            void submitSuspensionRequest()
              .then((res) => Alert.alert("تم", res.message))
              .catch((err: Error) => Alert.alert("خطأ", err.message));
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchSessions(),
        refetchNotifications(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (authLoading || !sessionValid || user?.role !== "student") {
    return null;
  }

  const attendancePercent = profile?.attendancePercent;
  const calendar = profile?.attendanceCalendar ?? [];
  const hasAttendance = calendar.some((day) => day.status != null);
  const centerName =
    profile?.center?.nameAr ??
    profile?.centerName ??
    user?.centerProfile?.nameAr;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching || notificationsFetching}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons
              name="account-heart"
              size={40}
              color={colors.primary}
            />
          </View>
          <Text style={styles.heroGreeting}>مرحباً</Text>
          <Text style={styles.heroName}>
            {profile?.fullName ?? user?.studentProfile?.fullName ?? "طالبة"}
          </Text>
          {centerName ? (
            <View style={styles.centerBadge}>
              <MaterialCommunityIcons
                name="home-city"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.centerBadgeText}>{centerName}</Text>
            </View>
          ) : null}
          {profile?.levelName ? (
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.levelBadgeText}>{profile.levelName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={colors.primaryDark}
            />
            <Text style={styles.sectionTitle}>إشعاراتي</Text>
            {(notificationsData?.unreadCount ?? 0) > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {notificationsData?.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
          {notificationsLoading && !notificationsData ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : notificationsError ? (
            <View>
              <Text style={styles.notificationsError}>
                {notificationsErrorObj instanceof Error
                  ? notificationsErrorObj.message
                  : "تعذر تحميل الإشعارات"}
              </Text>
              <Pressable onPress={() => refetchNotifications()}>
                <Text style={styles.retryTextInline}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : (notificationsData?.items?.length ?? 0) === 0 ? (
            <Text style={styles.placeholderText}>
              لا إشعارات بعد (قبول التسجيل أو اعتذار معلمة)
            </Text>
          ) : (
            <View style={styles.notificationsList}>
              {(notificationsData?.items ?? []).slice(0, 8).map((n) => (
                <Pressable
                  key={n.id}
                  style={[
                    styles.notificationRow,
                    !n.readAt && styles.notificationRowUnread,
                  ]}
                  onPress={() => {
                    if (!n.readAt) markReadMutation.mutate(n.id);
                    if (
                      n.type === "session_cancelled" &&
                      typeof n.data?.sessionId === "string"
                    ) {
                      router.push(
                        `/(auth)/session/${n.data.sessionId}` as Href
                      );
                    }
                  }}
                >
                  <Text style={styles.notificationTitle}>{n.title}</Text>
                  <Text style={styles.notificationBody} numberOfLines={3}>
                    {n.body}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {(error as Error)?.message ?? "تعذّر تحميل البيانات"}
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="school"
                  size={22}
                  color={colors.primaryDark}
                />
                <Text style={styles.sectionTitle}>مستواي</Text>
              </View>
              <Text style={styles.levelTitle}>
                {profile?.level?.fullName ?? profile?.levelName ?? "—"}
              </Text>
              {profile?.level?.shortName ? (
                <Text style={styles.levelSubtitle}>
                  {profile.level.shortName}
                </Text>
              ) : null}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={22}
                  color={colors.primaryDark}
                />
                <Text style={styles.sectionTitle}>جدولي</Text>
              </View>
              <Text style={styles.scheduleHint}>
                حصص المركز هذا الأسبوع. المميزة بـ «مستواي» تخص مستواك.
              </Text>
              {sessionsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : sessionsError ? (
                <View>
                  <Text style={styles.placeholderText}>
                    {sessionsErrorObj instanceof Error
                      ? sessionsErrorObj.message
                      : "تعذر تحميل الجدول"}
                  </Text>
                  <Pressable onPress={() => refetchSessions()}>
                    <Text style={styles.retryTextInline}>إعادة المحاولة</Text>
                  </Pressable>
                </View>
              ) : mySessions.length === 0 ? (
                <Text style={styles.placeholderText}>
                  لا توجد حصص مجدولة لهذا الأسبوع
                </Text>
              ) : (
                <View style={styles.scheduleList}>
                  {mySessions.map((session: SessionItem) => (
                    <Pressable
                      key={session.id}
                      style={[
                        styles.sessionCard,
                        session.isMyLevel && styles.sessionCardMine,
                      ]}
                      onPress={() =>
                        router.push(
                          `/(auth)/session/${session.id}` as Href
                        )
                      }
                    >
                      <View style={styles.sessionCardHeader}>
                        <Text style={styles.sessionTitle} numberOfLines={2}>
                          {session.title}
                        </Text>
                        {session.isMyLevel ? (
                          <View style={styles.mineChip}>
                            <Text style={styles.mineChipText}>مستواي</Text>
                          </View>
                        ) : (
                          <View style={styles.otherChip}>
                            <Text style={styles.otherChipText}>مركز</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.sessionWhen}>
                        {formatSessionWhen(session.startAt)}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {SESSION_MODE_LABELS[session.mode]}
                        {session.teacherName
                          ? ` · ${session.teacherName}`
                          : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="calendar-month"
                  size={22}
                  color={colors.primaryDark}
                />
                <Text style={styles.sectionTitle}>حضوري</Text>
                <Text style={styles.sectionMeta}>
                  {attendancePercent == null ? "—" : `${attendancePercent}%`}
                </Text>
              </View>
              {hasAttendance ? (
                <>
                  <View style={styles.calendarGrid}>
                    {WEEK_DAYS.map((day) => (
                      <View key={day} style={styles.calendarDayHeader}>
                        <Text style={styles.calendarDayText}>{day}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {calendar.map((day) => {
                      const dayNum = day.date.split("-")[2] ?? "";
                      return (
                        <View
                          key={day.date}
                          style={[
                            styles.calendarCell,
                            {
                              backgroundColor: getCalendarCellColor(day.status),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarCellText,
                              day.status != null && styles.calendarCellTextActive,
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.calendarHint}>آخر 30 يوماً</Text>
                </>
              ) : (
                <Text style={styles.placeholderText}>
                  لا يوجد سجل حضور بعد
                </Text>
              )}
            </View>
          </>
        )}

        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>الأمان</Text>
          <BiometricToggle />
        </View>

        <View style={styles.logoutWrap}>
          <Button
            onPress={handleRequestSuspension}
            variant="outlined"
            accessibilityLabel="طلب وقف قيد"
          >
            طلب وقف قيد
          </Button>
        </View>

        <View style={styles.logoutWrap}>
          <Button
            onPress={handleRequestDeletion}
            variant="outlined"
            accessibilityLabel="طلب حذف كلي للحساب"
          >
            طلب حذف كلي للحساب
          </Button>
        </View>

        <View style={styles.logoutWrap}>
          <Button
            onPress={handleLogout}
            variant="outlined"
            accessibilityLabel="تسجيل الخروج"
          >
            تسجيل الخروج
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e8f5fd",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroGreeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  centerBadge: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  centerBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  levelBadge: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#e8f5fd",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryBtn: {
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.background,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  sectionMeta: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  notificationsList: {
    gap: spacing.sm,
  },
  notificationRow: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationRowUnread: {
    borderColor: colors.primary,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 20,
  },
  notificationsError: {
    fontSize: 13,
    color: colors.error,
    textAlign: "right",
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  levelSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayHeader: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  calendarDayText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  calendarCellTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  calendarHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  scheduleHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  scheduleList: {
    gap: spacing.sm,
  },
  sessionCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCardMine: {
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  mineChip: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mineChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  otherChip: {
    backgroundColor: "#eff3f4",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  otherChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  sessionWhen: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
  },
  retryTextInline: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.sm,
  },
  logoutWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  securitySection: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
});
