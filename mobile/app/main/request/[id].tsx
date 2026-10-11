import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { space } from "@/src/theme";
import {
  Avatar,
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
  SelectField,
  Text,
  useToast,
} from "@/src/ui";
import {
  approveRequest,
  getRegistrationRequest,
  registrationQueryKeys,
  rejectRequest,
  type RegistrationRequestItem,
} from "@/src/api/registrationRequests";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { studentQueryKeys } from "@/src/api/students";
import { useAuth } from "@/src/context/AuthContext";
import DocumentViewer from "@/src/components/DocumentViewer";
import {
  GENDER_OPTIONS,
  STUDENT_TYPE_LABELS,
  TRACK_LABELS,
  academicLevelLabel,
  nationalityLabel,
  occupationLabel,
  trackRequiresLevel,
} from "@/src/constants/domain";
import { formatPhone } from "@/src/constants/phone";
import { formatAddress } from "@/src/types/student";
import { formatDateLong, formatDateTime } from "@/src/utils/format";
import { goBack } from "@/src/utils/navigation";

const FALLBACK: Href = "/main/requests" as Href;
const detailKey = (id: string) => ["registration-requests", "detail", id] as const;

/** مراجعة طلب تسجيل كامل: البيانات + المرفقات + القبول (مع تعديل المستوى) أو الرفض */
export default function RegistrationRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = id ?? "";
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";

  const query = useQuery({
    queryKey: detailKey(requestId),
    queryFn: () => getRegistrationRequest(requestId),
    enabled: !!requestId,
    // عرض فوري من القائمة ثم تحديث من الخادم
    initialData: () =>
      queryClient
        .getQueryData<RegistrationRequestItem[]>(registrationQueryKeys.pending)
        ?.find((r) => r.id === requestId),
  });

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });

  if (query.isLoading) {
    return (
      <Screen header={<Header back={FALLBACK} title="طلب تسجيل" />}>
        <LoadingState />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen header={<Header back={FALLBACK} title="طلب تسجيل" />}>
        <ErrorState message={query.error?.message ?? "لم يُعثر على الطلب"} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <RequestReview
      request={query.data}
      levels={levelsQuery.data ?? []}
      levelsLoading={levelsQuery.isLoading}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      onDone={(message) => {
        toast.success(message);
        void queryClient.invalidateQueries({ queryKey: registrationQueryKeys.pending });
        void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
        void queryClient.invalidateQueries({ queryKey: ["levels"] });
        queryClient.removeQueries({ queryKey: detailKey(requestId) });
        goBack(router, FALLBACK);
      }}
      onError={(message) => toast.error(message)}
    />
  );
}

type LevelOption = { id: string; shortName: string; fullName: string; track: string };

function RequestReview({
  request,
  levels,
  levelsLoading,
  refreshing,
  onRefresh,
  onDone,
  onError,
}: {
  request: RegistrationRequestItem;
  levels: LevelOption[];
  levelsLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [levelId, setLevelId] = useState<string | null>(request.requestedLevelId);
  const [levelError, setLevelError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    setLevelId(request.requestedLevelId);
  }, [request.requestedLevelId]);

  const needsLevel = trackRequiresLevel(request.track);
  const isPending = request.status === "pending";

  const levelOptions = useMemo(
    () =>
      levels
        .filter((l) => l.track === request.track)
        .map((l) => ({
          id: l.id,
          label: l.shortName || l.fullName,
          description: l.id === request.requestedLevelId ? "المستوى الذي طلبته الطالبة" : l.fullName,
        })),
    [levels, request.track, request.requestedLevelId]
  );
  const chosenLevelLabel = levelOptions.find((l) => l.id === levelId)?.label ?? request.requestedLevelName;

  const approveMutation = useMutation({
    mutationFn: () =>
      approveRequest(request.id, { track: request.track, levelId: needsLevel ? levelId ?? undefined : undefined }),
    onSuccess: (r) => onDone(r.message || "تم قبول الطالبة وإنشاء حسابها"),
    onError: (err: Error) => onError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectRequest(request.id, reason),
    onSuccess: (r) => {
      setRejectOpen(false);
      onDone(r.message || "تم رفض طلب التسجيل");
    },
    onError: (err: Error) => onError(err.message),
  });

  const confirmApprove = () => {
    if (needsLevel && !levelId) {
      setLevelError("اختاري المستوى قبل القبول");
      return;
    }
    const placement = needsLevel && chosenLevelLabel ? ` في ${chosenLevelLabel}` : "";
    Alert.alert(
      "قبول الطالبة",
      `سيُنشأ حساب ${request.fullName}${placement}، وتستطيع الدخول برقم هاتفها أو رقمها المدني فوراً.`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "قبول", onPress: () => approveMutation.mutate() },
      ]
    );
  };

  const busy = approveMutation.isPending || rejectMutation.isPending;
  const genderLabel = GENDER_OPTIONS.find((g) => g.id === request.gender)?.label;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={<Header back={FALLBACK} title="مراجعة طلب التسجيل" />}
      footer={
        isPending ? (
          <View style={styles.footer}>
            <Button
              variant="dangerTonal"
              size="lg"
              icon="close"
              onPress={() => setRejectOpen(true)}
              disabled={busy}
              style={styles.reject}
              accessibilityLabel={`رفض طلب ${request.fullName}`}
            >
              رفض
            </Button>
            <Button
              size="lg"
              icon="check"
              onPress={confirmApprove}
              loading={approveMutation.isPending}
              disabled={rejectMutation.isPending}
              style={styles.flex}
              accessibilityLabel={`قبول طلب ${request.fullName}`}
            >
              قبول الطالبة
            </Button>
          </View>
        ) : null
      }
    >
      <Card padding={5} style={styles.hero}>
        <Avatar name={request.fullName} uri={request.documents?.photo?.url} size={80} />
        <Text variant="title" align="center">
          {request.fullName}
        </Text>
        <View style={styles.badges}>
          <Badge label={TRACK_LABELS[request.track]} tone="primary" icon="map-marker-path" />
          <Badge
            label={STUDENT_TYPE_LABELS[request.studentType] ?? "مستجدة"}
            tone={request.studentType === "continuing" ? "accent" : "info"}
          />
          {genderLabel ? <Badge label={genderLabel} tone="neutral" /> : null}
        </View>
        {request.createdAt ? (
          <Text variant="caption" color="textSecondary">
            {`قُدّم الطلب ${formatDateTime(request.createdAt)}`}
          </Text>
        ) : null}
        <View style={styles.contactRow}>
          <Button
            variant="tonal"
            size="sm"
            icon="phone-outline"
            onPress={() => void Linking.openURL(`tel:+${request.phone}`)}
            accessibilityLabel={`اتصال بـ ${request.fullName}`}
          >
            اتصال
          </Button>
          <Button
            variant="tonal"
            size="sm"
            icon="whatsapp"
            onPress={() => void Linking.openURL(`https://wa.me/${request.phone}`)}
            accessibilityLabel={`مراسلة ${request.fullName} عبر واتساب`}
          >
            واتساب
          </Button>
        </View>
      </Card>

      {!isPending ? (
        <View style={styles.spacer}>
          <Banner
            tone={request.status === "approved" ? "success" : "danger"}
            title={request.status === "approved" ? "تم قبول هذا الطلب" : "تم رفض هذا الطلب"}
          >
            {request.status === "rejected" ? request.rejectionReason || undefined : undefined}
          </Banner>
        </View>
      ) : null}

      <Section title="المسار والتسكين">
        <Card padding={4} style={styles.infoCard}>
          <InfoRow
            label="المسار"
            value={[TRACK_LABELS[request.track], request.trackNote].filter(Boolean).join(" — ")}
            icon="map-marker-path"
          />
          <InfoRow label="المستوى المطلوب" value={request.requestedLevelName} icon="layers-outline" />
          <InfoRow
            label="الدورات"
            value={request.courses.map((c) => c.name).filter(Boolean).join("، ")}
            icon="certificate-outline"
            last={!needsLevel || !isPending}
          />
          {needsLevel && isPending ? (
            <View style={styles.levelPicker}>
              <SelectField
                label="المستوى عند القبول"
                required
                options={levelOptions}
                value={levelId}
                onChange={(v) => {
                  setLevelId(v);
                  setLevelError(null);
                }}
                disabled={levelsLoading}
                placeholder={levelsLoading ? "جاري تحميل المستويات…" : "اختاري المستوى"}
                emptyText={`لا توجد مستويات ${TRACK_LABELS[request.track]} في مركزكِ`}
                hint="يمكنكِ تعديل المستوى بعد مقابلة الطالبة قبل القبول"
                error={levelError}
              />
            </View>
          ) : null}
        </Card>
      </Section>

      <Section title="البيانات الشخصية">
        <Card padding={4} style={styles.infoCard}>
          <InfoRow label="الرقم المدني" value={request.idNumber} icon="card-account-details-outline" selectable />
          <InfoRow label="تاريخ الميلاد" value={request.dob ? formatDateLong(request.dob) : ""} icon="cake-variant-outline" />
          <InfoRow label="الجنسية" value={nationalityLabel(request.nationality)} icon="flag-outline" />
          <InfoRow label="المؤهل الدراسي" value={academicLevelLabel(request.academicLevel)} icon="school-outline" />
          <InfoRow
            label="الوظيفة الحالية"
            value={occupationLabel(request.occupation, request.occupationOther)}
            icon="briefcase-outline"
            last
          />
        </Card>
      </Section>

      <Section title="التواصل والسكن">
        <Card padding={4} style={styles.infoCard}>
          <InfoRow label="الهاتف" value={formatPhone(request.phone)} icon="phone-outline" selectable />
          <InfoRow label="عنوان السكن" value={formatAddress(request.homeAddress)} icon="home-outline" last />
        </Card>
      </Section>

      {request.notes?.trim() ? (
        <Section title="ملاحظات الطالبة">
          <Card padding={4} tone="accent">
            <Text variant="body">{request.notes}</Text>
          </Card>
        </Section>
      ) : null}

      <Section title="المرفقات" subtitle="اضغطي على المرفق لعرضه بالحجم الكامل">
        <DocumentViewer documents={request.documents} />
      </Section>

      <PromptSheet
        visible={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="رفض طلب التسجيل"
        message={`اكتبي سبب رفض طلب ${request.fullName} بوضوح — يُحفظ مع الطلب.`}
        inputLabel="سبب الرفض"
        placeholder="مثال: المرفقات غير واضحة، يرجى إعادة التسجيل"
        confirmLabel="رفض الطلب"
        confirmVariant="danger"
        loading={rejectMutation.isPending}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: space[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space[2] },
  contactRow: { flexDirection: "row", gap: space[2], marginTop: space[1] },
  spacer: { marginTop: space[4] },
  infoCard: { paddingVertical: space[1] },
  levelPicker: { paddingTop: space[3], paddingBottom: space[3] },
  footer: { flexDirection: "row", gap: space[3] },
  reject: { minWidth: 104 },
});
