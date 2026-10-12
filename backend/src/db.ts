import { createClient } from '@supabase/supabase-js';
import { env } from './config/env.js';
// Service-role client: bypasses RLS. Every query MUST filter by the verified owner_id.
export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
