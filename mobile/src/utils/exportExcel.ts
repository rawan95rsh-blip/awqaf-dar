import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

export type ExcelCell = string | number | boolean | null | undefined;

/**
 * Builds an .xlsx from row objects and opens the native share sheet.
 */
export async function exportRowsToExcel(
  rows: Record<string, ExcelCell>[],
  fileBaseName: string,
  sheetName = 'Sheet1'
): Promise<void> {
  if (!rows.length) {
    throw new Error('لا توجد بيانات للتصدير');
  }

  const safeName = fileBaseName
    .replace(/[^\w\u0600-\u06FF\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'export';

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const base64 = XLSX.write(workbook, {
    type: 'base64',
    bookType: 'xlsx',
  }) as string;

  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    throw new Error('تعذر الوصول لمجلد الملفات المؤقت');
  }

  const uri = `${dir}${safeName}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('المشاركة غير متاحة على هذا الجهاز');
  }

  await Sharing.shareAsync(uri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'تصدير Excel',
    UTI: 'com.microsoft.excel.xlsx',
  });
}
