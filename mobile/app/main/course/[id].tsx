import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import { goBack } from "@/src/utils/navigation";
import {
  coursesQueryKeys,
  deleteCourse,
  getCourse,
} from "@/src/api/courses";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = id ?? "";

  const courseQuery = useQuery({
    queryKey: coursesQueryKeys.detail(courseId),
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coursesQueryKeys.all });
      router.replace("/main/classes" as Href);
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const course = courseQuery.data;

  const confirmDelete = () => {
    Alert.alert("حذف الدورة", `هل تريدين حذف «${course?.name ?? ""}»؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

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
            { justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => goBack(router, "/main/classes" as Href)}
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={centerColors.text}
            />
            <Text style={styles.backButtonText}>الدورات العلمية</Text>
          </Pressable>
        </View>

        {courseQuery.isLoading ? (
          <ActivityIndicator size="large" color={centerColors.accent} />
        ) : courseQuery.isError || !course ? (
          <Text style={styles.errorText}>
            {courseQuery.error instanceof Error
              ? courseQuery.error.message
              : "الدورة غير موجودة"}
          </Text>
        ) : (
          <>
            <Text style={styles.eyebrow}>دورة علمية</Text>
            <Text style={styles.title}>{course.name}</Text>
            {course.description ? (
              <Text style={styles.description}>{course.description}</Text>
            ) : (
              <Text style={styles.descriptionMuted}>لا يوجد وصف بعد</Text>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>عن هذه الدورة</Text>
              <Text style={styles.cardBody}>
                الدورة العلمية تُعرَّف باسمها في المركز، وليست مستوى مطور ولا شبكة
                مواد الحفظ السبع.
              </Text>
            </View>

            <Pressable
              style={styles.deleteButton}
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator color={centerColors.accentRed} />
              ) : (
                <Text style={styles.deleteButtonText}>حذف الدورة</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  main: { flex: 1 },
  mainContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
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
  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: centerColors.accent,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: centerColors.textSecondary,
    marginBottom: spacing.xl,
  },
  descriptionMuted: {
    fontSize: 14,
    color: centerColors.textMuted,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: centerColors.textSecondary,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: centerColors.accentRed,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  deleteButtonText: {
    color: centerColors.accentRed,
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
  },
});
