import { useMemo } from "react";
import { Tabs } from "expo-router";
import { makeTabBar, type TabMeta } from "@/src/ui/TabBar";
import { useCenterInbox } from "@/src/hooks/useCenterInbox";

/** تبويبات المشرفة: الرئيسية · المستويات · الطالبات · الطلبات · المزيد */
export default function CenterTabsLayout() {
  const inbox = useCenterInbox();

  const TabBar = useMemo(() => {
    const meta: TabMeta = {
      index: { label: "الرئيسية", icon: "home-outline", iconActive: "home" },
      classes: { label: "المستويات", icon: "layers-outline", iconActive: "layers" },
      students: { label: "الطالبات", icon: "account-group-outline", iconActive: "account-group" },
      requests: { label: "الطلبات", icon: "inbox-outline", iconActive: "inbox", badge: inbox.total },
      more: { label: "المزيد", icon: "dots-grid", iconActive: "dots-grid" },
    };
    return makeTabBar(meta);
  }, [inbox.total]);

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="classes" />
      <Tabs.Screen name="students" />
      <Tabs.Screen name="requests" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
