import { createApp } from './app.js';
import { env } from './config/env.js';
import { createR2 } from './storage/r2.js';
import { filesService } from './services/files.js';

const storage = createR2();
createApp(storage).listen(env.PORT, () => console.log(`Cloudy API listening on :${env.PORT}`));
// Free hosts may sleep; cleanup also runs opportunistically. Prefer an external cron hitting POST /api/v1/maintenance/cleanup.
const svc = filesService(storage);
setInterval(() => svc.cleanup().catch(() => {}), 10 * 60_000).unref();
