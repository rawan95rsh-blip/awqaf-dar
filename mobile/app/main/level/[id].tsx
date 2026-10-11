import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { radius, space } from "@/src/theme";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  LoadingState,
  Screen,
  SearchBar,
  Section,
  Skeleton,
  SkeletonList,
  StatTile,
  Text,
  useToast,
} from "@/src/ui";
import WeeklySchedule from "@/src/components/WeeklySchedule";
import ClassOfferCard from "@/src/components/levels/ClassOfferCard";
import ClassOfferActionsSheet from "@/src/components/levels/ClassOfferActionsSheet";
import GradesheetCard from "@/src/components/levels/GradesheetCard";
import LevelStudentRow from "@/src/components/levels/LevelStudentRow";
import SubjectGrid from "@/src/components/levels/SubjectGrid";
import { TRACK_ICONS, studentsCountLabel } from "@/src/components/levels/helpers";
import { useAuth } from "@/src/context/AuthContext";
import { fetchLevelById, fetchLevelStudents, levelQueryKeys } from "@/src/api/levels";
import { classOffersQueryKeys, listClassOffers } from "@/src/api/classOffers";
import { PERFORMANCE, STUDENT_TYPE_LABELS, TRACK_LABELS } from "@/src/constants/domain";
import { formatPhone } from "@/src/constants/phone";
import type { ClassOfferItem } from "@/src/types/classOffer";
import type { StudentListItem } from "@/src/types/student";
import { exportWorkbook } from "@/src/utils/excel";

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** صفحة الفصل/المستوى (مثل «مطور أول») — تعمل لمستويات التمهيدي والمطور */
export default function LevelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const levelId = id ?? "";
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const centerName = user?.centerProfile?.nameAr ?? "المركز";

  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [menuOffer, setMenuOffer] = useState<ClassOfferItem | null>(null);

  const levelQuery = useQuery({
    queryKey: levelQueryKeys.detail(levelId),
    queryFn: () => fetchLevelById(levelId),
    enabled: !!levelId,
  });
  const studentsQuery = useQuery({
    queryKey: levelQueryKeys.students(levelId),
    queryFn: () => fetchLevelStudents(levelId),
    enabled: !!levelId,
  });
  // نفس مفتاح الجدول الأسبوعي لمشاركة الذاكرة المؤقتة
  const offersQuery = useQuery({
    queryKey: classOffersQueryKeys.list({ levelId }),
    queryFn: () => listClassOffers({ levelId }),
    enabled: !!levelId,
  });

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const offers = useMemo(
    () =>
      [...(offersQuery.data ?? [])].sort(
        (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)
      ),
    [offersQuery.data]
  );
  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return students;
    return students.filter((s) => s.fullName.includes(q) || s.idNumber.includes(q));
  }, [students, search]);

  const level = levelQuery.data;
  const levelName = level?.shortName || level?.fullName || "المستوى";
  const addClassHref = `/main/add-class?levelId=${encodeURIComponent(levelId)}` as Href;

  const header = (
    <Header
      back={"/main/classes" as Href}
      title={level ? levelName : "المستوى"}
      subtitle={level?.fullName}
      actions={
        <IconButton
          icon="calendar-plus"
          accessibilityLabel="إضافة فصل لهذا المستوى"
          variant="tonal"
          onPress={() => router.push(addClassHref)}
          disabled={!level}
        />
      }
    />
  );

  if (levelQuery.isLoading) {
    return (
      <Screen header={header}>
        <LoadingState label="جاري تحميل المستوى…" />
      </Screen>
    );
  }

  if (levelQuery.isError || !level) {
    return (
      <Screen header={header}>
        <ErrorState
          message={(levelQuery.error as Error | null)?.message ?? "لم يُعثر على المستوى"}
          onRetry={() => levelQuery.refetch()}
        />
      </Screen>
    );
  }

  const studentCount = studentsQuery.data ? students.length : level.studentCount;
  const attendanceAvg = average(students.map((s) => s.attendancePercent));
  const gradeAvg = average(students.map((s) => s.gradeAverage));
  const attention = students.filter((s) => s.status === "warning" || s.status === "frequent_absence").length;

  const openOffer = (offer: ClassOfferItem) => {
    if (offer.nextSessionId) {
      router.push(`/main/session/${offer.nextSessionId}` as Href);
    } else {
      toast.show("لا توجد حصة قادمة لهذا الفصل — تظهر الحصص في الجدول أسبوعياً", "info");
    }
  };

  const exportStudents = async () => {
    setExporting(true);
    try {
      await exportWorkbook(
        [
          {
            name: "طالبات المستوى",
            title: `قائمة طالبات ${levelName} — ${centerName}`,
            subtitle: level.fullName,
            columns: [
              { header: "م", width: 5 },
              { header: "اسم الطالبة", width: 28 },
              { header: "الرقم المدني", width: 15 },
              { header: "الهاتف", width: 16 },
              { header: "مستجدة/مستمرة", width: 13 },
              { header: "الحضور %", width: 10 },
              { header: "المعدل", width: 9 },
              { header: "الأداء", width: 14 },
            ],
            rows: students.map((s: StudentListItem, i) => [
              i + 1,
              s.fullName,
              s.idNumber,
              formatPhone(s.phone).replace("‎", ""),
              s.studentType ? STUDENT_TYPE_LABELS[s.studentType] : "",
              s.attendancePercent ?? "",
              s.gradeAverage ?? "",
              (PERFORMANCE[s.status] ?? PERFORMANCE.regular).label,
            ]),
          },
        ],
        `طالبات_${levelName}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر التصدير");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen
      header={header}
      refreshing={levelQuery.isRefetching || studentsQuery.isRefetching || offersQuery.isRefetching}
      onRefresh={() => {
        void levelQuery.refetch();
        void studentsQuery.refetch();
        void offersQuery.refetch();
      }}
    >
      <View style={styles.hero}>
        <Badge
          label={`مسار ${TRACK_LABELS[level.track]} · المستوى ${level.order}`}
          tone={level.track === "preparatory" ? "accent" : "primary"}
          icon={TRACK_ICONS[level.track]}
        />
        <View style={styles.stats}>
          <StatTile label="طالبة" value={studentCount} icon="account-group-outline" />
          <StatTile
            label="متوسط الحضور"
            value={attendanceAvg == null ? "—" : `${attendanceAvg}%`}
            icon="calendar-check-outline"
            tone={attendanceAvg != null && attendanceAvg < 75 ? "warning" : "success"}
          />
          <StatTile
            label="متوسط المعدل"
            value={gradeAvg ?? "—"}
            icon="chart-line"
            tone="info"
            hint={attention ? `${attention} تحتاج متابعة` : undefined}
          />
        </View>
      </View>

      <Section>
        <GradesheetCard levelId={levelId} levelName={levelName} track={level.track} centerName={centerName} />
      </Section>

      <Section>
        <WeeklySchedule levelId={levelId} scopeLabel={levelName} title={`جدول ${levelName}`} />
      </Section>

      <Section
        title="الفصول"
        subtitle="مواعيد أسبوعية ثابتة — اضغطي الفصل لفتح حصته القادمة"
        action={{ label: "إضافة فصل", icon: "plus", onPress: () => router.push(addClassHref) }}
      >
        {offersQuery.isLoading ? (
          <View style={styles.gap2}>
            <Skeleton height={84} radiusSize={radius.lg} />
            <Skeleton height={84} radiusSize={radius.lg} />
          </View>
        ) : offersQuery.isError ? (
          <ErrorState compact message={(offersQuery.error as Error).message} onRetry={() => offersQuery.refetch()} />
        ) : offers.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="calendar-blank-outline"
              title="لا فصول لهذا المستوى بعد"
              description="أضيفي فصلاً (مادة + يوم + وقت + معلمة) ليتكرر في الجدول كل أسبوع"
              actionLabel="إضافة فصل"
              onAction={() => router.push(addClassHref)}
            />
          </Card>
        ) : (
          <View style={styles.gap2}>
            {offers.map((offer) => (
              <ClassOfferCard
                key={offer.id}
                offer={offer}
                onPress={() => openOffer(offer)}
                onMenu={() => setMenuOffer(offer)}
              />
            ))}
          </View>
        )}
      </Section>

      <Section title="المواد" subtitle="التحضير والدرجات لكل مادة">
        <SubjectGrid
          offers={offers}
          onOpen={(subjectIndex) => router.push(`/main/subject/${levelId}/${subjectIndex}` as Href)}
        />
      </Section>

      <Section title="قائمة الطالبات" subtitle={studentsCountLabel(studentCount)}>
        {students.length > 0 ? (
          <View style={styles.toolbar}>
            {students.length > 8 ? (
              <View style={styles.flex}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="ابحثي بالاسم أو الرقم المدني" />
              </View>
            ) : (
              <View style={styles.flex} />
            )}
            <Button
              variant="secondary"
              size="sm"
              icon="microsoft-excel"
              loading={exporting}
              onPress={exportStudents}
              accessibilityLabel="تصدير قائمة الطالبات Excel"
            >
              Excel
            </Button>
          </View>
        ) : null}
        {studentsQuery.isLoading ? (
          <SkeletonList rows={4} />
        ) : studentsQuery.isError ? (
          <ErrorState compact message={(studentsQuery.error as Error).message} onRetry={() => studentsQuery.refetch()} />
        ) : students.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="account-multiple-plus-outline"
              title="لا توجد طالبات في هذا المستوى"
              description="تظهر الطالبات هنا بعد قبول طلبات التسجيل أو تعيين المستوى من ملف الطالبة"
              actionLabel="إضافة طالبة"
              onAction={() => router.push("/main/add-student" as Href)}
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Text variant="body" color="textSecondary" align="center" style={styles.noResults}>
            لا نتائج مطابقة للبحث
          </Text>
        ) : (
          <Card padding={0} style={styles.listCard}>
            {filtered.map((student, index) => (
              <LevelStudentRow
                key={student.id}
                student={student}
                index={index}
                divider={index < filtered.length - 1}
                onPress={() => router.push(`/main/student-profile/${student.id}` as Href)}
              />
            ))}
          </Card>
        )}
      </Section>

      <ClassOfferActionsSheet offer={menuOffer} onClose={() => setMenuOffer(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: space[3] },
  stats: { flexDirection: "row", gap: space[3] },
  gap2: { gap: space[2] },
  toolbar: { flexDirection: "row", alignItems: "center", gap: space[2] },
  listCard: { overflow: "hidden" },
  noResults: { paddingVertical: space[6] },
});
