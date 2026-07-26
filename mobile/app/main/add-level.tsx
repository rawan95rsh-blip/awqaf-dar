import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  I18nManager,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addClassTheme, spacing } from "@/constants";
import { useAuth } from "@/src/context/AuthContext";
import { createLevel, levelQueryKeys } from "@/src/api/levels";

const STEP_NAMES = ["بيانات المستوى", "الترتيب والإنشاء"] as const;

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[summaryRowStyles.row, last && summaryRowStyles.rowLast]}>
      <View style={summaryRowStyles.textWrap}>
        <Text style={summaryRowStyles.label}>{label}</Text>
        <Text style={summaryRowStyles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const summaryRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: addClassTheme.cardBorder,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  textWrap: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: addClassTheme.textSecondary,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: addClassTheme.text,
  },
});

export default function AddLevelScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id;

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [order, setOrder] = useState(11);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const createMutation = useMutation({
    mutationFn: createLevel,
    onSuccess: () => {
      if (centerId) {
        queryClient.invalidateQueries({ queryKey: levelQueryKeys.list(centerId) });
      }
      setShowSuccessModal(true);
    },
    onError: (err: Error) => {
      Alert.alert("خطأ", err.message);
    },
  });

  const trimmedFullName = fullName.trim();
  const canProceedStep1 = trimmedFullName.length > 0;

  const handleClose = () => router.back();
  const handleBack = () => {
    if (step === 1) router.back();
    else setStep(1);
  };

  const handleNext = () => {
    if (!canProceedStep1) return;
    setStep(2);
  };

  const handleCreate = () => {
    if (!canProceedStep1) {
      Alert.alert("تنبيه", "اسم المستوى مطلوب");
      return;
    }
    if (order < 1) {
      Alert.alert("تنبيه", "ترتيب المستوى يجب أن يكون رقماً موجباً");
      return;
    }

    createMutation.mutate({
      fullName: trimmedFullName,
      shortName: shortName.trim() || undefined,
      order,
    });
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    router.replace("/main/classes" as import("expo-router").Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="رجوع"
        >
          <Text style={styles.headerBackIcon}>
            {I18nManager.isRTL ? "→" : "←"}
          </Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>إضافة مستوى جديد</Text>
          <Text style={styles.headerSubtitle}>
            الخطوة {step} من 2 — {STEP_NAMES[step - 1]}
          </Text>
          <View style={styles.progressBar}>
            {[1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < step && styles.progressSegmentCompleted,
                  i === step && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
        </View>
        <Pressable
          style={styles.headerButton}
          onPress={handleClose}
          accessibilityLabel="إغلاق"
        >
          <Text style={styles.headerCloseIcon}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionBlueLine} />
              <Text style={styles.sectionTitle}>بيانات المستوى</Text>
            </View>
            <View style={styles.formCard}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>الاسم الكامل *</Text>
                <TextInput
                  style={styles.formInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="مثال: المستوى التاسع مطور"
                  placeholderTextColor={addClassTheme.textSecondary}
                  accessibilityLabel="الاسم الكامل للمستوى"
                />
              </View>
              <View style={styles.formDivider} />
              <View style={styles.formField}>
                <Text style={styles.formLabel}>الاسم المختصر</Text>
                <TextInput
                  style={styles.formInput}
                  value={shortName}
                  onChangeText={setShortName}
                  placeholder="مثال: مستوى مطور ٩"
                  placeholderTextColor={addClassTheme.textSecondary}
                  accessibilityLabel="الاسم المختصر للمستوى"
                />
              </View>
            </View>
            <Text style={styles.hint}>
              مؤقتاً: السعة والجدول وتوزيع الدرجات ستُضاف لاحقاً من شاشات المستوى.
            </Text>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.sectionTitleWrap}>
              <View style={[styles.sectionBlueLine, styles.sectionPurpleLine]} />
              <Text style={styles.sectionTitle}>ترتيب المستوى</Text>
            </View>
            <View style={styles.stepperCard}>
              <Text style={styles.stepperLabel}>رقم الترتيب في القائمة</Text>
              <Text style={styles.stepperDesc}>
                المستويات الافتراضية 1–10. استخدمي 11 أو أعلى للمستويات الجديدة.
              </Text>
              <View style={styles.stepperRow}>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => setOrder((v) => Math.max(1, v - 1))}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{order}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => setOrder((v) => v + 1)}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>ملخص</Text>
              <SummaryRow label="الاسم الكامل" value={trimmedFullName} />
              <SummaryRow
                label="الاسم المختصر"
                value={shortName.trim() || "—"}
              />
              <SummaryRow label="الترتيب" value={String(order)} last />
            </View>
          </>
        )}

        <View style={styles.footer}>
          {step === 1 ? (
            <Pressable
              style={[
                styles.primaryButton,
                !canProceedStep1 && styles.primaryButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceedStep1}
            >
              <Text style={styles.primaryButtonText}>التالي</Text>
            </Pressable>
          ) : (
            <View style={styles.footerTwoButtons}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep(1)}
                disabled={createMutation.isPending}
              >
                <Text style={styles.secondaryButtonText}>السابق</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.primaryButtonFlex,
                  createMutation.isPending && styles.primaryButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={addClassTheme.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>إنشاء المستوى</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={handleCloseSuccess}>
          <Pressable
            style={styles.successModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.successIconWrap}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>تم الإنشاء</Text>
            <Text style={styles.successMessage}>تم إنشاء المستوى بنجاح</Text>
            <View style={styles.successDetails}>
              <Text style={styles.successDetail}>الاسم: {trimmedFullName}</Text>
              {shortName.trim() ? (
                <Text style={styles.successDetail}>
                  المختصر: {shortName.trim()}
                </Text>
              ) : null}
              <Text style={styles.successDetail}>الترتيب: {order}</Text>
            </View>
            <Pressable style={styles.successButton} onPress={handleCloseSuccess}>
              <Text style={styles.successButtonText}>الذهاب للفصول</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: addClassTheme.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: addClassTheme.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: addClassTheme.headerButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackIcon: {
    fontSize: 20,
    fontWeight: "600",
    color: addClassTheme.accentBlue,
  },
  headerCloseIcon: {
    fontSize: 18,
    fontWeight: "500",
    color: addClassTheme.text,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: addClassTheme.textSecondary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
  },
  progressSegment: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: addClassTheme.progressInactive,
  },
  progressSegmentCompleted: {
    backgroundColor: addClassTheme.progressCompleted,
  },
  progressSegmentActive: {
    backgroundColor: addClassTheme.progressActive,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionBlueLine: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: addClassTheme.accentBlue,
    marginLeft: spacing.sm,
  },
  sectionPurpleLine: {
    backgroundColor: addClassTheme.accentPurple,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: addClassTheme.text,
  },
  formCard: {
    backgroundColor: addClassTheme.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
  },
  formField: {
    gap: spacing.xs,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: addClassTheme.text,
  },
  formInput: {
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: addClassTheme.text,
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  formDivider: {
    height: 1,
    backgroundColor: addClassTheme.cardBorder,
    marginVertical: spacing.md,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: 13,
    color: addClassTheme.textSecondary,
    lineHeight: 20,
  },
  stepperCard: {
    backgroundColor: addClassTheme.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    marginBottom: spacing.lg,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: spacing.xs,
  },
  stepperDesc: {
    fontSize: 13,
    color: addClassTheme.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: addClassTheme.headerButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: "600",
    color: addClassTheme.accentBlue,
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: "700",
    color: addClassTheme.text,
    minWidth: 48,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: addClassTheme.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
  footerTwoButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: addClassTheme.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: addClassTheme.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    backgroundColor: addClassTheme.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: addClassTheme.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  successModal: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: addClassTheme.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: addClassTheme.selectedBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  successIcon: {
    fontSize: 32,
    fontWeight: "700",
    color: addClassTheme.selectedBorder,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: spacing.xs,
  },
  successMessage: {
    fontSize: 15,
    color: addClassTheme.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  successDetails: {
    width: "100%",
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  successDetail: {
    fontSize: 14,
    color: addClassTheme.text,
    textAlign: "center",
  },
  successButton: {
    backgroundColor: addClassTheme.primaryDark,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  successButtonText: {
    color: addClassTheme.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
