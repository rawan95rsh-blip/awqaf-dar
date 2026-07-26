import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
  ActivityIndicator,
} from "react-native";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";
import { useAuth } from "@/src/context/AuthContext";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { coursesQueryKeys, listCourses } from "@/src/api/courses";
import { MUTOR_LEVEL_ORDER_MAX, MUTOR_LEVEL_ORDER_MIN } from "@/src/types/classOffer";

export default function ClassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id;

  const {
    data: courses = [],
    isLoading: coursesLoading,
    isError: coursesError,
    error: coursesErrorObj,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: coursesQueryKeys.list(),
    queryFn: listCourses,
    enabled: !!centerId,
  });

  const {
    data: levels = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: levelQueryKeys.list(centerId ?? ""),
    queryFn: () => fetchLevelsByCenter(centerId!),
    enabled: !!centerId,
  });

  const mutorLevels = useMemo(
    () =>
      levels.filter(
        (level) =>
          level.order >= MUTOR_LEVEL_ORDER_MIN &&
          level.order <= MUTOR_LEVEL_ORDER_MAX
      ),
    [levels]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <DrawerTrigger />
        </View>

        <Text style={styles.levelsSectionTitle}>مستويات المطور</Text>
        <Text style={styles.levelsSectionHint}>
          سلّم مطور ١ إلى مطور ٨. اضغطي مستوى لعرض فصوله ومواده وطلابه.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={centerColors.accent} style={styles.loader} />
        ) : isError ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : "تعذر تحميل المستويات"}
            </Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : mutorLevels.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد مستويات مطور لهذا المركز</Text>
        ) : (
          <View style={styles.levelsList}>
            {mutorLevels.map((level) => (
              <Pressable
                key={level.id}
                style={styles.levelCard}
                onPress={() =>
                  router.push(`/main/level/${level.id}` as import("expo-router").Href)
                }
              >
                <Text style={styles.levelCardText}>
                  {level.shortName ?? level.fullName}
                </Text>
                <Text style={styles.levelCardCount}>
                  {level.studentCount ?? 0} طالب
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {isRefetching && !isLoading ? (
          <ActivityIndicator size="small" color={centerColors.accent} />
        ) : null}

        <View style={styles.coursesSection}>
          <View style={styles.coursesHeader}>
            <Text style={styles.levelsSectionTitle}>الدورات العلمية</Text>
            <Pressable
              style={styles.addCourseButton}
              onPress={() =>
                router.push("/main/add-course" as import("expo-router").Href)
              }
              accessibilityRole="button"
              accessibilityLabel="إضافة دورة علمية"
            >
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={centerColors.primaryButtonText}
              />
              <Text style={styles.addCourseButtonText}>إضافة دورة</Text>
            </Pressable>
          </View>
          <Text style={styles.levelsSectionHint}>
            كل دورة علمية باسم يحدده المركز (مثل أعمال القلوب أو مواريث).
          </Text>
          {coursesLoading ? (
            <ActivityIndicator size="small" color={centerColors.accent} />
          ) : coursesError ? (
            <View style={styles.messageBox}>
              <Text style={styles.errorText}>
                {coursesErrorObj instanceof Error
                  ? coursesErrorObj.message
                  : "تعذر تحميل الدورات"}
              </Text>
              <Pressable onPress={() => refetchCourses()}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : courses.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد دورات علمية بعد</Text>
          ) : (
            courses.map((course) => (
              <Pressable
                key={course.id}
                style={styles.courseCard}
                onPress={() =>
                  router.push(
                    `/main/course/${course.id}` as import("expo-router").Href
                  )
                }
              >
                <Text style={styles.courseCardTitle}>{course.name}</Text>
                {course.description ? (
                  <Text style={styles.courseCardMeta} numberOfLines={2}>
                    {course.description}
                  </Text>
                ) : (
                  <Text style={styles.courseCardMeta}>دورة علمية</Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: centerColors.background,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  levelsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
  },
  levelsSectionHint: {
    fontSize: 13,
    color: centerColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  levelsList: {
    marginBottom: spacing.xl,
  },
  levelCard: {
    width: "100%",
    marginBottom: spacing.md,
    backgroundColor: centerColors.cardBg,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: centerColors.cardBorder,
  },
  levelCardText: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 4,
  },
  levelCardCount: {
    fontSize: 13,
    color: centerColors.textSecondary,
  },
  coursesSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  coursesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  addCourseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.primaryButton,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    gap: spacing.xs,
  },
  addCourseButtonText: {
    color: centerColors.primaryButtonText,
    fontSize: 13,
    fontWeight: "600",
  },
  courseCard: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    marginBottom: spacing.sm,
  },
  courseCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 4,
  },
  courseCardMeta: {
    fontSize: 13,
    color: centerColors.textSecondary,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  messageBox: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.accent,
  },
  emptyText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
});
