# دور القرآن — تطبيق الجوال (Expo + React Native)

تطبيق جوال مبني بـ **Expo SDK 54** و **Expo Router** و **React Query**، وفق قواعد المشروع في `rules/Frontend`.

## التشغيل

1. تثبيت الحزم: `npm install`
2. تشغيل الباك اند من مجلد `backend`: `npm run dev` (على `http://localhost:8000`)
3. ضبط عنوان الـ API إن لزم: انسخ `.env.example` إلى `.env` وعدّل `EXPO_PUBLIC_API_URL` (على الجهاز الحقيقي أو سيميوليتر قد تحتاج عنوان الماك مثل `http://192.168.x.x:8000`)
4. تشغيل التطبيق:
   - `npm start` — فتح Expo
   - `npm run ios` — تشغيل على سيميوليتر iOS
   - `npm run android` — تشغيل على أندرويد

## المسارات

- اختيار نوع الحساب → تسجيل دخول / تسجيل مركز / تسجيل طالب
- لوحة المركز: الرئيسية، الطلاب، الطلبات المعلقة
- لوحة الطالب: الرئيسية، الملف، الشهادات

## الهيكل

- `app/` — Expo Router (شاشات وتخطيطات)
- `src/api/` — دوال API و axios instance مع SecureStore
- `src/context/` — AuthContext و AuthProvider
- `src/types/` — واجهات TypeScript
- `src/utils/` — دوال مساعدة
- `constants/index.ts` — ثوابت التطبيق (ألوان، تباعد، تخطيط)
