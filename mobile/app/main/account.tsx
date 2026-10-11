import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View, type TextInput } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { space } from "@/src/theme";
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  Header,
  InfoRow,
  ListItem,
  LoadingState,
  Screen,
  Section,
  Text,
  TextField,
  useToast,
} from "@/src/ui";
import { changePassword, fetchAccount, mapAccountToUser, updateAccount, type AccountResponse } from "@/src/api/account";
import { useAuth } from "@/src/context/AuthContext";
import { PASSWORD_HINT, validatePassword } from "@/src/constants/domain";
import { formatPhone, toLatinDigits } from "@/src/constants/phone";
import BiometricSwitch from "@/src/components/center/BiometricSwitch";

const ACCOUNT_KEY = ["account"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** بيانات المشرفة (الاسم والبريد) — الهاتف للعرض فقط لأنه اسم الدخول */
function ProfileForm({ account }: { account: AccountResponse }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { token, login } = useAuth();
  const savedName = account.center?.supervisorName ?? "";
  const savedEmail = account.user.email ?? "";
  const [name, setName] = useState(savedName);
  const [email, setEmail] = useState(savedEmail);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    setName(savedName);
    setEmail(savedEmail);
  }, [savedName, savedEmail]);

  const dirty = name.trim() !== savedName || email.trim().toLowerCase() !== savedEmail.toLowerCase();

  const mutation = useMutation({
    mutationFn: () => updateAccount({ supervisorName: name.trim(), email: email.trim().toLowerCase() }),
    onSuccess: (data) => {
      queryClient.setQueryData(ACCOUNT_KEY, data);
      if (token) login(token, mapAccountToUser(data));
      toast.success("تم حفظ بيانات الحساب");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const save = () => {
    const next: typeof errors = {};
    if (name.trim().length < 3) next.name = "اكتبي اسم المشرفة";
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) next.email = "البريد الإلكتروني غير صالح";
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate();
  };

  return (
    <Card padding={4} style={styles.form}>
      <TextField
        label="اسم المشرفة"
        required
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
        }}
        autoComplete="name"
        textContentType="name"
        icon="account-outline"
        error={errors.name}
      />
      <TextField
        label="البريد الإلكتروني"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
        }}
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
      <Button onPress={save} loading={mutation.isPending} disabled={!dirty} icon="content-save-outline">
        {dirty ? "حفظ البيانات" : "البيانات محفوظة"}
      </Button>
    </Card>
  );
}

/** تغيير كلمة المرور (أرقام فقط، 6 على الأقل) */
function PasswordForm() {
  const toast = useToast();
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("تم تغيير كلمة المرور");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clear = (key: keyof typeof errors) => {
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const submit = () => {
    const e: typeof errors = {};
    if (!current) e.current = "أدخلي كلمة المرور الحالية";
    const passError = validatePassword(next);
    if (passError) e.next = passError;
    else if (next === current) e.next = "اختاري كلمة مرور مختلفة عن الحالية";
    else if (next !== confirm) e.confirm = "كلمتا المرور غير متطابقتين";
    setErrors(e);
    if (Object.keys(e).length) return;
    mutation.mutate();
  };

  return (
    <Card padding={4} style={styles.form}>
      <TextField
        label="كلمة المرور الحالية"
        value={current}
        onChangeText={(v) => {
          setCurrent(toLatinDigits(v));
          clear("current");
        }}
        secureTextEntry
        keyboardType="number-pad"
        textContentType="password"
        autoComplete="password"
        icon="lock-outline"
        returnKeyType="next"
        onSubmitEditing={() => newRef.current?.focus()}
        error={errors.current}
      />
      <TextField
        ref={newRef}
        label="كلمة المرور الجديدة"
        value={next}
        onChangeText={(v) => {
          setNext(toLatinDigits(v));
          clear("next");
        }}
        secureTextEntry
        keyboardType="number-pad"
        textContentType="newPassword"
        icon="lock-reset"
        hint={PASSWORD_HINT}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.next}
      />
      <TextField
        ref={confirmRef}
        label="تأكيد كلمة المرور الجديدة"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(toLatinDigits(v));
          clear("confirm");
        }}
        secureTextEntry
        keyboardType="number-pad"
        icon="lock-check-outline"
        returnKeyType="done"
        onSubmitEditing={submit}
        error={errors.confirm}
      />
      <Button
        variant="secondary"
        onPress={submit}
        loading={mutation.isPending}
        disabled={!current && !next && !confirm}
        icon="key-outline"
      >
        تغيير كلمة المرور
      </Button>
    </Card>
  );
}

/** حساب المشرفة: البيانات، كلمة المرور، البصمة، الخروج */
export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const query = useQuery({ queryKey: ACCOUNT_KEY, queryFn: fetchAccount });
  const account = query.data;

  const centerName = account?.center?.nameAr ?? user?.centerProfile?.nameAr ?? "المركز";
  const supervisorName = account?.center?.supervisorName || "المشرفة";

  const confirmLogout = () =>
    Alert.alert("تسجيل الخروج", "هل تريدين تسجيل الخروج من حساب المركز على هذا الجهاز؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: () => logout(() => router.replace("/(auth)/welcome" as Href)),
      },
    ]);

  return (
    <Screen
      header={<Header back={"/main/more" as Href} title="الحساب" />}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !account ? (
        <ErrorState message={query.error?.message} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Card padding={5} style={styles.hero}>
            <Avatar name={supervisorName} size={72} tone="accent" />
            <View style={styles.heroText}>
              <Text variant="headline" align="center">
                {supervisorName}
              </Text>
              <Text variant="caption" color="textSecondary" align="center">
                {`مشرفة ${centerName}`}
              </Text>
            </View>
          </Card>

          <Section title="بيانات الدخول">
            <Card padding={4} style={styles.info}>
              <InfoRow label="رقم الهاتف" value={formatPhone(account.user.phone)} icon="phone-outline" selectable />
              <InfoRow label="المركز" value={centerName} icon="domain" last />
            </Card>
            <Text variant="caption" color="textMuted">
              رقم الهاتف هو اسم الدخول للحساب ولا يمكن تغييره من التطبيق.
            </Text>
          </Section>

          <Section title="بيانات المشرفة">
            <ProfileForm account={account} />
          </Section>

          <Section title="كلمة المرور">
            <PasswordForm />
          </Section>

          <BiometricSwitch />

          <Section>
            <Card padding={0} style={styles.listCard}>
              <ListItem title="تسجيل الخروج" leadingIcon="logout" destructive onPress={confirmLogout} chevron={false} />
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space[3] },
  heroText: { alignItems: "center", gap: 2 },
  info: { paddingVertical: space[1] },
  form: { gap: space[4] },
  listCard: { overflow: "hidden" },
});
