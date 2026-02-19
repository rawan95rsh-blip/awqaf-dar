import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "@/src/components/ScreenContainer";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { colors, spacing } from "@/constants";
import { setPendingCenterRegistration } from "@/src/api/auth";

const CENTER_OPTIONS = [
  "مركز رسل",
  "مركز محمد الوزان",
  "مركز عبدالله مبارك",
] as const;

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

export default function RegisterCenterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [centerName, setCenterName] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  const [centerDropdownVisible, setCenterDropdownVisible] = useState(false);

  const toggleSpec = (id: string) => {
    setSelectedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = () => {
    setPendingCenterRegistration(
      {
        email: email.trim(),
        phone: phone.trim(),
        password,
        centerName,
        supervisorName: supervisorName.trim(),
        specializations: Array.from(selectedSpecs),
      },
      () => {
        router.push(
          "/(auth)/register-center-verify" as import("expo-router").Href,
        );
      },
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>إنشاء حساب مركز جديد</Text>
          <View style={styles.headerDots}>
            <View style={[styles.dot, styles.dotGreen]} />
            <View style={[styles.dot, styles.dotYellow]} />
            <View style={[styles.dot, styles.dotRed]} />
          </View>
        </View>

        {/* Logo placeholder */}
        <View style={styles.logoBox}>
          <MaterialCommunityIcons
            name="diamond-stone"
            size={48}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.logoTitle}>مطور</Text>
        <Text style={styles.logoSubtitle}>منصة إدارة مراكز القرآن</Text>

        {/* Form */}
        <Input
          label="البريد الإلكتروني"
          required
          value={email}
          onChangeText={setEmail}
          placeholder="example@center.com"
          keyboardType="email-address"
          autoComplete="email"
          accessibilityLabel="البريد الإلكتروني"
        />
        <Input
          label="رقم الهاتف"
          required
          value={phone}
          onChangeText={setPhone}
          placeholder="5X XXX XXXX 966+"
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel="رقم الهاتف"
        />

        {/* Center dropdown */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>اسم المركز *</Text>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setCenterDropdownVisible(true)}
            accessibilityLabel="اختر المركز"
          >
            <Text
              style={[
                styles.dropdownText,
                !centerName && styles.dropdownPlaceholder,
              ]}
            >
              {centerName ?? "اختر المركز"}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        <Modal
          visible={centerDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCenterDropdownVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setCenterDropdownVisible(false)}
          >
            <View style={styles.modalContent}>
              {CENTER_OPTIONS.map((name) => (
                <Pressable
                  key={name}
                  style={styles.modalOption}
                  onPress={() => {
                    setCenterName(name);
                    setCenterDropdownVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        <Input
          label="اسم مشرفة المركز"
          required
          value={supervisorName}
          onChangeText={setSupervisorName}
          placeholder="أ. فاطمة الأحمد"
          accessibilityLabel="اسم مشرفة المركز"
        />
        <Input
          label="الرقم السري"
          required
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          secureTextEntry
          autoComplete="new-password"
          accessibilityLabel="الرقم السري"
        />

        {/* Specializations */}
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

        <View style={styles.buttonWrapper}>
          <Button onPress={handleContinue} accessibilityLabel="متابعة">
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
  dotGreen: { backgroundColor: "#4caf50" },
  dotYellow: { backgroundColor: "#ffeb3b" },
  dotRed: { backgroundColor: "#f44336" },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
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
  fieldWrapper: { marginBottom: spacing.md },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: "500",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    backgroundColor: colors.background,
  },
  dropdownText: { fontSize: 16, color: colors.text },
  dropdownPlaceholder: { color: colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
  },
  modalOption: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalOptionText: { fontSize: 16, color: colors.text },
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
    backgroundColor: "#f5f0ff",
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
  buttonWrapper: { marginTop: spacing.sm },
});
