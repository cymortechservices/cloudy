import { z } from 'zod';
const schema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  STORAGE_PROVIDER: z.enum(['r2']).default('r2'),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(26214400),
  GLOBAL_STORAGE_CAP_BYTES: z.coerce.number().int().positive().default(8589934592),
  UPLOAD_RESERVATION_TTL_SECONDS: z.coerce.number().int().positive().default(900),
});
export const env = schema.parse(process.env);
