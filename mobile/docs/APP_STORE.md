# App Store / TestFlight (أسبوع 10 يوم 4–5)

## إعدادات التطبيق (منفّذة في المستودع)

| الحقل | القيمة |
|--------|--------|
| الاسم | دور القرآن |
| Bundle ID | `kw.awqaf.darquran` |
| Version | `1.0.0` |
| iOS buildNumber | `1` (الإنتاج يزيد تلقائياً عبر EAS `autoIncrement`) |
| EAS projectId | `e8bb9308-72f5-4285-b970-6ae217a5fc5b` |

صلاحيات infoPlist المستخدمة فعلياً:

- Face ID — دخول سريع
- الإشعارات — قبول تسجيل + اعتذار معلمة

**غير مضافة عمداً:** Location / Photo Library (الخرائط عبر رابط خارجي؛ رفع الملفات مؤجّل) لتفادي رفض Apple لصلاحيات غير مستخدمة.

## قبل البناء

1. انشري الباك اند على HTTPS ([`DEPLOY.md`](./DEPLOY.md)) — الحالي: `https://awqaf-dar.onrender.com`
2. تأكدي `EXPO_PUBLIC_API_URL` في `eas.json` (preview/production)
3. حساب Apple Developer **Program** ($99) — عند البناء/النشر فقط (المجاني يكفي للتطوير)

```bash
cd mobile
eas build --platform ios --profile preview
```

ثم ارفعي البناء إلى TestFlight من موقع Expo أو:

```bash
eas submit --platform ios --latest
```

## Metadata مقترح (App Store Connect)

**الاسم:** دور القرآن  
**الترجمة العربية — الوصف القصير:**  
إدارة مراكز ودور القرآن: تسجيل، مستويات، حصص، حضور ودرجات.

**الوصف:**  
منصة لإدارة دور القرآن في الكويت. تتيح للمشرفات إدارة الطالبات والمستويات والحصص الحضورية/عن بُعد، وتسجيل الحضور والدرجات، وللطالبات متابعة الجدول والانضمام عبر Zoom عند توفر الرابط.

**الكلمات المفتاحية:** قرآن,أوقاف,دور,تعليم,حضور,كويت

**التصنيف:** Education  
**العمر:** 4+

**Privacy Policy URL:** انشري [`legal/privacy.html`](./legal/privacy.html) على استضافة عامة (GitHub Pages / أي موقع) ثم الصقي الرابط هنا.  
النص الكامل: [`legal/PRIVACY_POLICY_AR.md`](./legal/PRIVACY_POLICY_AR.md)

**Support URL:** انشري [`legal/support.html`](./legal/support.html) أو استخدمي بريداً عاماً للدعم.  
النص: [`legal/SUPPORT_AR.md`](./legal/SUPPORT_AR.md)

**قبل النشر:** املئي خانات البريد واسم الجهة في ملفي الخصوصية والدعم (placeholders).

**ملاحظة توقيت:** حساب Apple المجاني يكفي الآن؛ ادفعِ Program ($99) وارفعِ الروابط في App Store Connect عند الاقتراب من Submit وبعد الموافقات اللازمة.

## حسابات للمراجع (App Review Information)

```
مشرف:
الهاتف: 0512345678
كلمة المرور: 123456

طالبة:
الهوية المدنية: 123456789012
كلمة المرور: 123456
```

ملاحظات للمراجع (Notes):

> التطبيق باللغة العربية (RTL). بعد الدخول كمشرفة يمكن تجربة الحصص والحضور. الطالبة تستخدم رقم الهوية المدنية وليس الهاتف.

## Export Compliance

- عادةً: يستخدم التشفير القياسي فقط (HTTPS / JWT) → أجيبي وفق نموذج Apple الحالي (غالباً Exempt / standard encryption).

## بعد الرفض الشائع

| سبب | معالجة |
|-----|--------|
| نقص Privacy Policy | انشري صفحة + حدّثي الرابط |
| حساب تجريبي لا يعمل | تأكدي seed على سيرفر الإنتاج |
| صلاحية غير مستخدمة | أزلنا Location/Photos مسبقاً |
| localhost API | لازم HTTPS إنتاج في EAS env |
