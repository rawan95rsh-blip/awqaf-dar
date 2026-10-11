import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, space } from "@/src/theme";
import { Banner, Button, EmptyState, Header, LoadingState, Screen, Text, useToast } from "@/src/ui";
import {
  getPendingRegistrationPhone,
  removePendingRegistrationPhone,
  resendCenterCode,
  verifyCenter,
} from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import { formatPhone } from "@/src/constants/phone";
import { promptEnableBiometricsAfterLogin } from "@/src/utils/biometric";
import OtpInput, { type OtpInputHandle } from "@/src/components/center/OtpInput";

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

/** عدّاد تنازلي بالثواني — يعيد الثواني المتبقية ودالة لإعادة التشغيل */
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  return { remaining, restart: () => setRemaining(seconds) };
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/** التحقق من رقم المركز برمز من 4 أرقام ثم الدخول مباشرة */
export default function RegisterCenterVerifyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ phone?: string; devCode?: string }>();
  const otpRef = useRef<OtpInputHandle>(null);

  const [phone, setPhone] = useState<string | null>(params.phone?.trim() || null);
  const [phoneResolved, setPhoneResolved] = useState(!!params.phone?.trim());
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(__DEV__ ? params.devCode ?? null : null);
  const countdown = useCountdown(RESEND_SECONDS);

  // عند فتح الشاشة من جديد (بعد إغلاق التطبيق) نسترجع الرقم المحفوظ
  useEffect(() => {
    if (phoneResolved) return;
    let active = true;
    void getPendingRegistrationPhone()
      .then((stored) => {
        if (active && stored?.trim()) setPhone(stored.trim());
      })
      .finally(() => {
        if (active) setPhoneResolved(true);
      });
    return () => {
      active = false;
    };
  }, [phoneResolved]);

  const verifyMutation = useMutation({
    mutationFn: (otp: string) => verifyCenter({ phone: phone!, code: otp }),
    onSuccess: ({ token, user }) => {
      login(token, user, () => {
        void removePendingRegistrationPhone().catch(() => undefined);
        promptEnableBiometricsAfterLogin(() => router.replace("/main" as Href));
      });
    },
    onError: () => {
      setCode("");
      otpRef.current?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => resendCenterCode(phone!),
    onSuccess: (r) => {
      countdown.restart();
      verifyMutation.reset();
      setCode("");
      if (__DEV__ && r.devCode) setDevCode(r.devCode);
      toast.success(r.message || "تم إرسال رمز جديد");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submit = (otp = code) => {
    if (!phone || verifyMutation.isPending) return;
    if (otp.length !== CODE_LENGTH) {
      otpRef.current?.focus();
      return;
    }
    verifyMutation.mutate(otp);
  };

  const backToRegister = () => router.replace("/(auth)/register-center" as Href);

  if (!phoneResolved) {
    return (
      <Screen header={<Header back={"/(auth)/register-center" as Href} />}>
        <LoadingState />
      </Screen>
    );
  }

  if (!phone) {
    return (
      <Screen header={<Header back={"/(auth)/welcome" as Href} />}>
        <EmptyState
          icon="phone-alert-outline"
          title="لم نجد رقم التسجيل"
          description="ابدئي تسجيل المركز من جديد ليصلكِ رمز التحقق."
          actionLabel="تسجيل مركز جديد"
          onAction={backToRegister}
        />
      </Screen>
    );
  }

  const canResend = countdown.remaining <= 0 && !resendMutation.isPending;

  return (
    <Screen
      header={<Header back={"/(auth)/register-center" as Href} />}
      footer={
        <View style={styles.footer}>
          <Button
            size="lg"
            fullWidth
            icon="check"
            loading={verifyMutation.isPending}
            disabled={code.length !== CODE_LENGTH}
            onPress={() => submit()}
          >
            تأكيد وإنشاء الحساب
          </Button>
          <Button variant="ghost" fullWidth onPress={backToRegister} disabled={verifyMutation.isPending}>
            تعديل رقم الهاتف
          </Button>
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="message-lock-outline" size={36} color={colors.primary} />
        </View>
        <Text variant="title" align="center">
          أدخلي رمز التحقق
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          أرسلنا رمزاً من 4 أرقام برسالة نصية إلى
        </Text>
        <Text variant="headline" align="center" tabular>
          {formatPhone(phone)}
        </Text>
      </View>

      <View style={styles.form}>
        {__DEV__ && devCode ? (
          <Banner tone="warning" icon="bug-outline" title="وضع التطوير">
            {`رمز التحقق: ${devCode}`}
          </Banner>
        ) : null}

        <OtpInput
          ref={otpRef}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (verifyMutation.isError) verifyMutation.reset();
          }}
          onComplete={(v) => submit(v)}
          length={CODE_LENGTH}
          error={verifyMutation.isError}
          disabled={verifyMutation.isPending}
        />

        {verifyMutation.isError ? (
          <Text variant="caption" color="danger" align="center">
            {verifyMutation.error.message}
          </Text>
        ) : null}

        <View style={styles.resend}>
          <Text variant="caption" color="textSecondary">
            لم يصلكِ الرمز؟
          </Text>
          <Button
            variant="ghost"
            size="sm"
            icon="refresh"
            onPress={() => resendMutation.mutate()}
            loading={resendMutation.isPending}
            disabled={!canResend}
            accessibilityLabel={
              canResend ? "إعادة إرسال الرمز" : `إعادة الإرسال متاحة بعد ${countdown.remaining} ثانية`
            }
          >
            {canResend || resendMutation.isPending
              ? "إعادة إرسال الرمز"
              : `إعادة الإرسال بعد ${formatSeconds(countdown.remaining)}`}
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space[1], marginTop: space[4], marginBottom: space[8] },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[3],
  },
  form: { gap: space[5] },
  resend: { alignItems: "center", gap: space[1] },
  footer: { gap: space[1] },
});
