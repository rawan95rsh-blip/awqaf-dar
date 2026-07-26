# خطة الربط المتكامل مع الباك اند

## الوضع الحالي (أسبوع 6 — جارٍ)

| المجال | الحالة |
|--------|--------|
| Backend Express + MongoDB | ✅ |
| Auth (مشرف + طالبة + مركز) | ✅ |
| Levels / Students (قراءة + إضافة مستوى) | ✅ |
| Attendance / Grades (قراءة + كتابة) | ✅ |
| Account + Settings (أوزان الدرجات) | ✅ |
| `GET /api/students/me` + لوحة الطالبة | ✅ |
| Seed شامل (طلاب + حضور + درجات) | ✅ |
| E2E نهائي + Postman | ✅ |

**أسبوع 6 مكتمل.**

---

## حسابات التجربة الثابتة (`npm run seed`)

| الدور | الدخول |
|--------|--------|
| مشرف المركز | `0512345678` / `123456` |
| طالبة (نورة — مركز تجريبي) | `123456789012` / `123456` |

---

## الشاشات المربوطة بالـ API

| الشاشة | الملف | API |
|--------|------|-----|
| الفصول | `mobile/app/main/(drawer)/classes.tsx` | `GET /api/levels` |
| المستوى | `mobile/app/main/level/[id].tsx` | `GET /api/levels/:id` |
| المادة | `mobile/app/main/subject/...` | بيانات المستوى |
| الطلاب | `mobile/app/main/(drawer)/students.tsx` | `GET /api/students` |
| التحضير | `mobile/app/main/attendance/...` | `GET/POST /api/attendance` |
| الدرجات | `mobile/app/main/grades/...` | `GET/POST /api/grades/bulk` |
| الملف الشخصي | `mobile/app/main/student-profile/[id].tsx` | `GET /api/students/:id` + grades + attendance |
| لوحة الطالبة | `mobile/app/(auth)/student-home.tsx` | `GET /api/students/me` |
| الحساب | `mobile/app/main/(drawer)/account.tsx` | `PUT /api/account` |
| الإعدادات | `mobile/app/main/(drawer)/settings.tsx` | `GET/PUT /api/settings/grade-weights` |
| إضافة فصل (معاينة محلية؛ الربط لاحقاً) | `mobile/app/main/add-class.tsx` | مطور → مستوى ١–٨؛ دورة → بلا مستوى |

---

## Seed (`backend/src/scripts/seed.ts`)

- 3 مراكز (تجريبي، النور، الفرقان)
- 10 مستويات لكل مركز seed
- **10 طالبات** + حساب طالبة ثابت للتجربة
- **7 أيام حضور** + **درجات لمادتين** (فهرس 0 و 1) لكل طالبة في المركز التجريبي

---

## API Client

- `mobile/src/api/client.ts` — axios + Bearer token
- `EXPO_PUBLIC_API_URL` — عنوان الخادم (للجهاز الحقيقي: IP الماك)

---

## ما تبقى

- `reports.tsx` — تقارير (مؤجّل)
- أوزان درجات per-subject (مؤجّل)
- خريطة تفاعلية للمركز (مؤجّل — العنوان النصي جاهز أسبوع 7)
- فلتر مراكز نسائي/رجالي (✅ أسبوع 7 يوم 2)

---

## أسبوع 7 — عنوان المركز (يوم 1–3 ✅)

| الشاشة / API | الحالة |
|--------------|--------|
| `Center.addressText` + `city` | ✅ |
| `Center.genderAudience` | ✅ `female` / `male` فقط |
| `Student.gender` + طلب التسجيل | ✅ |
| `GET/PUT /api/settings/center-profile` | ✅ |
| `GET /api/centers/public?audience=` | ✅ تطابق مباشر |
| `settings.tsx` — عنوان + نوع المركز | ✅ |
| `register-student.tsx` — جنس → فلترة تلقائية | ✅ |
| زر افتح في الخرائط (Linking خارجي) | ✅ يوم 3 |
| خريطة مدمجة | مؤجّل |
## مراجع

- [ربط الدرجات بالملف الشخصي](./GRADES_PROFILE_LINK.md) — **تم التنفيذ** عبر API
- Postman: `backend/postman/README.md`

## أسبوع 8 — الحصص (يوم 1 ✅)

| العنصر | الحالة |
|--------|--------|
| `Session` model | ✅ |
| `GET/POST/PUT/DELETE /api/sessions` | ✅ مشرف فقط |
| `mobile/src/api/sessions.ts` | ✅ |
| جدول أسبوعي UI | يوم 2 |

