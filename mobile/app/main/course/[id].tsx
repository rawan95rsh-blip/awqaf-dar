import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  LoadingState,
  Screen,
  Section,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useToast,
} from "@/src/ui";
import ClassOfferCard from "@/src/components/levels/ClassOfferCard";
import ClassOfferActionsSheet from "@/src/components/levels/ClassOfferActionsSheet";
import { confirmAsync } from "@/src/components/levels/confirm";
import { coursesQueryKeys, deleteCourse, getCourse, updateCourse } from "@/src/api/courses";
import { classOffersQueryKeys, listClassOffers } from "@/src/api/classOffers";
import type { ClassOfferItem } from "@/src/types/classOffer";

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = id ?? "";
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [menuOffer, setMenuOffer] = useState<ClassOfferItem | null>(null);

  const courseQuery = useQuery({
    queryKey: coursesQueryKeys.detail(courseId),
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  });
  const offersQuery = useQuery({
    queryKey: classOffersQueryKeys.list({ track: "courses" }),
    queryFn: () => listClassOffers({ track: "courses" }),
  });

  const course = courseQuery.data;
  // فصول الدورة هي فصول مسار «دورة» المسجّلة باسم الدورة نفسه
  const offers = useMemo(
    () =>
      (offersQuery.data ?? [])
        .filter((o) => course && o.subjectName.trim() === course.name.trim())
        .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
    [offersQuery.data, course]
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteCourse(courseId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: coursesQueryKeys.all });
      toast.success(result?.message ?? "تم حذف الدورة");
      router.replace("/main/classes" as Href);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const header = (
    <Header
      back={"/main/classes" as Href}
      title="دورة علمية"
      actions={
        course ? (
          <IconButton icon="pencil-outline" accessibilityLabel="تعديل الدورة" variant="surface" onPress={() => setEditOpen(true)} />
        ) : null
      }
    />
  );

  if (courseQuery.isLoading) {
    return (
      <Screen header={header}>
        <LoadingState label="جاري تحميل الدورة…" />
      </Screen>
    );
  }

  if (courseQuery.isError || !course) {
    return (
      <Screen header={header}>
        <ErrorState
          message={(courseQuery.error as Error | null)?.message ?? "الدورة غير موجودة"}
          onRetry={() => courseQuery.refetch()}
        />
      </Screen>
    );
  }

  const addClassHref = `/main/add-class?track=courses&subjectName=${encodeURIComponent(course.name)}` as Href;

  const askDelete = async () => {
    const ok = await confirmAsync({
      title: `حذف دورة «${course.name}»؟`,
      message: offers.length
        ? `ستبقى فصولها (${offers.length}) في الجدول حتى تحذفيها من قائمة الفصول.`
        : "لا يمكن التراجع عن الحذف.",
      confirmLabel: "حذف الدورة",
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  return (
    <Screen
      header={header}
      refreshing={courseQuery.isRefetching || offersQuery.isRefetching}
      onRefresh={() => {
        void courseQuery.refetch();
        void offersQuery.refetch();
      }}
    >
      <Card elevated style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="certificate-outline" size={28} color={colors.accentStrong} />
        </View>
        <Text variant="eyebrow" color="accentStrong">
          دورة علمية
        </Text>
        <Text variant="title">{course.name}</Text>
        {course.description ? (
          <Text variant="body" color="textSecondary">
            {course.description}
          </Text>
        ) : (
          <Button variant="ghost" size="sm" icon="text-box-plus-outline" onPress={() => setEditOpen(true)} style={styles.start}>
            أضيفي نبذة عن الدورة
          </Button>
        )}
      </Card>

      <Section
        title="فصول الدورة"
        subtitle="مواعيد أسبوعية مسجّلة باسم هذه الدورة"
        action={{ label: "إضافة فصل", icon: "plus", onPress: () => router.push(addClassHref) }}
      >
        {offersQuery.isLoading ? (
          <Skeleton height={84} radiusSize={radius.lg} />
        ) : offersQuery.isError ? (
          <ErrorState compact message={(offersQuery.error as Error).message} onRetry={() => offersQuery.refetch()} />
        ) : offers.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="calendar-blank-outline"
              title="لا فصول لهذه الدورة بعد"
              description="أضيفي موعداً أسبوعياً ومعلمة ليظهر في الجدول"
              actionLabel="إضافة فصل"
              onAction={() => router.push(addClassHref)}
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {offers.map((offer) => (
              <ClassOfferCard
                key={offer.id}
                offer={offer}
                onMenu={() => setMenuOffer(offer)}
                onPress={() =>
                  offer.nextSessionId
                    ? router.push(`/main/session/${offer.nextSessionId}` as Href)
                    : toast.show("لا توجد حصة قادمة لهذا الفصل", "info")
                }
              />
            ))}
          </View>
        )}
      </Section>

      <Section>
        <Button
          variant="dangerTonal"
          icon="trash-can-outline"
          loading={deleteMutation.isPending}
          onPress={() => void askDelete()}
          fullWidth
        >
          حذف الدورة
        </Button>
      </Section>

      <EditCourseSheet
        visible={editOpen}
        courseId={course.id}
        initialName={course.name}
        initialDescription={course.description ?? ""}
        onClose={() => setEditOpen(false)}
      />
      <ClassOfferActionsSheet offer={menuOffer} onClose={() => setMenuOffer(null)} showSubjectLink={false} />
    </Screen>
  );
}

function EditCourseSheet({
  visible,
  courseId,
  initialName,
  initialDescription,
  onClose,
}: {
  visible: boolean;
  courseId: string;
  initialName: string;
  initialDescription: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setDescription(initialDescription);
      setError(null);
    }
  }, [visible, initialName, initialDescription]);

  const mutation = useMutation({
    mutationFn: () => updateCourse(courseId, { name: name.trim(), description: description.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(coursesQueryKeys.detail(courseId), updated);
      void queryClient.invalidateQueries({ queryKey: coursesQueryKeys.all });
      toast.success("تم حفظ بيانات الدورة");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submit = () => {
    if (name.trim().length < 2) {
      setError("اكتبي اسم الدورة (حرفان على الأقل)");
      return;
    }
    mutation.mutate();
  };

  return (
    <Sheet
      visible={visible}
      onClose={mutation.isPending ? () => undefined : onClose}
      title="تعديل الدورة"
      footer={
        <View style={styles.sheetFooter}>
          <Button fullWidth onPress={submit} loading={mutation.isPending}>
            حفظ التعديلات
          </Button>
          <Button fullWidth variant="ghost" onPress={onClose} disabled={mutation.isPending}>
            إلغاء
          </Button>
        </View>
      }
    >
      <TextField
        label="اسم الدورة"
        required
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (error) setError(null);
        }}
        maxLength={80}
        error={error}
      />
      <TextField
        label="نبذة عن الدورة"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
        showCounter
        placeholder="موضوع الدورة والفئة المستهدفة"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space[1] },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[2],
  },
  start: { alignSelf: "flex-start", marginTop: space[1] },
  list: { gap: space[2] },
  sheetFooter: { gap: space[2] },
});
