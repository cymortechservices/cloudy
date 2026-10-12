import { z } from 'zod';
const schema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  STORAGE_PROVIDER: z.enum(['supabase', 'r2']).default('supabase'),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('cloudy-private'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(26214400),
  GLOBAL_STORAGE_CAP_BYTES: z.coerce.number().int().positive().default(943718400),
  UPLOAD_RESERVATION_TTL_SECONDS: z.coerce.number().int().positive().default(900),
}).superRefine((v, ctx) => {
  if (v.STORAGE_PROVIDER === 'r2') for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'] as const)
    if (!v[k]) ctx.addIssue({ code: 'custom', path: [k], message: `${k} is required when STORAGE_PROVIDER=r2` });
});
export const env = schema.parse(process.env);
