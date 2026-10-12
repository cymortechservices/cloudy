import type { StorageAdapter } from './adapter.js';
import { env } from '../config/env.js';
import { createR2 } from './r2.js';
import { createSupabaseStorage } from './supabase.js';
export const createStorage = (): StorageAdapter => (env.STORAGE_PROVIDER === 'r2' ? createR2() : createSupabaseStorage());
