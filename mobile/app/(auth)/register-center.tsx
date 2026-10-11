import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { space } from "@/src/theme";
import {
  Banner,
  Button,
  Card,
  ChoiceChips,
  Header,
  PhoneField,
  Screen,
  Section,
  Text,
  TextField,
  type ChoiceOption,
} from "@/src/ui";
import BrandMark from "@/src/components/BrandMark";
import { registerCenter, setPendingRegistrationPhone } from "@/src/api/auth";
import { PASSWORD_HINT, validatePassword } from "@/src/constants/domain";
import { DEFAULT_COUNTRY, toInternational, toLatinDigits, validatePhone } from "@/src/constants/phone";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** تخصصات المركز — مطابقة للخادم (VALID_SPECIALIZATIONS) */
type Specialization = "mutor" | "dawa" | "atruja" | "courses" | "siraj";

const SPECIALIZATIONS: Array<ChoiceOption<Specialization> & { icon: IconName }> = [
  { id: "mutor", label: "مطور", icon: "book-open-variant" },
  { id: "dawa", label: "دعوة", icon: "send-outline" },
  { id: "atruja", label: "أترجة", icon: "star-four-points-outline" },
  { id: "courses", label: "دورات", icon: "certificate-outline" },
  { id: "siraj", label: "سراج منير", icon: "white-balance-sunny" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Form = {
  centerName: string;
  supervisorName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  specializations: Specialization[];
};

type Errors = Partial<Record<keyof Form, string>>;

const INITIAL: Form = {
  centerName: "",
  supervisorName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  specializations: [],
};

function validate(form: Form, phoneError: string | null): Errors {
  const e: Errors = {};
  if (form.centerName.trim().length < 3) e.centerName = "اكتبي اسم المركز";
  if (form.supervisorName.trim().length < 3) e.supervisorName = "اكتبي اسم المشرفة";
  if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) e.email = "البريد الإلكتروني غير صالح";
  if (phoneError) e.phone = phoneError;
  const pass = validatePassword(form.password);
  if (pass) e.password = pass;
  else if (form.password !== form.confirmPassword) e.confirmPassword = "كلمتا المرور غير متطابقتين";
  if (form.specializations.length === 0) e.specializations = "اختاري تخصصاً واحداً على الأقل";
  return e;
}

/** تسجيل مركز جديد ← رمز تحقق برسالة نصية */
export default function RegisterCenterScreen() {
  const router = useRouter();
  const supervisorRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [form, setForm] = useState<Form>(INITIAL);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      registerCenter({
        centerName: form.centerName.trim(),
        supervisorName: form.supervisorName.trim(),
        email: form.email.trim().toLowerCase() || undefined,
        phone: toLatinDigits(form.phone),
        countryCode: country.dialCode,
        password: form.password,
        specializations: form.specializations,
      }),
    onSuccess: async (data) => {
      const phone = data.phone || toInternational(form.phone, country);
      await setPendingRegistrationPhone(phone).catch(() => undefined);
      router.push({
        pathname: "/(auth)/register-center-verify",
        params: { phone, ...(__DEV__ && data.devCode ? { devCode: data.devCode } : {}) },
      } as Href);
    },
  });

  const submit = () => {
    const next = validate(form, validatePhone(form.phone, country));
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate();
  };

  return (
    <Screen
      header={<Header back={"/(auth)/welcome" as Href} title="تسجيل مركز جديد" />}
      footer={
        <View style={styles.footer}>
          <Button size="lg" fullWidth icon="arrow-left" iconPosition="end" loading={mutation.isPending} onPress={submit}>
            متابعة وإرسال رمز التحقق
          </Button>
          <Button variant="ghost" fullWidth onPress={() => router.replace("/(auth)/login" as Href)}>
            لديكِ حساب؟ تسجيل الدخول
          </Button>
        </View>
      }
    >
      <View style={styles.hero}>
        <BrandMark size={52} />
        <Text variant="title" align="center">
          أنشئي حساب مركزكِ
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          أديري الطالبات والفصول والحضور والدرجات من مكان واحد.
        </Text>
      </View>

      {mutation.isError ? (
        <Banner tone="danger" title="تعذّر إنشاء الحساب">
          {mutation.error.message}
        </Banner>
      ) : null}

      <Section title="بيانات المركز">
        <Card padding={4} style={styles.card}>
          <TextField
            label="اسم المركز"
            required
            value={form.centerName}
            onChangeText={(v) => set("centerName", v)}
            placeholder="مثال: دار النور لتحفيظ القرآن"
            icon="domain"
            returnKeyType="next"
            onSubmitEditing={() => supervisorRef.current?.focus()}
            error={errors.centerName}
          />
          <TextField
            ref={supervisorRef}
            label="اسم المشرفة"
            required
            value={form.supervisorName}
            onChangeText={(v) => set("supervisorName", v)}
            placeholder="الاسم الكامل"
            icon="account-outline"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errors.supervisorName}
          />
          <ChoiceChips<Specialization>
            label="تخصصات المركز"
            required
            multiple
            options={SPECIALIZATIONS}
            value={form.specializations}
            onChange={(v: Specialization[]) => set("specializations", v)}
            error={errors.specializations}
          />
        </Card>
      </Section>

      <Section title="بيانات الدخول" subtitle="سيصلكِ رمز تحقق على رقم الهاتف لتفعيل الحساب">
        <Card padding={4} style={styles.card}>
          <PhoneField
            required
            country={country}
            onCountryChange={setCountry}
            value={form.phone}
            onChangeText={(v) => set("phone", v)}
            error={errors.phone}
            hint="يُستخدم لتسجيل الدخول"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={emailRef}
            label="البريد الإلكتروني"
            value={form.email}
            onChangeText={(v) => set("email", v)}
            placeholder="center@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            icon="email-outline"
            ltr
            hint="اختياري"
            error={errors.email}
          />
          <TextField
            ref={passwordRef}
            label="كلمة المرور"
            required
            value={form.password}
            onChangeText={(v) => set("password", toLatinDigits(v))}
            secureTextEntry
            keyboardType="number-pad"
            textContentType="newPassword"
            autoComplete="new-password"
            icon="lock-outline"
            hint={PASSWORD_HINT}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.password}
          />
          <TextField
            ref={confirmRef}
            label="تأكيد كلمة المرور"
            required
            value={form.confirmPassword}
            onChangeText={(v) => set("confirmPassword", toLatinDigits(v))}
            secureTextEntry
            keyboardType="number-pad"
            icon="lock-check-outline"
            returnKeyType="done"
            onSubmitEditing={submit}
            error={errors.confirmPassword}
          />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space[2], marginTop: space[2], marginBottom: space[4] },
  card: { gap: space[4] },
  footer: { gap: space[1] },
});
