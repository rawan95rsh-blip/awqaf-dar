/** معرّفات البيانات التجريبية — تُستخدم في seed و purge-demo */
export const DEMO_CENTER_NAME = 'مركز تجريبي (للعرض)';
export const DEMO_ID_PREFIX = '29999999';
export const DEMO_PHONE_PREFIX = '96550000';

/**
 * الأسماء الوهمية التي أنشأتها نسخة seed القديمة (مركز تجريبي / مركز النور / مركز الفرقان).
 * تُحذف بواسطة purge-demo.
 */
export const LEGACY_DEMO_ID_NUMBERS = [
  '123456789012',
  '100000000099',
  ...Array.from({ length: 20 }, (_, i) => `0010000000${String(i + 1).padStart(2, '0')}`),
];

export const LEGACY_DEMO_PHONES = [
  '0512345678',
  '0598765497',
  '0591000099',
  ...Array.from({ length: 20 }, (_, i) => `05910000${String(i + 1).padStart(2, '0')}`),
];

export const LEGACY_DEMO_CENTER_NAMES = ['مركز تجريبي', 'مركز النور', 'مركز الفرقان'];
