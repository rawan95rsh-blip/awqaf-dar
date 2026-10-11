import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space } from "@/src/theme";
import {
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Header,
  Screen,
  Section,
  Skeleton,
  Text,
  TextField,
  useToast,
} from "@/src/ui";
import {
  DEFAULT_GRADE_WEIGHTS,
  fetchCenterProfile,
  fetchGradeWeights,
  settingsQueryKeys,
  updateCenterProfile,
  updateGradeWeights,
  type CenterProfile,
} from "@/src/api/settings";
import { CENTER_AUDIENCE_LABELS, GENDER_OPTIONS, type Gender } from "@/src/constants/domain";
import type { GradeWeights } from "@/src/constants/grades";
import { hasCenterLocation, openCenterInMaps } from "@/src/utils/maps";
import WeightStepper from "@/src/components/center/WeightStepper";

const AUDIENCE_OPTIONS = GENDER_OPTIONS.map((g) => ({ id: g.id, label: CENTER_AUDIENCE_LABELS[g.id], icon: g.icon }));

const WEIGHT_FIELDS: Array<{ key: keyof GradeWeights; label: string; hint: string }> = [
  { key: "attendance", label: "الحضور", hint: "الالتزام بالحضور" },
  { key: "shortExam", label: "اختبار قصير", hint: "الاختبارات خلال الفصل" },
  { key: "participation", label: "المشاركة", hint: "التفاعل داخل الحلقة" },
  { key: "final", label: "الاختبار النهائي", hint: "اختبار نهاية المستوى" },
];

function SectionSkeleton() {
  return (
    <Card padding={4} style={styles.skeleton}>
      <Skeleton width="40%" />
      <Skeleton height={48} />
      <Skeleton height={48} />
    </Card>
  );
}

/** بيانات المركز التي تظهر للطالبات عند التسجيل */
function CenterProfileForm({ profile }: { profile: CenterProfile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<Gender>(profile.genderAudience ?? "female");
  const [city, setCity] = useState(profile.city ?? "");
  const [address, setAddress] = useState(profile.addressText ?? "");

  useEffect(() => {
    setAudience(profile.genderAudience ?? "female");
    setCity(profile.city ?? "");
    setAddress(profile.addressText ?? "");
  }, [profile]);

  const dirty =
    audience !== profile.genderAudience ||
    city.trim() !== (profile.city ?? "") ||
    address.trim() !== (profile.addressText ?? "");

  const mutation = useMutation({
    mutationFn: () => updateCenterProfile({ genderAudience: audience, city: city.trim(), addressText: address.trim() }),
    onSuccess: (r) => {
      toast.success(r.message || "تم حفظ بيانات المركز");
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.centerProfile });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const location = { addressText: address, city, nameAr: profile.nameAr };

  return (
    <Card padding={4} style={styles.form}>
      <ChoiceChips<Gender>
        label="نوع المركز"
        options={AUDIENCE_OPTIONS}
        value={audience}
        onChange={(v: Gender) => setAudience(v)}
      />
      <TextField
        label="المدينة / المنطقة"
        value={city}
        onChangeText={setCity}
        placeholder="مثال: حولي"
        maxLength={100}
        icon="city-variant-outline"
      />
      <TextField
        label="العنوان"
        value={address}
        onChangeText={setAddress}
        placeholder="القطعة، الشارع، أقرب معلم"
        multiline
        maxLength={300}
        showCounter
      />
      {hasCenterLocation(location) ? (
        <Card tone="primary" padding={3} onPress={() => void openCenterInMaps(location)} style={styles.maps}>
          <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
          <View style={styles.flex}>
            <Text variant="label">معاينة في الخرائط</Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {[address.trim(), city.trim()].filter(Boolean).join("، ")}
            </Text>
          </View>
          <MaterialCommunityIcons name="open-in-new" size={18} color={colors.primary} />
        </Card>
      ) : null}
      <Button onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!dirty} icon="content-save-outline">
        {dirty ? "حفظ بيانات المركز" : "البيانات محفوظة"}
      </Button>
    </Card>
  );
}

/** أوزان الدرجات الافتراضية — يجب أن يساوي مجموعها 100 */
function GradeWeightsForm({ saved }: { saved: GradeWeights }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<GradeWeights>(saved);

  useEffect(() => setWeights(saved), [saved]);

  const total = useMemo(
    () => weights.attendance + weights.shortExam + weights.participation + weights.final,
    [weights]
  );
  const diff = 100 - total;
  const valid = diff === 0;
  const dirty = WEIGHT_FIELDS.some((f) => weights[f.key] !== saved[f.key]);
  const isDefault = WEIGHT_FIELDS.every((f) => weights[f.key] === DEFAULT_GRADE_WEIGHTS[f.key]);

  const mutation = useMutation({
    mutationFn: () => updateGradeWeights(weights),
    onSuccess: (r) => {
      toast.success(r.message || "تم حفظ أوزان الدرجات");
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.gradeWeights });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const totalTone = valid ? "success" : "danger";
  const totalHint = valid ? "المجموع مكتمل" : diff > 0 ? `أضيفي ${diff} درجة` : `أنقصي ${-diff} درجة`;

  return (
    <Card padding={4} style={styles.form}>
      <View>
        {WEIGHT_FIELDS.map((field) => (
          <WeightStepper
            key={field.key}
            label={field.label}
            hint={field.hint}
            value={weights[field.key]}
            onChange={(v) => setWeights((prev) => ({ ...prev, [field.key]: v }))}
            disabled={mutation.isPending}
          />
        ))}
      </View>

      <View style={styles.total} accessible accessibilityLabel={`المجموع ${total} من 100 — ${totalHint}`}>
        <View style={styles.totalHead}>
          <Text variant="bodyStrong">المجموع</Text>
          <Text variant="headline" color={totalTone} tabular>
            {`${total} / 100`}
          </Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.min(total, 100)}%`, backgroundColor: valid ? colors.success : colors.danger },
            ]}
          />
        </View>
        <Text variant="caption" color={totalTone}>
          {totalHint}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          variant="ghost"
          onPress={() => setWeights({ ...DEFAULT_GRADE_WEIGHTS })}
          disabled={isDefault || mutation.isPending}
          icon="restore"
        >
          الافتراضي
        </Button>
        <Button
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!valid || !dirty}
          icon="content-save-outline"
          style={styles.flex}
        >
          حفظ الأوزان
        </Button>
      </View>
    </Card>
  );
}

/** إعدادات المركز: الملف التعريفي + أوزان الدرجات */
export default function SettingsScreen() {
  const profileQuery = useQuery({ queryKey: settingsQueryKeys.centerProfile, queryFn: fetchCenterProfile });
  const weightsQuery = useQuery({ queryKey: settingsQueryKeys.gradeWeights, queryFn: fetchGradeWeights });

  return (
    <Screen
      header={<Header back={"/main/more" as Href} title="إعدادات المركز" subtitle={profileQuery.data?.nameAr} />}
      refreshing={profileQuery.isRefetching || weightsQuery.isRefetching}
      onRefresh={() => {
        void profileQuery.refetch();
        void weightsQuery.refetch();
      }}
    >
      <Section title="بيانات المركز" subtitle="تظهر للطالبات عند اختيار المركز في التسجيل" style={styles.first}>
        {profileQuery.isLoading ? (
          <SectionSkeleton />
        ) : profileQuery.isError || !profileQuery.data ? (
          <ErrorState compact message={profileQuery.error?.message} onRetry={() => void profileQuery.refetch()} />
        ) : (
          <CenterProfileForm profile={profileQuery.data} />
        )}
      </Section>

      <Section title="أوزان الدرجات" subtitle="توزيع درجة كل مادة (من 100) — المجموع يجب أن يساوي 100">
        {weightsQuery.isLoading ? (
          <SectionSkeleton />
        ) : weightsQuery.isError || !weightsQuery.data ? (
          <ErrorState compact message={weightsQuery.error?.message} onRetry={() => void weightsQuery.refetch()} />
        ) : (
          <GradeWeightsForm saved={weightsQuery.data} />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  first: { marginTop: space[2] },
  form: { gap: space[4] },
  skeleton: { gap: space[3] },
  maps: { flexDirection: "row", alignItems: "center", gap: space[3] },
  total: {
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  totalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill },
  actions: { flexDirection: "row", gap: space[2] },
});
