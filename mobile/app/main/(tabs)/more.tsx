import { Alert, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, space } from "@/src/theme";
import { Avatar, Card, Header, ListItem, Screen, Section, Text } from "@/src/ui";
import { useAuth } from "@/src/context/AuthContext";
import { formatPhone } from "@/src/constants/phone";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type MenuItem = { title: string; subtitle: string; icon: IconName; href: string; tone?: "primary" | "accent" | "info" };

const MANAGEMENT: MenuItem[] = [
  { title: "التقارير", subtitle: "كشف الغياب وكشف الدرجات الشامل", icon: "file-chart-outline", href: "/main/reports", tone: "accent" },
  { title: "إضافة مستوى", subtitle: "مستوى جديد في التمهيدي أو المطور", icon: "layers-plus", href: "/main/add-level" },
  { title: "إضافة دورة", subtitle: "دورة علمية تسجّل فيها الطالبات", icon: "certificate-outline", href: "/main/add-course" },
];

const SETTINGS: MenuItem[] = [
  { title: "إعدادات المركز", subtitle: "نوع المركز والعنوان وأوزان الدرجات", icon: "cog-outline", href: "/main/settings", tone: "info" },
  { title: "الحساب", subtitle: "بيانات المشرفة وكلمة المرور والبصمة", icon: "account-circle-outline", href: "/main/account", tone: "info" },
];

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  const router = useRouter();
  return (
    <Section title={title}>
      <Card padding={0} style={styles.listCard}>
        {items.map((item, i) => (
          <ListItem
            key={item.href}
            title={item.title}
            subtitle={item.subtitle}
            leadingIcon={item.icon}
            leadingTone={item.tone ?? "primary"}
            onPress={() => router.push(item.href as Href)}
            divider={i < items.length - 1}
          />
        ))}
      </Card>
    </Section>
  );
}

/** تبويب «المزيد»: التقارير والإعدادات والحساب وتسجيل الخروج */
export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const centerName = user?.centerProfile?.nameAr ?? "المركز";
  const version = Constants.expoConfig?.version ?? "—";

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
    <Screen withTabBar header={<Header large eyebrow="المزيد" title={centerName} />}>
      <Card padding={4} onPress={() => router.push("/main/account" as Href)} style={styles.profile} accessibilityLabel="الحساب">
        <Avatar name={centerName} size={52} tone="accent" />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {centerName}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {user?.phone ? formatPhone(user.phone) : "حساب المشرفة"}
          </Text>
        </View>
        <Text variant="label" color="primary">
          الحساب
        </Text>
      </Card>

      <MenuGroup title="الإدارة" items={MANAGEMENT} />
      <MenuGroup title="الإعدادات" items={SETTINGS} />

      <Section>
        <Card padding={0} style={styles.listCard}>
          <ListItem title="تسجيل الخروج" leadingIcon="logout" destructive onPress={confirmLogout} chevron={false} />
        </Card>
      </Section>

      <View style={styles.footer}>
        <MaterialCommunityIcons name="book-open-page-variant" size={18} color={colors.textMuted} />
        <Text variant="micro" color="textMuted" align="center">
          {`تطبيق دور القرآن · الإصدار ${version}`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { flexDirection: "row", alignItems: "center", gap: space[3] },
  listCard: { overflow: "hidden" },
  footer: { alignItems: "center", gap: space[1], marginTop: space[8] },
});
