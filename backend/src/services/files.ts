import { db } from '../db.js';
import { env } from '../config/env.js';
import { ApiError, fromDbError } from '../utils/errors.js';
import { newObjectKey, sanitizeName, signatureMatches, validateType } from '../utils/files.js';
import type { StorageAdapter } from '../storage/adapter.js';

const COLS = 'id, folder_id, original_name, mime_type, file_extension, size_bytes, created_at, updated_at';
const rpc = async (fn: string, args: Record<string, unknown>) => {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw fromDbError(error.message) ?? new ApiError(500, 'DB_ERROR', 'Something went wrong.');
  return data;
};

export function filesService(storage: StorageAdapter) {
  const owned = async (owner: string, id: string, ready = true) => {
    let q = db.from('files').select('*').eq('id', id).eq('owner_id', owner);
    if (ready) q = q.eq('status', 'ready');
    const { data } = await q.maybeSingle();
    if (!data) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.'); // same response whether missing or not yours
    return data;
  };
  return {
    async uploadIntent(owner: string, i: { name: string; mimeType: string; size: number; folderId?: string | null }) {
      if (i.size > env.MAX_FILE_SIZE_BYTES) throw new ApiError(413, 'FILE_TOO_LARGE', `Files must be ${Math.floor(env.MAX_FILE_SIZE_BYTES / 1048576)} MB or smaller.`);
      const name = sanitizeName(i.name);
      const t = validateType(name, i.mimeType);
      if (!t) throw new ApiError(415, 'UNSUPPORTED_TYPE', 'This file type is not allowed.');
      const key = newObjectKey(owner);
      const id = await rpc('reserve_upload', {
        p_owner: owner, p_folder: i.folderId ?? null, p_name: name, p_mime: i.mimeType.toLowerCase(), p_ext: t.ext,
        p_size: i.size, p_key: key, p_ttl_seconds: env.UPLOAD_RESERVATION_TTL_SECONDS, p_global_cap: env.GLOBAL_STORAGE_CAP_BYTES });
      const up = await storage.presignUpload(key, i.mimeType.toLowerCase(), i.size, env.UPLOAD_RESERVATION_TTL_SECONDS);
      return { fileId: id as string, uploadUrl: up.url, headers: up.headers, expiresInSeconds: env.UPLOAD_RESERVATION_TTL_SECONDS };
    },
    /** Verifies the object really exists with the right size and signature before accounting. Idempotent. */
    async completeUpload(owner: string, id: string) {
      const f = await owned(owner, id, false);
      if (f.status === 'ready') return { file: await this.get(owner, id), alreadyComplete: true };
      const head = await storage.head(f.object_key);
      if (!head) throw new ApiError(409, 'UPLOAD_MISSING', 'The upload was not received. Please retry.');
      const bad = async (code: string, msg: string) => { await this.cancel(owner, id); throw new ApiError(422, code, msg); };
      if (head.size > f.size_bytes || head.size === 0) return bad('SIZE_MISMATCH', 'Uploaded size does not match.');
      const bytes = await storage.readHead(f.object_key, 16);
      if (!signatureMatches(f.file_extension, bytes)) return bad('CONTENT_MISMATCH', 'File contents do not match its type.');
      await rpc('finalize_upload', { p_owner: owner, p_file: id, p_actual_size: head.size });
      return { file: await this.get(owner, id), alreadyComplete: false };
    },
    async cancel(owner: string, id: string) {
      const key = await rpc('release_upload', { p_owner: owner, p_file: id });
      if (key) await storage.remove(key as string).then(() => db.from('deletion_queue').delete().eq('object_key', key as string)).catch(() => {});
    },
    async get(owner: string, id: string) {
      const { data } = await db.from('files').select(COLS).eq('id', id).eq('owner_id', owner).eq('status', 'ready').maybeSingle();
      if (!data) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
      return data;
    },
    async list(owner: string, p: any) {
      let q = db.from('files').select(COLS, { count: 'exact' }).eq('owner_id', owner).eq('status', 'ready');
      if (p.q) q = q.ilike('original_name', `%${p.q.replace(/[%_\\]/g, '\\$&')}%`);
      if (p.folderId === 'root') q = q.is('folder_id', null); else if (p.folderId) q = q.eq('folder_id', p.folderId);
      if (p.type) q = q.eq('file_extension', p.type.toLowerCase());
      const col = p.sort === 'name' ? 'original_name' : p.sort === 'size' ? 'size_bytes' : p.sort;
      const { data, count, error } = await q.order(col, { ascending: p.dir === 'asc' }).range(p.offset, p.offset + p.limit - 1);
      if (error) throw new ApiError(500, 'DB_ERROR', 'Could not load files.');
      return { items: data, total: count ?? 0 };
    },
    async update(owner: string, id: string, patch: { name?: string; folderId?: string | null }) {
      await owned(owner, id);
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) upd.original_name = sanitizeName(patch.name);
      if (patch.folderId !== undefined) {
        if (patch.folderId) { const { data } = await db.from('folders').select('id').eq('id', patch.folderId).eq('owner_id', owner).maybeSingle();
          if (!data) throw new ApiError(404, 'FOLDER_NOT_FOUND', 'Folder not found.'); }
        upd.folder_id = patch.folderId;
      }
      await db.from('files').update(upd).eq('id', id).eq('owner_id', owner);
      return this.get(owner, id);
    },
    async remove(owner: string, id: string) {
      const key = await rpc('delete_file', { p_owner: owner, p_file: id });
      if (!key) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
      try { await storage.remove(key as string); await db.from('deletion_queue').delete().eq('object_key', key as string); } catch { /* retried by cleanup */ }
    },
    async downloadUrl(owner: string, id: string, inline: boolean) {
      const f = await owned(owner, id);
      return { url: await storage.presignDownload(f.object_key, f.original_name, 60, inline), expiresInSeconds: 60 };
    },
    /** Account deletion: queue every object first (so failures are retried), delete the auth user (cascades all rows), then purge objects. */
    async purgeUser(owner: string) {
      const keys: string[] = [];
      for (let off = 0; ; off += 1000) {
        const { data, error } = await db.from('files').select('object_key').eq('owner_id', owner).range(off, off + 999);
        if (error) throw new ApiError(500, 'DB_ERROR', 'Could not delete account. Nothing was changed.');
        keys.push(...(data ?? []).map((r) => r.object_key)); if (!data || data.length < 1000) break;
      }
      for (let i = 0; i < keys.length; i += 500) {
        const { error } = await db.from('deletion_queue').upsert(keys.slice(i, i + 500).map((object_key) => ({ object_key })), { onConflict: 'object_key', ignoreDuplicates: true });
        if (error) throw new ApiError(500, 'DB_ERROR', 'Could not delete account. Nothing was changed.');
      }
      const { error } = await db.auth.admin.deleteUser(owner);
      if (error) throw new ApiError(500, 'DELETE_FAILED', 'Could not delete account. Please try again.');
      await this.cleanup().catch(() => {}); // best effort; the queue is retried later
      return keys.length;
    },
    /** Expire stale reservations and drain the deletion queue. Safe to call repeatedly (cron / on interval). */
    async cleanup() {
      const { data } = await db.rpc('expire_reservations');
      const { data: q } = await db.from('deletion_queue').select('object_key, attempts').lt('attempts', 10).limit(100);
      for (const r of q ?? []) {
        try { await storage.remove(r.object_key); await db.from('deletion_queue').delete().eq('object_key', r.object_key); }
        catch { await db.from('deletion_queue').update({ attempts: r.attempts + 1 }).eq('object_key', r.object_key); }
      }
      return { expired: (data as string[] | null)?.length ?? 0, queued: q?.length ?? 0 };
    },
  };
}
