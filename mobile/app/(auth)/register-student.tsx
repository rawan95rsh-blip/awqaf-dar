import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "@/src/components/ScreenContainer";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import SelectField from "@/src/components/SelectField";
import { colors, spacing, centerColors } from "@/constants";
import {
  ACADEMIC_LEVEL_OPTIONS,
  NATIONALITY_OPTIONS,
} from "@/src/constants/registrationOptions";
import {
  GENDER_AUDIENCE_LABELS,
  STUDENT_GENDER_OPTIONS,
  type StudentGender,
} from "@/src/constants/genderAudience";
import {
  fetchLevelsByCenter,
  fetchPublicCenters,
  submitRegistrationRequest,
} from "@/src/api/registrationRequests";
import { hasCenterLocation, openCenterInMaps } from "@/src/utils/maps";
import {
  filterDigitsOnly,
  isDigitsOnlyPassword,
  PASSWORD_DIGITS_ERROR_AR,
} from "@/src/utils/password";
import {
  isKuwaitCivilId,
  KUWAIT_CIVIL_ID_ERROR_AR,
  KUWAIT_CIVIL_ID_LABEL_AR,
  KUWAIT_CIVIL_ID_LENGTH,
  normalizeIdNumber,
} from "@/src/utils/idNumber";
import { TRACK_LABELS, type ClassTrack } from "@/src/types/classOffer";

const ENROLLMENT_TRACK_OPTIONS: Array<{ id: ClassTrack; label: string }> = [
  { id: "mutor", label: TRACK_LABELS.mutor },
  { id: "courses", label: TRACK_LABELS.courses },
];

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s/g, "");
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("ar-KW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDobForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type FieldErrors = {
  fullName?: string;
  idNumber?: string;
  gender?: string;
  nationalityId?: string;
  dob?: string;
  academicLevelId?: string;
  phone?: string;
  password?: string;
  track?: string;
  centerId?: string;
  memorizationLevelId?: string;
};

function validateForm(values: {
  fullName: string;
  idNumber: string;
  gender: StudentGender | null;
  nationalityId: string | null;
  dob: Date | null;
  academicLevelId: string | null;
  phone: string;
  password: string;
  track: ClassTrack | null;
  centerId: string | null;
  memorizationLevelId: string | null;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "أدخل الاسم الكامل";
  } else if (values.fullName.trim().length < 3) {
    errors.fullName = "الاسم قصير جداً";
  }

  const normalizedId = normalizeIdNumber(values.idNumber);
  if (!normalizedId) {
    errors.idNumber = `أدخل ${KUWAIT_CIVIL_ID_LABEL_AR}`;
  } else if (!isKuwaitCivilId(normalizedId)) {
    errors.idNumber = KUWAIT_CIVIL_ID_ERROR_AR;
  }

  if (!values.gender) {
    errors.gender = "اختاري الجنس";
  }

  if (!values.nationalityId) {
    errors.nationalityId = "اختر الجنسية";
  }

  if (!values.dob) {
    errors.dob = "اختر تاريخ الميلاد";
  }

  if (!values.academicLevelId) {
    errors.academicLevelId = "اختر المستوى الدراسي";
  }

  const normalizedPhone = normalizePhone(values.phone);
  if (!normalizedPhone) {
    errors.phone = "أدخل رقم الهاتف";
  } else if (!/^\d{10}$/.test(normalizedPhone)) {
    errors.phone = "رقم الهاتف يجب أن يكون 10 أرقام";
  }

  if (!values.password) {
    errors.password = "أدخل كلمة المرور";
  } else if (!isDigitsOnlyPassword(values.password)) {
    errors.password = PASSWORD_DIGITS_ERROR_AR;
  }

  if (!values.track) {
    errors.track = "اختاري مسار الانضمام";
  }

  if (!values.centerId) {
    errors.centerId = "اختر المركز";
  }

  if (!values.memorizationLevelId) {
    errors.memorizationLevelId = "اختر مستوى الحفظ";
  }

  return errors;
}

export default function RegisterStudentScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationalityId, setNationalityId] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [academicLevelId, setAcademicLevelId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [track, setTrack] = useState<ClassTrack | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [gender, setGender] = useState<StudentGender | null>(null);
  const [memorizationLevelId, setMemorizationLevelId] = useState<string | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const centersQuery = useQuery({
    queryKey: ["public-centers", gender],
    queryFn: () => fetchPublicCenters(gender ?? "all"),
    enabled: Boolean(gender),
  });

  const levelsQuery = useQuery({
    queryKey: ["center-levels", centerId],
    queryFn: () => fetchLevelsByCenter(centerId!),
    enabled: Boolean(centerId),
  });

  const centerOptions = useMemo(
    () =>
      (centersQuery.data ?? []).map((center) => ({
        id: center.id,
        label: center.nameAr,
      })),
    [centersQuery.data]
  );

  const selectedCenter = useMemo(
    () => (centersQuery.data ?? []).find((center) => center.id === centerId) ?? null,
    [centersQuery.data, centerId]
  );

  const memorizationLevelOptions = useMemo(
    () =>
      (levelsQuery.data ?? []).map((level) => ({
        id: level.id,
        label: level.shortName || level.fullName,
      })),
    [levelsQuery.data]
  );

  const submitMutation = useMutation({
    mutationFn: submitRegistrationRequest,
    onSuccess: (data) => {
      Alert.alert(
        "تم إرسال الطلب",
        data.message ||
          "تم إرسال طلبك بنجاح — بانتظار موافقة المركز.\nسيتم تفعيل حسابك بعد الموافقة.",
        [
          {
            text: "العودة لتسجيل الدخول",
            onPress: () => router.replace("/(auth)/login" as Href),
          },
        ]
      );
    },
    onError: (err: Error) => {
      setFormError(err.message ?? "فشل إرسال الطلب");
    },
  });

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (formError) setFormError(null);
  };

  const handleCenterSelect = (nextCenterId: string) => {
    setCenterId(nextCenterId);
    setMemorizationLevelId(null);
    clearFieldError("centerId");
    clearFieldError("memorizationLevelId");
  };

  const handleGenderSelect = (next: StudentGender) => {
    setGender(next);
    setCenterId(null);
    setMemorizationLevelId(null);
    clearFieldError("gender");
    clearFieldError("centerId");
    clearFieldError("memorizationLevelId");
  };

  const handleDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDobPicker(false);
    }
    if (event.type === "dismissed") {
      setShowDobPicker(false);
      return;
    }
    if (selectedDate) {
      setDob(selectedDate);
      clearFieldError("dob");
    }
  };

  const handleSubmit = () => {
    const errors = validateForm({
      fullName,
      idNumber,
      gender,
      nationalityId,
      dob,
      academicLevelId,
      phone,
      password,
      track,
      centerId,
      memorizationLevelId,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("راجعي الحقول المطلوبة");
      return;
    }

    if (
      !dob ||
      !gender ||
      !nationalityId ||
      !academicLevelId ||
      !track ||
      !centerId ||
      !memorizationLevelId
    ) {
      return;
    }

    setFieldErrors({});
    setFormError(null);

    submitMutation.mutate({
      fullName: fullName.trim(),
      idNumber: normalizeIdNumber(idNumber),
      gender,
      nationality: nationalityId,
      academicLevel: academicLevelId,
      track,
      phone: normalizePhone(phone),
      password,
      dob: formatDobForApi(dob),
      centerId,
      requestedLevelId: memorizationLevelId,
    });
  };

  const centersLoading = centersQuery.isLoading;
  const levelsLoading = Boolean(centerId) && levelsQuery.isLoading;
  const centersLoadError =
    centersQuery.isError && !centersQuery.isFetching
      ? "تعذر تحميل المراكز"
      : null;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="رجوع"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="arrow-right"
              size={24}
              color={colors.text}
            />
          </Pressable>
          <Text style={styles.headerTitle}>تسجيل طالبة</Text>
          <View style={styles.headerDots}>
            <View style={[styles.dot, styles.dotGreen]} />
            <View style={[styles.dot, styles.dotYellow]} />
            <View style={[styles.dot, styles.dotRed]} />
          </View>
        </View>

        <View style={styles.logoBox}>
          <MaterialCommunityIcons
            name="account-school-outline"
            size={48}
            color={colors.primary}
          />
        </View>
        <Text style={styles.logoTitle}>انضمام طالبة</Text>
        <Text style={styles.logoSubtitle}>تقديم طلب انضمام لمركز قرآني</Text>

        <View style={styles.infoBanner}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.infoBannerText}>
            سيتم مراجعة طلبك من قبل المركز قبل تفعيل الحساب
          </Text>
        </View>

        {centersLoadError ? (
          <Text style={styles.formError}>{centersLoadError}</Text>
        ) : null}
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Input
          label="الاسم الكامل"
          required
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            clearFieldError("fullName");
          }}
          placeholder="نورة العتيبي"
          accessibilityLabel="الاسم الكامل"
          error={fieldErrors.fullName}
        />

        <Input
          label={KUWAIT_CIVIL_ID_LABEL_AR}
          required
          value={idNumber}
          onChangeText={(text) => {
            setIdNumber(filterDigitsOnly(text).slice(0, KUWAIT_CIVIL_ID_LENGTH));
            clearFieldError("idNumber");
          }}
          placeholder="12 رقماً"
          keyboardType="number-pad"
          accessibilityLabel={KUWAIT_CIVIL_ID_LABEL_AR}
          error={fieldErrors.idNumber}
        />

        <SelectField
          label="الجنسية"
          required
          value={nationalityId}
          options={NATIONALITY_OPTIONS}
          onSelect={(id) => {
            setNationalityId(id);
            clearFieldError("nationalityId");
          }}
          placeholder="اختر الجنسية"
          error={fieldErrors.nationalityId}
          accessibilityLabel="الجنسية"
        />

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>تاريخ الميلاد *</Text>
          <Pressable
            style={[
              styles.dateTrigger,
              fieldErrors.dob ? styles.dateTriggerError : null,
            ]}
            onPress={() => setShowDobPicker(true)}
            accessibilityLabel="تاريخ الميلاد"
            accessibilityRole="button"
          >
            <Text
              style={[styles.dateTriggerText, !dob && styles.datePlaceholder]}
            >
              {dob ? formatDateLabel(dob) : "اختر تاريخ الميلاد"}
            </Text>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={20}
              color={centerColors.textSecondary}
            />
          </Pressable>
          {fieldErrors.dob ? (
            <Text style={styles.fieldError}>{fieldErrors.dob}</Text>
          ) : null}
          {showDobPicker ? (
            <DateTimePicker
              value={dob ?? new Date(2010, 4, 15)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={handleDobChange}
            />
          ) : null}
          {Platform.OS === "ios" && showDobPicker ? (
            <Pressable
              style={styles.dateDoneButton}
              onPress={() => setShowDobPicker(false)}
            >
              <Text style={styles.dateDoneText}>تم</Text>
            </Pressable>
          ) : null}
        </View>

        <SelectField
          label="المستوى الدراسي"
          required
          value={academicLevelId}
          options={ACADEMIC_LEVEL_OPTIONS}
          onSelect={(id) => {
            setAcademicLevelId(id);
            clearFieldError("academicLevelId");
          }}
          placeholder="اختر المستوى الدراسي"
          error={fieldErrors.academicLevelId}
          accessibilityLabel="المستوى الدراسي"
        />

        <Input
          label="رقم الهاتف"
          required
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            clearFieldError("phone");
          }}
          placeholder="05XXXXXXXX"
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel="رقم الهاتف"
          error={fieldErrors.phone}
        />

        <Input
          label="كلمة المرور"
          required
          value={password}
          onChangeText={(text) => {
            setPassword(filterDigitsOnly(text));
            clearFieldError("password");
          }}
          placeholder="أرقام فقط — 6 على الأقل"
          secureTextEntry
          keyboardType="number-pad"
          autoComplete="new-password"
          accessibilityLabel="كلمة المرور"
          error={fieldErrors.password}
        />

        <Text style={styles.fieldLabel}>مسار الانضمام *</Text>
        <View style={styles.filterRow}>
          {ENROLLMENT_TRACK_OPTIONS.map((option) => {
            const selected = track === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setTrack(option.id);
                  clearFieldError("track");
                }}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`مسار ${option.label}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.track ? (
          <Text style={styles.fieldError}>{fieldErrors.track}</Text>
        ) : null}

        <Text style={styles.fieldLabel}>الجنس *</Text>
        <View style={styles.filterRow}>
          {STUDENT_GENDER_OPTIONS.map((option) => {
            const selected = gender === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => handleGenderSelect(option.id)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`الجنس ${option.label}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.gender ? (
          <Text style={styles.fieldError}>{fieldErrors.gender}</Text>
        ) : null}

        {!gender ? (
          <Text style={styles.centerHint}>اختاري الجنس أولاً لعرض المراكز المناسبة</Text>
        ) : centersLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.inlineLoadingText}>جاري تحميل المراكز...</Text>
          </View>
        ) : (
          <>
            <SelectField
              label="المركز"
              required
              value={centerId}
              options={centerOptions}
              onSelect={handleCenterSelect}
              placeholder={
                centerOptions.length > 0 ? "اختر المركز" : "لا توجد مراكز لهذا الجنس"
              }
              disabled={centerOptions.length === 0}
              error={fieldErrors.centerId}
              accessibilityLabel="المركز"
            />

            {selectedCenter ? (
              <View style={styles.centerAddressCard}>
                <Text style={styles.centerAddressTitle}>
                  {selectedCenter.nameAr}
                  {" · "}
                  {GENDER_AUDIENCE_LABELS[selectedCenter.genderAudience]}
                </Text>
                {selectedCenter.city ? (
                  <Text style={styles.centerAddressCity}>{selectedCenter.city}</Text>
                ) : null}
                {selectedCenter.addressText ? (
                  <Text style={styles.centerAddressText}>
                    {selectedCenter.addressText}
                  </Text>
                ) : (
                  <Text style={styles.centerAddressMuted}>لا يوجد عنوان مسجّل بعد</Text>
                )}
                {hasCenterLocation(selectedCenter) ? (
                  <Pressable
                    onPress={() =>
                      openCenterInMaps({
                        addressText: selectedCenter.addressText,
                        city: selectedCenter.city,
                        nameAr: selectedCenter.nameAr,
                      })
                    }
                    style={styles.mapsButton}
                    accessibilityRole="link"
                    accessibilityLabel="افتح موقع المركز في الخرائط"
                  >
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.mapsButtonText}>افتح في الخرائط</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {levelsLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.inlineLoadingText}>جاري تحميل المستويات...</Text>
          </View>
        ) : (
          <SelectField
            label="مستوى الحفظ"
            required
            value={memorizationLevelId}
            options={memorizationLevelOptions}
            onSelect={(id) => {
              setMemorizationLevelId(id);
              clearFieldError("memorizationLevelId");
            }}
            placeholder={
              !centerId
                ? "اختر المركز أولاً"
                : memorizationLevelOptions.length > 0
                  ? "اختر مستوى الحفظ"
                  : "لا توجد مستويات لهذا المركز"
            }
            disabled={!centerId || memorizationLevelOptions.length === 0}
            error={fieldErrors.memorizationLevelId}
            accessibilityLabel="مستوى الحفظ"
          />
        )}

        <View style={styles.buttonWrapper}>
          <Button
            onPress={handleSubmit}
            loading={submitMutation.isPending}
            disabled={submitMutation.isPending || centersLoading}
            accessibilityLabel="إرسال الطلب"
          >
            إرسال الطلب
          </Button>
        </View>

        <Pressable
          onPress={() => router.replace("/(auth)/login" as Href)}
          style={styles.loginLink}
          accessibilityLabel="الانتقال إلى تسجيل الدخول"
          accessibilityRole="link"
        >
          <Text style={styles.loginLinkText}>لديك حساب؟ سجّل دخول</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
    marginStart: -spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  headerDots: { flexDirection: "row", gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotGreen: { backgroundColor: centerColors.cardBorder },
  dotYellow: { backgroundColor: centerColors.cardBorder },
  dotRed: { backgroundColor: centerColors.cardBorder },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: centerColors.surfaceMuted,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  logoSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: centerColors.surfaceMuted,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 20,
  },
  formError: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inlineLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginBottom: spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: centerColors.surfaceMuted,
  },
  filterChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  filterChipTextSelected: {
    color: "#fff",
  },
  centerHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.md,
  },
  centerAddressCard: {
    backgroundColor: centerColors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  centerAddressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  centerAddressCity: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "right",
  },
  centerAddressText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 20,
  },
  centerAddressMuted: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    backgroundColor: colors.background,
  },
  dateTriggerError: {
    borderColor: colors.error,
  },
  dateTriggerText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
  },
  datePlaceholder: {
    color: colors.textSecondary,
  },
  fieldError: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.error,
    textAlign: "right",
  },
  dateDoneButton: {
    alignSelf: "flex-end",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  dateDoneText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonWrapper: { marginTop: spacing.sm },
  loginLink: {
    marginTop: spacing.xl,
    alignSelf: "center",
    padding: spacing.sm,
  },
  loginLinkText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "500",
  },
});
