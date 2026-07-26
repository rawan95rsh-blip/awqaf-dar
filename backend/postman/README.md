# Postman — awqaf-dar API

## الاستيراد

1. افتحي **Postman**
2. **Import** → اسحبي الملفين:
   - `awqaf-dar.postman_collection.json`
   - `awqaf-dar.local.postman_environment.json`
3. **مهم:** من القائمة العلوية اليمنى اختاري البيئة: **awqaf-dar — Local**
4. تأكدي أن `baseUrl` = `http://localhost:8000`

إن ظهر `Invalid URI "http:///api/health"` → البيئة غير مفعّلة أو `baseUrl` فارغ.

---

## أسبوع 2 — تسجيل المركز (الترتيب الكامل)

```
0 — System     → Health Check
3 — Center     → Register Center          (201 + devCode: 7890)
3 — Center     → Verify Center (OTP)      (200 + token)
1 — Auth       → Login — Center Admin     (بحساب seed أو newCenterPhone)
2 — Account    → Get Account
```

### متغيرات أسبوع 2

| المتغير | الغرض |
|---------|--------|
| `newCenterPhone` | هاتف مركز جديد (غيّريه لكل تجربة، مثل `0513333333`) |
| `newCenterPassword` | كلمة مرور التسجيل (`password123`) |
| `pendingCenterPhone` | لاختبار login قبل verify (انسخي هاتفاً بعد Register وقبل Verify) |
| `token` | يُملأ تلقائياً بعد Verify أو Login |

### حالات الحافة (مجلد 3 — Center Registration)

| الطلب | المتوقع |
|-------|---------|
| Edge — Register duplicate phone | `409` |
| Edge — Verify wrong code | `400` |
| Edge — Login before verify | `403` (بعد Register وقبل Verify) |
| Edge — Verify without register | `404` |

---

## أسبوع 3 — تسجيل الطالبة (الترتيب الكامل)

### المسار السعيد (Happy path)

```
0 — System       → Health Check
1 — Auth         → Login — Center Admin        (يملأ token + centerId)
4 — Registration → List Public Centers         (يملأ centerId + otherCenterId)
4 — Registration → List Levels by Center         (يملأ levelId)
4 — Registration → Submit Request              (201 — غيّري studentIdNumber/Phone لكل تجربة)
4 — Registration → List Requests (pending)
4 — Registration → Get Request by ID
4 — Registration → Approve Request             (يملأ studentId + approvedRegistrationRequestId)
1 — Auth         → Login — Student (idNumber)  (200 + studentProfile)
1 — Auth         → Login — Student (phone)     (اختياري)
```

> **قبل Submit:** غيّري `studentIdNumber` و `studentPhone` في Environment إذا سبق استخدامهما (وإلا `409`).

### حقول Submit

| الحقل | مثال | القيم المسموحة |
|-------|------|----------------|
| `nationality` | `KW` | `KW`, `SA`, `AE`, ... `OTHER` |
| `academicLevel` | `high` | `none`, `middle`, `high`, `university`, `postgraduate`, `other` |

متغيرات البيئة: `studentNationality` (افتراضي `KW`)، `studentAcademicLevel` (افتراضي `high`).

### مستويات الحفظ

| نوع المركز | المستويات |
|------------|-----------|
| مراكز seed (تجريبي، النور، الفرقان) | 8 مطور + **دورات** + **استماع** = 10 |
| مراكز جديدة (مثل رسل) | **دورات** + **استماع** فقط (2) |

تُنشأ المستويات العامة تلقائياً عند `npm run seed` أو عند تفعيل مركز جديد (`verify-center`).

### حالات الحافة (مجلد 4 → Edge cases)

| الطلب | المتوقع | إعداد مسبق |
|-------|---------|------------|
| Edge — Submit duplicate idNumber | `409` | Edge Setup — Pending for duplicate test |
| Edge — Submit after approved idNumber | `409` | Submit + Approve للطالبة الافتراضية |
| Edge — Approve already processed | `409` | Approve Request ناجح |
| Edge — Approve other center request | `404` | Login Admin + List Public/Other Levels + Edge Setup — Submit to other center |
| Edge — Login student before approve | `403` | Edge Setup — Pending for login test |
| Edge — Reject without reason | `400` | Login Admin + Edge Setup — Pending for reject test |
| Edge — Approve invalid levelId | `400` | Login + List Levels — Other Center + Edge Setup — Pending for wrong level test |

### اختبارات تلقائية

الطلبات الرئيسية في مجلد 4 و Login Student تتضمن **Tests** تلقائية (Status، success، role، إلخ). شغّلي **Collection Runner** على مجلد `4 — Registration Requests` بعد Login Admin.

---

## أسبوع 4 — الطلاب والمستويات (الترتيب الكامل)

### المسار السعيد (Happy path)

```
0 — System     → Health Check
1 — Auth       → Login — Center Admin     (يملأ token + centerId)
5 — Students   → List Students            (يملأ studentId)
5 — Students   → Get Student by ID
6 — Levels     → List Levels              (يملأ levelId + studentCount)
6 — Levels     → Get Level by ID
6 — Levels     → Level Students
```

> **مهم:** تأكدي أن `centerId` مضبوط بعد Login. إن ظهر `معرّف المركز مطلوب` في List Levels → راجعي Params أو انسخي `centerId` من استجابة Login.

### اختبارات تلقائية

مجلدا **5 — Students** و **6 — Levels** يتضمنان Tests تلقائية. شغّلي **Collection Runner** على:
`5 — Students` ثم `6 — Levels` بعد Login Admin.

### حالات الحافة (أسبوع 4)

| الطلب | المتوقع | إعداد مسبق |
|-------|---------|------------|
| Edge — Invalid student id | `400` | Login Admin |
| Edge — Student not found | `404` | Login Admin |
| Edge — Student other center | `404` | `npm run seed` → انسخي `otherCenterStudentId` إلى Environment + Login Admin |
| Edge — Invalid level id | `400` | Login Admin |

### طلبات ما زالت «قريباً»

| المجلد | الطلب |
|--------|-------|
| 5 — Students | Create / Update (يدوي من المركز) |

> **ملاحظة:** `6 — Levels → Create Level` و `9 — Settings` مفعّلان من أسبوع 6.

---

## أسبوع 6 — الإعدادات والتلميع (الترتيب الكامل)

### المسار السعيد — Postman (مجلدات 0–9)

```
0 — System     → Health Check
1 — Auth       → Login — Center Admin        (seed: 0512345678 / 123456)
2 — Account    → Get Account
2 — Account    → Update Account
2 — Account    → Change Password              (اختياري — يغيّر كلمة المرور؛ أعيدي seed)
9 — Settings   → Get Settings
9 — Settings   → Update Grade Weights
6 — Levels     → List Levels
6 — Levels     → Create Level                (order: 11+)
5 — Students   → List Students
5 — Students   → Get Student by ID
5 — Students   → Student Grades
5 — Students   → Student Attendance
1 — Auth       → Login — Student (idNumber)  (123456789012 / 123456)
5 — Students   → Get My Profile (Student)
7 — Attendance → Get Attendance
8 — Grades     → Get Grades
```

---

## أسبوع 7 — عنوان المركز (بدون خريطة)

```
1 — Auth       → Login — Center Admin
9 — Settings   → Get Center Profile
9 — Settings   → Update Center Profile       (addressText + city + genderAudience)
9 — Settings   → Get Settings                (يشمل centerProfile)
4 — Requests   → List Public Centers
4 — Requests   → List Public Centers — Female
4 — Requests   → List Public Centers — Male
```

| الحقل | الوصف |
|-------|--------|
| `addressText` | نص العنوان (حي، شارع، معلم) — حد 300 |
| `city` | المدينة — حد 100 |
| `genderAudience` | `female` \| `male` فقط (لا مختلط) |
| `?audience=` | `all` \| `female` \| `male` — تطابق مباشر |
| `gender` (طالب) | `female` \| `male` — يُحفظ في الطلب والطالب ويفلتر المراكز تلقائياً |

> الخريطة التفاعلية مؤجّلة. يوم 3: زر «افتح في الخرائط» يفتح Apple/Google Maps بالعنوان النصي.

### Seed يوم 2+

| المركز | النوع |
|--------|-------|
| مركز تجريبي | نسائي |
| مركز النور | نسائي |
| مركز الفرقان | رجالي |

### E2E النهائي — أسبوع 6 (تطبيق + API)

| # | الخطوة | الأداة |
|---|--------|--------|
| 1 | `npm run seed` + `npm run dev` | Terminal |
| 2 | Login مشرف → **الفصول** → مستوى → مادة → تحضير → حفظ | التطبيق |
| 3 | نفس المسار → **سجل الدرجات** → حفظ | التطبيق |
| 4 | **الطلاب** → ملف طالبة → درجات + حضور (من seed) | التطبيق |
| 5 | **الحساب** → تعديل بيانات | التطبيق |
| 6 | **الإعدادات** → أوزان الدرجات | التطبيق |
| 7 | **إضافة فصل** → مستوى جديد → يظهر في الفصول | التطبيق |
| 8 | Login طالبة `123456789012` → لوحة الطالبة (مركز + درجات + حضور) | التطبيق |
| 9 | Postman: المسار أعلاه (0–9) | Postman |

### حسابات seed الثابتة

| الدور | الدخول |
|--------|--------|
| مشرف | `0512345678` / `123456` |
| طالبة | `123456789012` / `123456` |

بعد `npm run seed` تتوفر بيانات حضور (7 أيام) ودرجات (مادتان) لكل طالبة في المركز التجريبي.

---

## أسبوع 5 — التحضير والدرجات (الترتيب الكامل)

### المسار السعيد (Happy path)

```
0 — System     → Health Check
1 — Auth       → Login — Center Admin
6 — Levels     → List Levels              (يملأ levelId)
6 — Levels     → Level Students           (يملأ studentId من نفس المستوى)
7 — Attendance → Save Attendance (bulk)
7 — Attendance → Get Attendance
8 — Grades     → Save Grades (bulk)
8 — Grades     → Get Grades
5 — Students   → Student Grades
5 — Students   → Student Attendance
```

> **مهم:** استخدمي **Level Students** قبل Save — وليس List Students — لأن `studentId` يجب أن يكون من نفس `levelId`.

### اختبارات تلقائية

مجلدا **7 — Attendance** و **8 — Grades** يتضمنان Tests + Edge cases (تاريخ فارغ، bulk فارغ).

### حالات الحافة (أسبوع 5)

| الطلب | المتوقع |
|-------|---------|
| Edge — Missing date | `400` |
| Edge — Empty attendance bulk | `400` |
| Edge — Empty grades bulk | `400` |

### E2E النهائي — أسبوع 5

| الخطوة | الأداة |
|--------|--------|
| `npm run build && npm start` (أو `npm run dev`) | Terminal |
| Postman: Login → List Levels → Level Students → Save Attendance → Save Grades → Student Grades | Postman |
| Login مشرف → **الفصول** → مستوى → مادة → تحضير → حفظ | التطبيق |
| نفس المسار → **سجل الدرجات** → حفظ | التطبيق |
| **الطلاب** → ملف طالبة → تظهر الدرجات والحضور | التطبيق |

---

## ترتيب الاختبار العام

```
0 — System → Health Check          ✅
1 — Auth   → Login Center Admin    ✅ (seed: 0512345678 / 123456)
1 — Auth   → Login Student         ✅ (seed: 123456789012 / 123456)
2 — Account → Get / Update / Password ✅ أسبوع 6
3 — Center Registration            ✅ أسبوع 2
4 — Registration Requests          ✅ أسبوع 3
5 — Students                       ✅ أسبوع 4 + Get My Profile (أسبوع 6)
6 — Levels                         ✅ أسبوع 4 + Create Level (أسبوع 6)
7 — Attendance                     ✅ أسبوع 5
8 — Grades                         ✅ أسبوع 5
9 — Settings                       ✅ أسبوع 6 + Center Profile (أسبوع 7 — عنوان بدون خريطة)
```

بعد **Login** أو **Verify** يُحفظ `token` تلقائياً — الطلبات المحمية تستخدمه.

---

## E2E النهائي — أسبوع 4

| الخطوة | الأداة |
|--------|--------|
| `npm run seed` + `npm run dev` | Terminal — انسخي `otherCenterStudentId` إن اختبرتِ Edge cases |
| Postman: Login → List Students → Get Student → List Levels → Get Level → Level Students | Postman |
| Login مشرف → **الفصول** → مستوى → طالبات | التطبيق |
| **الطلاب** → بحث → ملف شخصي | التطبيق |
| (اختياري) Approve طالبة جديدة → تظهر في List Students | Postman + التطبيق |

---

## E2E النهائي — أسبوع 3

| الخطوة | الأداة |
|--------|--------|
| `npm run seed` + `npm run build && npm start` | Terminal |
| Postman: Login → Submit → Approve → Login Student | Postman |
| تسجيل طالبة من التطبيق | iPhone / Simulator |
| موافقة من شاشة **طلبات التسجيل** | iPhone (مشرف المركز) |
| دخول الطالبة بالهوية | iPhone |

---

## المتغيرات الثابتة (Environment)

| المتغير | الغرض |
|---------|--------|
| `baseUrl` | عنوان الباك اند |
| `token` | يُملأ بعد Login / Verify |
| `centerAdminPhone` | هاتف seed (`0512345678`) |
| `centerAdminPassword` | كلمة مرور seed (`123456`) |
| `studentIdNumber` | هوية مدنية كويتية ثابتة (`123456789012` — 12 رقماً) |
| `studentPhone` | هاتف الطالبة الثابتة (`0598765497`) |
| `studentNationality` | جنسية الطالبة (`KW`, `SA`, ...) |
| `studentAcademicLevel` | المستوى الدراسي (`high`, `university`, ...) |
| `studentPassword` | كلمة مرور الطالبة (`123456` — أرقام فقط) |
| `registrationRequestId` | يُملأ بعد تقديم طلب |
| `studentId` / `levelId` / `centerId` | يُملأون من الاستجابات |
| `otherCenterId` / `otherCenterLevelId` | لحالات الحافة بين مراكز |
| `otherCenterStudentId` | طالبة في مركز النور — من `npm run seed` |
| `edgeDuplicateIdNumber` … `edgeWrongLevelPhone` | هويات/هواتف لاختبارات الحافة |

---

## ملاحظات التطوير

- OTP في development: **`7890`** (`DEV_VERIFICATION_CODE` في `.env`)
- `devCode` يظهر في استجابة Register **فقط** عند `NODE_ENV=development`
- **Change Password** في Postman يغيّر كلمة مرور المشرف — شغّلي `npm run seed` لإعادة `123456`
- للجهاز الحقيقي: عيّني `EXPO_PUBLIC_API_URL` في `mobile/.env` إلى IP الماك

## أسبوع 10 — QA + الإطلاق

- دليل التنفيذ: `mobile/docs/WEEK_10_QA.md`
- نشر Backend: `mobile/docs/DEPLOY.md`
- TestFlight / App Store: `mobile/docs/APP_STORE.md`
- Postman: مجلد **9 — Settings** (ملف المركز) + **10 — Sessions** (+ 10b/10c) — لا مجلد منفصل باسم Center Profile & Sessions
- Rate limit على `POST /api/auth/login` (وregister/verify)
- حسابات: مشرف `0512345678` / `123456` — طالبة `123456789012` / `123456`

## أسبوع 9ب يوم 5 — مسار مطور ترمات MVP (بند 5)

- ترم المطور = **3 أشهر** (قاعدة منتج موثّقة؛ بدون أتمتة تاريخ).
- `PATCH /api/students/:id/promote` — مشرف يرقّي طالبة مسار `mutor` للمستوى التالي.
- عند المستوى 8: رفض مع توجيه لتعيين حالة القيد «خريجة».
- مسار الدورات (`courses`): الترقية غير متاحة.
- **بند 13 (شهادات AI) مؤجّل** — لا تنفيذ في يوم 5.
- Postman: **Promote Student (mutor) [9ب]** في المجلد 5 — Students.
- التطبيق: زر «ترقية للمستوى التالي» في ملف الطالبة (مسار مطور).

## أسبوع 9ب يوم 4 — هوية مدنية كويتية (بند 8)

- `idNumber`: **12 رقماً** (هوية مدنية كويتية).
- نصوص موحّدة: «رقم الهوية المدنية».
- **الشهادة (بند 10) مؤجّلة** — لا تنفيذ في يوم 4.
- Seed الطالبة: `123456789012` / `123456`.
- بعد التحديث: `npm run seed` لإعادة الهويات.

## أسبوع 9ب يوم 3 — حالات القيد ووقف القيد

- `enrollmentStatus`: `enrolled` | `graduated` | `suspended`
- `PATCH /api/students/:id/enrollment-status` للمشرف
- `POST/GET/PATCH /api/suspension-requests` — طلب وقف قيد من الطالبة + موافقة/رفض
- Login للطالبة الموقوفة → `403` برسالة واضحة
- Postman: مجلد **13 — Suspension Requests** + Update Enrollment في المجلد 5

## أسبوع 9ب يوم 2 — إضافة يدوية + حصرية المركز + حذف كلي

- `POST /api/students` — مشرف يضيف طالبة (تمهيدي افتراضي).
- منع تسجيل مركز ثانٍ لهوية نشطة (409).
- `POST/GET/PATCH /api/account-deletion-requests` — طلب حذف كلي + موافقة/رفض.
- بعد الموافقة: `deletedAt` + تعطيل الحساب + تحرير الهوية/الهاتف.
- Postman: مجلد **12 — Account Deletion (9ب)** + Create Student في المجلد 5.
- بعد التحديث: `npm run seed` لإنشاء مستوى **تمهيدي** (order 0).

## أسبوع 9ب يوم 1 — كلمة مرور رقمية + مسار انضمام

- كلمة المرور: **أرقام فقط** وبحد أدنى 6 (`^\d{6,}$`) لتسجيل المركز/الطالبة وتغيير كلمة المرور.
- طلب التسجيل يتطلب `track`: `"mutor"` | `"courses"`.
- Seed الطالبة: `123456789012` / `123456`.
- Postman في مجلد **4 — Registration Requests**:
  - `Submit Request — track courses (201) [9ب]`
  - `Edge — Password with letters (400) [9ب]`
  - `Edge — Missing track (400) [9ب]`

---

## أسبوع 8 — الحصص (اليوم 1)

```
1 — Auth       → Login — Center Admin
6 — Levels     → List Levels                 (احفظي levelId)
10 — Sessions  → List Sessions
10 — Sessions  → Create Session
10 — Sessions  → Get Session by ID
10 — Sessions  → Update Session
10 — Sessions  → Delete Session              (اختياري)
10 — Sessions  → Edge — Create online without zoom → 400
10b — Class Offers → List Class Offers
10b — Class Offers → Create Class Offer — Mutor
10b — Class Offers → Create Class Offer — Course
```

| الحقل | الوصف |
|-------|--------|
| `mode` | `in_person` \| `online` \| `hybrid` (للحصة) |
| `track` | `mutor` \| `courses` (للفصل) |
| `status` | `scheduled` \| `cancelled` \| `completed` |
| `zoomUrl` | إلزامي إذا `mode=online` عند إنشاء حصة مباشرة و HTTPS فقط |
| `subjectIndex` | 0–6 |
| `levelId` | إلزامي لفصل مطور؛ null لفصل دورة |

