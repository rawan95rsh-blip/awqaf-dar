import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { radius, space } from "@/src/theme";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  ListItem,
  Screen,
  Section,
  Skeleton,
  StatTile,
} from "@/src/ui";
import LevelTile from "@/src/components/levels/LevelTile";
import { TRACK_ICONS } from "@/src/components/levels/helpers";
import { useAuth } from "@/src/context/AuthContext";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { levelsOfTrack } from "@/src/api/classOffers";
import { coursesQueryKeys, listCourses } from "@/src/api/courses";
import type { LevelTrack } from "@/src/constants/domain";
import type { LevelListItem } from "@/src/types/level";

const TRACK_SECTIONS: Array<{ track: LevelTrack; title: string; subtitle: string; empty: string }> = [
  {
    track: "preparatory",
    title: "مستويات التمهيدي",
    subtitle: "من تمهيدي أول إلى تمهيدي سادس",
    empty: "لا توجد مستويات تمهيدي بعد",
  },
  {
    track: "mutor",
    title: "مستويات المطور",
    subtitle: "من مطور أول إلى مطور ثامن",
    empty: "لا توجد مستويات مطور بعد",
  },
];

export default function LevelsTabScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });

  const coursesQuery = useQuery({
    queryKey: coursesQueryKeys.list(),
    queryFn: listCourses,
    enabled: !!centerId,
  });

  const levels = useMemo(() => levelsQuery.data ?? [], [levelsQuery.data]);
  const courses = coursesQuery.data ?? [];
  const totalStudents = levels.reduce((sum, level) => sum + (level.studentCount ?? 0), 0);
  const levelsLoading = levelsQuery.isLoading || (!centerId && !levelsQuery.isError);

  const openLevel = (level: LevelListItem) => router.push(`/main/level/${level.id}` as Href);

  return (
    <Screen
      withTabBar
      refreshing={levelsQuery.isRefetching || coursesQuery.isRefetching}
      onRefresh={() => {
        void levelsQuery.refetch();
        void coursesQuery.refetch();
      }}
      header={
        <Header
          large
          title="المستويات"
          subtitle="الفصول والجداول والدرجات لكل مستوى"
          actions={
            <IconButton
              icon="calendar-plus"
              accessibilityLabel="إضافة فصل جديد"
              variant="primary"
              onPress={() => router.push("/main/add-class" as Href)}
            />
          }
        />
      }
    >
      <View style={styles.stats}>
        <StatTile label="مستوى" value={levelsLoading ? "…" : levels.length} icon="layers-outline" />
        <StatTile
          label="طالبة في المستويات"
          value={levelsLoading ? "…" : totalStudents}
          icon="account-group-outline"
          tone="info"
          onPress={() => router.navigate("/main/students" as Href)}
        />
        <StatTile
          label="دورة علمية"
          value={coursesQuery.isLoading ? "…" : courses.length}
          icon="certificate-outline"
          tone="accent"
        />
      </View>

      {levelsQuery.isError ? (
        <Section>
          <ErrorState message={(levelsQuery.error as Error).message} onRetry={() => levelsQuery.refetch()} />
        </Section>
      ) : (
        TRACK_SECTIONS.map((section) => {
          const trackLevels = levelsOfTrack(levels, section.track);
          return (
            <Section
              key={section.track}
              title={section.title}
              subtitle={section.subtitle}
              action={{
                label: "مستوى جديد",
                icon: "plus",
                onPress: () => router.push(`/main/add-level?track=${section.track}` as Href),
              }}
            >
              {levelsLoading ? (
                <View style={styles.grid}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={styles.skeletonTile}>
                      <Skeleton height={104} radiusSize={radius.lg} />
                    </View>
                  ))}
                </View>
              ) : trackLevels.length === 0 ? (
                <Card>
                  <EmptyState
                    compact
                    icon={TRACK_ICONS[section.track]}
                    title={section.empty}
                    description="أضيفي المستويات لتظهر هنا مع فصولها وطالباتها"
                    actionLabel="إضافة مستوى"
                    onAction={() => router.push(`/main/add-level?track=${section.track}` as Href)}
                  />
                </Card>
              ) : (
                <View style={styles.grid}>
                  {trackLevels.map((level) => (
                    <LevelTile key={level.id} level={level} onPress={() => openLevel(level)} />
                  ))}
                </View>
              )}
            </Section>
          );
        })
      )}

      <Section
        title="الدورات العلمية"
        subtitle="دورات قصيرة باسم يحدده المركز (أعمال القلوب، المواريث…)"
        action={{ label: "إضافة دورة", icon: "plus", onPress: () => router.push("/main/add-course" as Href) }}
      >
        {coursesQuery.isLoading ? (
          <View style={styles.coursesSkeleton}>
            <Skeleton height={60} radiusSize={radius.md} />
            <Skeleton height={60} radiusSize={radius.md} />
          </View>
        ) : coursesQuery.isError ? (
          <ErrorState compact message={(coursesQuery.error as Error).message} onRetry={() => coursesQuery.refetch()} />
        ) : courses.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="certificate-outline"
              title="لا توجد دورات علمية بعد"
              description="أنشئي دورة ثم أضيفي لها فصلاً بموعد أسبوعي"
              actionLabel="إضافة دورة"
              onAction={() => router.push("/main/add-course" as Href)}
            />
          </Card>
        ) : (
          <Card padding={0} style={styles.listCard}>
            {courses.map((course, index) => (
              <ListItem
                key={course.id}
                title={course.name}
                subtitle={course.description || "دورة علمية"}
                leadingIcon="certificate-outline"
                leadingTone="accent"
                onPress={() => router.push(`/main/course/${course.id}` as Href)}
                divider={index < courses.length - 1}
              />
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: space[3] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  skeletonTile: { flexBasis: "47%", flexGrow: 1 },
  coursesSkeleton: { gap: space[2] },
  listCard: { overflow: "hidden" },
});
