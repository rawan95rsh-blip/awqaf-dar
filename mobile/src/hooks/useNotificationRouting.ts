import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

type NotificationData = { type?: string; sessionId?: string; studentId?: string };

/** فتح الشاشة المناسبة عند الضغط على إشعار (اعتذار معلمة، قبول تسجيل، نقل…) */
export function useNotificationRouting() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (Platform.OS === "web" || !user) return;

    const open = (data: NotificationData) => {
      if (user.role === "student") {
        if (data.sessionId) router.push(`/student/session/${data.sessionId}` as Href);
        else router.push("/student" as Href);
        return;
      }
      if (data.type === "transfer_updated") router.push("/main/requests?tab=transfers" as Href);
      else if (data.sessionId) router.push(`/main/session/${data.sessionId}` as Href);
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response.notification.request.content.data as NotificationData);
    });

    // التطبيق فُتح من إشعار وهو مغلق
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response.notification.request.content.data as NotificationData);
    });

    return () => sub.remove();
  }, [router, user]);
}
