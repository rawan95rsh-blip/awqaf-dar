import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Pressable,
  I18nManager,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import {
  approveRequest,
  fetchLevelsByCenter,
  listPendingRequests,
  rejectRequest,
  type RegistrationRequestItem,
} from "@/src/api/registrationRequests";
import {
  approveAccountDeletionRequest,
  deletionRequestQueryKeys,
  listAccountDeletionRequests,
  rejectAccountDeletionRequest,
  type AccountDeletionRequestItem,
} from "@/src/api/accountDeletionRequests";
import {
  approveSuspensionRequest,
  listSuspensionRequests,
  rejectSuspensionRequest,
  suspensionRequestQueryKeys,
  type SuspensionRequestItem,
} from "@/src/api/suspensionRequests";
import {
  ACADEMIC_LEVEL_OPTIONS,
  NATIONALITY_OPTIONS,
} from "@/src/constants/registrationOptions";
import { STUDENT_GENDER_LABELS } from "@/src/constants/genderAudience";
import { TRACK_LABELS } from "@/src/types/classOffer";

const REQUESTS_QUERY_KEY = ["registration-requests", "pending"] as const;

function getOptionLabel(
  options: { id: string; label: string }[],
  id: string
): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

function RequestCard({
  request,
  levelName,
  onApprove,
  onReject,
  isProcessing,
}: {
  request: RegistrationRequestItem;
  levelName: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{request.fullName}</Text>
      <Text style={styles.cardRow}>الهوية المدنية: {request.idNumber}</Text>
      <Text style={styles.cardRow}>الهاتف: {request.phone}</Text>
      <Text style={styles.cardRow}>
        الجنس: {request.gender ? STUDENT_GENDER_LABELS[request.gender] : "—"}
      </Text>
      <Text style={styles.cardRow}>
        الجنسية: {getOptionLabel(NATIONALITY_OPTIONS, request.nationality)}
      </Text>
      <Text style={styles.cardRow}>
        المستوى الدراسي:{" "}
        {getOptionLabel(ACADEMIC_LEVEL_OPTIONS, request.academicLevel)}
      </Text>
      <Text style={styles.cardRow}>
        المسار:{" "}
        {request.track ? TRACK_LABELS[request.track] : "—"}
      </Text>
      <Text style={styles.cardRow}>المستوى المطلوب: {levelName}</Text>
      <Text style={styles.cardRow}>تاريخ الميلاد: {request.dob}</Text>

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onReject(request.id)}
          disabled={isProcessing}
          accessibilityLabel={`رفض طلب ${request.fullName}`}
        >
          <Text style={styles.rejectBtnText}>رفض</Text>
        </Pressable>
        <Pressable
          style={[styles.approveBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onApprove(request.id)}
          disabled={isProcessing}
          accessibilityLabel={`الموافقة على طلب ${request.fullName}`}
        >
          <Text style={styles.approveBtnText}>موافقة</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SuspensionRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: {
  request: SuspensionRequestItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{request.studentName ?? "طالبة"}</Text>
      <Text style={styles.cardRow}>الهوية: {request.studentIdNumber ?? "—"}</Text>
      {request.reason ? (
        <Text style={styles.cardRow}>السبب: {request.reason}</Text>
      ) : null}
      <View style={styles.cardActions}>
        <Pressable
          style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onReject(request.id)}
          disabled={isProcessing}
        >
          <Text style={styles.rejectBtnText}>رفض</Text>
        </Pressable>
        <Pressable
          style={[styles.approveBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onApprove(request.id)}
          disabled={isProcessing}
        >
          <Text style={styles.approveBtnText}>موافقة وقف</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DeletionRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: {
  request: AccountDeletionRequestItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{request.studentName ?? "طالبة"}</Text>
      <Text style={styles.cardRow}>الهوية: {request.studentIdNumber ?? "—"}</Text>
      {request.reason ? (
        <Text style={styles.cardRow}>السبب: {request.reason}</Text>
      ) : null}
      <View style={styles.cardActions}>
        <Pressable
          style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onReject(request.id)}
          disabled={isProcessing}
        >
          <Text style={styles.rejectBtnText}>رفض</Text>
        </Pressable>
        <Pressable
          style={[styles.approveBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onApprove(request.id)}
          disabled={isProcessing}
        >
          <Text style={styles.approveBtnText}>موافقة حذف</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RequestsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const centerId = user?.centerProfile?.id;
  const isCenterAdmin = user?.role === "center_admin";

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: REQUESTS_QUERY_KEY,
    queryFn: listPendingRequests,
    enabled: isCenterAdmin,
  });

  const { data: levels = [] } = useQuery({
    queryKey: ["levels", centerId],
    queryFn: () => fetchLevelsByCenter(centerId!),
    enabled: isCenterAdmin && !!centerId,
  });

  const {
    data: deletionRequests = [],
    refetch: refetchDeletions,
    isRefetching: isRefetchingDeletions,
  } = useQuery({
    queryKey: deletionRequestQueryKeys.list("pending"),
    queryFn: () => listAccountDeletionRequests("pending"),
    enabled: isCenterAdmin,
  });

  const {
    data: suspensionRequests = [],
    refetch: refetchSuspensions,
    isRefetching: isRefetchingSuspensions,
  } = useQuery({
    queryKey: suspensionRequestQueryKeys.list("pending"),
    queryFn: () => listSuspensionRequests("pending"),
    enabled: isCenterAdmin,
  });

  const levelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const level of levels) {
      map.set(level.id, level.fullName);
    }
    return map;
  }, [levels]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
  }, [queryClient]);

  const invalidateDeletions = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: deletionRequestQueryKeys.list("pending"),
    });
  }, [queryClient]);

  const invalidateSuspensions = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: suspensionRequestQueryKeys.list("pending"),
    });
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRequest(id),
    onSuccess: () => {
      invalidate();
      Alert.alert("تمت الموافقة", "تم إنشاء حساب الطالبة بنجاح");
    },
    onError: (err: Error) => {
      Alert.alert("خطأ", err.message);
    },
    onSettled: () => setProcessingId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectRequest(id, reason),
    onSuccess: () => {
      invalidate();
      setRejectTargetId(null);
      setRejectReason("");
      Alert.alert("تم الرفض", "تم رفض طلب التسجيل");
    },
    onError: (err: Error) => {
      Alert.alert("خطأ", err.message);
    },
    onSettled: () => setProcessingId(null),
  });

  const approveDeletionMutation = useMutation({
    mutationFn: (id: string) => approveAccountDeletionRequest(id),
    onSuccess: () => {
      invalidateDeletions();
      Alert.alert("تم", "تمت الموافقة على الحذف الكلي");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
    onSettled: () => setProcessingId(null),
  });

  const rejectDeletionMutation = useMutation({
    mutationFn: (id: string) => rejectAccountDeletionRequest(id),
    onSuccess: () => {
      invalidateDeletions();
      Alert.alert("تم", "تم رفض طلب الحذف");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
    onSettled: () => setProcessingId(null),
  });

  const approveSuspensionMutation = useMutation({
    mutationFn: (id: string) => approveSuspensionRequest(id),
    onSuccess: () => {
      invalidateSuspensions();
      Alert.alert("تم", "تمت الموافقة على وقف القيد");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
    onSettled: () => setProcessingId(null),
  });

  const rejectSuspensionMutation = useMutation({
    mutationFn: (id: string) => rejectSuspensionRequest(id),
    onSuccess: () => {
      invalidateSuspensions();
      Alert.alert("تم", "تم رفض طلب وقف القيد");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
    onSettled: () => setProcessingId(null),
  });

  const handleApprove = (id: string) => {
    Alert.alert("تأكيد الموافقة", "هل تريدين الموافقة على هذا الطلب وإنشاء حساب الطالبة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "موافقة",
        onPress: () => {
          setProcessingId(id);
          approveMutation.mutate(id);
        },
      },
    ]);
  };

  const handleRejectPress = (id: string) => {
    setRejectReason("");
    setRejectTargetId(id);
  };

  const handleRejectConfirm = () => {
    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert("مطلوب", "أدخلي سبب الرفض");
      return;
    }
    if (!rejectTargetId) return;
    setProcessingId(rejectTargetId);
    rejectMutation.mutate({ id: rejectTargetId, reason });
  };

  if (!isCenterAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View
            style={[
              styles.topBar,
              { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
            ]}
          >
            <DrawerTrigger />
          </View>
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>غير متاح</Text>
            <Text style={styles.emptyText}>هذه الصفحة لمشرفي المراكز فقط</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <DrawerTrigger />
        </View>

        <Text style={styles.screenTitle}>الطلبات</Text>
        <Text style={styles.screenSubtitle}>
          تسجيل: {requests.length} · وقف قيد: {suspensionRequests.length} · حذف:{" "}
          {deletionRequests.length}
        </Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={centerColors.accent} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>
              {(error as Error)?.message ?? "تعذر تحميل الطلبات"}
            </Text>
            <View style={styles.retryWrap}>
              <Button onPress={() => refetch()} accessibilityLabel="إعادة المحاولة">
                إعادة المحاولة
              </Button>
            </View>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={
                  isRefetching || isRefetchingDeletions || isRefetchingSuspensions
                }
                onRefresh={() => {
                  void refetch();
                  void refetchDeletions();
                  void refetchSuspensions();
                }}
                tintColor={centerColors.accent}
              />
            }
            ListHeaderComponent={
              <Text style={styles.sectionHeading}>طلبات التسجيل</Text>
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>لا توجد طلبات تسجيل معلقة</Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.deletionSection}>
                <Text style={styles.sectionHeading}>طلبات وقف القيد</Text>
                {suspensionRequests.length === 0 ? (
                  <Text style={styles.emptyText}>لا توجد طلبات وقف قيد معلقة</Text>
                ) : (
                  suspensionRequests.map((item) => (
                    <SuspensionRequestCard
                      key={item.id}
                      request={item}
                      onApprove={(id) => {
                        Alert.alert(
                          "تأكيد",
                          "الموافقة توقف قيد الطالبة ولن تتمكن من تسجيل الدخول.",
                          [
                            { text: "إلغاء", style: "cancel" },
                            {
                              text: "موافقة",
                              onPress: () => {
                                setProcessingId(id);
                                approveSuspensionMutation.mutate(id);
                              },
                            },
                          ]
                        );
                      }}
                      onReject={(id) => {
                        setProcessingId(id);
                        rejectSuspensionMutation.mutate(id);
                      }}
                      isProcessing={processingId === item.id}
                    />
                  ))
                )}

                <Text style={[styles.sectionHeading, { marginTop: spacing.xl }]}>
                  طلبات الحذف الكلي
                </Text>
                {deletionRequests.length === 0 ? (
                  <Text style={styles.emptyText}>لا توجد طلبات حذف معلقة</Text>
                ) : (
                  deletionRequests.map((item) => (
                    <DeletionRequestCard
                      key={item.id}
                      request={item}
                      onApprove={(id) => {
                        Alert.alert(
                          "تأكيد",
                          "الموافقة تحذف الحساب وتسمح بالتسجيل في مركز آخر. السجل الأكاديمي يبقى.",
                          [
                            { text: "إلغاء", style: "cancel" },
                            {
                              text: "موافقة",
                              style: "destructive",
                              onPress: () => {
                                setProcessingId(id);
                                approveDeletionMutation.mutate(id);
                              },
                            },
                          ]
                        );
                      }}
                      onReject={(id) => {
                        setProcessingId(id);
                        rejectDeletionMutation.mutate(id);
                      }}
                      isProcessing={processingId === item.id}
                    />
                  ))
                )}
              </View>
            }
            renderItem={({ item }) => (
              <RequestCard
                request={item}
                levelName={
                  levelNameById.get(item.requestedLevelId) ?? "—"
                }
                onApprove={handleApprove}
                onReject={handleRejectPress}
                isProcessing={processingId === item.id}
              />
            )}
          />
        )}
      </View>

      <Modal
        visible={rejectTargetId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTargetId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>سبب الرفض</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="اكتبي سبب رفض الطلب..."
              placeholderTextColor={centerColors.textMuted}
              multiline
              textAlign="right"
              accessibilityLabel="سبب الرفض"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setRejectTargetId(null)}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirm}
                onPress={handleRejectConfirm}
              >
                <Text style={styles.modalConfirmText}>تأكيد الرفض</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: "right",
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: "right",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  deletionSection: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
  },
  card: {
    backgroundColor: centerColors.cardBg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  cardRow: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.xs,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  approveBtn: {
    backgroundColor: centerColors.accentGreen,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  approveBtnText: {
    color: centerColors.textOnAccent,
    fontWeight: "600",
    fontSize: 14,
  },
  rejectBtn: {
    backgroundColor: centerColors.cardBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  rejectBtnText: {
    color: centerColors.accentRed,
    fontWeight: "600",
    fontSize: 14,
  },
  btnDisabled: { opacity: 0.5 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: centerColors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    fontSize: 15,
    color: centerColors.accentRed,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  retryWrap: { width: "100%", maxWidth: 200 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: centerColors.background,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: "right",
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 100,
    fontSize: 15,
    color: centerColors.text,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancel: { padding: spacing.sm },
  modalCancelText: { fontSize: 15, color: centerColors.textSecondary },
  modalConfirm: {
    backgroundColor: centerColors.accentRed,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  modalConfirmText: {
    color: centerColors.textOnAccent,
    fontWeight: "600",
    fontSize: 14,
  },
});
