import { useMemo } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ErrorState, Header, LoadingState, Screen, useToast } from "@/src/ui";
import { fetchStudentById, studentQueryKeys, updateStudent } from "@/src/api/students";
import { useAuth } from "@/src/context/AuthContext";
import type { StudentProfile } from "@/src/types/student";
import { goBack } from "@/src/utils/navigation";
import StudentForm, { useStudentForm } from "@/src/components/center/StudentForm";
import { buildUpdatePayload, formFromProfile, pickedDocuments } from "@/src/components/center/studentFormModel";

/** تعديل بيانات طالبة — يُرسل الحقول المتغيرة فقط */
export default function StudentEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = id ?? "";
  const fallback = `/main/student-profile/${studentId}` as Href;

  const query = useQuery({
    queryKey: studentQueryKeys.detail(studentId),
    queryFn: () => fetchStudentById(studentId),
    enabled: !!studentId,
  });

  if (query.isLoading) {
    return (
      <Screen header={<Header back={fallback} title="تعديل البيانات" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen header={<Header back={fallback} title="تعديل البيانات" />}>
        <ErrorState message={query.error?.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  // النموذج يُنشأ بعد وصول البيانات حتى تُملأ القيم الابتدائية مرة واحدة
  return <EditStudentForm profile={query.data} fallback={fallback} />;
}

function EditStudentForm({ profile, fallback }: { profile: StudentProfile; fallback: Href }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? profile.centerId ?? "";

  const initial = useMemo(() => formFromProfile(profile), [profile]);
  const form = useStudentForm(initial, "edit");

  const payload = useMemo(() => buildUpdatePayload(form.values, initial), [form.values, initial]);
  const dirty = Object.keys(payload).length > 0 || form.hasNewDocuments;

  const mutation = useMutation({
    mutationFn: () => updateStudent(profile.id, payload, pickedDocuments(form.documents)),
    onSuccess: (r) => {
      toast.success(r.message || "تم حفظ بيانات الطالبة");
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["levels"] });
      void queryClient.invalidateQueries({ queryKey: ["level-students"] });
      goBack(router, fallback);
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

  const leave = () => {
    if (!dirty || mutation.isPending) {
      goBack(router, fallback);
      return;
    }
    Alert.alert("تجاهل التعديلات؟", "لم تُحفظ التعديلات التي أجريتِها على بيانات الطالبة.", [
      { text: "متابعة التعديل", style: "cancel" },
      { text: "تجاهل", style: "destructive", onPress: () => goBack(router, fallback) },
    ]);
  };

  return (
    <Screen
      header={<Header onBack={leave} title="تعديل البيانات" subtitle={profile.fullName} />}
      footer={
        <Button
          fullWidth
          size="lg"
          icon="content-save-outline"
          loading={mutation.isPending}
          disabled={!dirty}
          onPress={submit}
        >
          {dirty ? "حفظ التعديلات" : "لا توجد تعديلات"}
        </Button>
      }
    >
      <StudentForm
        form={form}
        mode="edit"
        centerId={centerId}
        existingDocuments={profile.documents}
        submitError={mutation.error?.message}
      />
    </Screen>
  );
}
