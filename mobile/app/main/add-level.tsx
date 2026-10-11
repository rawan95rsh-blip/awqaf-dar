import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { space } from "@/src/theme";
import {
  Badge,
  Banner,
  Button,
  Card,
  ChoiceCards,
  ChoiceChips,
  ErrorState,
  Header,
  InfoRow,
  Screen,
  Skeleton,
  Text,
  TextField,
  useToast,
} from "@/src/ui";
import {
  TRACK_ICONS,
  TRACK_RANGES,
  suggestedFullName,
  suggestedShortName,
} from "@/src/components/levels/helpers";
import { useAuth } from "@/src/context/AuthContext";
import { createLevel, fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { levelsOfTrack } from "@/src/api/classOffers";
import { TRACK_LABELS, type LevelTrack } from "@/src/constants/domain";

const TRACK_CHOICES: Array<{ id: LevelTrack; label: string; description: string; icon: (typeof TRACK_ICONS)[LevelTrack] }> = [
  { id: "preparatory", label: "تمهيدي", description: "سلّم من 6 مستويات", icon: TRACK_ICONS.preparatory },
  { id: "mutor", label: "مطور", description: "سلّم من 8 مستويات", icon: TRACK_ICONS.mutor },
];

function isLevelTrack(value: unknown): value is LevelTrack {
  return value === "preparatory" || value === "mutor";
}

type Errors = Partial<Record<"track" | "order" | "fullName", string>>;

export default function AddLevelScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ track?: string }>();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";

  const [track, setTrack] = useState<LevelTrack | null>(isLevelTrack(params.track) ? params.track : null);
  const [order, setOrder] = useState<number | null>(null);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [namesTouched, setNamesTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });

  const existing = useMemo(
    () => (track ? levelsOfTrack(levelsQuery.data ?? [], track) : []),
    [levelsQuery.data, track]
  );

  /** الترتيبات المتاحة: الفراغات في السلّم + الترتيب التالي بعد آخر مستوى */
  const freeOrders = useMemo(() => {
    if (!track) return [];
    const taken = new Set(existing.map((l) => l.order));
    const upper = Math.max(TRACK_RANGES[track], ...existing.map((l) => l.order)) + 1;
    const free: number[] = [];
    for (let n = 1; n <= upper; n += 1) if (!taken.has(n)) free.push(n);
    return free;
  }, [existing, track]);

  // اقتراح أول ترتيب متاح عند تغيير المسار
  useEffect(() => {
    if (!track || !levelsQuery.data) return;
    setOrder((current) => (current != null && freeOrders.includes(current) ? current : freeOrders[0] ?? null));
  }, [track, freeOrders, levelsQuery.data]);

  // تعبئة الأسماء تلقائياً بنمط المركز ما لم تعدّلها المشرفة
  useEffect(() => {
    if (namesTouched || !track || order == null) return;
    setShortName(suggestedShortName(track, order));
    setFullName(suggestedFullName(track, order));
  }, [track, order, namesTouched]);

  const mutation = useMutation({
    mutationFn: () =>
      createLevel({
        track: track!,
        order: order!,
        fullName: fullName.trim(),
        shortName: shortName.trim() || undefined,
      }),
    onSuccess: (level) => {
      void queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success(`أُضيف مستوى «${level.shortName || level.fullName}»`);
      router.replace(`/main/level/${level.id}` as Href);
    },
  });

  const submit = () => {
    const e: Errors = {};
    if (!track) e.track = "اختاري المسار";
    if (order == null) e.order = "اختاري ترتيب المستوى";
    else if (existing.some((l) => l.order === order)) e.order = "يوجد مستوى بنفس الترتيب في هذا المسار";
    if (fullName.trim().length < 3) e.fullName = "اكتبي الاسم الكامل للمستوى";
    setErrors(e);
    if (Object.keys(e).length) return;
    mutation.mutate();
  };

  const editName = (setter: (v: string) => void) => (value: string) => {
    setNamesTouched(true);
    setter(value);
    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
  };

  return (
    <Screen
      header={<Header back={"/main/classes" as Href} title="مستوى جديد" />}
      footer={
        <Button fullWidth size="lg" icon="check" onPress={submit} loading={mutation.isPending} disabled={levelsQuery.isLoading}>
          إضافة المستوى
        </Button>
      }
    >
      <View style={styles.form}>
        {mutation.isError ? (
          <Banner tone="danger" title="تعذّر إضافة المستوى">
            {(mutation.error as Error).message}
          </Banner>
        ) : null}

        <ChoiceCards
          label="المسار"
          required
          options={TRACK_CHOICES}
          value={track}
          onChange={(value) => {
            setTrack(value);
            setErrors((prev) => ({ ...prev, track: undefined, order: undefined }));
          }}
          error={errors.track}
        />

        {track ? (
          <View style={styles.group}>
            <Text variant="label">{`مستويات ${TRACK_LABELS[track]} الحالية`}</Text>
            {levelsQuery.isLoading ? (
              <Skeleton height={28} width="70%" />
            ) : levelsQuery.isError ? (
              <ErrorState compact message={(levelsQuery.error as Error).message} onRetry={() => levelsQuery.refetch()} />
            ) : existing.length === 0 ? (
              <Text variant="caption" color="textMuted">
                لا توجد مستويات في هذا المسار بعد
              </Text>
            ) : (
              <View style={styles.badges}>
                {existing.map((level) => (
                  <Badge key={level.id} label={`${level.order} · ${level.shortName}`} tone="neutral" />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {track && levelsQuery.data ? (
          <ChoiceChips
            label="ترتيب المستوى في السلّم"
            required
            options={freeOrders.map((n) => ({ id: String(n), label: String(n) }))}
            value={order == null ? null : String(order)}
            onChange={(value: string) => {
              setOrder(Number(value));
              setErrors((prev) => ({ ...prev, order: undefined }));
            }}
            error={errors.order}
          />
        ) : null}

        {track ? (
          <>
            <TextField
              label="الاسم المختصر"
              hint="يظهر في القوائم والجداول — مثل «مطور أول»"
              value={shortName}
              onChangeText={editName(setShortName)}
              maxLength={40}
            />
            <TextField
              label="الاسم الكامل"
              required
              value={fullName}
              onChangeText={editName(setFullName)}
              maxLength={80}
              error={errors.fullName}
            />
          </>
        ) : null}

        {track && order != null ? (
          <Card tone="primary">
            <InfoRow label="المسار" value={TRACK_LABELS[track]} />
            <InfoRow label="الترتيب" value={String(order)} />
            <InfoRow label="الاسم" value={shortName.trim() || fullName.trim()} last />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[5], paddingTop: space[2] },
  group: { gap: space[2] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
