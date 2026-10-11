import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, shadows, space } from "@/src/theme";
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, Text } from "@/src/ui";
import { SUBJECT_ICONS } from "@/src/constants/domain";
import { SESSION_MODE_LABELS, type SessionItem } from "@/src/types/session";
import { formatTime } from "@/src/utils/format";
import { openZoomUrl } from "@/src/utils/openZoomUrl";
import SessionCheckIn from "./SessionCheckIn";
import { countdownLabel, dayLabel, isCheckInWindowOpen } from "./sessionTiming";
import { heroGlass, heroGlassStrong } from "./tokens";

/**
 * بطاقة «حصتكِ القادمة» — أهم معلومة للطالبة: متى، ومع من، وزر التحضير/Zoom في وقته.
 */
export default function NextSessionHero({
  session,
  now,
  loading,
  error,
  onRetry,
  onOpen,
  hasLevel,
}: {
  session: SessionItem | null;
  now: Date;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onOpen: (id: string) => void;
  hasLevel: boolean;
}) {
  if (loading) {
    return (
      <View style={[styles.hero, styles.heroLoading]}>
        <Skeleton width="40%" height={14} style={styles.skeletonOnHero} />
        <Skeleton width="70%" height={26} style={styles.skeletonOnHero} />
        <Skeleton width="55%" height={14} style={styles.skeletonOnHero} />
      </View>
    );
  }

  if (error) {
    return (
      <Card padding={2}>
        <ErrorState compact message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!session) {
    return (
      <Card padding={2}>
        <EmptyState
          compact
          icon={hasLevel ? "calendar-check-outline" : "layers-off-outline"}
          title={hasLevel ? "لا حصص قادمة لمستواكِ" : "لم يُحدَّد مستواكِ بعد"}
          description={
            hasLevel
              ? "سيظهر هنا موعد حصتكِ القادمة فور جدولتها — تصفّحي جدول المركز من تبويب «جدولي»"
              : "ستظهر حصصكِ هنا بعد أن يضيفكِ المركز إلى مستوى دراسي"
          }
        />
      </Card>
    );
  }

  const countdown = countdownLabel(session, now);
  const windowOpen = isCheckInWindowOpen(session, now);
  const hasZoom = session.mode !== "in_person" && !!session.zoomUrl?.trim();
  const meta = [session.teacherName, SESSION_MODE_LABELS[session.mode]].filter(Boolean).join(" · ");

  return (
    <View style={styles.hero} accessibilityLabel={`حصتكِ القادمة: ${session.title}، ${countdown.text}`}>
      <View style={styles.topRow}>
        <View style={styles.eyebrow}>
          <MaterialCommunityIcons name="bell-ring-outline" size={14} color={colors.accentMuted} />
          <Text variant="eyebrow" style={styles.eyebrowText}>
            حصتكِ القادمة
          </Text>
        </View>
        <Badge label={countdown.text} tone={windowOpen ? "accent" : "primary"} size="sm" />
      </View>

      <View style={styles.mainRow}>
        <View style={styles.subjectIcon}>
          <MaterialCommunityIcons
            name={SUBJECT_ICONS[session.subjectIndex] ?? "book-open-variant"}
            size={26}
            color={colors.onPrimary}
          />
        </View>
        <View style={styles.flex}>
          <Text variant="title" style={styles.onHero} numberOfLines={2}>
            {session.title}
          </Text>
          <Text variant="body" style={styles.onHeroSoft} tabular>
            {`${dayLabel(session.startAt, now)} · ${formatTime(session.startAt)} – ${formatTime(session.endAt)}`}
          </Text>
          {meta ? (
            <Text variant="caption" style={styles.onHeroSoft} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>

      {windowOpen ? (
        <View style={styles.checkIn}>
          <SessionCheckIn session={session} appearance="hero" />
        </View>
      ) : null}

      <View style={styles.actions}>
        {hasZoom ? (
          <Button
            variant={windowOpen ? "accent" : "secondary"}
            size="sm"
            icon="video-outline"
            onPress={() => void openZoomUrl(session.zoomUrl)}
            style={styles.action}
            accessibilityLabel="انضمي إلى الحصة عبر Zoom"
          >
            انضمي عبر Zoom
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          icon="information-outline"
          onPress={() => onOpen(session.id)}
          style={[styles.action, styles.detailsBtn]}
          accessibilityLabel="تفاصيل الحصة"
        >
          <Text variant="label" style={styles.onHero}>
            تفاصيل الحصة
          </Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: space[5],
    gap: space[4],
    overflow: "hidden",
    ...shadows.md,
  },
  heroLoading: { gap: space[3] },
  skeletonOnHero: { backgroundColor: heroGlass },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrowText: { color: colors.accentMuted },
  mainRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  subjectIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: heroGlassStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  onHero: { color: colors.onPrimary },
  onHeroSoft: { color: colors.primaryMuted },
  checkIn: {
    backgroundColor: heroGlass,
    borderRadius: radius.lg,
    padding: space[3],
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  action: { flexGrow: 1 },
  detailsBtn: { backgroundColor: heroGlass },
});
