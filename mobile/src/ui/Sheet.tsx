import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadows, space } from "@/src/theme";
import IconButton from "./IconButton";
import Text from "./Text";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** أقصى ارتفاع كنسبة من الشاشة */
  maxHeightRatio?: number;
  scroll?: boolean;
};

/** لوحة سفلية (Bottom Sheet) — للاختيارات والنماذج القصيرة */
export default function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.85,
  scroll = true,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const translate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      translate.setValue(40);
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 220 }).start();
    }
  }, [visible, translate]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="إغلاق" />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * maxHeightRatio,
              paddingBottom: Math.max(insets.bottom, space[4]),
              transform: [{ translateY: translate }],
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text variant="headline">{title}</Text>
                {subtitle ? (
                  <Text variant="caption" color="textSecondary">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <IconButton icon="close" accessibilityLabel="إغلاق" onPress={onClose} variant="surface" size={18} />
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, styles.bodyContent]}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: space[2],
    ...shadows.lg,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: space[2],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[5],
    paddingBottom: space[3],
  },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: space[5], paddingBottom: space[2], gap: space[3] },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
});
