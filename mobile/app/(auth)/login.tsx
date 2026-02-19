import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import ScreenContainer from "@/src/components/ScreenContainer";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { loginApi } from "@/src/api/auth";
import { colors, spacing } from "@/constants";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      new Promise<{ token: string; user: import("@/src/types/auth").User }>(
        (resolve, reject) => {
          loginApi({ phone, password }, resolve, reject);
        },
      ),
    onSuccess: (data) => {
      setError(null);
      login(data.token, data.user, () => {
        router.replace("/main" as Href);
      });
    },
    onError: (err: Error) => {
      setError(err.message ?? "فشل تسجيل الدخول");
    },
  });

  const handleSubmit = () => {
    setError(null);
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError("أدخل رقم الهاتف");
      return;
    }
    if (!password) {
      setError("أدخل كلمة المرور");
      return;
    }
    mutation.mutate();
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (error) setError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) setError(null);
  };

  const handlePressRegister = () => {
    router.push("/(auth)/register-student" as Href);
  };

  const handlePressRegisterCenter = () => {
    router.push("/(auth)/register-center" as Href);
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>تسجيل الدخول</Text>

        <Input
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="رقم الهاتف"
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel="رقم الهاتف"
        />
        <Input
          value={password}
          onChangeText={handlePasswordChange}
          placeholder="كلمة المرور"
          secureTextEntry
          autoComplete="password"
          accessibilityLabel="كلمة المرور"
        />

        {error ? (
          <Text
            style={styles.errorBlock}
            accessibilityLabel="رسالة خطأ"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}

        <Button
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          accessibilityLabel="تسجيل الدخول"
        >
          تسجيل الدخول
        </Button>

        <Pressable
          onPress={handlePressRegister}
          style={styles.registerLink}
          accessibilityLabel="الانتقال إلى التسجيل"
          accessibilityRole="link"
        >
          <Text style={styles.registerLinkText}>ليس لديك حساب؟ سجّل هنا</Text>
        </Pressable>
        <Pressable
          onPress={handlePressRegisterCenter}
          style={styles.registerLink}
          accessibilityLabel="إنشاء حساب مركز"
          accessibilityRole="link"
        >
          <Text style={styles.registerLinkText}>إنشاء حساب مركز</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  errorBlock: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  registerLink: {
    marginTop: spacing.xl,
    alignSelf: "center",
    padding: spacing.sm,
  },
  registerLinkText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "500",
  },
});
