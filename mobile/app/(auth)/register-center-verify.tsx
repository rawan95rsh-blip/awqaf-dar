import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import ScreenContainer from "@/src/components/ScreenContainer";
import Button from "@/src/components/Button";
import { colors, spacing, centerColors } from "@/constants";
import { useAuth } from "@/src/context/AuthContext";
import {
  verifyCenterApi,
  getPendingRegistrationPhone,
  removePendingRegistrationPhone,
} from "@/src/api/auth";
import { promptEnableBiometricsAfterLogin } from "@/src/utils/biometric";

export default function RegisterCenterVerifyScreen() {
  const router = useRouter();
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const { login } = useAuth();
  const [registrationPhone, setRegistrationPhone] = useState<string | null>(
    typeof phoneParam === "string" && phoneParam.trim() ? phoneParam.trim() : null
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (registrationPhone) return;
    getPendingRegistrationPhone((storedPhone) => {
      if (storedPhone?.trim()) {
        setRegistrationPhone(storedPhone.trim());
      }
    });
  }, [registrationPhone]);

  const mutation = useMutation({
    mutationFn: ({ phone, code: otp }: { phone: string; code: string }) =>
      new Promise<{ token: string; user: import("@/src/types/auth").User }>(
        (resolve, reject) => {
          verifyCenterApi({ phone, code: otp }, resolve, reject);
        }
      ),
    onSuccess: (data) => {
      setError(null);
      login(data.token, data.user, () => {
        removePendingRegistrationPhone(() => {
          promptEnableBiometricsAfterLogin(() => {
            router.replace("/main" as Href);
          });
        });
      });
    },
    onError: (err: Error) => {
      setError(err.message ?? "فشل التحقق من الكود");
    },
  });

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCode(digits);
    if (error) setError(null);
  };

  const handleCreateAccount = () => {
    if (mutation.isPending) return;

    setError(null);

    if (!registrationPhone) {
      setError("لم يُعثر على رقم الهاتف. يرجى إعادة التسجيل.");
      return;
    }

    if (code.length !== 4) {
      setError("أدخل الكود المكون من 4 أرقام");
      return;
    }

    mutation.mutate({ phone: registrationPhone, code });
  };

  const handleGoToLogin = () => {
    router.replace("/(auth)/login" as Href);
  };

  const handleBackToRegister = () => {
    router.replace("/(auth)/register-center" as Href);
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>الكود الخاص لإتمام الحساب *</Text>

        {registrationPhone ? (
          <Text style={styles.phoneHint}>
            تم الإرسال إلى: {registrationPhone}
          </Text>
        ) : null}

        <Pressable
          style={styles.codeRow}
          onPress={() => inputRef.current?.focus()}
          disabled={mutation.isPending}
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.codeDot}>
              <Text style={styles.codeChar}>
                {code.length > i ? code[i] : ""}
              </Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          maxLength={4}
          editable={!mutation.isPending}
          style={styles.hiddenInput}
          accessibilityLabel="إدخال الكود المكون من 4 أرقام"
        />

        <Text style={styles.hint}>
          {__DEV__
            ? "في التطوير استخدمي الكود 7890"
            : "يُرسل إليك الكود من قبل المنصة"}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!registrationPhone ? (
          <Pressable
            style={styles.backLinkWrap}
            onPress={handleBackToRegister}
            accessibilityLabel="العودة للتسجيل"
          >
            <Text style={styles.loginLinkHighlight}>العودة لإنشاء الحساب</Text>
          </Pressable>
        ) : null}

        <View style={styles.buttonWrapper}>
          <Button
            onPress={handleCreateAccount}
            loading={mutation.isPending}
            disabled={mutation.isPending || !registrationPhone}
            accessibilityLabel="إنشاء الحساب"
          >
            إنشاء الحساب ←
          </Button>
        </View>

        <Pressable
          style={styles.loginLinkWrap}
          onPress={handleGoToLogin}
          accessibilityLabel="تسجيل الدخول"
        >
          <Text style={styles.loginLinkText}>
            هل لديك حساب بالفعل ؟{" "}
            <Text style={styles.loginLinkHighlight}>تسجيل الدخول</Text>
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  phoneHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "right",
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codeDot: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: centerColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  codeChar: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1,
    left: -9999,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "right",
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  backLinkWrap: {
    alignSelf: "center",
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  loginLinkWrap: {
    alignSelf: "center",
    padding: spacing.sm,
  },
  loginLinkText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  loginLinkHighlight: {
    color: colors.primary,
    fontWeight: "600",
  },
});
