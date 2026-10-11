import { useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, space } from "@/src/theme";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  InfoRow,
  ListItem,
  LoadingState,
  PromptSheet,
  Screen,
  Section,
  SelectField,
  StatTile,
  Text,
  useToast,
} from "@/src/ui";
import {
  fetchStudentById,
  promoteStudent,
  reinstateStudent,
  studentQueryKeys,
  suspendStudent,
  updateStudent,
  updateStudentEnrollmentStatus,
} from "@/src/api/students";
import { fetchStudentAttendance, fetchStudentGrades, gradesQueryKeys } from "@/src/api/grades";
import { fetchPublicCenters } from "@/src/api/registrationRequests";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import {
  cancelTransfer,
  createTransfer,
  listCenterTransfers,
  TRANSFER_STATUS_LABELS,
  transferQueryKeys,
} from "@/src/api/transfers";
import { useAuth } from "@/src/context/AuthContext";
import AttendanceCalendar from "@/src/components/AttendanceCalendar";
import DocumentViewer from "@/src/components/DocumentViewer";
import {
  ENROLLMENT_ACTION_LABELS,
  ENROLLMENT_LABELS,
  ENROLLMENT_TONES,
  PERFORMANCE,
  STUDENT_TYPE_LABELS,
  TRACK_LABELS,
  academicLevelLabel,
  nationalityLabel,
  occupationLabel,
  subjectName,
} from "@/src/constants/domain";
import { formatPhone } from "@/src/constants/phone";
import { formatAddress } from "@/src/types/student";
import { formatDateLong, formatDateShort } from "@/src/utils/format";

type Dialog = null | "suspend" | "reinstate" | "transfer" | "graduate" | "notes";

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = id ?? "";
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";
  const [dialog, setDialog] = useState<Dialog>(null);
  const [transferCenterId, setTransferCenterId] = useState<string | null>(null);
  const [reinstateLevelId, setReinstateLevelId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: studentQueryKeys.detail(studentId),
    queryFn: () => fetchStudentById(studentId),
    enabled: !!studentId,
  });
  const gradesQuery = useQuery({
    queryKey: gradesQueryKeys.student(studentId),
    queryFn: () => fetchStudentGrades(studentId),
    enabled: !!studentId,
  });
  const attendanceQuery = useQuery({
    queryKey: gradesQueryKeys.studentAttendance(studentId),
    queryFn: () => fetchStudentAttendance(studentId),
    enabled: !!studentId,
  });
  const transfersQuery = useQuery({ queryKey: transferQueryKeys.center, queryFn: listCenterTransfers });
  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: dialog === "reinstate" && !!centerId,
  });

  const profile = profileQuery.data;
  const centersQuery = useQuery({
    queryKey: ["public-centers", profile?.gender ?? "female"],
    queryFn: () => fetchPublicCenters(profile?.gender ?? "female"),
    enabled: dialog === "transfer" && !!profile,
  });

  const openTransfer = useMemo(
    () =>
      (transfersQuery.data ?? []).find(
        (t) => t.studentId === studentId && (t.status === "pending_source" || t.status === "pending_destination")
      ),
    [transfersQuery.data, studentId]
  );

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: transferQueryKeys.center });
    void queryClient.invalidateQueries({ queryKey: ["level-students"] });
    void queryClient.invalidateQueries({ queryKey: ["levels"] });
  };

  const onDone = (message?: string) => {
    setDialog(null);
    refreshAll();
    if (message) toast.success(message);
  };
  const onFail = (err: Error) => toast.error(err.message);

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => suspendStudent(studentId, reason),
    onSuccess: (r) => onDone(r.message),
    onError: onFail,
  });
  const reinstateMutation = useMutation({
    mutationFn: (reason: string) => reinstateStudent(studentId, { reason, levelId: reinstateLevelId ?? undefined }),
    onSuccess: (r) => onDone(r.message),
    onError: onFail,
  });
  const graduateMutation = useMutation({
    mutationFn: (reason: string) => updateStudentEnrollmentStatus(studentId, "graduated", reason),
    onSuccess: () => onDone("تم تعيين الطالبة خريجة — بارك الله فيها"),
    onError: onFail,
  });
  const promoteMutation = useMutation({
    mutationFn: () => promoteStudent(studentId),
    onSuccess: (r) => onDone(r.message),
    onError: onFail,
  });
  const transferMutation = useMutation({
    mutationFn: (reason: string) => createTransfer({ studentId, toCenterId: transferCenterId!, reason }),
    onSuccess: (r) => onDone(r.message),
    onError: onFail,
  });
  const cancelTransferMutation = useMutation({
    mutationFn: (transferId: string) => cancelTransfer(transferId),
    onSuccess: (r) => onDone(r.message),
    onError: onFail,
  });
  const notesMutation = useMutation({
    mutationFn: (notes: string) => updateStudent(studentId, { notes }),
    onSuccess: () => onDone("تم حفظ الملاحظات"),
    onError: onFail,
  });

  if (profileQuery.isLoading) {
    return (
      <Screen header={<Header back={"/main/students" as Href} title="ملف الطالبة" />}>
        <LoadingState />
      </Screen>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Screen header={<Header back={"/main/students" as Href} title="ملف الطالبة" />}>
        <ErrorState message={(profileQuery.error as Error)?.message} onRetry={() => profileQuery.refetch()} />
      </Screen>
    );
  }

  const status = profile.enrollmentStatus;
  const perf = PERFORMANCE[profile.status] ?? PERFORMANCE.regular;
  const isEnrolled = status === "enrolled";
  const canPromote =
    isEnrolled && !!profile.level && !(profile.level.track === "mutor" && profile.level.order >= 8);
  const calendar = attendanceQuery.data?.calendar ?? profile.attendanceCalendar ?? [];
  const grades = gradesQuery.data?.grades ?? [];

  return (
    <Screen
      refreshing={profileQuery.isRefetching}
      onRefresh={() => {
        void profileQuery.refetch();
        void gradesQuery.refetch();
        void attendanceQuery.refetch();
      }}
      header={
        <Header
          back={"/main/students" as Href}
          title="ملف الطالبة"
          actions={
            <IconButton
              icon="pencil-outline"
              accessibilityLabel="تعديل البيانات"
              onPress={() => router.push(`/main/student-edit/${studentId}` as Href)}
            />
          }
        />
      }
    >
      {/* البطاقة التعريفية */}
      <Card padding={5} style={styles.hero}>
        <Avatar name={profile.fullName} uri={profile.photoUrl} size={80} />
        <Text variant="title" align="center">
          {profile.fullName}
        </Text>
        <View style={styles.badges}>
          <Badge label={ENROLLMENT_LABELS[status]} tone={ENROLLMENT_TONES[status]} />
          <Badge
            label={profile.levelShortName || TRACK_LABELS[profile.track]}
            tone="primary"
            icon="layers-outline"
          />
          {profile.studentType ? <Badge label={STUDENT_TYPE_LABELS[profile.studentType]} tone="info" /> : null}
          {isEnrolled ? <Badge label={perf.label} tone={perf.tone} icon={perf.icon} /> : null}
        </View>
        <View style={styles.contactRow}>
          <Button
            variant="tonal"
            size="sm"
            icon="phone-outline"
            onPress={() => Linking.openURL(`tel:+${profile.phone}`)}
          >
            اتصال
          </Button>
          <Button
            variant="tonal"
            size="sm"
            icon="whatsapp"
            onPress={() => Linking.openURL(`https://wa.me/${profile.phone}`)}
          >
            واتساب
          </Button>
        </View>
      </Card>

      {openTransfer ? (
        <View style={styles.spacer}>
          <Banner
            tone="info"
            icon="swap-horizontal"
            title={`طلب نقل إلى ${openTransfer.toCenterName}`}
            action={
              openTransfer.direction === "outgoing" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={cancelTransferMutation.isPending}
                  onPress={() => cancelTransferMutation.mutate(openTransfer.id)}
                  style={styles.bannerAction}
                >
                  إلغاء الطلب
                </Button>
              ) : null
            }
          >
            {TRANSFER_STATUS_LABELS[openTransfer.status]}
          </Banner>
        </View>
      ) : null}

      {status === "suspended" ? (
        <View style={styles.spacer}>
          <Banner tone="danger" title="قيد الطالبة موقوف">
            {profile.enrollmentHistory.find((e) => e.action === "suspended")?.reason ||
              "لا تستطيع الطالبة تسجيل الدخول حتى إعادة القيد"}
          </Banner>
        </View>
      ) : null}

      <View style={styles.stats}>
        <StatTile
          label="الحضور"
          value={(attendanceQuery.data?.attendancePercent ?? profile.attendancePercent) == null ? "—" : `${attendanceQuery.data?.attendancePercent ?? profile.attendancePercent}%`}
          icon="calendar-check"
          tone="success"
        />
        <StatTile label="المعدل" value={profile.gradeAverage ?? "—"} icon="chart-line" tone="accent" />
        <StatTile
          label="أيام الغياب"
          value={attendanceQuery.data?.absentDays ?? profile.absentDays ?? 0}
          icon="calendar-remove"
          tone="danger"
        />
      </View>

      {/* إجراءات القيد */}
      <Section title="إجراءات القيد">
        <Card padding={0} style={styles.listCard}>
          {canPromote ? (
            <ListItem
              title="ترقية للمستوى التالي"
              subtitle={
                profile.level?.track === "preparatory" && profile.level.order === 6
                  ? "من تمهيدي سادس إلى مطور أول"
                  : `المستوى الحالي: ${profile.levelShortName}`
              }
              leadingIcon="arrow-up-bold-circle-outline"
              onPress={() => promoteMutation.mutate()}
              trailing={promoteMutation.isPending ? <Text variant="caption">…</Text> : undefined}
              divider
            />
          ) : null}
          {status !== "suspended" && !openTransfer ? (
            <ListItem
              title="طلب نقل إلى مركز آخر"
              subtitle="يُرسل للمركز الجديد للقبول"
              leadingIcon="swap-horizontal"
              leadingTone="info"
              onPress={() => {
                setTransferCenterId(null);
                setDialog("transfer");
              }}
              divider
            />
          ) : null}
          {status === "enrolled" ? (
            <ListItem
              title="تعيين كخريجة"
              subtitle="عند إتمام المسار"
              leadingIcon="school-outline"
              leadingTone="accent"
              onPress={() => setDialog("graduate")}
              divider
            />
          ) : null}
          {status === "enrolled" ? (
            <ListItem
              title="وقف القيد"
              subtitle="تتوقف الطالبة عن الدخول للتطبيق"
              leadingIcon="account-cancel-outline"
              destructive
              onPress={() => setDialog("suspend")}
            />
          ) : (
            <ListItem
              title="إعادة القيد"
              subtitle={status === "graduated" ? "لمسار جديد أو إعادة دراسة" : "إعادة تفعيل الطالبة"}
              leadingIcon="account-reactivate-outline"
              leadingTone="success"
              onPress={() => {
                setReinstateLevelId(null);
                setDialog("reinstate");
              }}
            />
          )}
        </Card>
      </Section>

      <Section title="البيانات الشخصية" action={{ label: "تعديل", icon: "pencil-outline", onPress: () => router.push(`/main/student-edit/${studentId}` as Href) }}>
        <Card padding={4} style={styles.infoCard}>
          <InfoRow label="الرقم المدني" value={profile.idNumber} icon="card-account-details-outline" selectable />
          <InfoRow label="الهاتف" value={formatPhone(profile.phone)} icon="phone-outline" selectable />
          <InfoRow label="تاريخ الميلاد" value={formatDateLong(profile.dob)} icon="cake-variant-outline" />
          <InfoRow label="الجنسية" value={nationalityLabel(profile.nationality)} icon="flag-outline" />
          <InfoRow label="المؤهل الدراسي" value={academicLevelLabel(profile.academicLevel)} icon="school-outline" />
          <InfoRow label="الوظيفة الحالية" value={occupationLabel(profile.occupation, profile.occupationOther)} icon="briefcase-outline" />
          <InfoRow label="عنوان السكن" value={formatAddress(profile.homeAddress)} icon="home-outline" />
          <InfoRow
            label="المسار"
            value={[TRACK_LABELS[profile.track], profile.trackNote].filter(Boolean).join(" — ")}
            icon="map-marker-path"
          />
          <InfoRow
            label="الدورات"
            value={profile.courses.map((c) => c.name).filter(Boolean).join("، ")}
            icon="certificate-outline"
            last
          />
        </Card>
      </Section>

      <Section title="الملاحظات" action={{ label: profile.notes ? "تعديل" : "إضافة", icon: "pencil-outline", onPress: () => setDialog("notes") }}>
        <Card padding={4} tone={profile.notes ? "accent" : "surface"}>
          <Text variant="body" color={profile.notes ? "text" : "textMuted"}>
            {profile.notes || "لا توجد ملاحظات — أضيفي ما يفيد المعلمات (مقدار الحفظ، ظروف خاصة…)"}
          </Text>
        </Card>
      </Section>

      <Section title="المرفقات">
        <DocumentViewer documents={profile.documents} />
      </Section>

      <Section title="سجل الحضور" subtitle="آخر 30 يوماً">
        <Card padding={4}>
          {calendar.some((d) => d.status) ? (
            <AttendanceCalendar days={calendar} />
          ) : (
            <EmptyState compact icon="calendar-blank-outline" title="لا يوجد تحضير بعد" description="يُسجَّل الحضور من شاشة المادة أو الحصة" />
          )}
        </Card>
      </Section>

      <Section title="الدرجات">
        <Card padding={0} style={styles.listCard}>
          {grades.length === 0 ? (
            <EmptyState compact icon="clipboard-text-outline" title="لا توجد درجات مرصودة" />
          ) : (
            grades.map((g, i) => (
              <ListItem
                key={`${g.levelId}-${g.subjectIndex}`}
                title={subjectName(g.subjectIndex)}
                subtitle={`حضور ${g.breakdown.attendance} · قصير ${g.breakdown.shortExam} · مشاركة ${g.breakdown.participation} · نهائي ${g.breakdown.final}`}
                trailing={
                  <View style={styles.gradeTrail}>
                    <Text variant="headline" tabular>
                      {String(g.total)}
                    </Text>
                    <Badge label={g.label} tone={g.total >= 90 ? "accent" : g.total >= 60 ? "success" : "danger"} size="sm" />
                  </View>
                }
                chevron={false}
                divider={i < grades.length - 1}
              />
            ))
          )}
        </Card>
      </Section>

      {profile.enrollmentHistory.length ? (
        <Section title="سجل القيد">
          <Card padding={4} style={styles.timeline}>
            {profile.enrollmentHistory.map((event, i) => (
              <View key={`${event.action}-${event.at}-${i}`} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{ENROLLMENT_ACTION_LABELS[event.action] ?? event.action}</Text>
                  {event.reason ? (
                    <Text variant="caption" color="textSecondary">
                      {event.reason}
                    </Text>
                  ) : null}
                </View>
                <Text variant="micro" color="textMuted">
                  {event.at ? formatDateShort(event.at) : ""}
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {/* النوافذ */}
      <PromptSheet
        visible={dialog === "suspend"}
        onClose={() => setDialog(null)}
        title="وقف قيد الطالبة"
        message={`لن تتمكن ${profile.fullName} من تسجيل الدخول حتى إعادة القيد. يُحفظ السبب في سجلها.`}
        inputLabel="سبب وقف القيد"
        confirmLabel="وقف القيد"
        confirmVariant="danger"
        loading={suspendMutation.isPending}
        onConfirm={(reason) => suspendMutation.mutate(reason)}
      />
      <PromptSheet
        visible={dialog === "reinstate"}
        onClose={() => setDialog(null)}
        title="إعادة القيد"
        message="تعود الطالبة مسجّلة ويمكنها الدخول مجدداً."
        inputLabel="ملاحظة (اختياري)"
        required={false}
        confirmLabel="إعادة القيد"
        confirmVariant="primary"
        loading={reinstateMutation.isPending}
        onConfirm={(reason) => reinstateMutation.mutate(reason)}
      >
        <SelectField
          label="المستوى عند العودة"
          options={[
            { id: "", label: `كما هو (${profile.levelShortName || "بدون مستوى"})` },
            ...(levelsQuery.data ?? []).map((l) => ({ id: l.id, label: l.shortName })),
          ]}
          value={reinstateLevelId ?? ""}
          onChange={(v) => setReinstateLevelId(v || null)}
        />
      </PromptSheet>
      <PromptSheet
        visible={dialog === "graduate"}
        onClose={() => setDialog(null)}
        title="تعيين كخريجة"
        inputLabel="ملاحظة (اختياري)"
        required={false}
        confirmLabel="تأكيد التخرج"
        loading={graduateMutation.isPending}
        onConfirm={(reason) => graduateMutation.mutate(reason)}
      />
      <PromptSheet
        visible={dialog === "transfer"}
        onClose={() => setDialog(null)}
        title="نقل إلى مركز آخر"
        message="يُرسل الطلب للمركز الجديد، وتنتقل الطالبة بعد قبوله مع حفظ سجلها الأكاديمي."
        inputLabel="سبب النقل"
        required={false}
        confirmLabel="إرسال طلب النقل"
        loading={transferMutation.isPending}
        onConfirm={(reason) => {
          if (!transferCenterId) {
            toast.error("اختاري المركز الجديد");
            return;
          }
          transferMutation.mutate(reason);
        }}
      >
        <SelectField
          label="المركز الجديد"
          required
          options={(centersQuery.data ?? [])
            .filter((c) => c.id !== centerId)
            .map((c) => ({ id: c.id, label: c.nameAr, description: c.city }))}
          value={transferCenterId}
          onChange={setTransferCenterId}
          placeholder={centersQuery.isLoading ? "جاري التحميل…" : "اختاري المركز"}
          emptyText="لا توجد مراكز أخرى متاحة"
        />
      </PromptSheet>
      <PromptSheet
        visible={dialog === "notes"}
        onClose={() => setDialog(null)}
        title="ملاحظات الطالبة"
        inputLabel="الملاحظات"
        required={false}
        initialValue={profile.notes}
        confirmLabel="حفظ"
        loading={notesMutation.isPending}
        onConfirm={(notes) => notesMutation.mutate(notes)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: space[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space[2] },
  contactRow: { flexDirection: "row", gap: space[2], marginTop: space[1] },
  spacer: { marginTop: space[4] },
  bannerAction: { alignSelf: "flex-start", marginTop: space[1], paddingHorizontal: 0 },
  stats: { flexDirection: "row", gap: space[3], marginTop: space[4] },
  listCard: { overflow: "hidden" },
  infoCard: { paddingVertical: space[1] },
  gradeTrail: { alignItems: "center", gap: 2 },
  timeline: { gap: space[4] },
  timelineItem: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 7 },
});
