import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { space } from "@/src/theme";
import {
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Section,
  Segmented,
  SelectField,
  Text,
  useToast,
} from "@/src/ui";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { fetchAttendanceReport, fetchGradesheet, reportQueryKeys } from "@/src/api/reports";
import { useAuth } from "@/src/context/AuthContext";
import { TRACK_LABELS } from "@/src/constants/domain";
import { attendanceSheets, exportWorkbook, gradesheetSheets } from "@/src/utils/excel";
import AttendanceReportView from "@/src/components/center/reports/AttendanceReportView";
import GradesheetView from "@/src/components/center/reports/GradesheetView";
import {
  PERIOD_ANCHOR_LABELS,
  PERIOD_LABELS,
  periodRange,
  type ReportPeriod,
} from "@/src/components/center/reports/reportPeriod";

type ReportType = "attendance" | "grades";

/**
 * التقارير: كشف الغياب (يومي / أسبوعي / شهري) وكشف الدرجات الشامل لجميع المواد —
 * معاينة داخل التطبيق ثم تصدير Excel.
 */
export default function ReportsScreen() {
  const params = useLocalSearchParams<{ levelId?: string; type?: string }>();
  const toast = useToast();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";
  const centerName = user?.centerProfile?.nameAr ?? "المركز";

  const [levelId, setLevelId] = useState<string | null>(params.levelId ?? null);
  const [type, setType] = useState<ReportType>(params.type === "grades" ? "grades" : "attendance");
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [exporting, setExporting] = useState(false);

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });
  const levels = levelsQuery.data ?? [];

  // مستوى واحد فقط؟ اختاريه تلقائياً
  useEffect(() => {
    if (!levelId && levels.length === 1) setLevelId(levels[0].id);
  }, [levelId, levels]);

  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);

  const attendanceQuery = useQuery({
    queryKey: reportQueryKeys.attendance(levelId ?? "", range.fromKey, range.toKey),
    queryFn: () => fetchAttendanceReport(levelId!, range.fromKey, range.toKey),
    enabled: !!levelId && type === "attendance",
  });
  const gradesQuery = useQuery({
    queryKey: reportQueryKeys.gradesheet(levelId ?? ""),
    queryFn: () => fetchGradesheet(levelId!),
    enabled: !!levelId && type === "grades",
  });
  const activeQuery = type === "attendance" ? attendanceQuery : gradesQuery;

  const levelOptions = levels.map((l) => ({
    id: l.id,
    label: l.shortName || l.fullName,
    description: [TRACK_LABELS[l.track], l.studentCount != null ? `${l.studentCount} طالبة` : ""].filter(Boolean).join(" · "),
  }));

  const canExport =
    type === "attendance"
      ? !!attendanceQuery.data && attendanceQuery.data.rows.length > 0 && attendanceQuery.data.days.length > 0
      : !!gradesQuery.data && gradesQuery.data.rows.length > 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (type === "attendance" && attendanceQuery.data) {
        const report = attendanceQuery.data;
        const levelName = report.level.shortName || report.level.fullName;
        await exportWorkbook(
          attendanceSheets(report, centerName, PERIOD_LABELS[period]),
          `كشف_الغياب_${PERIOD_LABELS[period]}_${levelName}_${range.fromKey}`
        );
      } else if (type === "grades" && gradesQuery.data) {
        const sheet = gradesQuery.data;
        const levelName = sheet.level.shortName || sheet.level.fullName;
        await exportWorkbook(gradesheetSheets(sheet, centerName), `كشف_الدرجات_${levelName}`);
      }
      toast.success("تم تجهيز ملف Excel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تصدير الملف");
    } finally {
      setExporting(false);
    }
  };

  const renderPreview = () => {
    if (!levelId) {
      return (
        <EmptyState
          icon="file-chart-outline"
          title="اختاري المستوى"
          description="يظهر التقرير هنا للمراجعة، ثم يمكنكِ تصديره كملف Excel ومشاركته."
        />
      );
    }
    if (activeQuery.isLoading) return <LoadingState label="جاري إعداد التقرير…" />;
    if (activeQuery.isError) {
      return <ErrorState message={activeQuery.error.message} onRetry={() => void activeQuery.refetch()} />;
    }
    if (type === "attendance" && attendanceQuery.data) return <AttendanceReportView report={attendanceQuery.data} />;
    if (type === "grades" && gradesQuery.data) return <GradesheetView sheet={gradesQuery.data} />;
    return null;
  };

  return (
    <Screen
      header={<Header back={"/main/more" as Href} title="التقارير" />}
      refreshing={activeQuery.isRefetching}
      onRefresh={levelId ? () => void activeQuery.refetch() : undefined}
      footer={
        canExport ? (
          <Button fullWidth size="lg" icon="microsoft-excel" loading={exporting} onPress={() => void handleExport()}>
            {type === "attendance" ? "تصدير كشف الغياب" : "تصدير كشف الدرجات"}
          </Button>
        ) : null
      }
    >
      <Card padding={4} style={styles.controls}>
        <Segmented<ReportType>
          options={[
            { id: "attendance", label: "الغياب", icon: "calendar-check-outline" },
            { id: "grades", label: "الدرجات", icon: "clipboard-text-outline" },
          ]}
          value={type}
          onChange={setType}
        />
        <SelectField
          label="المستوى"
          required
          options={levelOptions}
          value={levelId}
          onChange={setLevelId}
          disabled={levelsQuery.isLoading}
          placeholder={levelsQuery.isLoading ? "جاري تحميل المستويات…" : "اختاري المستوى"}
          emptyText="لا توجد مستويات — أضيفي مستوى أولاً"
          error={levelsQuery.isError ? levelsQuery.error.message : undefined}
        />
        {type === "attendance" ? (
          <>
            <View style={styles.field}>
              <Text variant="label">الفترة</Text>
              <Segmented<ReportPeriod>
                options={(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((id) => ({ id, label: PERIOD_LABELS[id] }))}
                value={period}
                onChange={setPeriod}
              />
            </View>
            <DateField
              label={PERIOD_ANCHOR_LABELS[period]}
              value={anchor}
              onChange={setAnchor}
              maximumDate={new Date()}
            />
            <Text variant="caption" color="textSecondary">
              {`الفترة: ${range.label}`}
            </Text>
          </>
        ) : (
          <Text variant="caption" color="textSecondary">
            كشف واحد للفصل يضم جميع المواد السبع، مع ورقة تفصيلية لكل مادة عند التصدير.
          </Text>
        )}
      </Card>

      <Section title={type === "attendance" ? `كشف الغياب ${PERIOD_LABELS[period]}` : "كشف الدرجات الشامل"}>
        {renderPreview()}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: space[4] },
  field: { gap: 6 },
});
