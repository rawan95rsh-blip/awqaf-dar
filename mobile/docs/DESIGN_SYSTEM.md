# نظام التصميم «سكينة» — دليل المطورة

هذا الدليل يشرح كيف تُبنى أي شاشة في التطبيق حتى تبقى الواجهة موحّدة وسهلة التطوير.

## الهوية
- **الطابع:** هادئ دافئ يناسب دور القرآن — أخضر زمردي عميق + ورق رملي + لمسة ذهبية خفيفة.
- **الخط:** IBM Plex Sans Arabic (4 أوزان) — يُحمَّل في `app/_layout.tsx`.
- **الاتجاه:** التطبيق RTL دائماً (مفروض في `app/_layout.tsx` وفي `app.json`).

## القواعد الذهبية
1. **لا ألوان أو أحجام خطوط مكتوبة يدوياً** — استخدمي `colors`, `space`, `radius`, `typography` من `@/src/theme`.
2. **لا `Text` من react-native** — استخدمي `Text` من `@/src/ui` مع `variant` (display/title/headline/body/bodyStrong/label/caption/micro/eyebrow/number).
3. **لا `textAlign: "left" | "right"`** — في RTL تنعكس القيم. اتركي المحاذاة طبيعية أو `align="center"`.
4. **لا `marginLeft/Right`** للتباعد الاتجاهي — استخدمي `marginStart/End` و `gap`.
5. **لا `letterSpacing`** على النص العربي (يكسر اتصال الحروف).
6. **رسائل النجاح:** `useToast().success("…")` بدل `Alert.alert("تم")`. نوافذ التأكيد المهمة: `Alert` أو `PromptSheet`.
7. **لا أزرار بلا وظيفة.** إن لم تكن الميزة جاهزة لا تعرضي الزر.
8. **كل قائمة لها:** حالة تحميل (`SkeletonList`/`LoadingState`) + حالة خطأ (`ErrorState` مع إعادة المحاولة) + حالة فارغة (`EmptyState` مع خطوة تالية).
9. **الأرقام** (هاتف، رقم مدني): `TextField` مع `ltr` و `toLatinDigits` لقبول الأرقام العربية.

## هيكل الشاشة
```tsx
<Screen
  header={<Header title="العنوان" back={"/main" as Href} actions={…} />}
  footer={<Button fullWidth onPress={save}>حفظ</Button>}   // أزرار ثابتة أسفل الشاشة فوق لوحة المفاتيح
  refreshing={q.isRefetching}
  onRefresh={q.refetch}
>
  <Section title="قسم" action={{ label: "عرض الكل", onPress }}>
    <Card>…</Card>
  </Section>
</Screen>
```
- شاشات التبويب الرئيسية: `<Screen withTabBar header={<Header large title="…" />}>`.
- `Screen` يتولّى المنطقة الآمنة + التمرير + تجنّب لوحة المفاتيح.

## المكونات (`@/src/ui`)
| المكون | الاستخدام |
|---|---|
| `Button` | variants: primary / secondary / tonal / ghost / danger / dangerTonal / accent — sizes: sm/md/lg — `icon`, `loading` |
| `IconButton` | أيقونة قابلة للضغط (44×44) مع `badge` اختياري |
| `TextField` | label/required/hint/error/icon/prefix/`ltr`/secure/multiline/showCounter |
| `PhoneField` | هاتف + مفتاح الدولة (الكويت افتراضياً) |
| `SelectField` | اختيار من لوحة سفلية (مفرد أو `multiple`) مع بحث تلقائي للقوائم الطويلة |
| `DateField` | تاريخ (iOS لوحة سفلية / Android منتقي النظام / الويب input) |
| `ChoiceChips` / `ChoiceCards` / `Segmented` / `FilterBar` | خيارات قصيرة / قرارات مهمة / تبويبات / فلاتر بعدّاد |
| `ImagePickerField` | رفع صورة (كاميرا/معرض) مع ضغط تلقائي |
| `Card`, `Section`, `ListItem`, `InfoRow`, `StatTile`, `Badge`, `Avatar`, `Divider` | العرض |
| `Sheet`, `PromptSheet` | لوحة سفلية / تأكيد مع حقل سبب |
| `EmptyState`, `ErrorState`, `LoadingState`, `Skeleton(List)`, `Banner` | الحالات |
| `Steps` | مؤشر خطوات للنماذج الطويلة |

## البيانات
- طبقة الـ API في `src/api/*` — كل دالة ترمي `Error` برسالة عربية جاهزة للعرض.
- مفاتيح React Query معرّفة بجانب كل API (`studentQueryKeys`, …). بعد أي تعديل: `invalidateQueries`.
- ثوابت المجال (المسارات، المؤهلات، الوظائف، المواد، المرفقات…) في `src/constants/domain.ts` — مطابقة للخادم.
- التصدير إلى Excel عبر `src/utils/excel.ts` (`exportWorkbook` + مولّدات جاهزة للجدول الأسبوعي وكشف الدرجات وكشف الغياب).
