import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  I18nManager,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";
import Button from "@/src/components/Button";
import {
  fetchCenterProfile,
  fetchGradeWeights,
  settingsQueryKeys,
  updateCenterProfile,
  updateGradeWeights,
} from "@/src/api/settings";
import { GRADE_WEIGHTS, type GradeWeights } from "@/src/constants/grades";
import {
  GENDER_AUDIENCE_OPTIONS,
  type GenderAudience,
} from "@/src/constants/genderAudience";
import { hasCenterLocation, openCenterInMaps } from "@/src/utils/maps";

const WEIGHT_FIELDS: Array<{ key: keyof GradeWeights; label: string }> = [
  { key: "attendance", label: "الحضور" },
  { key: "shortExam", label: "اختبار قصير" },
  { key: "participation", label: "المشاركة" },
  { key: "final", label: "النهائي" },
];

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<GradeWeights>({ ...GRADE_WEIGHTS });
  const [addressText, setAddressText] = useState("");
  const [city, setCity] = useState("");
  const [genderAudience, setGenderAudience] = useState<GenderAudience>("female");

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErr,
  } = useQuery({
    queryKey: settingsQueryKeys.centerProfile,
    queryFn: fetchCenterProfile,
  });

  const {
    data: gradeData,
    isLoading: weightsLoading,
    isError: weightsError,
    error: weightsErr,
  } = useQuery({
    queryKey: settingsQueryKeys.gradeWeights,
    queryFn: fetchGradeWeights,
  });

  useEffect(() => {
    if (profile) {
      setAddressText(profile.addressText ?? "");
      setCity(profile.city ?? "");
      setGenderAudience(profile.genderAudience ?? "female");
    }
  }, [profile]);

  useEffect(() => {
    if (gradeData) setWeights(gradeData);
  }, [gradeData]);

  const total = useMemo(
    () => weights.attendance + weights.shortExam + weights.participation + weights.final,
    [weights]
  );

  const profileMutation = useMutation({
    mutationFn: updateCenterProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.centerProfile });
      Alert.alert("تم الحفظ", "تم حفظ بيانات المركز بنجاح");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const saveMutation = useMutation({
    mutationFn: updateGradeWeights,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.gradeWeights });
      Alert.alert("تم الحفظ", "تم حفظ أوزان الدرجات بنجاح");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const handleSaveAddress = () => {
    profileMutation.mutate({
      addressText: addressText.trim(),
      city: city.trim(),
      genderAudience,
    });
  };

  const handleSave = () => {
    if (total !== 100) {
      Alert.alert("تنبيه", "مجموع الأوزان يجب أن يساوي 100");
      return;
    }
    saveMutation.mutate({
      attendance: Math.round(weights.attendance),
      shortExam: Math.round(weights.shortExam),
      participation: Math.round(weights.participation),
      final: Math.round(weights.final),
    });
  };

  const updateWeight = (key: keyof GradeWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: Math.round(value) }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <DrawerTrigger />
        </View>

        <Text style={styles.title}>الإعدادات</Text>
        {profile?.nameAr ? (
          <Text style={styles.centerName}>{profile.nameAr}</Text>
        ) : null}

        <Text style={styles.sectionTitle}>بيانات المركز</Text>
        <Text style={styles.subtitle}>
          العنوان ونوع المركز يظهران للطالبات عند التسجيل
        </Text>

        {profileLoading ? (
          <ActivityIndicator color={centerColors.accent} style={styles.loader} />
        ) : profileError ? (
          <Text style={styles.errorText}>
            {profileErr instanceof Error ? profileErr.message : "تعذر تحميل البيانات"}
          </Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>نوع المركز</Text>
            <View style={styles.chipRow}>
              {GENDER_AUDIENCE_OPTIONS.map((option) => {
                const selected = genderAudience === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setGenderAudience(option.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`نوع المركز ${option.label}`}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>المدينة</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              textAlign="right"
              placeholder="مثال: الرياض"
              placeholderTextColor={centerColors.textSecondary}
              accessibilityLabel="مدينة المركز"
            />
            <Text style={styles.label}>العنوان</Text>
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={addressText}
              onChangeText={setAddressText}
              textAlign="right"
              multiline
              placeholder="الحي، الشارع، أقرب معلم"
              placeholderTextColor={centerColors.textSecondary}
              accessibilityLabel="عنوان المركز"
            />
            {hasCenterLocation({ addressText, city }) ? (
              <Pressable
                onPress={() =>
                  openCenterInMaps({
                    addressText,
                    city,
                    nameAr: profile?.nameAr,
                  })
                }
                style={styles.mapsButton}
                accessibilityRole="link"
                accessibilityLabel="افتح موقع المركز في الخرائط"
              >
                <Text style={styles.mapsButtonText}>معاينة في الخرائط</Text>
              </Pressable>
            ) : null}
            <Button
              onPress={handleSaveAddress}
              loading={profileMutation.isPending}
              accessibilityLabel="حفظ بيانات المركز"
            >
              حفظ بيانات المركز
            </Button>
          </View>
        )}

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
          أوزان الدرجات (المجموع = 100)
        </Text>

        {weightsLoading ? (
          <ActivityIndicator color={centerColors.accent} style={styles.loader} />
        ) : weightsError ? (
          <Text style={styles.errorText}>
            {weightsErr instanceof Error ? weightsErr.message : "تعذر تحميل الأوزان"}
          </Text>
        ) : (
          <View style={styles.card}>
            {WEIGHT_FIELDS.map((field) => (
              <View key={field.key} style={styles.sliderRow}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderValue}>{Math.round(weights[field.key])}</Text>
                  <Text style={styles.sliderLabel}>{field.label}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={100}
                  step={1}
                  value={weights[field.key]}
                  onValueChange={(value) => updateWeight(field.key, value)}
                  minimumTrackTintColor={centerColors.accent}
                  maximumTrackTintColor={centerColors.cardBorder}
                  thumbTintColor={centerColors.primaryButton}
                />
              </View>
            ))}

            <Text
              style={[
                styles.totalText,
                total === 100 ? styles.totalOk : styles.totalBad,
              ]}
            >
              المجموع: {total} / 100
            </Text>

            <Button
              onPress={handleSave}
              loading={saveMutation.isPending}
              disabled={total !== 100}
              accessibilityLabel="حفظ أوزان الدرجات"
            >
              حفظ الأوزان
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  centerName: {
    fontSize: 15,
    fontWeight: "600",
    color: centerColors.accent,
    marginBottom: spacing.lg,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: 13,
    color: centerColors.textSecondary,
    marginBottom: spacing.md,
    textAlign: "right",
  },
  loader: { marginVertical: spacing.xl },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
  },
  card: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.text,
    textAlign: "right",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  chip: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: centerColors.background,
  },
  chipSelected: {
    borderColor: centerColors.accent,
    backgroundColor: centerColors.accent,
  },
  chipText: {
    fontSize: 14,
    color: centerColors.text,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: centerColors.text,
    backgroundColor: centerColors.background,
    minHeight: 44,
  },
  addressInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  mapsButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: centerColors.accent,
  },
  sliderRow: { gap: spacing.xs },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: centerColors.text,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.accent,
  },
  slider: {
    width: "100%",
    height: 36,
  },
  totalText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: spacing.sm,
  },
  totalOk: { color: centerColors.accentGreen },
  totalBad: { color: centerColors.accentRed },
});
