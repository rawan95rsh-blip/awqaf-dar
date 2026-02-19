import { useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "@/src/components/ScreenContainer";
import Button from "@/src/components/Button";
import { colors, spacing } from "@/constants";
import { useAuth } from "@/src/context/AuthContext";
import {
  getPendingCenterRegistration,
  removePendingCenterRegistration,
} from "@/src/api/auth";
import type { User } from "@/src/types/auth";

/** الكود المعتمد لإتمام إنشاء الحساب (ثابت) */
const VALID_VERIFICATION_CODE = "7890";

export default function RegisterCenterVerifyScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCode(digits);
    setError(null);
  };

  const handleCreateAccount = () => {
    setError(null);
    if (code !== VALID_VERIFICATION_CODE) {
      setError("الكود غير صحيح");
      return;
    }
    setIsSubmitting(true);
    getPendingCenterRegistration((pending) => {
      if (!pending) {
        setError("لم تُحفظ بيانات التسجيل. يرجى إعادة تعبئة النموذج.");
        setIsSubmitting(false);
        return;
      }
      const user: User = {
        id: "new-" + Date.now(),
        email: pending.email || undefined,
        phone: pending.phone || undefined,
        centerProfile: pending.centerName
          ? { nameAr: pending.centerName }
          : undefined,
      };
      const token = "mock-token-" + Date.now();
      login(token, user, () => {
        removePendingCenterRegistration(() => {
          setIsSubmitting(false);
          router.replace("/(main)" as import("expo-router").Href);
        });
      });
    });
  };

  const handleGoToLogin = () => {
    router.replace("/(auth)/login" as import("expo-router").Href);
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>الكود الخاص لإتمام الحساب *</Text>

        <Pressable
          style={styles.codeRow}
          onPress={() => inputRef.current?.focus()}
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
          style={styles.hiddenInput}
          accessibilityLabel="إدخال الكود المكون من 4 أرقام"
        />

        <Text style={styles.hint}>يُرسل إليك الكود من قبل المنصة</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonWrapper}>
          <Button
            onPress={handleCreateAccount}
            disabled={isSubmitting}
            accessibilityLabel="إنشاء الحساب"
          >
            {isSubmitting ? "جاري إنشاء الحساب…" : "إنشاء الحساب ←"}
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
    marginBottom: spacing.lg,
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
    backgroundColor: "#f8f8f8",
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
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.md,
  },
  buttonWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
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
