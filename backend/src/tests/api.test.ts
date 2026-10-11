/**
 * اختبارات تكامل للـ API — تحتاج قاعدة Mongo متوافقة:
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/awqaf-test npm test
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.DEV_VERIFICATION_CODE = '7890';

const uri = process.env.TEST_MONGODB_URI;

type Json = Record<string, any>;

let server: Server;
let base = '';

async function api(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; form?: FormData } = {}
): Promise<{ status: number; body: Json }> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const res = await fetch(`${base}${path}`, { method, headers, body });
  const text = await res.text();
  let parsed: Json = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

function pngBlob(): Blob {
  // صورة PNG صغيرة 1x1
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  return new Blob([bytes], { type: 'image/png' });
}

async function registerCenter(name: string, phone: string, gender: 'female' | 'male' = 'female') {
  const reg = await api('POST', '/api/auth/register-center', {
    body: {
      phone,
      countryCode: '965',
      password: '123456',
      centerName: name,
      supervisorName: 'مشرفة',
      specializations: ['mutor'],
    },
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  const verify = await api('POST', '/api/auth/verify-center', {
    body: { phone, countryCode: '965', code: reg.body.data.devCode },
  });
  assert.equal(verify.status, 200, JSON.stringify(verify.body));
  const token = verify.body.data.token as string;
  if (gender === 'male') {
    await api('PUT', '/api/settings/center-profile', { token, body: { genderAudience: 'male' } });
  }
  return { token, centerId: verify.body.data.user.centerProfile.id as string };
}

describe('awqaf-dar API', { skip: !uri ? 'TEST_MONGODB_URI not set' : false }, () => {
  let centerA: { token: string; centerId: string };
  let centerB: { token: string; centerId: string };
  let levels: Json[] = [];
  let studentId = '';
  let studentToken = '';

  before(async () => {
    await mongoose.connect(uri!);
    await mongoose.connection.db!.dropDatabase();
    const { runStartupMigrations } = await import('../utils/migrations');
    await runStartupMigrations();
    const { app } = await import('../app');
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    centerA = await registerCenter('مركز الاختبار أ', '51111111');
    centerB = await registerCenter('مركز الاختبار ب', '52222222');
  });

  after(async () => {
    server?.close();
    await mongoose.disconnect();
  });

  it('creates 6 preparatory + 8 mutor levels for a new center', async () => {
    const res = await api('GET', `/api/levels?centerId=${centerA.centerId}`);
    assert.equal(res.status, 200);
    levels = res.body.data;
    assert.equal(levels.filter((l) => l.track === 'preparatory').length, 6);
    assert.equal(levels.filter((l) => l.track === 'mutor').length, 8);
    assert.equal(levels[0].shortName, 'تمهيدي أول');
    assert.equal(levels[5].shortName, 'تمهيدي سادس');
  });

  it('rejects Saudi-style 10 digit phone as Kuwaiti and accepts 8 digits', async () => {
    const bad = await api('POST', '/api/auth/login', {
      body: { phone: '0512345678', countryCode: '965', password: '123456' },
    });
    assert.equal(bad.status, 401);
    const ok = await api('POST', '/api/auth/login', {
      body: { phone: '51111111', countryCode: '965', password: '123456' },
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
  });

  it('requires documents and new fields on student registration', async () => {
    const form = new FormData();
    form.set('fullName', 'طالبة الاختبار');
    form.set('idNumber', '290010100011');
    form.set('gender', 'female');
    form.set('nationality', 'KW');
    form.set('academicLevel', 'university');
    form.set('track', 'preparatory');
    form.set('phone', '61234567');
    form.set('countryCode', '965');
    form.set('password', '123456');
    form.set('dob', '1990-01-01');
    form.set('centerId', centerA.centerId);
    form.set('levelId', levels.find((l) => l.track === 'preparatory' && l.order === 6)!.id);
    form.set('occupation', 'employee');
    form.set('studentType', 'new');
    form.set('homeAddress', JSON.stringify({ area: 'السالمية', block: '5' }));
    form.set('notes', 'تحفظ جزء عم');
    form.set('civilId', pngBlob(), 'civil.png');
    form.set('photo', pngBlob(), 'photo.png');

    const missingQualification = await api('POST', '/api/registration-requests', { form });
    assert.equal(missingQualification.status, 400);
    assert.match(missingQualification.body.error, /مؤهل/);

    form.set('qualification', pngBlob(), 'q.png');
    const ok = await api('POST', '/api/registration-requests', { form });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));

    const list = await api('GET', '/api/registration-requests', { token: centerA.token });
    assert.equal(list.body.data.length, 1);
    const request = list.body.data[0];
    assert.equal(request.requestedLevelName, 'تمهيدي سادس');
    assert.equal(request.homeAddress.area, 'السالمية');
    assert.ok(request.documents.civilId?.url);

    const file = await fetch(`${base}${request.documents.photo.url}`, {
      headers: { Authorization: `Bearer ${centerA.token}` },
    });
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/png');
    const forbidden = await fetch(`${base}${request.documents.photo.url}`, {
      headers: { Authorization: `Bearer ${centerB.token}` },
    });
    assert.equal(forbidden.status, 403);

    const approve = await api('PATCH', `/api/registration-requests/${request.id}/approve`, {
      token: centerA.token,
      body: {},
    });
    assert.equal(approve.status, 200, JSON.stringify(approve.body));
    studentId = approve.body.data.studentId;
  });

  it('logs the student in with civil ID and with phone + country code', async () => {
    const byId = await api('POST', '/api/auth/login', {
      body: { idNumber: '290010100011', password: '123456' },
    });
    assert.equal(byId.status, 200, JSON.stringify(byId.body));
    studentToken = byId.body.data.token;
    const byPhone = await api('POST', '/api/auth/login', {
      body: { phone: '+96561234567', password: '123456' },
    });
    assert.equal(byPhone.status, 200, JSON.stringify(byPhone.body));
  });

  it('filters students and edits notes', async () => {
    const all = await api('GET', '/api/students?track=preparatory&studentType=new', { token: centerA.token });
    assert.equal(all.body.data.length, 1);
    const none = await api('GET', '/api/students?enrollmentStatus=suspended', { token: centerA.token });
    assert.equal(none.body.data.length, 0);

    const edit = await api('PUT', `/api/students/${studentId}`, {
      token: centerA.token,
      body: { notes: 'ملاحظة معدلة', studentType: 'continuing' },
    });
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    assert.equal(edit.body.data.notes, 'ملاحظة معدلة');
    assert.equal(edit.body.data.studentType, 'continuing');
  });

  it('suspends, blocks login, then reinstates', async () => {
    const noReason = await api('POST', `/api/students/${studentId}/suspend`, { token: centerA.token, body: {} });
    assert.equal(noReason.status, 400);
    const s = await api('POST', `/api/students/${studentId}/suspend`, {
      token: centerA.token,
      body: { reason: 'انقطاع' },
    });
    assert.equal(s.body.data.enrollmentStatus, 'suspended');
    const login = await api('POST', '/api/auth/login', { body: { idNumber: '290010100011', password: '123456' } });
    assert.equal(login.status, 403);
    const r = await api('POST', `/api/students/${studentId}/reinstate`, { token: centerA.token, body: { reason: 'عادت' } });
    assert.equal(r.body.data.enrollmentStatus, 'enrolled');
    assert.equal(r.body.data.enrollmentHistory[0].action, 'reinstated');
  });

  it('promotes from preparatory 6 to mutor 1', async () => {
    const res = await api('PATCH', `/api/students/${studentId}/promote`, { token: centerA.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.levelShortName, 'مطور أول');
    assert.equal(res.body.data.track, 'mutor');
  });

  it('builds a recurring weekly schedule from class offers', async () => {
    const mutor1 = levels.find((l) => l.track === 'mutor' && l.order === 1)!;
    const offer = await api('POST', '/api/class-offers', {
      token: centerA.token,
      body: {
        track: 'mutor',
        levelId: mutor1.id,
        subjectName: 'التجويد',
        mode: 'in_person',
        weekday: 0,
        startTime: '10:00',
        endTime: '11:00',
        teacherName: 'أ. معلمة',
        gradeWeights: { attendance: 20, shortExam: 20, participation: 20, final: 40 },
      },
    });
    assert.equal(offer.status, 201, JSON.stringify(offer.body));

    const clash = await api('POST', '/api/class-offers', {
      token: centerA.token,
      body: { ...offer.body.data, startTime: '10:30', endTime: '11:30', subjectName: 'النحو' },
    });
    assert.equal(clash.status, 409);

    const from = new Date();
    const to = new Date(from.getTime() + 21 * 86400000);
    const sessions = await api(
      'GET',
      `/api/sessions?from=${from.toISOString()}&to=${to.toISOString()}`,
      { token: centerA.token }
    );
    assert.equal(sessions.status, 200);
    assert.ok(sessions.body.data.length >= 3, `expected 3 weekly sessions, got ${sessions.body.data.length}`);
    // 10:00 Kuwait = 07:00 UTC
    assert.equal(new Date(sessions.body.data[0].startAt).getUTCHours(), 7);

    // نفس الطلب مرة ثانية لا يكرر الحصص
    const again = await api('GET', `/api/sessions?from=${from.toISOString()}&to=${to.toISOString()}`, {
      token: centerA.token,
    });
    assert.equal(again.body.data.length, sessions.body.data.length);

    const cancel = await api('POST', `/api/sessions/${sessions.body.data[1].id}/cancel`, {
      token: centerA.token,
      body: { reason: 'اعتذار المعلمة' },
    });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
  });

  it('produces gradesheet and attendance reports', async () => {
    const mutor1 = levels.find((l) => l.track === 'mutor' && l.order === 1)!;
    const save = await api('POST', '/api/grades/bulk', {
      token: centerA.token,
      body: {
        levelId: mutor1.id,
        subjectIndex: 3,
        records: [{ studentId, breakdown: { attendance: 20, shortExam: 18, participation: 19, final: 38 } }],
      },
    });
    assert.equal(save.status, 200, JSON.stringify(save.body));
    const sheet = await api('GET', `/api/reports/gradesheet?levelId=${mutor1.id}`, { token: centerA.token });
    assert.equal(sheet.status, 200);
    assert.equal(sheet.body.data.subjects.length, 7);
    assert.equal(sheet.body.data.rows[0].subjects[3].total, 95);
    assert.equal(sheet.body.data.isFinal, true);

    const today = new Date().toISOString().slice(0, 10);
    const att = await api('GET', `/api/reports/attendance?levelId=${mutor1.id}&from=${today}&to=${today}`, {
      token: centerA.token,
    });
    assert.equal(att.status, 200, JSON.stringify(att.body));
  });

  it('transfers a student from center A to center B', async () => {
    const studentReq = await api('POST', '/api/transfer-requests/me', {
      token: studentToken,
      body: { toCenterId: centerB.centerId, reason: 'انتقال السكن' },
    });
    assert.equal(studentReq.status, 201, JSON.stringify(studentReq.body));
    assert.equal(studentReq.body.data.status, 'pending_source');

    const incomingB = await api('GET', '/api/transfer-requests', { token: centerB.token });
    assert.equal(incomingB.body.data.length, 0, 'destination should not see it before source approval');

    const approveA = await api('PATCH', `/api/transfer-requests/${studentReq.body.data.id}/approve`, {
      token: centerA.token,
      body: {},
    });
    assert.equal(approveA.body.data.status, 'pending_destination');

    const approveB = await api('PATCH', `/api/transfer-requests/${studentReq.body.data.id}/approve`, {
      token: centerB.token,
      body: {},
    });
    assert.equal(approveB.status, 200, JSON.stringify(approveB.body));

    const inB = await api('GET', '/api/students', { token: centerB.token });
    assert.equal(inB.body.data.length, 1);
    assert.equal(inB.body.data[0].levelShortName, 'مطور أول');
    const inA = await api('GET', '/api/students', { token: centerA.token });
    assert.equal(inA.body.data.length, 0);
  });
});

describe('legacy data migration', { skip: !uri ? 'TEST_MONGODB_URI not set' : false }, () => {
  it('converts the old single «تمهيدي» level (order 0) into تمهيدي أول and adds 2–6', async () => {
    await mongoose.connect(uri!.replace(/\/[^/]*$/, '/awqaf-migration-test'));
    const db = mongoose.connection.db!;
    await db.dropDatabase();
    const centerId = new mongoose.Types.ObjectId();
    await db.collection('centers').insertOne({ _id: centerId, nameAr: 'قديم', supervisorName: 'x', status: 'active' });
    const legacyLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((order) => ({
      _id: new mongoose.Types.ObjectId(),
      centerId,
      order,
      fullName: order === 0 ? 'المستوى التمهيدي' : `مطور ${order}`,
      shortName: order === 0 ? 'تمهيدي' : `مستوى مطور ${order}`,
    }));
    await db.collection('levels').insertMany(legacyLevels);
    await db.collection('students').insertOne({
      fullName: 'قديمة',
      idNumber: '280010100001',
      gender: 'female',
      nationality: 'KW',
      academicLevel: 'high',
      track: 'mutor',
      enrollmentStatus: 'enrolled',
      phone: '0591000001',
      dob: new Date('2000-01-01'),
      levelId: legacyLevels[0]._id,
      centerId,
      deletedAt: null,
    });

    const { runStartupMigrations } = await import('../utils/migrations');
    await runStartupMigrations();
    await runStartupMigrations(); // idempotent

    const levels = await db.collection('levels').find({ centerId }).toArray();
    assert.equal(levels.length, 14);
    const prep1 = levels.find((l) => l.track === 'preparatory' && l.order === 1)!;
    assert.equal(prep1._id.toString(), legacyLevels[0]._id.toString());
    assert.equal(prep1.shortName, 'تمهيدي أول');
    const student = await db.collection('students').findOne({ centerId });
    assert.equal(student!.track, 'preparatory');
    await mongoose.disconnect();
  });
});
