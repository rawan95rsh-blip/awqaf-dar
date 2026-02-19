import { View, Text, StyleSheet, I18nManager } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";

export default function RequestsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <DrawerTrigger />
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.text}>طلبات التسجيل — قريباً</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18, color: centerColors.text },
});
