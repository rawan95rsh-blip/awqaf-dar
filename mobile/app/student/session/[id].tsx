import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import {
  Badge,
  Banner,
  Button,
  Card,
  ErrorState,
  Header,
  InfoRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from "@/src/ui";
import { getSession, sessionsQueryKeys } from "@/src/api/sessions";
import { sessionAttendanceQueryKeys } from "@/src/api/sessionAttendance";
import { SUBJECT_ICONS, subjectName } from "@/src/constants/domain";
import { SESSION_MODE_LABELS, SESSION_STATUS_LABELS } from "@/src/types/session";
import { formatDateLong, formatDateTime, formatTime } from "@/src/utils/format";
import { openZoomUrl } from "@/src/utils/openZoomUrl";
import { useNow } from "@/src/components/student/hooks";
import SessionCheckIn from "@/src/components/student/SessionCheckIn";
import { countdownLabel, dayLabel, sessionPhase } from "@/src/components/student/sessionTiming";

const BACK: Href = "/student/schedule" as Href;

export default function StudentSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = id ?? "";
  const queryClient = useQueryClient();
  const now = useNow();

  const sessionQuery = useQuery({
    queryKey: sessionsQueryKeys.detail(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
  });
  const session = sessionQuery.data;

  if (sessionQuery.isLoading) {
    return (
      <Screen header={<Header back={BACK} title="تفاصيل الحصة" />}>
        <View style={styles.loading}>
          <Skeleton width="65%" height={28} />
          <Skeleton width="40%" height={18} />
          <Skeleton height={180} radiusSize={radius.lg} />
          <Skeleton height={96} radiusSize={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <Screen header={<Header back={BACK} title="تفاصيل الحصة" />}>
        <ErrorState
          message={(sessionQuery.error as Error | null)?.message ?? "الحصة غير موجودة"}
          onRetry={() => void sessionQuery.refetch()}
        />
      </Screen>
    );
  }

  const phase = sessionPhase(session, now);
  const cancelled = phase === "cancelled";
  const countdown = countdownLabel(session, now);
  const isOnline = session.mode !== "in_person";
  const hasZoom = !!session.zoomUrl?.trim();
  const zoomLive = phase === "checkin" || phase === "live";

  return (
    <Screen
      refreshing={sessionQuery.isRefetching}
      onRefresh={() => {
        void sessionQuery.refetch();
        void queryClient.invalidateQueries({ queryKey: sessionAttendanceQueryKeys.mine(sessionId) });
      }}
      header={<Header back={BACK} title="تفاصيل الحصة" />}
      footer={
        !cancelled && isOnline && hasZoom && phase !== "ended" ? (
          <Button
            fullWidth
            size="lg"
            variant={zoomLive ? "primary" : "secondary"}
            icon="video-outline"
            onPress={() => void openZoomUrl(session.zoomUrl)}
            accessibilityLabel="انضمي إلى الحصة عبر Zoom"
          >
            {zoomLive ? "انضمي الآن عبر Zoom" : "انضمي عبر Zoom"}
          </Button>
        ) : null
      }
    >
      {/* العنوان */}
      <View style={styles.titleBlock}>
        <View style={[styles.subjectIcon, cancelled && styles.subjectIconCancelled]}>
          <MaterialCommunityIcons
            name={SUBJECT_ICONS[session.subjectIndex] ?? "book-open-variant"}
            size={28}
            color={cancelled ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.flex}>
          <Text variant="eyebrow" color="accentStrong">
            {subjectName(session.subjectIndex)}
          </Text>
          <Text variant="title" accessibilityRole="header" style={cancelled ? styles.strike : undefined}>
            {session.title}
          </Text>
        </View>
      </View>

      <View style={styles.badges}>
        <Badge
          label={cancelled ? SESSION_STATUS_LABELS.cancelled : countdown.text}
          tone={countdown.tone}
          icon={cancelled ? "calendar-remove-outline" : phase === "live" ? "record-circle-outline" : "clock-outline"}
        />
        {session.isMyLevel ? <Badge label="مستواي" tone="primary" icon="star-four-points-outline" /> : null}
        <Badge
          label={SESSION_MODE_LABELS[session.mode]}
          tone="info"
          icon={session.mode === "in_person" ? "map-marker-outline" : "video-outline"}
        />
      </View>

      {/* اعتذار المعلمة */}
      {cancelled ? (
        <View style={styles.block}>
          <Banner tone="danger" icon="calendar-remove-outline" title="اعتذرت المعلمة عن هذه الحصة">
            <Text variant="body" style={styles.reason}>
              {session.cancelReason?.trim() || "لم يُذكر سبب الاعتذار"}
            </Text>
            {session.cancelledAt ? (
              <Text variant="micro" color="textSecondary">
                {`أُعلن الإلغاء ${formatDateTime(session.cancelledAt)}`}
              </Text>
            ) : null}
          </Banner>
        </View>
      ) : null}

      {/* التحضير */}
      {!cancelled ? (
        <Section title="حضوري" subtitle="كشف التحضير">
          <Card padding={4}>
            <SessionCheckIn session={session} />
          </Card>
        </Section>
      ) : null}

      {/* المعلومات */}
      <Section title="معلومات الحصة">
        <Card padding={4} style={styles.infoCard}>
          <InfoRow label="اليوم" value={`${dayLabel(session.startAt, now)} · ${formatDateLong(session.startAt)}`} icon="calendar-outline" />
          <InfoRow
            label="الوقت"
            value={`${formatTime(session.startAt)} – ${formatTime(session.endAt)}`}
            icon="clock-outline"
          />
          <InfoRow label="المعلمة" value={session.teacherName} icon="account-tie-woman" />
          <InfoRow label="طريقة الحضور" value={SESSION_MODE_LABELS[session.mode]} icon="map-marker-radius-outline" last={!session.notes} />
          {session.notes ? <InfoRow label="ملاحظات" value={session.notes} icon="note-text-outline" last /> : null}
        </Card>
      </Section>

      {/* Zoom */}
      {isOnline && !cancelled ? (
        <Section title="الحضور عن بُعد">
          {hasZoom ? (
            <Card padding={4} style={styles.zoomCard}>
              <View style={styles.zoomRow}>
                <View style={styles.zoomIcon}>
                  <MaterialCommunityIcons name="video-outline" size={22} color={colors.info} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">Zoom</Text>
                  <Text variant="caption" color="textSecondary">
                    {phase === "ended" ? "انتهت الحصة" : "اضغطي «انضمي» أسفل الشاشة لفتح التطبيق"}
                  </Text>
                </View>
              </View>
              {session.zoomMeetingId || session.zoomPasscode ? (
                <View>
                  {session.zoomMeetingId ? (
                    <InfoRow label="رقم الاجتماع" value={session.zoomMeetingId} selectable last={!session.zoomPasscode} />
                  ) : null}
                  {session.zoomPasscode ? (
                    <InfoRow label="رمز الدخول" value={session.zoomPasscode} selectable last />
                  ) : null}
                </View>
              ) : null}
            </Card>
          ) : (
            <Banner tone="info" icon="link-variant-off" title="لم يُضف رابط Zoom بعد">
              سيظهر زر الانضمام هنا فور إضافة المعلمة للرابط — اسحبي للتحديث قبل موعد الحصة.
            </Banner>
          )}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { gap: space[4], paddingTop: space[2] },
  titleBlock: { flexDirection: "row", alignItems: "center", gap: space[3], marginTop: space[2] },
  subjectIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectIconCancelled: { backgroundColor: colors.dangerSoft },
  strike: { textDecorationLine: "line-through" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[4] },
  block: { marginTop: space[4] },
  reason: { color: colors.text },
  infoCard: { paddingVertical: space[1] },
  zoomCard: { gap: space[2] },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  zoomIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
