import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { runStartupMigrations } from './utils/migrations';
import { isSmsConfigured } from './services/smsService';
import { app } from './app';

dotenv.config();

const PORT = process.env.PORT ?? 8000;

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.DEV_VERIFICATION_CODE) {
  console.warn('[startup] DEV_VERIFICATION_CODE is ignored in production — remove it from env');
}
if (process.env.NODE_ENV === 'production' && !isSmsConfigured()) {
  console.warn('[startup] SMS is not configured (TWILIO_*) — center verification codes will only be logged');
}

connectDB(mongoUri)
  .then(async () => {
    try {
      await runStartupMigrations();
    } catch (err) {
      console.warn('[startup] migrations:', (err as Error).message);
    }
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
