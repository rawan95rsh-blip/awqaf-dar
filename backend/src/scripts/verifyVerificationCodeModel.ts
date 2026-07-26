/**
 * اختبار الدفعة 1 — نموذج VerificationCode
 * التشغيل: npm run verify:verification-code
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { VerificationCode } from '../models/VerificationCode';

dotenv.config();

async function verify(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI غير موجود في .env');
  }

  await connectDB(mongoUri);

  const user = await User.findOne({ phone: '0512345678' });
  if (!user) {
    throw new Error('لم يُعثر على مستخدم seed (0512345678). شغّلي: npm run seed');
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const testPhone = `0599999${String(Date.now()).slice(-3)}`;

  const created = await VerificationCode.create({
    phone: testPhone,
    code: '7890',
    purpose: 'center_registration',
    expiresAt,
    userId: user._id,
  });

  console.log('✓ تم الإنشاء:', {
    id: created._id.toString(),
    phone: created.phone,
    purpose: created.purpose,
    expiresAt: created.expiresAt.toISOString(),
  });

  const found = await VerificationCode.findById(created._id);
  if (!found) {
    throw new Error('فشل القراءة — السجل غير موجود بعد الإنشاء');
  }

  if (found.code !== '7890' || found.purpose !== 'center_registration') {
    throw new Error('الحقول المحفوظة لا تطابق المُدخل');
  }

  console.log('✓ تمت القراءة والتحقق من الحقول');

  await VerificationCode.deleteOne({ _id: created._id });
  console.log('✓ تم حذف سجل الاختبار (تنظيف)');

  await mongoose.disconnect();
  console.log('\nالدفعة 1 — نموذج VerificationCode يعمل بشكل صحيح.');
}

verify().catch((err) => {
  console.error('✗ فشل الاختبار:', err instanceof Error ? err.message : err);
  mongoose.disconnect().finally(() => process.exit(1));
});
