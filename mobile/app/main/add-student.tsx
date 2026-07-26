import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { centerColors, spacing } from "@/constants";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import SelectField from "@/src/components/SelectField";
import { useAuth } from "@/src/context/AuthContext";
import { createStudent, studentQueryKeys } from "@/src/api/students";
import { fetchLevelsByCenter } from "@/src/api/levels";
import {
  ACADEMIC_LEVEL_OPTIONS,
  NATIONALITY_OPTIONS,
} from "@/src/constants/registrationOptions";
import {
  STUDENT_GENDER_OPTIONS,
  type StudentGender,
} from "@/src/constants/genderAudience";
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
} from "@/src/utils/idNumber";
import { TRACK_LABELS, type ClassTrack } from "@/src/types/classOffer";

const TRACK_OPTIONS: Array<{ id: ClassTrack; label: string }> = [
  { id: "mutor", label: TRACK_LABELS.mutor },
  { id: "courses", label: TRACK_LABELS.courses },
];

function formatDobForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function AddStudentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id;

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState<StudentGender>("female");
  const [nationalityId, setNationalityId] = useState<string | null>("KW");
  const [academicLevelId, setAcademicLevelId] = useState<string | null>("high");
  const [track, setTrack] = useState<ClassTrack>("mutor");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState<Date>(() => new Date(2010, 4, 15));
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const levelsQuery = useQuery({
    queryKey: ["levels", centerId],
    queryFn: () => fetchLevelsByCenter(centerId!),
    enabled: !!centerId,
  });

  const levels = levelsQuery.data ?? [];
  const preparatory = useMemo(
    () =>
      levels.find((l) => l.order === 0 || l.shortName?.includes("تمهيدي")) ??
      levels[0],
    [levels]
  );

  useEffect(() => {
    if (levelId || !preparatory) return;
    setLevelId(preparatory.id);
  }, [preparatory, levelId]);

  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentQueryKeys.list({}) });
      Alert.alert("تم", "تم إنشاء الطالبة بنجاح", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (!fullName.trim() || fullName.trim().length < 3) {
      setError("أدخل الاسم الكامل");
      return;
    }
    const id = filterDigitsOnly(idNumber);
    if (!isKuwaitCivilId(id)) {
      setError(KUWAIT_CIVIL_ID_ERROR_AR);
      return;
    }
    const phoneNorm = filterDigitsOnly(phone);
    if (!/^\d{10}$/.test(phoneNorm)) {
      setError("رقم الهاتف يجب أن يكون 10 أرقام");
      return;
    }
    if (!isDigitsOnlyPassword(password)) {
      setError(PASSWORD_DIGITS_ERROR_AR);
      return;
    }
    if (!nationalityId || !academicLevelId) {
      setError("أكملي الجنسية والمستوى الدراسي");
      return;
    }

    mutation.mutate({
      fullName: fullName.trim(),
      idNumber: id,
      gender,
      nationality: nationalityId,
      academicLevel: academicLevelId,
      track,
      phone: phoneNorm,
      password,
      dob: formatDobForApi(dob),
      levelId: levelId ?? undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} accessibilityLabel="رجوع">
            <MaterialCommunityIcons
              name="arrow-right"
              size={24}
              color={centerColors.text}
            />
          </Pressable>
          <Text style={styles.title}>إضافة طالبة</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.hint}>
          المستوى الافتراضي: التمهيدي إن وُجد في المركز
        </Text>

        <Input
          label="الاسم الكامل"
          required
          value={fullName}
          onChangeText={setFullName}
          accessibilityLabel="الاسم الكامل"
        />
        <Input
          label={KUWAIT_CIVIL_ID_LABEL_AR}
          required
          value={idNumber}
          onChangeText={(t) =>
            setIdNumber(filterDigitsOnly(t).slice(0, KUWAIT_CIVIL_ID_LENGTH))
          }
          keyboardType="number-pad"
          placeholder="12 رقماً"
          accessibilityLabel={KUWAIT_CIVIL_ID_LABEL_AR}
        />
        <Input
          label="رقم الهاتف"
          required
          value={phone}
          onChangeText={(t) => setPhone(filterDigitsOnly(t).slice(0, 10))}
          keyboardType="phone-pad"
          accessibilityLabel="رقم الهاتف"
        />
        <Input
          label="كلمة المرور"
          required
          value={password}
          onChangeText={(t) => setPassword(filterDigitsOnly(t))}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="أرقام فقط — 6 على الأقل"
          accessibilityLabel="كلمة المرور"
        />

        <SelectField
          label="الجنسية"
          required
          options={NATIONALITY_OPTIONS}
          value={nationalityId}
          onSelect={setNationalityId}
          accessibilityLabel="الجنسية"
        />
        <SelectField
          label="المستوى الدراسي"
          required
          options={ACADEMIC_LEVEL_OPTIONS}
          value={academicLevelId}
          onSelect={setAcademicLevelId}
          accessibilityLabel="المستوى الدراسي"
        />

        <Text style={styles.label}>الجنس</Text>
        <View style={styles.row}>
          {STUDENT_GENDER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setGender(opt.id)}
              style={[styles.chip, gender === opt.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, gender === opt.id && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>المسار</Text>
        <View style={styles.row}>
          {TRACK_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setTrack(opt.id)}
              style={[styles.chip, track === opt.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, track === opt.id && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>تاريخ الميلاد</Text>
        <Pressable
          style={styles.dateBtn}
          onPress={() => setShowDobPicker(true)}
        >
          <Text style={styles.dateText}>{formatDobForApi(dob)}</Text>
        </Pressable>
        {showDobPicker ? (
          <DateTimePicker
            value={dob}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_e: DateTimePickerEvent, date?: Date) => {
              if (Platform.OS === "android") setShowDobPicker(false);
              if (date) setDob(date);
            }}
          />
        ) : null}

        {levelsQuery.isLoading ? (
          <ActivityIndicator color={centerColors.accent} />
        ) : (
          <SelectField
            label="المستوى في المركز"
            options={levels.map((l) => ({
              id: l.id,
              label: l.fullName || l.shortName || l.id,
            }))}
            value={levelId}
            onSelect={setLevelId}
            accessibilityLabel="المستوى"
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          accessibilityLabel="حفظ الطالبة"
        >
          حفظ الطالبة
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.sm },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.text,
  },
  hint: {
    fontSize: 13,
    color: centerColors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 13,
    color: centerColors.textSecondary,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
  chip: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipOn: {
    backgroundColor: centerColors.accent,
    borderColor: centerColors.accent,
  },
  chipText: { color: centerColors.text, fontSize: 14 },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  dateBtn: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: centerColors.cardBg,
  },
  dateText: { textAlign: "right", color: centerColors.text, fontSize: 15 },
  error: {
    color: centerColors.accentRed,
    textAlign: "center",
    marginVertical: spacing.sm,
  },
});
