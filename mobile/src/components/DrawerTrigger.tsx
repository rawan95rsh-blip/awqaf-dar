import { View, Pressable, StyleSheet, I18nManager } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { centerColors, spacing } from "@/constants";

/** ثلاثة خطوط أفقية لسحب/فتح الدرج الجانبي — محاذاة لليمين */
export default function DrawerTrigger() {
  const navigation = useNavigation();

  return (
    <View style={I18nManager.isRTL ? styles.wrapperRTL : styles.wrapperLTR}>
      <Pressable
        style={styles.trigger}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        accessibilityLabel="فتح القائمة"
      >
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperRTL: { alignSelf: "flex-start" },
  wrapperLTR: { alignSelf: "flex-end" },
  trigger: {
    padding: spacing.sm,
    justifyContent: "center",
    gap: 5,
  },
  line: {
    width: 22,
    height: 2.5,
    borderRadius: 1,
    backgroundColor: centerColors.text,
  },
});
