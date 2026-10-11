import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { space, type Tone } from "@/src/theme";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListItem,
  PromptSheet,
  Section,
  SelectField,
  SkeletonList,
  useToast,
} from "@/src/ui";
import {
  approveTransfer,
  cancelTransfer,
  rejectTransfer,
  TRANSFER_STATUS_LABELS,
  transferQueryKeys,
  type TransferItem,
  type TransferStatus,
} from "@/src/api/transfers";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { studentQueryKeys } from "@/src/api/students";
import { useAuth } from "@/src/context/AuthContext";
import { TRACK_LABELS } from "@/src/constants/domain";
import { formatDateShort } from "@/src/utils/format";
import RequestCard, { ReasonNote } from "./RequestCard";

const STATUS_TONES: Record<TransferStatus, Tone> = {
  pending_source: "warning",
  pending_destination: "info",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

const HISTORY_LIMIT = 5;

type Dialog = { type: "accept" | "reject"; transfer: TransferItem } | null;

function byNewest(a: TransferItem, b: TransferItem): number {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
}

/**
 * طلبات النقل:
 * - واردة: طالبة من مركز آخر بانتظار قبولكِ
 * - مغادرة: طالبة من مركزكِ طلبت الانتقال (موافقتكِ تُحيل الطلب للمركز الجديد)
 * - مُرسلة: طلبات أرسلتِها بانتظار المركز الآخر (يمكن إلغاؤها)
 */
export default function TransferRequestList({ query }: { query: UseQueryResult<TransferItem[], Error> }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";

  const [dialog, setDialog] = useState<Dialog>(null);
  const [levelId, setLevelId] = useState("");

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: dialog?.type === "accept" && !!centerId,
  });

  const groups = useMemo(() => {
    const all = [...(query.data ?? [])].sort(byNewest);
    return {
      incoming: all.filter((t) => t.direction === "incoming" && t.status === "pending_destination"),
      leaving: all.filter((t) => t.direction === "outgoing" && t.status === "pending_source"),
      sent: all.filter((t) => t.direction === "outgoing" && t.status === "pending_destination"),
      history: all
        .filter((t) => t.status === "approved" || t.status === "rejected" || t.status === "cancelled")
        .slice(0, HISTORY_LIMIT),
    };
  }, [query.data]);

  const onSuccess = (message: string) => {
    setDialog(null);
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: transferQueryKeys.center });
    void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["levels"] });
    void queryClient.invalidateQueries({ queryKey: ["level-students"] });
  };
  const onError = (err: Error) => toast.error(err.message);

  const approveMutation = useMutation({
    mutationFn: (vars: { id: string; levelId?: string }) => approveTransfer(vars.id, vars.levelId),
    onSuccess: (r) => onSuccess(r.message ?? "تمت الموافقة على طلب النقل"),
    onError,
  });
  const rejectMutation = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => rejectTransfer(vars.id, vars.reason),
    onSuccess: (r) => onSuccess(r.message ?? "تم رفض طلب النقل"),
    onError,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelTransfer(id),
    onSuccess: (r) => onSuccess(r.message ?? "تم إلغاء طلب النقل"),
    onError,
  });

  const isBusy = (id: string) =>
    (approveMutation.isPending && approveMutation.variables?.id === id) ||
    (cancelMutation.isPending && cancelMutation.variables === id);

  const openProfile = (transfer: TransferItem) =>
    router.push(`/main/student-profile/${transfer.studentId}` as Href);

  const confirmForward = (transfer: TransferItem) =>
    Alert.alert(
      "الموافقة على النقل",
      `سيُحال طلب ${transfer.studentName} إلى ${transfer.toCenterName} للقبول النهائي، وتبقى مسجّلة لديكِ حتى يقبلها المركز الجديد.`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "موافقة وإحالة", onPress: () => approveMutation.mutate({ id: transfer.id }) },
      ]
    );

  const confirmCancel = (transfer: TransferItem) =>
    Alert.alert("إلغاء طلب النقل", `هل تريدين إلغاء طلب نقل ${transfer.studentName}؟`, [
      { text: "تراجع", style: "cancel" },
      { text: "إلغاء الطلب", style: "destructive", onPress: () => cancelMutation.mutate(transfer.id) },
    ]);

  if (query.isLoading) return <SkeletonList rows={3} />;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;

  const hasOpen = groups.incoming.length + groups.leaving.length + groups.sent.length > 0;
  const firstOpen = groups.incoming.length ? "incoming" : groups.leaving.length ? "leaving" : "sent";
  const sectionStyle = (key: typeof firstOpen) => (key === firstOpen ? styles.firstSection : undefined);
  const levelOptions = [
    { id: "", label: "المستوى المقابل تلقائياً", description: "نفس المسار والترتيب في مركزكِ" },
    ...(levelsQuery.data ?? []).map((l) => ({ id: l.id, label: l.shortName || l.fullName, description: TRACK_LABELS[l.track] })),
  ];

  return (
    <View>
      {!hasOpen ? (
        <EmptyState
          icon="swap-horizontal"
          title="لا توجد طلبات نقل معلقة"
          description="تظهر هنا طلبات النقل الواردة إلى مركزكِ وطلبات الطالبات الراغبات بالانتقال لمركز آخر."
        />
      ) : null}

      {groups.incoming.length ? (
        <Section title="واردة إلى مركزكِ" subtitle="طالبات من مراكز أخرى بانتظار قبولكِ" style={sectionStyle("incoming")}>
          {groups.incoming.map((t) => (
            <RequestCard
              key={t.id}
              name={t.studentName}
              subtitle={`من ${t.fromCenterName}${t.studentLevelName ? ` · ${t.studentLevelName}` : ""}`}
              createdAt={t.createdAt}
              avatarTone="info"
              badges={<Badge label={t.initiatedBy === "student" ? "بطلب الطالبة" : "بطلب المركز"} tone="neutral" size="sm" />}
              actions={
                <>
                  <Button
                    variant="dangerTonal"
                    size="sm"
                    style={styles.flex}
                    disabled={isBusy(t.id)}
                    onPress={() => setDialog({ type: "reject", transfer: t })}
                  >
                    رفض
                  </Button>
                  <Button
                    size="sm"
                    icon="check"
                    style={styles.flex}
                    loading={isBusy(t.id)}
                    onPress={() => {
                      setLevelId("");
                      setDialog({ type: "accept", transfer: t });
                    }}
                  >
                    قبول الطالبة
                  </Button>
                </>
              }
            >
              <ReasonNote label="سبب النقل" text={t.reason} />
            </RequestCard>
          ))}
        </Section>
      ) : null}

      {groups.leaving.length ? (
        <Section title="طلبات مغادرة" subtitle="طالبات من مركزكِ يرغبن بالانتقال" style={sectionStyle("leaving")}>
          {groups.leaving.map((t) => (
            <RequestCard
              key={t.id}
              name={t.studentName}
              subtitle={`إلى ${t.toCenterName}`}
              createdAt={t.createdAt}
              avatarTone="warning"
              onPress={() => openProfile(t)}
              accessibilityLabel={`ملف ${t.studentName}`}
              actions={
                <>
                  <Button
                    variant="dangerTonal"
                    size="sm"
                    style={styles.flex}
                    disabled={isBusy(t.id)}
                    onPress={() => setDialog({ type: "reject", transfer: t })}
                  >
                    رفض
                  </Button>
                  <Button
                    size="sm"
                    icon="send-outline"
                    style={styles.flex}
                    loading={isBusy(t.id)}
                    onPress={() => confirmForward(t)}
                  >
                    موافقة وإحالة
                  </Button>
                </>
              }
            >
              <ReasonNote label="سبب الانتقال" text={t.reason} />
            </RequestCard>
          ))}
        </Section>
      ) : null}

      {groups.sent.length ? (
        <Section title="بانتظار المركز الآخر" subtitle="طلبات نقل خرجت من مركزكِ" style={sectionStyle("sent")}>
          {groups.sent.map((t) => (
            <RequestCard
              key={t.id}
              name={t.studentName}
              subtitle={`إلى ${t.toCenterName}`}
              createdAt={t.createdAt}
              avatarTone="neutral"
              onPress={() => openProfile(t)}
              accessibilityLabel={`ملف ${t.studentName}`}
              badges={<Badge label={TRANSFER_STATUS_LABELS[t.status]} tone={STATUS_TONES[t.status]} icon="clock-outline" size="sm" />}
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  icon="close"
                  style={styles.flex}
                  loading={isBusy(t.id)}
                  onPress={() => confirmCancel(t)}
                >
                  إلغاء الطلب
                </Button>
              }
            />
          ))}
        </Section>
      ) : null}

      {groups.history.length ? (
        <Section title="آخر الطلبات المنتهية">
          <Card padding={0} style={styles.listCard}>
            {groups.history.map((t, i) => (
              <ListItem
                key={t.id}
                title={t.studentName}
                subtitle={[
                  t.direction === "incoming" ? `من ${t.fromCenterName}` : `إلى ${t.toCenterName}`,
                  t.createdAt ? formatDateShort(t.createdAt) : "",
                  t.status === "rejected" ? t.rejectionReason : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                leadingIcon={t.direction === "incoming" ? "arrow-down-bold-circle-outline" : "arrow-up-bold-circle-outline"}
                leadingTone="neutral"
                trailing={<Badge label={TRANSFER_STATUS_LABELS[t.status]} tone={STATUS_TONES[t.status]} size="sm" />}
                chevron={false}
                divider={i < groups.history.length - 1}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      <PromptSheet
        visible={dialog?.type === "accept"}
        onClose={() => setDialog(null)}
        title="قبول طلب النقل"
        message={
          dialog
            ? `ستنتقل ${dialog.transfer.studentName} إلى مركزكِ مع سجلها الأكاديمي${
                dialog.transfer.studentLevelName ? ` (مستواها الحالي: ${dialog.transfer.studentLevelName})` : ""
              }.`
            : undefined
        }
        inputLabel={null}
        confirmLabel="قبول ونقل الطالبة"
        loading={approveMutation.isPending}
        onConfirm={() => {
          if (dialog) approveMutation.mutate({ id: dialog.transfer.id, levelId: levelId || undefined });
        }}
      >
        <SelectField
          label="المستوى في مركزكِ"
          options={levelOptions}
          value={levelId}
          onChange={setLevelId}
          disabled={levelsQuery.isLoading}
          hint={levelsQuery.isError ? "تعذّر تحميل المستويات — سيُستخدم المستوى المقابل" : undefined}
        />
      </PromptSheet>

      <PromptSheet
        visible={dialog?.type === "reject"}
        onClose={() => setDialog(null)}
        title="رفض طلب النقل"
        message={dialog ? `سيُبلَّغ الطرف الآخر برفض طلب نقل ${dialog.transfer.studentName} مع السبب.` : undefined}
        inputLabel="سبب الرفض"
        placeholder="مثال: لا يوجد مقعد متاح في المستوى حالياً"
        confirmLabel="رفض الطلب"
        confirmVariant="danger"
        loading={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (dialog) rejectMutation.mutate({ id: dialog.transfer.id, reason });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  firstSection: { marginTop: 0 },
  listCard: { overflow: "hidden" },
});
