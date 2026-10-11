import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import { space } from "@/src/theme";
import { Button, EmptyState, ErrorState, PromptSheet, SkeletonList, Text, useToast } from "@/src/ui";
import {
  approveSuspensionRequest,
  rejectSuspensionRequest,
  suspensionRequestQueryKeys,
  type SuspensionRequestItem,
} from "@/src/api/suspensionRequests";
import {
  approveAccountDeletionRequest,
  deletionRequestQueryKeys,
  rejectAccountDeletionRequest,
} from "@/src/api/accountDeletionRequests";
import { studentQueryKeys } from "@/src/api/students";
import RequestCard, { ReasonNote } from "./RequestCard";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** الحقول المشتركة بين طلبات وقف القيد وطلبات حذف الحساب */
export type StudentRequestItem = Pick<
  SuspensionRequestItem,
  "id" | "studentId" | "reason" | "studentName" | "studentIdNumber" | "createdAt"
>;

export type StudentRequestKind = "suspension" | "deletion";

type KindConfig = {
  queryKey: QueryKey;
  approve: (id: string) => Promise<{ message: string }>;
  reject: (id: string, reason?: string) => Promise<{ message: string }>;
  approveLabel: string;
  approveTitle: string;
  approveMessage: (name: string) => string;
  approvedToast: string;
  rejectTitle: string;
  rejectedToast: string;
  empty: { icon: IconName; title: string; description: string };
};

const CONFIG: Record<StudentRequestKind, KindConfig> = {
  suspension: {
    queryKey: suspensionRequestQueryKeys.list("pending"),
    approve: approveSuspensionRequest,
    reject: rejectSuspensionRequest,
    approveLabel: "موافقة على الوقف",
    approveTitle: "وقف قيد الطالبة",
    approveMessage: (name) => `سيُوقف قيد ${name} ولن تتمكن من تسجيل الدخول حتى تُعيدي قيدها من ملفها.`,
    approvedToast: "تم وقف قيد الطالبة",
    rejectTitle: "رفض طلب وقف القيد",
    rejectedToast: "تم رفض طلب وقف القيد",
    empty: {
      icon: "account-cancel-outline",
      title: "لا توجد طلبات وقف قيد",
      description: "عندما تطلب طالبة وقف قيدها من التطبيق يظهر طلبها هنا لمراجعته.",
    },
  },
  deletion: {
    queryKey: deletionRequestQueryKeys.list("pending"),
    approve: approveAccountDeletionRequest,
    reject: rejectAccountDeletionRequest,
    approveLabel: "موافقة على الحذف",
    approveTitle: "حذف حساب الطالبة",
    approveMessage: (name) =>
      `سيُحذف حساب ${name} ويمكنها التسجيل في مركز آخر. يبقى سجلها الأكاديمي محفوظاً. لا يمكن التراجع عن هذا الإجراء.`,
    approvedToast: "تم حذف حساب الطالبة",
    rejectTitle: "رفض طلب الحذف",
    rejectedToast: "تم رفض طلب حذف الحساب",
    empty: {
      icon: "account-remove-outline",
      title: "لا توجد طلبات حذف",
      description: "تظهر هنا طلبات الطالبات الراغبات بحذف حساباتهن نهائياً.",
    },
  },
};

/** طلبات وقف القيد أو حذف الحساب — الموافقة بتأكيد، والرفض مع سبب اختياري */
export default function StudentRequestList({
  kind,
  query,
}: {
  kind: StudentRequestKind;
  query: UseQueryResult<StudentRequestItem[], Error>;
}) {
  const config = CONFIG[kind];
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<StudentRequestItem | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: config.queryKey });
    void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => config.approve(id),
    onSuccess: () => {
      toast.success(config.approvedToast);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => config.reject(vars.id, vars.reason || undefined),
    onSuccess: () => {
      setRejecting(null);
      toast.success(config.rejectedToast);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmApprove = (item: StudentRequestItem) => {
    const name = item.studentName ?? "الطالبة";
    Alert.alert(config.approveTitle, config.approveMessage(name), [
      { text: "إلغاء", style: "cancel" },
      { text: config.approveLabel, style: "destructive", onPress: () => approveMutation.mutate(item.id) },
    ]);
  };

  if (query.isLoading) return <SkeletonList rows={3} />;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;

  const items = query.data ?? [];
  if (items.length === 0) {
    return <EmptyState icon={config.empty.icon} title={config.empty.title} description={config.empty.description} />;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const name = item.studentName ?? "طالبة";
        const approving = approveMutation.isPending && approveMutation.variables === item.id;
        return (
          <RequestCard
            key={item.id}
            name={name}
            subtitle={item.studentIdNumber ? `الرقم المدني ${item.studentIdNumber}` : undefined}
            createdAt={item.createdAt}
            avatarTone={kind === "deletion" ? "danger" : "warning"}
            onPress={() => router.push(`/main/student-profile/${item.studentId}` as Href)}
            accessibilityLabel={`ملف ${name}`}
            actions={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  style={styles.flex}
                  disabled={approving}
                  onPress={() => setRejecting(item)}
                >
                  رفض
                </Button>
                <Button variant="danger" size="sm" style={styles.flex} loading={approving} onPress={() => confirmApprove(item)}>
                  {config.approveLabel}
                </Button>
              </>
            }
          >
            {item.reason?.trim() ? (
              <ReasonNote text={item.reason} />
            ) : (
              <Text variant="caption" color="textMuted">
                لم تذكر الطالبة سبباً
              </Text>
            )}
          </RequestCard>
        );
      })}

      <PromptSheet
        visible={!!rejecting}
        onClose={() => setRejecting(null)}
        title={config.rejectTitle}
        message={rejecting ? `يبقى حساب ${rejecting.studentName ?? "الطالبة"} كما هو.` : undefined}
        inputLabel="سبب الرفض (اختياري)"
        required={false}
        confirmLabel="تأكيد الرفض"
        loading={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (rejecting) rejectMutation.mutate({ id: rejecting.id, reason });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space[3] },
});
