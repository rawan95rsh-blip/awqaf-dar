import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  I18nManager,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addClassTheme, spacing } from "@/constants";
import { coursesQueryKeys, createCourse } from "@/src/api/courses";

export default function AddCourseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: coursesQueryKeys.all });
      Alert.alert("تم", "أُنشئت الدورة العلمية بنجاح", [
        {
          text: "حسناً",
          onPress: () => router.replace(`/main/course/${course.id}` as Href),
        },
      ]);
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("تنبيه", "أدخلي اسم الدورة العلمية");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityLabel="رجوع"
        >
          <Text style={styles.headerBackIcon}>
            {I18nManager.isRTL ? "→" : "←"}
          </Text>
        </Pressable>
        <Text style={styles.headerTitle}>إضافة دورة علمية</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          الدورة العلمية كيان باسم يحدده المركز (مثال: أعمال القلوب، مواريث).
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>اسم الدورة العلمية *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: أعمال القلوب"
            placeholderTextColor={addClassTheme.textSecondary}
            accessibilityLabel="اسم الدورة العلمية"
          />
          <View style={styles.divider} />
          <Text style={styles.label}>وصف (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="نبذة مختصرة عن الدورة"
            placeholderTextColor={addClassTheme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="وصف الدورة"
          />
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            (!name.trim() || createMutation.isPending) && styles.primaryButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!name.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={addClassTheme.white} />
          ) : (
            <Text style={styles.primaryButtonText}>إنشاء الدورة</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: addClassTheme.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: addClassTheme.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: addClassTheme.headerButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackIcon: {
    fontSize: 20,
    fontWeight: "600",
    color: addClassTheme.accentBlue,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: addClassTheme.text,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    color: addClassTheme.textSecondary,
    textAlign: "right",
    marginBottom: spacing.lg,
  },
  formCard: {
    backgroundColor: addClassTheme.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: addClassTheme.text,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: addClassTheme.text,
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  textArea: {
    minHeight: 88,
  },
  divider: {
    height: 1,
    backgroundColor: addClassTheme.cardBorder,
    marginVertical: spacing.md,
  },
  primaryButton: {
    backgroundColor: addClassTheme.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: addClassTheme.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
