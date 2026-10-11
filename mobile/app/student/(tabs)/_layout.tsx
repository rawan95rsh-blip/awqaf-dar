import { useMemo } from "react";
import { Tabs } from "expo-router";
import { makeTabBar, type TabMeta } from "@/src/ui/TabBar";
import { useMyNotifications } from "@/src/components/student/hooks";

/** تبويبات الطالبة: الرئيسية · جدولي · درجاتي · حسابي */
export default function StudentTabsLayout() {
  const notifications = useMyNotifications();
  const unread = notifications.data?.unreadCount ?? 0;

  const TabBar = useMemo(() => {
    const meta: TabMeta = {
      index: { label: "الرئيسية", icon: "home-outline", iconActive: "home", badge: unread },
      schedule: { label: "جدولي", icon: "calendar-blank-outline", iconActive: "calendar-month" },
      grades: { label: "درجاتي", icon: "chart-box-outline", iconActive: "chart-box" },
      profile: { label: "حسابي", icon: "account-circle-outline", iconActive: "account-circle" },
    };
    return makeTabBar(meta);
  }, [unread]);

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="grades" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
