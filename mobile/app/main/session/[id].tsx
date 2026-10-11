import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import {
  Badge,
  Banner,
  Button,
  Card,
  ErrorState,
  Header,
  InfoRow,
  LoadingState,
  PromptSheet,
  Screen,
  Section,
  Skeleton,
  Text,
  useToast,
} from "@/src/ui";
import ZoomLinkSheet from "@/src/components/levels/ZoomLinkSheet";
import { WEIGHT_FIELDS } from "@/src/components/levels/helpers";
import { cancelSession, getSession, sessionsQueryKeys, updateSession } from "@/src/api/sessions";
import { classOffersQueryKeys, getClassOffer } from "@/src/api/classOffers";
import { formatAttendanceDate } from "@/src/api/attendance";
import { SUBJECT_ICONS } from "@/src/constants/domain";
import { SESSION_MODE_LABELS, SESSION_STATUS_LABELS, type SessionStatus } from "@/src/types/session";
import { TRACK_LABELS } from "@/src/types/classOffer";
import { formatDateLong, formatDateTime, formatTime, formatWeekday } from "@/src/utils/format";
import { openZoomUrl } from "@/src/utils/openZoomUrl";

const STATUS_TONES: Record<SessionStatus, "primary" | "danger" | "success"> = {
  scheduled: "primary",
  cancelled: "danger",
  completed: "success",
};

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = id ?? "";
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

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
  const offer = offerQuery.data;

  const refreshSessions = () => {
    void queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
  };

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelSession(sessionId, reason),
    onSuccess: (result) => {
      queryClient.setQueryData(sessionsQueryKeys.detail(sessionId), result);
      refreshSessions();
      setCancelOpen(false);
      toast.success(result.message ?? "تم تسجيل اعتذار المعلمة وإلغاء الحصة");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const zoomMutation = useMutation({
    mutationFn: (zoomUrl: string) => updateSession(sessionId, { zoomUrl }),
    onSuccess: (result) => {
      queryClient.setQueryData(sessionsQueryKeys.detail(sessionId), result);
      refreshSessions();
      setZoomOpen(false);
      toast.success("تم حفظ رابط Zoom");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const backHref = (session?.levelId ? `/main/level/${session.levelId}` : "/main/classes") as Href;
  const header = <Header back={backHref} title="تفاصيل الحصة" />;

  if (sessionQuery.isLoading) {
    return (
      <Screen header={header}>
        <LoadingState label="جاري تحميل الحصة…" />
      </Screen>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <Screen header={header}>
        <ErrorState
          message={(sessionQuery.error as Error | null)?.message ?? "الحصة غير موجودة"}
          onRetry={() => sessionQuery.refetch()}
        />
      </Screen>
    );
  }

  const isScheduled = session.status === "scheduled";
  const isCancelled = session.status === "cancelled";
  const zoomUrl = session.zoomUrl?.trim();
  const levelLabel = offer
    ? offer.track === "courses"
      ? "دورة عامة لجميع المستويات"
      : offer.levelLabel
    : null;

  const openAttendance = () => {
    if (!session.levelId) return;
    const date = formatAttendanceDate(new Date(session.startAt));
    const returnTo = encodeURIComponent(`/main/session/${sessionId}`);
    router.push(`/main/attendance/${session.levelId}/${session.subjectIndex}?date=${date}&returnTo=${returnTo}` as Href);
  };

  return (
    <Screen
      header={header}
      refreshing={sessionQuery.isRefetching}
      onRefresh={() => {
        void sessionQuery.refetch();
        if (classOfferId) void offerQuery.refetch();
      }}
    >
      <Card elevated style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, isCancelled && styles.heroIconMuted]}>
            <MaterialCommunityIcons
              name={SUBJECT_ICONS[session.subjectIndex] ?? "book-outline"}
              size={26}
              color={isCancelled ? colors.textMuted : colors.onPrimary}
            />
          </View>
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={2} style={isCancelled ? styles.strike : undefined}>
              {session.title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {`${formatWeekday(session.startAt)} ${formatDateLong(session.startAt)}`}
            </Text>
          </View>
        </View>
        <View style={styles.heroMeta}>
          <Badge label={SESSION_STATUS_LABELS[session.status]} tone={STATUS_TONES[session.status]} />
          <Badge
            label={`${formatTime(session.startAt)} – ${formatTime(session.endAt)}`}
            icon="clock-outline"
            tone="neutral"
          />
          <Badge
            label={SESSION_MODE_LABELS[session.mode]}
            icon={session.mode === "in_person" ? "map-marker-outline" : "video-outline"}
            tone="neutral"
          />
        </View>
      </Card>

      {isCancelled ? (
        <View style={styles.block}>
          <Banner tone="danger" icon="calendar-remove" title="اعتذار المعلمة — الحصة ملغاة">
            <Text variant="body" color="danger">
              {session.cancelReason?.trim() || "لم يُذكر سبب"}
            </Text>
            {session.cancelledAt ? (
              <Text variant="micro" color="danger">
                {`سُجّل الاعتذار ${formatDateTime(session.cancelledAt)}`}
              </Text>
            ) : null}
          </Banner>
        </View>
      ) : null}

      {isScheduled ? (
        <View style={styles.actions}>
          {session.levelId ? (
            <Button icon="clipboard-check-outline" size="lg" fullWidth onPress={openAttendance}>
              كشف التحضير
            </Button>
          ) : null}
          {zoomUrl ? (
            <Button icon="video" variant="accent" fullWidth onPress={() => void openZoomUrl(zoomUrl)}>
              الانضمام عبر Zoom
            </Button>
          ) : null}
          <Button icon="calendar-remove" variant="dangerTonal" fullWidth onPress={() => setCancelOpen(true)}>
            اعتذار المعلمة عن الحصة
          </Button>
          <Button
            icon={zoomUrl ? "link-edit" : "link-plus"}
            variant="ghost"
            size="sm"
            onPress={() => setZoomOpen(true)}
            style={styles.zoomLink}
          >
            {zoomUrl ? "تعديل رابط Zoom" : "إضافة رابط Zoom"}
          </Button>
          {!session.levelId ? (
            <Text variant="caption" color="textMuted">
              هذه الحصة لدورة عامة غير مرتبطة بمستوى، لذلك لا يتوفر لها كشف تحضير.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Section title="بيانات الحصة">
        <Card padding={4}>
          <InfoRow label="النوع" icon="shape-outline" value={offer ? TRACK_LABELS[offer.track] : offerQuery.isLoading ? "…" : null} />
          <InfoRow label="المستوى" icon="layers-outline" value={levelLabel ?? (offerQuery.isLoading ? "…" : null)} />
          <InfoRow label="طريقة الحضور" icon="map-marker-outline" value={SESSION_MODE_LABELS[session.mode]} />
          <InfoRow label="البداية" icon="clock-start" value={formatDateTime(session.startAt)} />
          <InfoRow label="النهاية" icon="clock-end" value={formatDateTime(session.endAt)} />
          <InfoRow label="المعلمة" icon="account-tie-outline" value={session.teacherName} last />
        </Card>
      </Section>

      {classOfferId ? (
        <Section title="توزيع الدرجات" subtitle="حسب إعداد الفصل (المجموع 100)">
          {offerQuery.isLoading ? (
            <Skeleton height={76} radiusSize={radius.lg} />
          ) : offerQuery.isError || !offer ? (
            <ErrorState compact message={(offerQuery.error as Error | null)?.message} onRetry={() => offerQuery.refetch()} />
          ) : (
            <View style={styles.weights}>
              {WEIGHT_FIELDS.map((field) => (
                <View key={field.key} style={styles.weight}>
                  <MaterialCommunityIcons name={field.icon} size={18} color={colors.primary} />
                  <Text variant="headline" tabular>
                    {String(offer.gradeWeights[field.key])}
                  </Text>
                  <Text variant="micro" color="textSecondary" numberOfLines={1}>
                    {field.short}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>
      ) : null}

      <PromptSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="اعتذار المعلمة عن الحصة"
        message={
          session.levelId
            ? `ستُلغى حصة «${session.title}» ويصل إشعار بالاعتذار وسببه لطالبات المستوى.`
            : `ستُلغى حصة «${session.title}» ويُسجَّل سبب الاعتذار.`
        }
        inputLabel="سبب الاعتذار"
        placeholder="مثال: ظرف صحي طارئ للمعلمة"
        confirmLabel="تأكيد الاعتذار وإلغاء الحصة"
        confirmVariant="danger"
        minLength={3}
        loading={cancelMutation.isPending}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
      />

      <ZoomLinkSheet
        visible={zoomOpen}
        initialUrl={zoomUrl}
        loading={zoomMutation.isPending}
        onClose={() => setZoomOpen(false)}
        onSave={(url) => zoomMutation.mutate(url)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: space[4] },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space[3] },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconMuted: { backgroundColor: colors.surfaceSunken },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  strike: { textDecorationLine: "line-through", color: colors.textSecondary },
  block: { marginTop: space[4] },
  actions: { marginTop: space[4], gap: space[3] },
  zoomLink: { alignSelf: "flex-start" },
  weights: { flexDirection: "row", gap: space[2] },
  weight: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
});
