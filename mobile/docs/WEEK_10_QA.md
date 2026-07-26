# أسبوع 10 — QA + الإطلاق

لا ميزات منتج كبيرة. تلميع، اختبار، نشر.

## حسابات التجربة (بعد `npm run seed`)

| الدور | المعرّف | كلمة المرور |
|--------|---------|-------------|
| مشرف مركز تجريبي | `0512345678` | `123456` |
| طالبة (نورة) | `123456789012` | `123456` |

---

## اليوم 1 — تكامل Welcome / خرائط / فلتر

### جاهز مسبقاً (أسابيع 7–9ب)

- [x] Welcome → تسجيل طالبة / دخول / تسجيل مركز
- [x] عنوان المركز + «افتح في الخرائط» (خارجي، بدون خريطة مدمجة)
- [x] فلتر مراكز نسائي/رجالي عند التسجيل
- [x] Postman: مجلد **9 — Settings** (ملف المركز) + **10 — Sessions** + **10b/10c**

### مؤجّل (مو ضمن الإطلاق)

- [ ] تكبير خط مخصّص (`FontScaleProvider`) — مؤجّل من أسبوع 7
- [ ] خريطة مدمجة داخل التطبيق

### تحقق سريع

1. `npm run seed` ثم Login مشرف
2. الإعدادات → عنوان يظهر + افتح في الخرائط
3. تسجيل طالبة → اختيار جنس → قائمة مراكز مفلترة
4. Postman: List Public Centers — Female / Male

---

## اليوم 2 — E2E-SESSION

نفّذي على Simulator ثم جهاز حقيقي إن أمكن.

```
1. backend: npm run build && npm start   (أو npm run dev)
2. npm run seed
3. Login مشرف 0512345678 / 123456
4. الإعدادات → تأكيد العنوان (خريطة مدمجة مؤجّلة)
5. إنشاء/فتح حصة + Zoom إن وُجد
6. Login طالبة 123456789012 / 123456
7. جدولي → تفاصيل الحصة → انضمام Zoom
8. check-in → يظهر في كشف التحضير عند المشرف
9. مشرف: اعتذار المعلمة عن حصة → إلغاء + سبب → إشعار لطالبات المستوى
10. قبول طلب تسجيل → إشعار للطالبة المقبولة فقط
```

### تصنيف الأخطاء

| مستوى | معنى | إجراء |
|--------|------|--------|
| P0 | يمنع المسار الأساسي | أصلحي فوراً قبل TestFlight |
| P1 | مزعج لكن له بديل | أصلحي قبل Submit |
| P2 | تجميلي | سجّلي لبعد الإطلاق |

---

## اليوم 3 — Backend إنتاج

انظر: [`DEPLOY.md`](./DEPLOY.md)

- [ ] MongoDB Atlas جاهز
- [ ] نشر API على HTTPS (Render / Railway / VPS)
- [ ] `JWT_SECRET` قوي في أسرار المنصة (ليس في Git)
- [ ] `EXPO_PUBLIC_API_URL` في `eas.json` = رابط الإنتاج
- [x] Rate limit على `/api/auth/login` (وregister/verify)

---

## اليوم 4 — TestFlight

انظر: [`APP_STORE.md`](./APP_STORE.md)

```bash
cd mobile
# عدّلي EXPO_PUBLIC_API_URL في eas.json أولاً
eas build --platform ios --profile preview
eas submit --platform ios --profile production   # أو رفع يدوي لـ TestFlight
```

- [x] `bundleIdentifier`: `kw.awqaf.darquran`
- [x] Face ID + Notifications في infoPlist
- [ ] Apple Developer ($99) + مختبرين 2–3 على TestFlight

---

## اليوم 5 — Submit for Review

انظر قسم metadata في [`APP_STORE.md`](./APP_STORE.md)

- [ ] Privacy Policy URL عام
- [ ] Support URL / بريد
- [ ] حسابات للمراجع (المشرف + الطالبة أعلاه)
- [ ] Submit → راقبي الرفض → resubmit
