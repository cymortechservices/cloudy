import type { StorageAdapter } from './adapter.js';
import { db } from '../db.js';
import { env } from '../config/env.js';

/**
 * Supabase Storage adapter. The bucket is PRIVATE and has no client policies: only this backend (service role)
 * and short-lived signed URLs can reach objects. Bucket-level file_size_limit/allowed_mime_types are set in migration 0002.
 */
export function createSupabaseStorage(): StorageAdapter {
  const bucket = () => db.storage.from(env.SUPABASE_STORAGE_BUCKET);
  const fail = (what: string, e: { message: string } | null) => new Error(`Storage ${what} failed: ${e?.message ?? 'unknown'}`);
  const split = (key: string) => { const i = key.lastIndexOf('/'); return [key.slice(0, i), key.slice(i + 1)] as const; };
  return {
    async presignUpload(key) {
      // Signed upload URLs are single-object and expire on Supabase's schedule; size is re-verified in complete-upload.
      const { data, error } = await bucket().createSignedUploadUrl(key);
      if (error || !data) throw fail('upload authorization', error);
      return { url: data.signedUrl, headers: { 'x-upsert': 'false' }, mode: 'form' };
    },
    async presignDownload(key, filename, ttl, inline) {
      const { data, error } = await bucket().createSignedUrl(key, ttl, inline ? undefined : { download: filename });
      if (error || !data) throw fail('download link', error);
      return data.signedUrl;
    },
    async head(key) {
      const [folder, name] = split(key);
      const { data, error } = await bucket().list(folder, { limit: 5, search: name });
      if (error) throw fail('lookup', error);
      const o = data?.find((x) => x.name === name);
      return o ? { size: Number((o.metadata as any)?.size ?? 0) } : null;
    },
    async readHead(key, bytes) {
      const { data, error } = await bucket().createSignedUrl(key, 30);
      if (error || !data) throw fail('read', error);
      const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${bytes - 1}` } });
      if (!res.ok || !res.body) throw new Error('Storage read failed.');
      const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let n = 0;
      while (n < bytes) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
      await reader.cancel().catch(() => {});
      const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
      return out.slice(0, bytes);
    },
    async remove(key) {
      const { error } = await bucket().remove([key]);
      if (error) throw fail('delete', error);
    },
  };
}
