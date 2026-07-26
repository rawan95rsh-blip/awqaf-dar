import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, spacing } from "@/constants";
import { goBack } from "@/src/utils/navigation";
import { openZoomUrl } from "@/src/utils/openZoomUrl";
import { getSession, sessionsQueryKeys } from "@/src/api/sessions";
import {
  checkInToSession,
  fetchMySessionAttendance,
  sessionAttendanceQueryKeys,
} from "@/src/api/sessionAttendance";
import {
  SESSION_MODE_LABELS,
  SESSION_STATUS_LABELS,
} from "@/src/types/session";
import {
  ATTENDANCE_STATUS_LABELS,
} from "@/src/types/attendance";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
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

export default function StudentSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = id ?? "";
  const homeHref = "/(auth)/student-home" as Href;
  const [pendingStatus, setPendingStatus] = useState<"present" | null>(null);

  const sessionQuery = useQuery({
    queryKey: sessionsQueryKeys.detail(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
  });

  const myAttendanceQuery = useQuery({
    queryKey: sessionAttendanceQueryKeys.mine(sessionId),
    queryFn: () => fetchMySessionAttendance(sessionId),
    enabled: !!sessionId,
  });

  const checkInMutation = useMutation({
    mutationFn: (status: "present") => checkInToSession(sessionId, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: sessionAttendanceQueryKeys.mine(sessionId),
      });
      setPendingStatus(null);
      Alert.alert("تم", result.message);
    },
    onError: (err: Error) => {
      setPendingStatus(null);
      Alert.alert("خطأ", err.message);
    },
  });

  const session = sessionQuery.data;
  const myAttendance = myAttendanceQuery.data;
  const hasZoom = Boolean(session?.zoomUrl?.trim());

  const handleCheckIn = (status: "present") => {
    setPendingStatus(status);
    checkInMutation.mutate(status);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => goBack(router, homeHref)}
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={colors.text}
            />
            <Text style={styles.backButtonText}>جدولي</Text>
          </Pressable>
        </View>

        {sessionQuery.isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : sessionQuery.isError || !session ? (
          <Text style={styles.errorText}>
            {sessionQuery.error instanceof Error
              ? sessionQuery.error.message
              : "الحصة غير موجودة"}
          </Text>
        ) : (
          <>
            <Text style={styles.title}>{session.title}</Text>
            <View style={styles.badges}>
              <View
                style={[
                  styles.statusBadge,
                  session.status === "cancelled" && styles.statusBadgeCancelled,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    session.status === "cancelled" && styles.statusBadgeTextCancelled,
                  ]}
                >
                  {SESSION_STATUS_LABELS[session.status]}
                </Text>
              </View>
              {session.isMyLevel ? (
                <View style={styles.mineBadge}>
                  <Text style={styles.mineBadgeText}>مستواي</Text>
                </View>
              ) : null}
            </View>

            {session.status === "cancelled" ? (
              <View style={styles.cancelBanner}>
                <MaterialCommunityIcons
                  name="calendar-remove"
                  size={22}
                  color="#b91c1c"
                />
                <View style={styles.cancelBannerText}>
                  <Text style={styles.cancelBannerTitle}>
                    اعتذرت المعلمة عن هذه الحصة
                  </Text>
                  <Text style={styles.cancelBannerReason}>
                    {session.cancelReason ?? "—"}
                  </Text>
                  {session.cancelledAt ? (
                    <Text style={styles.cancelBannerMeta}>
                      {formatDateTime(session.cancelledAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <InfoRow label="الوضع" value={SESSION_MODE_LABELS[session.mode]} />
              <InfoRow label="البداية" value={formatDateTime(session.startAt)} />
              <InfoRow label="النهاية" value={formatDateTime(session.endAt)} />
              <InfoRow label="المعلمة" value={session.teacherName ?? "—"} />
              {session.notes ? (
                <InfoRow label="ملاحظات" value={session.notes} />
              ) : null}
            </View>

            {session.status !== "cancelled" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>حضوري (كشف التحضير)</Text>
              {myAttendanceQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : myAttendanceQuery.isError ? (
                <Text style={styles.hintText}>
                  {myAttendanceQuery.error instanceof Error
                    ? myAttendanceQuery.error.message
                    : "تعذر تحميل حالة الحضور"}
                </Text>
              ) : myAttendance?.status ? (
                <View style={styles.checkedInBox}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={22}
                    color="#166534"
                  />
                  <Text style={styles.checkedInText}>
                    {myAttendance.status
                      ? ATTENDANCE_STATUS_LABELS[myAttendance.status]
                      : "—"}
                    {myAttendance.checkedInAt
                      ? ` · ${formatDateTime(myAttendance.checkedInAt)}`
                      : ""}
                  </Text>
                </View>
              ) : myAttendance?.canCheckIn ? (
                <View style={styles.checkInActions}>
                  <Text style={styles.hintText}>
                    سجّلي حضورك الآن (متاح قبل الحصة بـ 15 دقيقة وحتى نهايتها)
                  </Text>
                  <Pressable
                    style={styles.checkInBtn}
                    onPress={() => handleCheckIn("present")}
                    disabled={checkInMutation.isPending}
                  >
                    {checkInMutation.isPending && pendingStatus === "present" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="check" size={20} color="#fff" />
                        <Text style={styles.checkInBtnText}>حاضرة</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.hintText}>
                  {myAttendance?.checkInMessage ??
                    "التسجيل غير متاح خارج وقت الحصة"}
                </Text>
              )}
            </View>
            ) : null}

            {session.status !== "cancelled" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Zoom</Text>
              {hasZoom ? (
                <Pressable
                  style={styles.zoomButton}
                  onPress={() => openZoomUrl(session.zoomUrl)}
                  accessibilityRole="button"
                  accessibilityLabel="انضمام عبر Zoom"
                >
                  <MaterialCommunityIcons name="video" size={20} color="#fff" />
                  <Text style={styles.zoomButtonText}>انضمام عبر Zoom</Text>
                </Pressable>
              ) : (
                <Text style={styles.noZoomText}>لا يوجد رابط Zoom لهذه الحصة</Text>
              )}
            </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusBadge: {
    backgroundColor: "#e8f5fd",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  statusBadgeCancelled: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  statusBadgeTextCancelled: {
    color: "#b91c1c",
  },
  cancelBanner: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: spacing.md,
  },
  cancelBannerText: { flex: 1, gap: 4 },
  cancelBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#b91c1c",
    textAlign: "right",
  },
  cancelBannerReason: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    textAlign: "right",
  },
  cancelBannerMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
  },
  mineBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  mineBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    maxWidth: "60%",
    textAlign: "left",
  },
  hintText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  checkedInBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#f0fdf4",
    padding: spacing.md,
    borderRadius: 10,
  },
  checkedInText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#166534",
    textAlign: "right",
  },
  checkInActions: { gap: spacing.sm },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#166534",
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  checkInBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  zoomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  zoomButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  noZoomText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
  },
});
