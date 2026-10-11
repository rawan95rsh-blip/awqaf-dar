import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, space } from "@/src/theme";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ErrorState,
  Header,
  InfoRow,
  ListItem,
  PromptSheet,
  Screen,
  Section,
  SelectField,
  Skeleton,
  SkeletonList,
  Text,
  useToast,
} from "@/src/ui";
import { useAuth } from "@/src/context/AuthContext";
import { studentQueryKeys } from "@/src/api/students";
import { fetchPublicCenters, registrationQueryKeys } from "@/src/api/registrationRequests";
import {
  cancelTransfer,
  requestMyTransfer,
  TRANSFER_STATUS_LABELS,
  transferQueryKeys,
  type TransferItem,
  type TransferStatus,
} from "@/src/api/transfers";
import { submitSuspensionRequest } from "@/src/api/suspensionRequests";
import { submitAccountDeletionRequest } from "@/src/api/accountDeletionRequests";
import DocumentViewer from "@/src/components/DocumentViewer";
import BiometricSwitch from "@/src/components/student/BiometricSwitch";
import { useMyProfile, useMyTransfers } from "@/src/components/student/hooks";
import {
  ENROLLMENT_ACTION_LABELS,
  ENROLLMENT_LABELS,
  ENROLLMENT_TONES,
  STUDENT_TYPE_LABELS,
  TRACK_LABELS,
  occupationLabel,
  type Gender,
} from "@/src/constants/domain";
import { formatPhone } from "@/src/constants/phone";
import { formatAddress } from "@/src/types/student";
import { formatDateShort } from "@/src/utils/format";
import type { Tone } from "@/src/theme";

type Dialog = null | "transfer" | "suspend" | "delete";

const TRANSFER_TONES: Record<TransferStatus, Tone> = {
  pending_source: "warning",
  pending_destination: "info",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

function isOpenTransfer(t: TransferItem): boolean {
  return t.status === "pending_source" || t.status === "pending_destination";
}

export default function StudentProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  const transfersQuery = useMyTransfers();
  const gender: Gender = profile?.gender ?? "female";
  const myCenterId = profile?.center?.id ?? profile?.centerId ?? user?.centerProfile?.id;

  const centersQuery = useQuery({
    queryKey: registrationQueryKeys.centers(gender),
    queryFn: () => fetchPublicCenters(gender),
    enabled: dialog === "transfer" && !!profile,
  });

  const transfers = transfersQuery.data ?? [];
  const openTransfer = transfers.find(isOpenTransfer);
  const isEnrolled = profile?.enrollmentStatus === "enrolled";

  const closeDialog = () => setDialog(null);
  const onFail = (err: Error) => toast.error(err.message);

  const transferMutation = useMutation({
    mutationFn: (reason: string) => requestMyTransfer({ toCenterId: destinationId!, reason }),
    onSuccess: (r) => {
      closeDialog();
      toast.success(r.message ?? "تم إرسال طلب النقل");
      void queryClient.invalidateQueries({ queryKey: transferQueryKeys.mine });
    },
    onError: onFail,
  });

  const cancelTransferMutation = useMutation({
    mutationFn: (id: string) => cancelTransfer(id),
    onSuccess: (r) => {
      toast.success(r.message || "تم إلغاء طلب النقل");
      void queryClient.invalidateQueries({ queryKey: transferQueryKeys.mine });
    },
    onError: onFail,
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => submitSuspensionRequest(reason || undefined),
    onSuccess: (r) => {
      closeDialog();
      toast.success(r.message || "تم إرسال طلب وقف القيد");
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.me() });
    },
    onError: onFail,
  });

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => submitAccountDeletionRequest(reason || undefined),
    onSuccess: (r) => {
      closeDialog();
      toast.success(r.message || "تم إرسال طلب حذف الحساب");
    },
    onError: onFail,
  });

  const openTransferDialog = () => {
    setDestinationId(null);
    setDestinationError(null);
    setDialog("transfer");
  };

  const confirmCancelTransfer = (t: TransferItem) => {
    Alert.alert("إلغاء طلب النقل؟", `سيُلغى طلب نقلكِ إلى ${t.toCenterName} وتبقين في مركزكِ الحالي.`, [
      { text: "تراجع", style: "cancel" },
      { text: "إلغاء الطلب", style: "destructive", onPress: () => cancelTransferMutation.mutate(t.id) },
    ]);
  };

  const confirmLogout = () => {
    Alert.alert("تسجيل الخروج؟", "ستحتاجين إلى رقمكِ المدني وكلمة المرور للدخول مجدداً.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: () =>
          logout(() => {
            router.replace("/(auth)/welcome" as Href);
            // لا تبقى بيانات الطالبة في الذاكرة لمن يسجّل الدخول بعدها على نفس الجهاز
            queryClient.clear();
          }),
      },
    ]);
  };

  const displayName = profile?.fullName ?? user?.studentProfile?.fullName ?? "";
  const centerName = profile?.center?.nameAr ?? profile?.centerName ?? user?.centerProfile?.nameAr ?? "";
  const levelName = profile?.level?.fullName || profile?.levelName || "";

  return (
    <Screen
      withTabBar
      refreshing={profileQuery.isRefetching || transfersQuery.isRefetching}
      onRefresh={() => {
        void profileQuery.refetch();
        void transfersQuery.refetch();
      }}
      header={<Header large title="حسابي" />}
    >
      {/* البطاقة التعريفية */}
      {profileQuery.isLoading ? (
        <Card padding={5} style={styles.hero}>
          <Skeleton width={80} height={80} radiusSize={40} />
          <Skeleton width="55%" height={22} />
          <Skeleton width="40%" height={16} />
        </Card>
      ) : profileQuery.isError || !profile ? (
        <Card padding={2}>
          <ErrorState message={(profileQuery.error as Error | null)?.message} onRetry={() => void profileQuery.refetch()} />
        </Card>
      ) : (
        <>
          <Card padding={5} style={styles.hero}>
            <Avatar name={displayName} uri={profile.photoUrl} size={80} />
            <View style={styles.heroText}>
              <Text variant="title" align="center">
                {displayName}
              </Text>
              {centerName ? (
                <Text variant="caption" color="textSecondary" align="center">
                  {centerName}
                </Text>
              ) : null}
            </View>
            <View style={styles.badges}>
              <Badge label={ENROLLMENT_LABELS[profile.enrollmentStatus]} tone={ENROLLMENT_TONES[profile.enrollmentStatus]} />
              {profile.levelShortName ? (
                <Badge label={profile.levelShortName} tone="primary" icon="layers-outline" />
              ) : null}
              {profile.studentType ? <Badge label={STUDENT_TYPE_LABELS[profile.studentType]} tone="info" /> : null}
            </View>
          </Card>

          <Section title="بياناتي">
            <Card padding={4} style={styles.infoCard}>
              <InfoRow label="الرقم المدني" value={profile.idNumber} icon="card-account-details-outline" selectable />
              <InfoRow label="الهاتف" value={formatPhone(profile.phone)} icon="phone-outline" selectable />
              <InfoRow label="المركز" value={centerName} icon="home-city-outline" />
              <InfoRow label="المستوى" value={levelName} icon="layers-outline" />
              <InfoRow
                label="المسار"
                value={[TRACK_LABELS[profile.track], profile.trackNote].filter(Boolean).join(" — ")}
                icon="map-marker-path"
              />
              <InfoRow
                label="نوع القيد"
                value={profile.studentType ? STUDENT_TYPE_LABELS[profile.studentType] : ""}
                icon="account-clock-outline"
              />
              <InfoRow
                label="الوظيفة"
                value={occupationLabel(profile.occupation, profile.occupationOther)}
                icon="briefcase-outline"
              />
              <InfoRow
                label="عنوان السكن"
                value={formatAddress(profile.homeAddress)}
                icon="home-outline"
                last={!profile.courses.length}
              />
              {profile.courses.length ? (
                <InfoRow
                  label="الدورات"
                  value={profile.courses.map((c) => c.name).filter(Boolean).join("، ")}
                  icon="certificate-outline"
                  last
                />
              ) : null}
            </Card>
            <Text variant="caption" color="textMuted">
              لتعديل بياناتكِ تواصلي مع إدارة المركز.
            </Text>
          </Section>

          <Section title="مرفقاتي" subtitle="اضغطي على الصورة لعرضها كاملة">
            <DocumentViewer documents={profile.documents} />
          </Section>
        </>
      )}

      {/* الطلبات */}
      <Section title="الطلبات" subtitle="تُرسل لإدارة المركز للمراجعة">
        {transfersQuery.isLoading ? (
          <Card padding={4}>
            <SkeletonList rows={1} />
          </Card>
        ) : transfersQuery.isError ? (
          <Card padding={2}>
            <ErrorState
              compact
              message={(transfersQuery.error as Error).message}
              onRetry={() => void transfersQuery.refetch()}
            />
          </Card>
        ) : transfers.length ? (
          <Card padding={0} style={styles.listCard}>
            {transfers.slice(0, 5).map((t, i, arr) => (
              <View key={t.id} style={[styles.transfer, i < arr.length - 1 && styles.divider]}>
                <View style={styles.transferTop}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {`نقل إلى ${t.toCenterName}`}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {[t.createdAt ? formatDateShort(t.createdAt) : null, t.initiatedBy === "center" ? "بطلب من المركز" : "بطلبكِ"]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Badge label={TRANSFER_STATUS_LABELS[t.status]} tone={TRANSFER_TONES[t.status]} size="sm" />
                </View>
                {t.status === "rejected" && t.rejectionReason ? (
                  <Text variant="caption" color="danger">{`سبب الرفض: ${t.rejectionReason}`}</Text>
                ) : null}
                {isOpenTransfer(t) && t.initiatedBy === "student" ? (
                  <Button
                    variant="dangerTonal"
                    size="sm"
                    icon="close-circle-outline"
                    loading={cancelTransferMutation.isPending && cancelTransferMutation.variables === t.id}
                    onPress={() => confirmCancelTransfer(t)}
                    style={styles.transferAction}
                  >
                    إلغاء الطلب
                  </Button>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        <Card padding={0} style={styles.listCard}>
          <ListItem
            title="طلب نقل إلى مركز آخر"
            subtitle={
              openTransfer
                ? "لديكِ طلب نقل قيد المعالجة"
                : isEnrolled
                  ? "اختاري المركز الجديد واذكري السبب"
                  : "متاح للطالبات المسجّلات فقط"
            }
            leadingIcon="swap-horizontal"
            leadingTone="info"
            onPress={openTransferDialog}
            disabled={!profile || !isEnrolled || !!openTransfer}
            divider
          />
          <ListItem
            title="طلب وقف قيد"
            subtitle="إيقاف مؤقت للدراسة بعد موافقة المركز"
            leadingIcon="pause-circle-outline"
            leadingTone="warning"
            onPress={() => setDialog("suspend")}
            disabled={!profile || !isEnrolled}
            divider
          />
          <ListItem
            title="طلب حذف الحساب"
            subtitle="يُعطَّل حسابكِ نهائياً بعد موافقة المركز"
            leadingIcon="account-remove-outline"
            destructive
            onPress={() => setDialog("delete")}
            disabled={!profile}
          />
        </Card>
      </Section>

      {/* سجل القيد */}
      {profile?.enrollmentHistory.length ? (
        <Section title="سجل القيد">
          <Card padding={4} style={styles.timeline}>
            {profile.enrollmentHistory.map((event, i) => (
              <View key={`${event.action}-${event.at}-${i}`} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{ENROLLMENT_ACTION_LABELS[event.action] ?? event.action}</Text>
                  {event.reason ? (
                    <Text variant="caption" color="textSecondary">
                      {event.reason}
                    </Text>
                  ) : null}
                </View>
                <Text variant="micro" color="textMuted">
                  {event.at ? formatDateShort(event.at) : ""}
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {/* الأمان */}
      <Section title="الأمان">
        <Card padding={0} style={styles.listCard}>
          <BiometricSwitch divider />
          <ListItem title="تسجيل الخروج" leadingIcon="logout" destructive onPress={confirmLogout} chevron={false} />
        </Card>
      </Section>

      {/* النوافذ */}
      <PromptSheet
        visible={dialog === "transfer"}
        onClose={closeDialog}
        title="طلب نقل إلى مركز آخر"
        message="يُرسل الطلب لمركزكِ الحالي أولاً ثم للمركز الجديد، وتنتقلين بعد قبوله مع حفظ سجلّكِ الدراسي."
        inputLabel="سبب النقل"
        placeholder="مثال: الانتقال إلى سكن جديد بعيد عن المركز"
        confirmLabel="إرسال طلب النقل"
        loading={transferMutation.isPending}
        onConfirm={(reason) => {
          if (!destinationId) {
            setDestinationError("اختاري المركز الجديد");
            return;
          }
          transferMutation.mutate(reason);
        }}
      >
        {centersQuery.isError ? (
          <Banner tone="danger" title="تعذّر تحميل المراكز">
            <Button variant="ghost" size="sm" onPress={() => void centersQuery.refetch()} style={styles.bannerAction}>
              إعادة المحاولة
            </Button>
          </Banner>
        ) : null}
        <SelectField
          label="المركز الجديد"
          required
          options={(centersQuery.data ?? [])
            .filter((c) => c.id !== myCenterId)
            .map((c) => ({ id: c.id, label: c.nameAr, description: [c.city, c.addressText].filter(Boolean).join(" · ") }))}
          value={destinationId}
          onChange={(id) => {
            setDestinationId(id);
            setDestinationError(null);
          }}
          placeholder={centersQuery.isLoading ? "جاري تحميل المراكز…" : "اختاري المركز"}
          disabled={centersQuery.isLoading}
          error={destinationError}
          emptyText="لا توجد مراكز أخرى متاحة حالياً"
        />
      </PromptSheet>

      <PromptSheet
        visible={dialog === "suspend"}
        onClose={closeDialog}
        title="طلب وقف قيد"
        message="بعد موافقة المركز لن تتمكني من تسجيل الدخول حتى تُعيد الإدارة تفعيل قيدكِ."
        inputLabel="السبب (اختياري)"
        required={false}
        placeholder="مثال: سفر أو ظرف صحي"
        confirmLabel="إرسال الطلب"
        loading={suspendMutation.isPending}
        onConfirm={(reason) => suspendMutation.mutate(reason)}
      />

      <PromptSheet
        visible={dialog === "delete"}
        onClose={closeDialog}
        title="حذف الحساب نهائياً؟"
        message="سيُرسل طلب لمركزكِ. بعد الموافقة يُعطَّل حسابكِ ولن تتمكني من الدخول، ويمكنكِ التسجيل في مركز آخر لاحقاً."
        inputLabel="السبب (اختياري)"
        required={false}
        confirmLabel="إرسال طلب الحذف"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={(reason) => deleteMutation.mutate(reason)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: space[3] },
  heroText: { alignItems: "center", gap: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space[2] },
  infoCard: { paddingVertical: space[1] },
  listCard: { overflow: "hidden" },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  transfer: { padding: space[4], gap: space[2], backgroundColor: colors.surface },
  transferTop: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  transferAction: { alignSelf: "flex-start" },
  bannerAction: { alignSelf: "flex-start", paddingHorizontal: 0, minHeight: 32 },
  timeline: { gap: space[4] },
  timelineItem: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 7 },
});
