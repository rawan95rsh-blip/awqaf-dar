import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import authRoutes from './routes/auth';
import accountRoutes from './routes/account';
import centersRoutes from './routes/centers';
import levelsRoutes from './routes/levels';
import registrationRequestsRoutes from './routes/registrationRequests';
import studentsRoutes from './routes/students';
import accountDeletionRequestsRoutes from './routes/accountDeletionRequests';
import suspensionRequestsRoutes from './routes/suspensionRequests';
import attendanceRoutes from './routes/attendance';
import gradesRoutes from './routes/grades';
import settingsRoutes from './routes/settings';
import sessionsRoutes from './routes/sessions';
import classOffersRoutes from './routes/classOffers';
import coursesRoutes from './routes/courses';
import devicesRoutes from './routes/devices';
import notificationsRoutes from './routes/notifications';
import './models/Center';
import './models/User';
import './models/VerificationCode';
import './models/Level';
import './models/Student';
import { Student } from './models/Student';
import './models/RegistrationRequest';
import './models/AccountDeletionRequest';
import './models/SuspensionRequest';
import './models/Attendance';
import './models/Grade';
import './models/Course';
import './models/ClassOffer';
import './models/Session';
import './models/DeviceToken';
import './models/Notification';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 8000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/centers', centersRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/registration-requests', registrationRequestsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/account-deletion-requests', accountDeletionRequestsRoutes);
app.use('/api/suspension-requests', suspensionRequestsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/class-offers', classOffersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use(errorHandler);

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

connectDB(mongoUri)
  .then(async () => {
    try {
      await Student.syncIndexes();
    } catch (err) {
      console.warn('[startup] Student.syncIndexes:', (err as Error).message);
    }
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
