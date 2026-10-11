import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, shadows, space } from "@/src/theme";
import Text from "./Text";

type ToastKind = "success" | "error" | "info";
type ToastState = { id: number; message: string; kind: ToastKind } | null;

type ToastApi = {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** رسائل تأكيد خفيفة لا تقاطع المستخدمة (بدل نوافذ Alert «تم») */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: ToastKind = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, kind });
      void Haptics.notificationAsync(
        kind === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
      ).catch(() => undefined);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToast(null)
        );
      }, kind === "error" ? 4200 : 2600);
    },
    [opacity]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
    }),
    [show]
  );

  const icon = toast?.kind === "error" ? "alert-circle" : toast?.kind === "info" ? "information" : "check-circle";
  const iconColor = toast?.kind === "error" ? "#FFB4AB" : toast?.kind === "info" ? "#B7D5F0" : "#A8E3C2";

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + space[16] }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.toast,
              {
                opacity,
                transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
            <Text variant="label" style={styles.text}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: space[5],
    right: space[5],
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    maxWidth: 480,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    ...shadows.lg,
  },
  text: { color: colors.onPrimary, flexShrink: 1 },
});
