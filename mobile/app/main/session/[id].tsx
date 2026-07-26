import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { centerColors, spacing } from "@/constants";
import { goBack } from "@/src/utils/navigation";
import { openZoomUrl } from "@/src/utils/openZoomUrl";
import { formatAttendanceDate } from "@/src/api/attendance";
import {
  cancelSession,
  getSession,
  sessionsQueryKeys,
} from "@/src/api/sessions";
import { getClassOffer, classOffersQueryKeys } from "@/src/api/classOffers";
import {
  SESSION_MODE_LABELS,
  SESSION_STATUS_LABELS,
} from "@/src/types/session";
import { TRACK_LABELS } from "@/src/types/classOffer";

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
    const d = new Date(iso);
    return d.toLocaleString("ar-SA", {
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

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = id ?? "";
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  const sessionQuery = useQuery({
    queryKey: sessionsQueryKeys.detail(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
  });

  const session = sessionQuery.data;
  const classOfferId = session?.classOfferId ?? "";

  const offerQuery = useQuery({
    queryKey: classOffersQueryKeys.detail(classOfferId),
    queryFn: () => getClassOffer(classOfferId),
    enabled: !!classOfferId,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelSession(sessionId, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
      setShowCancelForm(false);
      setCancelReason("");
      Alert.alert("تم", result.message ?? "تم إلغاء الحصة");
    },
    onError: (err: Error) => {
      Alert.alert("خطأ", err.message);
    },
  });

  const offer = offerQuery.data;

  const backHref =
    offer?.track === "mutor" && offer.levelId
      ? (`/main/level/${offer.levelId}` as Href)
      : ("/main/classes" as Href);

  const hasZoom = Boolean(session?.zoomUrl?.trim());
  const canOpenAttendanceSheet = Boolean(session?.levelId);
  const canCancel = session?.status === "scheduled";

  const openAttendanceSheet = () => {
    if (!session?.levelId) return;
    const sheetDate = formatAttendanceDate(new Date(session.startAt));
    const returnTo = encodeURIComponent(`/main/session/${sessionId}`);
    router.push(
      `/main/attendance/${session.levelId}/${session.subjectIndex}?date=${sheetDate}&returnTo=${returnTo}` as Href
    );
  };

  const submitCancel = () => {
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      Alert.alert("تنبيه", "اكتبي سبب الاعتذار (3 أحرف على الأقل)");
      return;
    }
    Alert.alert(
      "تأكيد الاعتذار",
      "سيتم إلغاء الحصة. إشعار الطالبات يُفعَّل لاحقاً.",
      [
        { text: "رجوع", style: "cancel" },
        {
          text: "تأكيد الإلغاء",
          style: "destructive",
          onPress: () => cancelMutation.mutate(reason),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Pressable style={styles.backButton} onPress={() => goBack(router, backHref)}>
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={centerColors.text}
            />
            <Text style={styles.backButtonText}>رجوع</Text>
          </Pressable>
        </View>

        {sessionQuery.isLoading ? (
          <ActivityIndicator size="large" color={centerColors.accent} />
        ) : sessionQuery.isError || !session ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>تعذر تحميل الحصة</Text>
            <Text style={styles.emptyBody}>
              {sessionQuery.error instanceof Error
                ? sessionQuery.error.message
                : "الحصة غير موجودة"}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{session.title}</Text>
            <Text
              style={[
                styles.subtitle,
                session.status === "cancelled" && styles.subtitleCancelled,
              ]}
            >
              {SESSION_STATUS_LABELS[session.status]}
            </Text>

            {session.status === "cancelled" ? (
              <View style={styles.cancelBanner}>
                <MaterialCommunityIcons
                  name="calendar-remove"
                  size={22}
                  color={centerColors.accentRed}
                />
                <View style={styles.cancelBannerText}>
                  <Text style={styles.cancelBannerTitle}>
                    اعتذار المعلمة — الحصة ملغاة
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
              <InfoRow
                label="النوع"
                value={offer ? TRACK_LABELS[offer.track] : "—"}
              />
              <InfoRow
                label="المستوى"
                value={
                  offer?.track === "courses"
                    ? "عام لجميع المستويات"
                    : offer?.levelLabel ?? "—"
                }
              />
              <InfoRow label="الوضع" value={SESSION_MODE_LABELS[session.mode]} />
              <InfoRow label="البداية" value={formatDateTime(session.startAt)} />
              <InfoRow label="النهاية" value={formatDateTime(session.endAt)} />
              <InfoRow label="المعلمة" value={session.teacherName ?? "—"} />
            </View>

            {offer ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>توزيع الدرجات (من الفصل)</Text>
                <InfoRow label="الحضور" value={`${offer.gradeWeights.attendance}%`} />
                <InfoRow
                  label="اختبار قصير"
                  value={`${offer.gradeWeights.shortExam}%`}
                />
                <InfoRow
                  label="المشاركة"
                  value={`${offer.gradeWeights.participation}%`}
                />
                <InfoRow label="النهائي" value={`${offer.gradeWeights.final}%`} />
              </View>
            ) : null}

            {session.status !== "cancelled" ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Zoom</Text>
                {hasZoom ? (
                  <>
                    <Text style={styles.zoomHint} numberOfLines={2}>
                      {session.zoomUrl}
                    </Text>
                    <Pressable
                      style={styles.zoomButton}
                      onPress={() => openZoomUrl(session.zoomUrl)}
                      accessibilityRole="button"
                      accessibilityLabel="انضمام عبر Zoom"
                    >
                      <MaterialCommunityIcons
                        name="video"
                        size={20}
                        color={centerColors.textOnAccent}
                      />
                      <Text style={styles.zoomButtonText}>انضمام عبر Zoom</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.noZoomText}>لا يوجد رابط Zoom لهذه الحصة</Text>
                )}
              </View>
            ) : null}

            {session.status !== "cancelled" ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>كشف التحضير</Text>
                <Text style={styles.attendanceHint}>
                  سجّلي حضور وغياب الطالبات عبر كشف التحضير المعتمد (نفس شاشة
                  المادة).
                </Text>
                {canOpenAttendanceSheet ? (
                  <Pressable
                    style={styles.attendanceButton}
                    onPress={openAttendanceSheet}
                    accessibilityRole="button"
                    accessibilityLabel="فتح كشف تحضير الغياب"
                  >
                    <MaterialCommunityIcons
                      name="clipboard-check-outline"
                      size={20}
                      color={centerColors.textOnAccent}
                    />
                    <Text style={styles.attendanceButtonText}>كشف تحضير الغياب</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noZoomText}>
                    هذه الحصة غير مرتبطة بمستوى — استخدمي كشف التحضير من شاشة
                    المادة.
                  </Text>
                )}
              </View>
            ) : null}

            {canCancel ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>اعتذار المعلمة عن الحصة</Text>
                <Text style={styles.attendanceHint}>
                  يلغي الحصة ويُسجّل السبب. إشعار طالبات المستوى في يوم الإشعارات.
                </Text>
                {!showCancelForm ? (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setShowCancelForm(true)}
                    accessibilityRole="button"
                    accessibilityLabel="اعتذار عن الحصة"
                  >
                    <MaterialCommunityIcons
                      name="calendar-remove"
                      size={20}
                      color={centerColors.textOnAccent}
                    />
                    <Text style={styles.cancelButtonText}>اعتذار عن الحصة</Text>
                  </Pressable>
                ) : (
                  <View style={styles.cancelForm}>
                    <TextInput
                      style={styles.cancelInput}
                      placeholder="سبب الاعتذار..."
                      placeholderTextColor={centerColors.textSecondary}
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.cancelFormActions}>
                      <Pressable
                        style={styles.cancelSecondaryBtn}
                        onPress={() => {
                          setShowCancelForm(false);
                          setCancelReason("");
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        <Text style={styles.cancelSecondaryBtnText}>إلغاء</Text>
                      </Pressable>
                      <Pressable
                        style={styles.cancelConfirmBtn}
                        onPress={submitCancel}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <ActivityIndicator color={centerColors.textOnAccent} />
                        ) : (
                          <Text style={styles.cancelButtonText}>تأكيد الإلغاء</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.cardMuted}>
              <Text style={styles.mutedTitle}>قريباً</Text>
              <Text style={styles.mutedLine}>• رفع ملحقات الحصة</Text>
              <Text style={styles.mutedLine}>• إشعار اعتذار المعلمة للطالبات</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  main: { flex: 1 },
  mainContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
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
    color: centerColors.text,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: centerColors.accent,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  subtitleCancelled: {
    color: centerColors.accentRed,
  },
  cancelBanner: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    marginBottom: spacing.md,
  },
  cancelBannerText: { flex: 1, gap: 4 },
  cancelBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: centerColors.accentRed,
    textAlign: "right",
  },
  cancelBannerReason: {
    fontSize: 14,
    color: centerColors.text,
    lineHeight: 22,
    textAlign: "right",
  },
  cancelBannerMeta: {
    fontSize: 12,
    color: centerColors.textSecondary,
    textAlign: "right",
  },
  card: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: centerColors.cardBorder,
  },
  infoLabel: {
    fontSize: 14,
    color: centerColors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: centerColors.text,
    maxWidth: "60%",
    textAlign: "left",
  },
  zoomHint: {
    fontSize: 12,
    color: centerColors.textSecondary,
    marginBottom: spacing.md,
    textAlign: "left",
  },
  zoomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: centerColors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  zoomButtonText: {
    color: centerColors.textOnAccent,
    fontSize: 16,
    fontWeight: "700",
  },
  noZoomText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "right",
  },
  attendanceHint: {
    fontSize: 13,
    color: centerColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
    textAlign: "right",
  },
  attendanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: centerColors.primaryButton,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  attendanceButtonText: {
    color: centerColors.primaryButtonText,
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: centerColors.accentRed,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: centerColors.textOnAccent,
    fontSize: 16,
    fontWeight: "700",
  },
  cancelForm: { gap: spacing.md },
  cancelInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 15,
    color: centerColors.text,
    backgroundColor: centerColors.background,
    textAlign: "right",
  },
  cancelFormActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelSecondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  cancelSecondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: centerColors.textSecondary,
  },
  cancelConfirmBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: spacing.md,
    backgroundColor: centerColors.accentRed,
  },
  cardMuted: {
    backgroundColor: centerColors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  mutedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.sm,
  },
  mutedLine: {
    fontSize: 14,
    color: centerColors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: centerColors.text,
  },
  emptyBody: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
