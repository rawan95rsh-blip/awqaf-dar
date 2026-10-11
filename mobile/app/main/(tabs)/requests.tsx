import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { space } from "@/src/theme";
import { FilterBar, Header, Screen, type ChoiceOption } from "@/src/ui";
import { useCenterInbox } from "@/src/hooks/useCenterInbox";
import RegistrationRequestList from "@/src/components/center/requests/RegistrationRequestList";
import TransferRequestList from "@/src/components/center/requests/TransferRequestList";
import StudentRequestList from "@/src/components/center/requests/StudentRequestList";

type Tab = "registration" | "transfers" | "suspension" | "deletion";

const TABS: Tab[] = ["registration", "transfers", "suspension", "deletion"];

/** صياغة العدد بالعربية: طلب واحد / طلبان / ٣–١٠ طلبات / ١١+ طلباً */
function pendingLabel(count: number): string {
  if (count === 1) return "طلب واحد بانتظار مراجعتكِ";
  if (count === 2) return "طلبان بانتظار مراجعتكِ";
  return `${count} ${count <= 10 ? "طلبات" : "طلباً"} بانتظار مراجعتكِ`;
}

function isTab(value: unknown): value is Tab {
  return typeof value === "string" && (TABS as string[]).includes(value);
}

/** صندوق الطلبات: تسجيل · نقل · وقف قيد · حذف حساب */
export default function RequestsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const inbox = useCenterInbox();
  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : "registration");

  useEffect(() => {
    if (isTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const options: ChoiceOption<Tab>[] = [
    { id: "registration", label: "التسجيل", icon: "account-plus-outline", count: inbox.registrations.data?.length ?? 0 },
    { id: "transfers", label: "النقل", icon: "swap-horizontal", count: inbox.actionableTransfers.length },
    { id: "suspension", label: "وقف القيد", icon: "account-cancel-outline", count: inbox.suspensions.data?.length ?? 0 },
    { id: "deletion", label: "الحذف", icon: "account-remove-outline", count: inbox.deletions.data?.length ?? 0 },
  ];

  const subtitle = inbox.isLoading
    ? "جاري تحميل الطلبات…"
    : inbox.total > 0
      ? pendingLabel(inbox.total)
      : "لا توجد طلبات معلقة — أحسنتِ";

  return (
    <Screen
      withTabBar
      refreshing={inbox.isRefetching}
      onRefresh={() => void inbox.refetchAll()}
      header={<Header large title="الطلبات" subtitle={subtitle} />}
    >
      <FilterBar options={options} value={tab} onChange={setTab} />
      <View style={styles.content}>
        {tab === "registration" ? <RegistrationRequestList query={inbox.registrations} /> : null}
        {tab === "transfers" ? <TransferRequestList query={inbox.transfers} /> : null}
        {tab === "suspension" ? <StudentRequestList kind="suspension" query={inbox.suspensions} /> : null}
        {tab === "deletion" ? <StudentRequestList kind="deletion" query={inbox.deletions} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { marginTop: space[5] },
});
