import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { buildRouter } from './routes/index.js';
import { ApiError } from './utils/errors.js';
import type { StorageAdapter } from './storage/adapter.js';

export function createApp(storage: StorageAdapter) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: [env.FRONTEND_URL], methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type'], maxAge: 600 }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_q, s) => s.json({ status: 'ok' }));
  app.use('/api/v1', buildRouter(storage));
  app.use((_q, s) => s.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));
  app.use((e: unknown, _q: Request, s: Response, _n: NextFunction) => {
    if (e instanceof ApiError) return s.status(e.status).json({ error: { code: e.code, message: e.message } });
    console.error('Unhandled error', e instanceof Error ? e.message : 'unknown'); // never log tokens/URLs
    s.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } });
  });
  return app;
}
