import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { space } from "@/src/theme";
import { Banner, Button, Header, Screen, useToast } from "@/src/ui";
import { createStudent, studentQueryKeys } from "@/src/api/students";
import { useAuth } from "@/src/context/AuthContext";
import StudentForm, { useStudentForm } from "@/src/components/center/StudentForm";
import { buildCreatePayload, EMPTY_STUDENT_FORM, pickedDocuments } from "@/src/components/center/studentFormModel";

/** إضافة طالبة يدوياً من المشرفة — تُسجَّل مباشرة دون طلب مراجعة */
export default function AddStudentScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";
  const form = useStudentForm(EMPTY_STUDENT_FORM, "create");

  const mutation = useMutation({
    mutationFn: () => createStudent(buildCreatePayload(form.values), pickedDocuments(form.documents)),
    onSuccess: (student) => {
      toast.success(student.message || "تمت إضافة الطالبة بنجاح");
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["levels"] });
      void queryClient.invalidateQueries({ queryKey: ["level-students"] });
      router.replace(`/main/student-profile/${student.id}` as Href);
    },
  });

  const submit = () => {
    mutation.reset();
    if (!form.validate()) {
      toast.error("راجعي الحقول المظللة");
      return;
    }
    mutation.mutate();
  };

  return (
    <Screen
      header={<Header back={"/main/students" as Href} title="إضافة طالبة" />}
      footer={
        <Button fullWidth size="lg" icon="account-plus-outline" loading={mutation.isPending} onPress={submit}>
          إضافة الطالبة
        </Button>
      }
    >
      <View style={styles.intro}>
        <Banner tone="info" icon="account-check-outline">
          تُسجَّل الطالبة مباشرة في مركزكِ وتستطيع الدخول برقم هاتفها وكلمة المرور.
        </Banner>
      </View>
      <StudentForm form={form} mode="create" centerId={centerId} submitError={mutation.error?.message} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: space[2] },
});
