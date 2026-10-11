import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { SUBJECT_NAMES, WEEKDAYS } from "@/src/constants/domain";
import type { Gradesheet, AttendanceReport } from "@/src/api/reports";
import type { ClassOfferItem } from "@/src/types/classOffer";
import { MODE_LABELS, TRACK_LABELS } from "@/src/types/classOffer";
import { formatHHMM } from "@/src/utils/format";

export type Cell = string | number | boolean | null | undefined;

export type SheetSpec = {
  name: string;
  /** عنوان يظهر فوق الجدول (مدمج على عرض الأعمدة) */
  title?: string;
  subtitle?: string;
  columns: Array<{ header: string; width?: number }>;
  rows: Cell[][];
};

function safeFileName(base: string): string {
  return (
    base
      .replace(/[^\w؀-ۿ\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "export"
  );
}

function buildSheet(spec: SheetSpec): XLSX.WorkSheet {
  const aoa: Cell[][] = [];
  const merges: XLSX.Range[] = [];
  const lastCol = Math.max(spec.columns.length - 1, 0);
  if (spec.title) {
    aoa.push([spec.title]);
    merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: lastCol } });
  }
  if (spec.subtitle) {
    aoa.push([spec.subtitle]);
    merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: lastCol } });
  }
  if (spec.title || spec.subtitle) aoa.push([]);
  aoa.push(spec.columns.map((c) => c.header));
  for (const row of spec.rows) aoa.push(row);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  ws["!cols"] = spec.columns.map((c) => ({ wch: c.width ?? Math.max(10, c.header.length + 4) }));
  return ws;
}

/** ينشئ ملف Excel (اتجاه يمين لليسار) ويفتح المشاركة أو التنزيل */
export async function exportWorkbook(sheets: SheetSpec[], fileBaseName: string): Promise<void> {
  if (!sheets.length || sheets.every((s) => s.rows.length === 0)) {
    throw new Error("لا توجد بيانات للتصدير");
  }
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  for (const spec of sheets) {
    let name = spec.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
    while (usedNames.has(name)) name = `${name.slice(0, 28)}_${usedNames.size}`;
    usedNames.add(name);
    XLSX.utils.book_append_sheet(workbook, buildSheet(spec), name);
  }
  // عرض الورقة من اليمين لليسار
  workbook.Workbook = { Views: [{ RTL: true }] };

  const fileName = `${safeFileName(fileBaseName)}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) as string;
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error("تعذر الوصول لمجلد الملفات المؤقت");
  const uri = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (!(await Sharing.isAvailableAsync())) throw new Error("المشاركة غير متاحة على هذا الجهاز");
  await Sharing.shareAsync(uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "تصدير Excel",
    UTI: "com.microsoft.excel.xlsx",
  });
}

/** للتوافق مع الكود السابق */
export async function exportRowsToExcel(
  rows: Record<string, Cell>[],
  fileBaseName: string,
  sheetName = "Sheet1"
): Promise<void> {
  const headers = Object.keys(rows[0] ?? {});
  await exportWorkbook(
    [{ name: sheetName, columns: headers.map((h) => ({ header: h })), rows: rows.map((r) => headers.map((h) => r[h])) }],
    fileBaseName
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString("ar-KW-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });
}

// ———— الجدول الأسبوعي ————

export function weeklyScheduleSheets(offers: ClassOfferItem[], centerName: string, scopeLabel = "المركز"): SheetSpec[] {
  const sorted = [...offers].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  const times = Array.from(new Set(sorted.map((o) => `${o.startTime}–${o.endTime}`))).sort();
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => sorted.some((o) => o.weekday === d));
  const usedDays = days.length ? days : [0, 1, 2, 3, 4];

  const grid: Cell[][] = times.map((slot) => [
    slot.split("–").map(formatHHMM).join(" – "),
    ...usedDays.map((day) =>
      sorted
        .filter((o) => o.weekday === day && `${o.startTime}–${o.endTime}` === slot)
        .map((o) => `${o.subjectName}${o.levelLabel ? ` (${o.levelLabel})` : ""} — ${o.teacherName}`)
        .join("\n")
    ),
  ]);

  return [
    {
      name: "الجدول الأسبوعي",
      title: `الجدول الأسبوعي — ${centerName}`,
      subtitle: `${scopeLabel} · صادر بتاريخ ${todayLabel()}`,
      columns: [{ header: "الوقت", width: 18 }, ...usedDays.map((d) => ({ header: WEEKDAYS[d], width: 32 }))],
      rows: grid,
    },
    {
      name: "قائمة الفصول",
      title: `قائمة الفصول — ${centerName}`,
      columns: [
        { header: "اليوم", width: 12 },
        { header: "من", width: 10 },
        { header: "إلى", width: 10 },
        { header: "المادة", width: 18 },
        { header: "المسار", width: 10 },
        { header: "المستوى", width: 16 },
        { header: "المعلمة", width: 20 },
        { header: "النوع", width: 10 },
      ],
      rows: sorted.map((o) => [
        WEEKDAYS[o.weekday],
        formatHHMM(o.startTime),
        formatHHMM(o.endTime),
        o.subjectName,
        TRACK_LABELS[o.track],
        o.levelLabel ?? "عام",
        o.teacherName,
        MODE_LABELS[o.mode],
      ]),
    },
  ];
}

// ———— كشف الدرجات الشامل ————

export function gradesheetSheets(sheet: Gradesheet, centerName: string): SheetSpec[] {
  const levelName = sheet.level.shortName || sheet.level.fullName;
  const title = sheet.isFinal
    ? `كشف الدرجات النهائي الشامل — ${levelName}`
    : `كشف الدرجات الشامل — ${levelName}`;
  const subjectHeaders = sheet.subjects.map((s) => ({ header: s.name, width: 10 }));

  const summary: SheetSpec = {
    name: "الكشف الشامل",
    title,
    subtitle: `${centerName} · صادر بتاريخ ${todayLabel()} · الدرجة من 100 لكل مادة`,
    columns: [
      { header: "م", width: 5 },
      { header: "اسم الطالبة", width: 28 },
      { header: "الرقم المدني", width: 15 },
      ...subjectHeaders,
      { header: "المجموع", width: 10 },
      { header: "المعدل", width: 9 },
      { header: "التقدير", width: 12 },
      { header: "المواد المرصودة", width: 14 },
    ],
    rows: sheet.rows.map((row) => [
      row.index,
      row.fullName,
      row.idNumber,
      ...row.subjects.map((s) => (s ? s.total : "")),
      row.recordedCount ? row.sum : "",
      row.average ?? "",
      row.label ?? "",
      `${row.recordedCount}/${sheet.subjects.length}`,
    ]),
  };

  // ورقة تفصيلية لكل مادة (الحضور / القصير / المشاركة / النهائي)
  const details: SheetSpec[] = sheet.subjects.map((subject) => ({
    name: subject.name,
    title: `${subject.name} — ${levelName}`,
    columns: [
      { header: "م", width: 5 },
      { header: "اسم الطالبة", width: 28 },
      { header: "الحضور", width: 9 },
      { header: "اختبار قصير", width: 11 },
      { header: "المشاركة", width: 9 },
      { header: "النهائي", width: 9 },
      { header: "المجموع", width: 9 },
      { header: "التقدير", width: 12 },
    ],
    rows: sheet.rows.map((row) => {
      const g = row.subjects[subject.subjectIndex];
      return [
        row.index,
        row.fullName,
        g?.breakdown.attendance ?? "",
        g?.breakdown.shortExam ?? "",
        g?.breakdown.participation ?? "",
        g?.breakdown.final ?? "",
        g?.total ?? "",
        g?.label ?? "",
      ];
    }),
  }));

  return [summary, ...details];
}

// ———— كشف الغياب ————

const MARK: Record<string, string> = { present: "✓", absent: "غ", late: "ت" };

export function attendanceSheets(report: AttendanceReport, centerName: string, periodLabel: string): SheetSpec[] {
  const levelName = report.level.shortName || report.level.fullName;
  const dayHeaders = report.days.map((d) => ({
    header: new Date(`${d}T00:00:00`).toLocaleDateString("ar-KW-u-nu-latn", { day: "numeric", month: "numeric" }),
    width: 7,
  }));
  return [
    {
      name: "كشف الغياب",
      title: `كشف الغياب ${periodLabel} — ${levelName}`,
      subtitle: `${centerName} · من ${report.from} إلى ${report.to} · ✓ حاضرة  غ غائبة  ت متأخرة`,
      columns: [
        { header: "م", width: 5 },
        { header: "اسم الطالبة", width: 28 },
        { header: "الرقم المدني", width: 15 },
        ...dayHeaders,
        { header: "حضور", width: 7 },
        { header: "غياب", width: 7 },
        { header: "تأخير", width: 7 },
        { header: "النسبة", width: 8 },
      ],
      rows: report.rows.map((row) => [
        row.index,
        row.fullName,
        row.idNumber,
        ...report.days.map((d) => (row.byDay[d] ? MARK[row.byDay[d] as string] : "")),
        row.present,
        row.absent,
        row.late,
        row.percent == null ? "" : `${row.percent}%`,
      ]),
    },
  ];
}

export { SUBJECT_NAMES };
