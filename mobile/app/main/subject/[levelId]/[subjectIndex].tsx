import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import { Card, EmptyState, ErrorState, Header, Screen, Section, Skeleton, Text } from "@/src/ui";
import ClassOfferCard from "@/src/components/levels/ClassOfferCard";
import ClassOfferActionsSheet from "@/src/components/levels/ClassOfferActionsSheet";
import HubActionCard from "@/src/components/levels/HubActionCard";
import { studentsCountLabel } from "@/src/components/levels/helpers";
import { fetchLevelById, fetchLevelStudents, levelQueryKeys } from "@/src/api/levels";
import { classOffersQueryKeys, listClassOffers } from "@/src/api/classOffers";
import { attendanceQueryKeys, fetchAttendance, formatAttendanceDate } from "@/src/api/attendance";
import { fetchGrades, gradesQueryKeys } from "@/src/api/grades";
import { SUBJECT_ICONS, SUBJECT_NAMES, subjectName } from "@/src/constants/domain";
import type { ClassOfferItem } from "@/src/types/classOffer";

/** صفحة المادة داخل المستوى: كشف التحضير + سجل الدرجات + مواعيد المادة */
export default function SubjectScreen() {
  const params = useLocalSearchParams<{ levelId: string; subjectIndex: string }>();
  const levelId = params.levelId ?? "";
  const parsed = Number.parseInt(params.subjectIndex ?? "0", 10);
  const subjectIdx = Number.isInteger(parsed) && parsed >= 0 && parsed < SUBJECT_NAMES.length ? parsed : 0;
  const name = subjectName(subjectIdx);
  const router = useRouter();
  const today = formatAttendanceDate();
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
  const offersQuery = useQuery({
    queryKey: classOffersQueryKeys.list({ levelId }),
    queryFn: () => listClassOffers({ levelId }),
    enabled: !!levelId,
  });
  const todayQuery = useQuery({
    queryKey: attendanceQueryKeys.sheet(levelId, subjectIdx, today),
    queryFn: () => fetchAttendance(levelId, subjectIdx, today),
    enabled: !!levelId,
  });
  const gradesQuery = useQuery({
    queryKey: gradesQueryKeys.sheet(levelId, subjectIdx),
    queryFn: () => fetchGrades(levelId, subjectIdx),
    enabled: !!levelId,
  });

  const level = levelQuery.data;
  const levelName = level?.shortName || level?.fullName || "";
  const studentTotal = studentsQuery.data?.length ?? level?.studentCount ?? 0;
  const offers = useMemo(
    () =>
      (offersQuery.data ?? [])
        .filter((o) => o.subjectIndex === subjectIdx)
        .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
    [offersQuery.data, subjectIdx]
  );
  const teachers = Array.from(new Set(offers.map((o) => o.teacherName)));

  const takenToday = todayQuery.data?.records.length ?? 0;
  const gradedCount = gradesQuery.data?.records.length ?? 0;

  const attendanceStatus = todayQuery.isError
    ? "تعذّر التحقق من تحضير اليوم"
    : takenToday === 0
      ? "لم يُسجَّل تحضير اليوم بعد"
      : `اليوم: سُجّل تحضير ${takenToday} من ${studentTotal}`;
  const gradesStatus = gradesQuery.isError
    ? "تعذّر التحقق من الدرجات"
    : gradedCount === 0
      ? "لم تُرصد أي درجة بعد"
      : `رُصدت درجات ${gradedCount} من ${studentTotal}`;

  const addClassHref = `/main/add-class?levelId=${encodeURIComponent(levelId)}&subjectIndex=${subjectIdx}` as Href;

  if (!levelId) {
    return (
      <Screen header={<Header back={"/main/classes" as Href} title={name} />}>
        <ErrorState message="لم يُحدَّد المستوى" />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header back={`/main/level/${levelId}` as Href} title={name} subtitle={levelName || undefined} />}
      refreshing={levelQuery.isRefetching || todayQuery.isRefetching || gradesQuery.isRefetching}
      onRefresh={() => {
        void levelQuery.refetch();
        void studentsQuery.refetch();
        void offersQuery.refetch();
        void todayQuery.refetch();
        void gradesQuery.refetch();
      }}
    >
      {levelQuery.isError ? (
        <ErrorState message={(levelQuery.error as Error).message} onRetry={() => levelQuery.refetch()} />
      ) : (
        <>
          <Card style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name={SUBJECT_ICONS[subjectIdx] ?? "book-outline"} size={28} color={colors.onPrimary} />
            </View>
            <View style={styles.flex}>
              <Text variant="title">{name}</Text>
              {levelQuery.isLoading ? (
                <Skeleton height={14} width="50%" />
              ) : (
                <Text variant="caption" color="textSecondary">
                  {`${level?.fullName ?? ""} · ${studentsCountLabel(studentTotal)}`}
                </Text>
              )}
              {teachers.length ? (
                <Text variant="caption" color="primary" numberOfLines={1}>
                  {`المعلمة: ${teachers.join("، ")}`}
                </Text>
              ) : null}
            </View>
          </Card>

          <View style={styles.actions}>
            <HubActionCard
              icon="clipboard-check-outline"
              title="كشف التحضير"
              status={attendanceStatus}
              progress={studentTotal ? takenToday / studentTotal : null}
              loading={todayQuery.isLoading}
              onPress={() => router.push(`/main/attendance/${levelId}/${subjectIdx}?date=${today}` as Href)}
            />
            <HubActionCard
              icon="notebook-edit-outline"
              title="سجل الدرجات"
              status={gradesStatus}
              progress={studentTotal ? gradedCount / studentTotal : null}
              tone="accent"
              loading={gradesQuery.isLoading}
              onPress={() => router.push(`/main/grades/${levelId}/${subjectIdx}` as Href)}
            />
          </View>

          <Section
            title="مواعيد المادة"
            subtitle={`فصول ${name} لهذا المستوى`}
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
                  title={`لا يوجد فصل ${name} لهذا المستوى`}
                  description="أضيفي موعداً أسبوعياً ومعلمة لهذه المادة"
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
                        : setMenuOffer(offer)
                    }
                  />
                ))}
              </View>
            )}
          </Section>
        </>
      )}

      <ClassOfferActionsSheet offer={menuOffer} onClose={() => setMenuOffer(null)} showSubjectLink={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: "row", alignItems: "center", gap: space[4] },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { gap: space[3], marginTop: space[4] },
  list: { gap: space[2] },
});
