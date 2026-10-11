import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { space } from "@/src/theme";
import { Badge, Banner, Button, Header, Screen, Text, TextField, useToast } from "@/src/ui";
import { coursesQueryKeys, createCourse, listCourses } from "@/src/api/courses";

const EXAMPLES = ["أعمال القلوب", "المواريث", "فقه الصيام", "آداب طالب العلم"];

export default function AddCourseScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const coursesQuery = useQuery({ queryKey: coursesQueryKeys.list(), queryFn: listCourses });
  const existing = coursesQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: () => createCourse({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: coursesQueryKeys.all });
      toast.success(`أُنشئت دورة «${course.name}»`);
      router.replace(`/main/course/${course.id}` as Href);
    },
  });

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("اكتبي اسم الدورة (حرفان على الأقل)");
      return;
    }
    if (existing.some((c) => c.name.trim() === trimmed)) {
      setError("توجد دورة بنفس الاسم — اختاري اسماً مختلفاً");
      return;
    }
    mutation.mutate();
  };

  return (
    <Screen
      header={<Header back={"/main/classes" as Href} title="دورة علمية جديدة" />}
      footer={
        <Button fullWidth size="lg" icon="check" onPress={submit} loading={mutation.isPending}>
          إنشاء الدورة
        </Button>
      }
    >
      <View style={styles.form}>
        <Text variant="body" color="textSecondary">
          الدورة العلمية برنامج قصير باسم يحدده المركز، ولا ترتبط بمستويات التمهيدي أو المطور. بعد إنشائها
          أضيفي لها فصلاً بموعد أسبوعي.
        </Text>

        {mutation.isError ? (
          <Banner tone="danger" title="تعذّر إنشاء الدورة">
            {(mutation.error as Error).message}
          </Banner>
        ) : null}

        <TextField
          label="اسم الدورة"
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError(null);
          }}
          placeholder="مثال: أعمال القلوب"
          maxLength={80}
          error={error}
          returnKeyType="next"
          autoFocus
        />

        {!name.trim() ? (
          <View style={styles.examples}>
            <Text variant="caption" color="textMuted">
              أمثلة:
            </Text>
            {EXAMPLES.map((example) => (
              <Button key={example} variant="tonal" size="sm" onPress={() => setName(example)}>
                {example}
              </Button>
            ))}
          </View>
        ) : null}

        <TextField
          label="نبذة عن الدورة"
          hint="اختياري — تظهر في صفحة الدورة"
          value={description}
          onChangeText={setDescription}
          placeholder="موضوع الدورة والفئة المستهدفة"
          multiline
          maxLength={500}
          showCounter
        />

        {existing.length ? (
          <View style={styles.existing}>
            <Text variant="label" color="textSecondary">
              الدورات الحالية
            </Text>
            <View style={styles.badges}>
              {existing.map((course) => (
                <Badge key={course.id} label={course.name} tone="accent" icon="certificate-outline" />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[5], paddingTop: space[2] },
  examples: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[2], marginTop: -space[2] },
  existing: { gap: space[2] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
