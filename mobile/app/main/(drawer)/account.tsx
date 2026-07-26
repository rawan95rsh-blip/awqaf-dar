import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  I18nManager,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";
import Button from "@/src/components/Button";
import BiometricToggle from "@/src/components/BiometricToggle";
import { useAuth } from "@/src/context/AuthContext";
import {
  changePassword,
  fetchAccount,
  mapAccountToUser,
  updateAccount,
} from "@/src/api/account";
import {
  filterDigitsOnly,
  isDigitsOnlyPassword,
  PASSWORD_DIGITS_ERROR_AR,
} from "@/src/utils/password";

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, login, logout, token } = useAuth();

  const [supervisorName, setSupervisorName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: account, isLoading, isError, error } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
  });

  useEffect(() => {
    if (!account) return;
    setSupervisorName(account.center?.supervisorName ?? "");
    setEmail(account.user.email ?? "");
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: updateAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["account"] });
      if (token) {
        login(token, mapAccountToUser(data));
      }
      Alert.alert("تم الحفظ", "تم تحديث بيانات الحساب بنجاح");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("تم الحفظ", "تم تغيير كلمة المرور بنجاح");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const handleLogout = () => {
    logout(() => {
      router.replace("/(auth)/welcome" as Href);
    });
  };

  const handleSaveProfile = () => {
    updateMutation.mutate({
      supervisorName: supervisorName.trim(),
      email: email.trim(),
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("تنبيه", "أدخلي كلمة المرور الحالية والجديدة");
      return;
    }
    if (!isDigitsOnlyPassword(newPassword)) {
      Alert.alert("تنبيه", PASSWORD_DIGITS_ERROR_AR);
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const isCenterAdmin = user?.role === "center_admin";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <DrawerTrigger />
        </View>

        <Text style={styles.title}>الحساب</Text>
        {user?.phone ? <Text style={styles.subtitle}>{user.phone}</Text> : null}
        {user?.centerProfile?.nameAr ? (
          <Text style={styles.subtitle}>{user.centerProfile.nameAr}</Text>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={centerColors.accent} style={styles.loader} />
        ) : isError ? (
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : "تعذر تحميل الحساب"}
          </Text>
        ) : isCenterAdmin ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>بيانات المركز</Text>
            <Text style={styles.label}>اسم المشرف</Text>
            <TextInput
              style={styles.input}
              value={supervisorName}
              onChangeText={setSupervisorName}
              textAlign="right"
              placeholder="اسم المشرف"
              placeholderTextColor={centerColors.textSecondary}
            />
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              textAlign="right"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="center@example.com"
              placeholderTextColor={centerColors.textSecondary}
            />
            <Button
              onPress={handleSaveProfile}
              loading={updateMutation.isPending}
              accessibilityLabel="حفظ بيانات الحساب"
            >
              حفظ البيانات
            </Button>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>كلمة المرور</Text>
          <Text style={styles.label}>كلمة المرور الحالية</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={(text) => setCurrentPassword(filterDigitsOnly(text))}
            textAlign="right"
            secureTextEntry
            keyboardType="number-pad"
            placeholder="••••••"
            placeholderTextColor={centerColors.textSecondary}
          />
          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={(text) => setNewPassword(filterDigitsOnly(text))}
            textAlign="right"
            secureTextEntry
            keyboardType="number-pad"
            placeholder="أرقام فقط — 6 على الأقل"
            placeholderTextColor={centerColors.textSecondary}
          />
          <Button
            onPress={handleChangePassword}
            loading={passwordMutation.isPending}
            variant="outlined"
            accessibilityLabel="تغيير كلمة المرور"
          >
            تغيير كلمة المرور
          </Button>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأمان</Text>
          <BiometricToggle
            accentColor={centerColors.accent}
            textColor={centerColors.text}
            secondaryColor={centerColors.textSecondary}
          />
        </View>

        <View style={styles.logoutWrapper}>
          <Button
            onPress={handleLogout}
            variant="outlined"
            accessibilityLabel="تسجيل الخروج"
          >
            تسجيل الخروج
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.sm,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 16,
    color: centerColors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  loader: { marginVertical: spacing.xl },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: "right",
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    color: centerColors.textSecondary,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: centerColors.text,
    backgroundColor: centerColors.cardBg,
    marginBottom: spacing.sm,
  },
  logoutWrapper: { marginTop: spacing.xxl },
});
