import { type ReactElement, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, space } from "@/src/theme";

export type ScreenProps = {
  children: ReactNode;
  /** شريط علوي ثابت (Header) */
  header?: ReactElement | null;
  /** أزرار سفلية ثابتة فوق لوحة المفاتيح */
  footer?: ReactElement | null;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, "children" | "contentContainerStyle" | "refreshControl">;
  /** لا تضف حافة سفلية آمنة (عند وجود شريط تبويب) */
  withTabBar?: boolean;
  /** تغيير القيمة يعيد التمرير لأعلى الصفحة (مفيد بين خطوات النموذج) */
  scrollKey?: string | number;
};

/**
 * حاوية الشاشة الموحّدة:
 * منطقة آمنة + تمرير + تجنّب لوحة المفاتيح (حتى لا تُغطّى الحقول السفلية مثل خانة الاعتذار)
 */
export default function Screen({
  children,
  header,
  footer,
  scroll = true,
  padded = true,
  background = colors.background,
  refreshing,
  onRefresh,
  contentStyle,
  scrollProps,
  withTabBar = false,
  scrollKey,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomEdge = withTabBar ? [] : (["bottom"] as const);

  const body = scroll ? (
    <ScrollView
      key={scrollKey}
      style={styles.flex}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: footer ? space[4] : space[10] },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      {...scrollProps}
    >
      <View style={styles.maxWidth}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: background }]} edges={["top", ...bottomEdge]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {body}
        {footer ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: withTabBar ? space[3] : Math.max(space[3], insets.bottom > 0 ? space[2] : space[3]) },
            ]}
          >
            <View style={styles.maxWidth}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[2],
  },
  maxWidth: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[3],
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
