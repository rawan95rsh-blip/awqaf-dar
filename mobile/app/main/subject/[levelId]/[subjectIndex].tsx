import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  I18nManager,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import { SUBJECT_NAMES, getSubjectName } from "@/src/constants/subjects";
import { fetchLevelById, levelQueryKeys } from "@/src/api/levels";
import { goBack } from "@/src/utils/navigation";

export default function SubjectDetailScreen() {
  const { levelId, subjectIndex } = useLocalSearchParams<{
    levelId: string;
    subjectIndex: string;
  }>();
  const router = useRouter();
  const subjectIdx = parseInt(subjectIndex ?? "0", 10);
  const subjectName = getSubjectName(subjectIdx);
  const resolvedLevelId = levelId ?? "";

  const { data: level, isLoading } = useQuery({
    queryKey: levelQueryKeys.detail(resolvedLevelId),
    queryFn: () => fetchLevelById(resolvedLevelId),
    enabled: !!resolvedLevelId,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.main}>
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Pressable
            style={styles.backButton}
            onPress={() =>
              goBack(
                router,
                `/main/level/${resolvedLevelId}` as import("expo-router").Href
              )
            }
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={centerColors.text}
            />
            <Text style={styles.backButtonText}>المستوى</Text>
          </Pressable>
        </View>

        <Text style={styles.pageTitle}>{subjectName}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={centerColors.accent} />
        ) : (
          <Text style={styles.pageSubtitle}>
            {level?.fullName ?? "—"}
          </Text>
        )}

        <View style={styles.buttonsContainer}>
          <Pressable
            style={styles.iconButton}
            onPress={() =>
              router.push(
                `/main/attendance/${resolvedLevelId}/${subjectIndex}` as import("expo-router").Href
              )
            }
            disabled={!resolvedLevelId}
          >
            <View style={[styles.iconCircle, styles.attendanceIconBg]}>
              <MaterialCommunityIcons
                name="clipboard-check"
                size={36}
                color={centerColors.textOnAccent}
              />
            </View>
            <Text style={styles.iconButtonLabel}>كشف تحضير الغياب</Text>
          </Pressable>

          <Pressable
            style={styles.iconButton}
            onPress={() =>
              router.push(
                `/main/grades/${resolvedLevelId}/${subjectIndex}` as import("expo-router").Href
              )
            }
            disabled={!resolvedLevelId}
          >
            <View style={[styles.iconCircle, styles.gradesIconBg]}>
              <MaterialCommunityIcons
                name="notebook"
                size={36}
                color={centerColors.textOnAccent}
              />
            </View>
            <Text style={styles.iconButtonLabel}>سجل الدرجات</Text>
          </Pressable>
        </View>

        <Text style={styles.hintText}>
          {SUBJECT_NAMES.length} مواد ثابتة في النظام — المادة {subjectIdx + 1} من {SUBJECT_NAMES.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  main: { flex: 1, padding: spacing.lg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    color: centerColors.text,
    fontWeight: "600",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    fontSize: 14,
    color: centerColors.textSecondary,
    marginBottom: spacing.xxl,
  },
  buttonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  iconButton: {
    alignItems: "center",
    minWidth: 140,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  attendanceIconBg: {
    backgroundColor: centerColors.accent,
  },
  gradesIconBg: {
    backgroundColor: centerColors.primaryButton,
  },
  iconButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.text,
    textAlign: "center",
  },
  hintText: {
    marginTop: spacing.xxl,
    fontSize: 13,
    color: centerColors.textSecondary,
    textAlign: "center",
  },
});
