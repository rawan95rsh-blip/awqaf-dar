# نشر Backend للإنتاج (أسبوع 10 يوم 3)

## الوضع الحالي

| الخيار | متى | الاستقرار |
|--------|-----|-----------|
| **نفق Cloudflare (جاهز الآن)** | تجربة HTTPS / بناء تجريبي | مؤقت — يحتاج اللابتوب شغّال + النفق |
| **Render (دائم)** | TestFlight / App Store | دائم — يحتاج رفع `backend` على GitHub |

### رابط HTTPS الحالي (نفق)

```
https://refers-headset-expenditures-chairman.trycloudflare.com
```

تحقق: افتحي `/api/health` → `{"success":true,"data":{"status":"ok"}}`

مضبوط أيضاً في `mobile/eas.json` (preview + production).

**مهم:** إذا أعدتِ تشغيل النفق يتغيّر الرابط — حدّثي `eas.json` من جديد.  
أبقِ طرفين مفتوحين: `npm start` في `backend` + سكربت النفق.

```bash
# من جذر المشروع (بعد ما يكون الـ API على :8000)
./scripts/start-api-tunnel.sh
```

---

## نشر دائم على Render (موصى به للإطلاق)

### لماذا؟

على GitHub حالياً فرع `main` فيه `mobile` فقط — مجلد `backend` محلي ولم يُرفع بعد.  
Render يبني من GitHub، فلازم رفع الباك اند أولاً (commit + push).

### الخطوات

1. ارفعي المستودع شاملاً `backend/` و `render.yaml` إلى GitHub.
2. [render.com](https://render.com) → New → **Blueprint** → اختاري الريبو `awqaf-dar`.
3. املئي الأسرار لما يُطلب:
   - `MONGODB_URI` — انسخي من `backend/.env` المحلي
   - `JWT_SECRET` — يمكن توليده تلقائياً من Render أو انسخيه
4. بعد Deploy انسخ الرابط مثل `https://awqaf-dar-api.onrender.com`
5. استبدلي في `eas.json` رابط النفق برابط Render.
6. في Atlas: Network Access → اسمحي بـ `0.0.0.0/0` (أو IPs الخاصة بـ Render).

`render.yaml` في جذر المشروع مضبوط مسبقاً (`rootDir: backend`, health `/api/health`).

### متغيرات الإنتاج

| المتغير | ملاحظة |
|---------|--------|
| `MONGODB_URI` | Atlas |
| `JWT_SECRET` | عشوائي طويل |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` (في الـ Blueprint) |

**لا تضعي** `DEV_VERIFICATION_CODE` في الإنتاج.

### أوامر البناء (تلقائية على Render)

```bash
cd backend
npm ci && npm run build
npm start
```

---

## الموبايل محلياً

للمحاكي/الجهاز على نفس الشبكة: `EXPO_PUBLIC_API_URL` في `mobile/.env` = IP الماك.  
للتجربة عبر الإنترنت الآن: رابط النفق أعلاه.

---

## أمان مطبّق في الكود

- Rate limit على login
- `trust proxy` عند `NODE_ENV=production`
- الاستماع على `0.0.0.0` لاستضافة السحابة
