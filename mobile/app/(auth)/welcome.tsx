import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Button from "@/src/components/Button";

const WELCOME_COLORS = {
  background: "#fafbfc",
  navy: "#4a7ab5",
  textPrimary: "#4a5568",
  textSecondary: "#8b95a5",
  bookGrey: "#c5d0dc",
  orange: "#f5c49e",
  greenLight: "#b8e0b0",
  greenDark: "#6ba86b",
  wave: "#e8ecf0",
  glow: "#7ba3d4",
};

export default function WelcomeScreen() {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const glowOpacity = useSharedValue(0.3);
  const floatY = useSharedValue(0);
  const blob1X = useSharedValue(0);
  const blob2X = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500 }),
        withTiming(0.25, { duration: 1500 }),
      ),
      -1,
      true,
    );
    floatY.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    blob1X.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 2500 }),
        withTiming(-6, { duration: 2500 }),
      ),
      -1,
      true,
    );
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2200 }),
        withTiming(5, { duration: 2200 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedCenterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const animatedBlob1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob1X.value }],
  }));

  const animatedBlob2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob2X.value }],
  }));

  const handleContinue = () => {
    router.replace("/(auth)/login" as import("expo-router").Href);
  };

  const handleRegisterNow = () => {
    router.push("/(auth)/register-center" as import("expo-router").Href);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Centered block: icon + text + button */}
        <View style={styles.centeredBlock}>
          {/* Wavy lines (decorative) */}
          <View style={styles.waveContainer}>
            <View style={[styles.wave, styles.wave1]} />
            <View style={[styles.wave, styles.wave2]} />
            <View style={[styles.wave, styles.wave3]} />
          </View>

          {/* Book icon - left */}
          <Animated.View style={[styles.bookWrapper, animatedFloatStyle]}>
            <MaterialCommunityIcons
              name="book-open-variant"
              size={48}
              color={WELCOME_COLORS.bookGrey}
            />
          </Animated.View>

          {/* Glow layers behind blue box - softer, shinier */}
          <Animated.View style={[styles.glowCircleOuter, animatedGlowStyle]} />
          <Animated.View style={[styles.glowCircle, animatedGlowStyle]} />

          {/* Central blue box + cap */}
          <Animated.View style={[styles.centralWrapper, animatedCenterStyle]}>
            <Animated.View style={[styles.blobOrange, animatedBlob1Style]} />
            <Animated.View
              style={[styles.blobGreenLight, animatedBlob1Style]}
            />
            <Animated.View style={[styles.blobGreenDark, animatedBlob2Style]} />

            <View style={styles.blueBox}>
              <MaterialCommunityIcons name="school" size={72} color="#fff" />
            </View>
          </Animated.View>

          <Text style={styles.title}>منصة دور القرآن</Text>
          <Text style={styles.subtitle}>دولة الكويت</Text>

          <View style={styles.buttonWrapper}>
            <Button
              onPress={handleRegisterNow}
              backgroundColor="#4a9b6f"
              accessibilityLabel="سجل الآن - إنشاء حساب مركز"
            >
              سجل الآن
            </Button>
            <View style={styles.secondButtonWrap}>
              <Button
                onPress={handleContinue}
                variant="outlined"
                accessibilityLabel="متابعة إلى تسجيل الدخول"
              >
                متابعة
              </Button>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WELCOME_COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredBlock: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    position: "relative",
    marginVertical: 24,
  },
  waveContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.35,
  },
  wave: {
    position: "absolute",
    height: 3,
    backgroundColor: WELCOME_COLORS.wave,
    borderRadius: 2,
  },
  wave1: { top: 0, left: 20, width: "60%", opacity: 0.5 },
  wave2: { top: 22, right: 10, width: "50%", opacity: 0.4 },
  wave3: { top: 44, left: 40, width: "55%", opacity: 0.45 },
  bookWrapper: {
    position: "absolute",
    top: -10,
    left: -8,
    zIndex: 1,
  },
  glowCircleOuter: {
    position: "absolute",
    top: 24,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: WELCOME_COLORS.glow,
    zIndex: 0,
    opacity: 0.2,
  },
  glowCircle: {
    position: "absolute",
    top: 34,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: WELCOME_COLORS.glow,
    zIndex: 0,
  },
  centralWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  blueBox: {
    width: 140,
    height: 140,
    borderRadius: 24,
    backgroundColor: WELCOME_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: WELCOME_COLORS.glow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  blobOrange: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: WELCOME_COLORS.orange,
    opacity: 0.85,
  },
  blobGreenLight: {
    position: "absolute",
    top: 20,
    right: -24,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WELCOME_COLORS.greenLight,
    opacity: 0.85,
  },
  blobGreenDark: {
    position: "absolute",
    bottom: -4,
    left: -12,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: WELCOME_COLORS.greenDark,
    opacity: 0.85,
  },
  title: {
    marginTop: 28,
    fontSize: 28,
    fontWeight: "700",
    color: WELCOME_COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "500",
    color: WELCOME_COLORS.textSecondary,
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: 40,
    width: "100%",
    maxWidth: 280,
  },
  secondButtonWrap: {
    marginTop: 12,
  },
});
