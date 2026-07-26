# نشر Backend — Render + MongoDB Atlas

## المعمارية (لا تخلطين بينهما)

| الخدمة | الدور |
|--------|--------|
| **MongoDB Atlas** | قاعدة البيانات (تبقى كما هي) |
| **Render** | يشغّل كود `backend` على `https://…` |

الـ API على Render يتصل بـ Atlas عبر `MONGODB_URI`.

---

## جاهز في المستودع

- [x] `backend/` + `render.yaml` على GitHub فرع **`main`**
- [x] Health: `GET /api/health`
- [x] البناء: `npm ci && npm run build` ثم `npm start`

---

## خطوات Render (مرة واحدة)

1. ادخلي: [إنشاء Blueprint من الريبو](https://dashboard.render.com/blueprint/new?repo=https://github.com/rawan95rsh-blip/awqaf-dar)  
   (أو Dashboard → New → Blueprint → اختاري `awqaf-dar` / فرع `main`)

2. اربطي حساب GitHub إن طُلب، ووافقي على تطبيق الـ Blueprint.

3. عند `MONGODB_URI` (sync: false):  
   انسخي القيمة من ملفك المحلي `backend/.env` (سطر `MONGODB_URI=…` بالكامل بعد علامة `=`).

4. `JWT_SECRET` يُولَّد تلقائياً من Render — اتركيه.

5. Apply / Create → انتظري حتى تصبح الخدمة **Live**.

6. انسخي الرابط العام، مثال:
   `https://awqaf-dar-api.onrender.com`  
   (بدون شرطة `/` في النهاية)

7. افتحي في المتصفح:  
   `https://YOUR-SERVICE.onrender.com/api/health`  
   لازم يظهر: `{"success":true,"data":{"status":"ok"}}`

8. في **MongoDB Atlas** → Network Access → أضيفي `0.0.0.0/0`  
   (كي يسمح لاتصال Render؛ أو قيّدي لاحقاً بـ IPs إن لزم).

9. حدّثي الموبايل — في `mobile/eas.json` للـ `preview` و `production`:

```json
"EXPO_PUBLIC_API_URL": "https://YOUR-SERVICE.onrender.com"
```

ثم أرسلي الرابط في المحادثة لنضبطه في المشروع تلقائياً.

---

## متغيرات البيئة على Render

| المفتاح | المصدر |
|---------|--------|
| `NODE_ENV` | `production` (من الـ Blueprint) |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_SECRET` | توليد تلقائي |
| `MONGODB_URI` | من `backend/.env` المحلي يدوياً |

**لا تضعي** `DEV_VERIFICATION_CODE` على Render.

---

## ملاحظات Free plan

- الخدمة قد **تنام** بعد خمول؛ أول طلب بعد النوم يتأخر ~30–60 ثانية.
- للإطلاق الجاد لاحقاً يمكن ترقية الخطة.

---

## تجربة محلية (بدون Render)

```bash
cd backend && npm run build && npm start
```

الجهاز الحقيقي: `EXPO_PUBLIC_API_URL` في `mobile/.env` = IP الماك.
