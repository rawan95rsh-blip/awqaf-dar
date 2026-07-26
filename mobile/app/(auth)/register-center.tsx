import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "@/src/components/ScreenContainer";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { colors, spacing, centerColors } from "@/constants";
import {
  filterDigitsOnly,
  isDigitsOnlyPassword,
  PASSWORD_DIGITS_ERROR_AR,
} from "@/src/utils/password";
import {
  registerCenterApi,
  setPendingRegistrationPhone,
  type RegisterCenterRequest,
} from "@/src/api/auth";

const SPECIALIZATIONS = [
  {
    id: "mutor",
    title: "مطور",
    subtitle: "برنامج تطوير الحفظ",
    icon: "book-open-variant" as const,
  },
  {
    id: "dawa",
    title: "دعوة",
    subtitle: "برنامج الدعوة",
    icon: "send" as const,
  },
  {
    id: "atruja",
    title: "أترجة",
    subtitle: "برنامج الأترجة",
    icon: "star-four-points-outline" as const,
  },
  {
    id: "courses",
    title: "دورات",
    subtitle: "الدورات التدريبية",
    icon: "book-multiple" as const,
  },
  {
    id: "siraj",
    title: "سراج منير",
    subtitle: "برنامج سراج منير",
    icon: "white-balance-sunny" as const,
  },
];

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s/g, "");
}

function validateForm(
  email: string,
  phone: string,
  centerName: string,
  supervisorName: string,
  password: string,
  selectedSpecs: Set<string>
): string | null {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return "أدخل البريد الإلكتروني";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return "البريد الإلكتروني غير صالح";
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return "أدخل رقم الهاتف";
  if (!/^\d{10}$/.test(normalizedPhone)) {
    return "رقم الهاتف يجب أن يكون 10 أرقام";
  }

  if (!centerName.trim()) return "أدخل اسم المركز";
  if (!supervisorName.trim()) return "أدخل اسم مشرفة المركز";
  if (!password) return "أدخل الرقم السري";
  if (!isDigitsOnlyPassword(password)) return PASSWORD_DIGITS_ERROR_AR;
  if (selectedSpecs.size === 0) return "اختر تخصصاً واحداً على الأقل";

  return null;
}

export default function RegisterCenterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [centerName, setCenterName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  const toggleSpec = (id: string) => {
    setSelectedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (error) setError(null);
  };

  const mutation = useMutation({
    mutationFn: (payload: RegisterCenterRequest) =>
      new Promise<import("@/src/api/auth").RegisterCenterResponse>(
        (resolve, reject) => {
          registerCenterApi(payload, resolve, reject);
        }
      ),
    onSuccess: (data) => {
      setError(null);
      if (data.devCode) {
        setDevCodeHint(data.devCode);
        if (__DEV__) {
          Alert.alert("كود التطوير", data.devCode);
        }
      }
      setPendingRegistrationPhone(data.phone, () => {
        router.push({
          pathname: "/(auth)/register-center-verify",
          params: { phone: data.phone },
        } as Href);
      });
    },
    onError: (err: Error) => {
      setError(err.message ?? "فشل إنشاء الحساب");
    },
  });

  const handleContinue = () => {
    setError(null);
    setDevCodeHint(null);

    const validationError = validateForm(
      email,
      phone,
      centerName,
      supervisorName,
      password,
      selectedSpecs
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    mutation.mutate({
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone),
      password,
      centerName: centerName.trim(),
      supervisorName: supervisorName.trim(),
      specializations: Array.from(selectedSpecs),
    });
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>إنشاء حساب مركز جديد</Text>
          <View style={styles.headerDots}>
            <View style={[styles.dot, styles.dotGreen]} />
            <View style={[styles.dot, styles.dotYellow]} />
            <View style={[styles.dot, styles.dotRed]} />
          </View>
        </View>

        <View style={styles.logoBox}>
          <MaterialCommunityIcons
            name="diamond-stone"
            size={48}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.logoTitle}>مطور</Text>
        <Text style={styles.logoSubtitle}>منصة إدارة مراكز القرآن</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Input
          label="البريد الإلكتروني"
          required
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          placeholder="example@center.com"
          keyboardType="email-address"
          autoComplete="email"
          accessibilityLabel="البريد الإلكتروني"
        />
        <Input
          label="رقم الهاتف"
          required
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (error) setError(null);
          }}
          placeholder="05XXXXXXXX"
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel="رقم الهاتف"
        />
        <Input
          label="اسم المركز"
          required
          value={centerName}
          onChangeText={(text) => {
            setCenterName(text);
            if (error) setError(null);
          }}
          placeholder="مركز النور"
          accessibilityLabel="اسم المركز"
        />
        <Input
          label="اسم مشرفة المركز"
          required
          value={supervisorName}
          onChangeText={(text) => {
            setSupervisorName(text);
            if (error) setError(null);
          }}
          placeholder="أ. فاطمة الأحمد"
          accessibilityLabel="اسم مشرفة المركز"
        />
        <Input
          label="الرقم السري"
          required
          value={password}
          onChangeText={(text) => {
            setPassword(filterDigitsOnly(text));
            if (error) setError(null);
          }}
          placeholder="أرقام فقط — 6 على الأقل"
          secureTextEntry
          keyboardType="number-pad"
          autoComplete="new-password"
          accessibilityLabel="الرقم السري"
        />

        <Text style={styles.specTitle}>
          المركز متخصص بـ * (اختيار واحد أو أكثر)
        </Text>
        <View style={styles.specGrid}>
          {SPECIALIZATIONS.map((spec) => (
            <Pressable
              key={spec.id}
              style={[
                styles.specCard,
                selectedSpecs.has(spec.id) && styles.specCardSelected,
              ]}
              onPress={() => toggleSpec(spec.id)}
            >
              <MaterialCommunityIcons
                name={spec.icon}
                size={28}
                color={
                  selectedSpecs.has(spec.id)
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.specCardTitle,
                  selectedSpecs.has(spec.id) && styles.specCardTitleSelected,
                ]}
              >
                {spec.title}
              </Text>
              <Text style={styles.specCardSubtitle}>{spec.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {devCodeHint ? (
          <Text style={styles.devCodeHint}>كود التطوير: {devCodeHint}</Text>
        ) : null}

        <View style={styles.buttonWrapper}>
          <Button
            onPress={handleContinue}
            loading={mutation.isPending}
            accessibilityLabel="متابعة"
          >
            متابعة
          </Button>
        </View>
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
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
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
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  specTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  specCard: {
    width: "47%",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  specCardSelected: {
    borderColor: colors.primary,
    backgroundColor: centerColors.surfaceMuted,
  },
  specCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.xs,
  },
  specCardTitleSelected: { color: colors.primary },
  specCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  devCodeHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  buttonWrapper: { marginTop: spacing.sm },
});
