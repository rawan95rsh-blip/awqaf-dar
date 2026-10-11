import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { space } from "@/src/theme";
import { Banner, Button, Header, PhoneField, Screen, Segmented, Text, TextField } from "@/src/ui";
import BrandMark from "@/src/components/BrandMark";
import { login } from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import { CIVIL_ID_LENGTH, validateCivilId } from "@/src/constants/domain";
import { DEFAULT_COUNTRY, toLatinDigits, validatePhone } from "@/src/constants/phone";

type Method = "phone" | "civil";

/**
 * تسجيل الدخول — تبويبان منفصلان:
 * رقم الهاتف (مع مفتاح الدولة، الكويت 8 أرقام) أو الرقم المدني (12 رقماً)
 */
export default function LoginScreen() {
  const router = useRouter();
  const { login: saveSession } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [method, setMethod] = useState<Method>("phone");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [civilId, setCivilId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; civil?: string; password?: string }>({});

  const mutation = useMutation({
    mutationFn: () =>
      login(
        method === "phone"
          ? { phone: toLatinDigits(phone), countryCode: country.dialCode, password }
          : { idNumber: civilId, password }
      ),
    onSuccess: ({ token, user }) => {
      saveSession(token, user, () => {
        router.replace((user.role === "student" ? "/student" : "/main") as Href);
      });
    },
  });

  const submit = () => {
    const next: typeof errors = {};
    if (method === "phone") {
      const e = validatePhone(phone, country);
      if (e) next.phone = e;
    } else {
      const e = validateCivilId(civilId);
      if (e) next.civil = e;
    }
    if (!password) next.password = "أدخلي كلمة المرور";
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate();
  };

  return (
    <Screen
      header={<Header back={"/(auth)/welcome" as Href} />}
      footer={
        <View style={styles.footer}>
          <Button size="lg" fullWidth loading={mutation.isPending} onPress={submit}>
            تسجيل الدخول
          </Button>
          <Button variant="ghost" fullWidth onPress={() => router.push("/(auth)/register-student" as Href)}>
            ليس لديكِ حساب؟ سجّلي الآن
          </Button>
        </View>
      }
    >
      <View style={styles.hero}>
        <BrandMark size={56} />
        <Text variant="title" align="center">
          أهلاً بعودتكِ
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          سجّلي الدخول للمتابعة — للطالبات وإدارات المراكز
        </Text>
      </View>

      <View style={styles.form}>
        <Segmented<Method>
          options={[
            { id: "phone", label: "رقم الهاتف", icon: "phone-outline" },
            { id: "civil", label: "الرقم المدني", icon: "card-account-details-outline" },
          ]}
          value={method}
          onChange={(m) => {
            setMethod(m);
            setErrors({});
            mutation.reset();
          }}
        />

        {mutation.isError ? (
          <Banner tone="danger">{(mutation.error as Error).message}</Banner>
        ) : null}

        {method === "phone" ? (
          <PhoneField
            country={country}
            onCountryChange={setCountry}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
            }}
            error={errors.phone}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        ) : (
          <TextField
            label="الرقم المدني"
            value={civilId}
            onChangeText={(v) => {
              setCivilId(toLatinDigits(v).slice(0, CIVIL_ID_LENGTH));
              if (errors.civil) setErrors((p) => ({ ...p, civil: undefined }));
            }}
            keyboardType="number-pad"
            placeholder="12 رقماً"
            maxLength={CIVIL_ID_LENGTH}
            icon="card-account-details-outline"
            ltr
            hint="للطالبات فقط"
            error={errors.civil}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}

        <TextField
          ref={passwordRef}
          label="كلمة المرور"
          value={password}
          onChangeText={(v) => {
            setPassword(toLatinDigits(v));
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          secureTextEntry
          keyboardType="number-pad"
          textContentType="password"
          autoComplete="password"
          icon="lock-outline"
          error={errors.password}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Text variant="caption" color="textMuted">
          نسيتِ كلمة المرور؟ تواصلي مع إدارة مركزكِ لإعادة تعيينها.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space[2], marginTop: space[4], marginBottom: space[8] },
  form: { gap: space[5] },
  footer: { gap: space[1] },
});
