# ربط كشف الدرجات بملف الطالبة

## الحالة: ✅ تم التنفيذ (أسبوع 5–6)

الربط يتم عبر **API مشترك** — لا يوجد `MOCK_PROFILES` أو Context محلي.

---

## التدفق الحالي

```
شاشة الدرجات (grades)
        │
        │  POST /api/grades/bulk
        ▼
   MongoDB (Grade)
        │
        │  GET /api/students/:id/grades
        ▼
ملف الطالبة (student-profile)
        │
        │  GET /api/students/me (للطالبة)
        ▼
لوحة الطالبة (student-home)
```

---

## معرّف الطالبة الموحّد

- `studentId` = `_id` من MongoDB (نفس القيمة في كل الشاشات)
- عند الحفظ من كشف الدرجات: `studentId` من قائمة طالبات **نفس المستوى** (`GET /api/levels/:levelId/students`)
- عند العرض في الملف الشخصي: `GET /api/students/:id/grades`

---

## بنية الدرجة في API

```json
{
  "subjectIndex": 0,
  "levelId": "...",
  "breakdown": {
    "attendance": 20,
    "shortExam": 18,
    "participation": 15,
    "final": 40
  },
  "total": 93,
  "label": "ممتاز"
}
```

---

## الملفات ذات الصلة

| الطبقة | الملف |
|--------|--------|
| Backend | `backend/src/controllers/gradesController.ts` |
| Backend | `backend/src/models/Grade.ts` |
| Mobile API | `mobile/src/api/grades.ts` |
| كشف الدرجات | `mobile/app/main/grades/[levelId]/[subjectIndex].tsx` |
| الملف الشخصي | `mobile/app/main/student-profile/[id].tsx` |
| لوحة الطالبة | `mobile/app/(auth)/student-home.tsx` |

---

## Seed للتجربة

بعد `npm run seed` في المركز التجريبي:
- درجات لمادتين (السيرة، العقيدة) لكل طالبة
- حضور 7 أيام

حساب الطالبة للتجربة: `123456789012` / `123456`
