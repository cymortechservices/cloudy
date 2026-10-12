import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import type { ZodSchema } from 'zod';
import { db } from '../db.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, fromDbError } from '../utils/errors.js';
import * as S from '../schemas/index.js';
import { filesService } from '../services/files.js';
import type { StorageAdapter } from '../storage/adapter.js';

const parse = <T,>(schema: ZodSchema<T>, v: unknown): T => {
  const r = schema.safeParse(v);
  if (!r.success) throw new ApiError(400, 'VALIDATION_ERROR', r.error.issues[0]?.message ?? 'Invalid input.');
  return r.data;
};
const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

export function buildRouter(storage: StorageAdapter) {
  const r = Router();
  const files = filesService(storage);
  r.use(requireAuth);
  r.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, keyGenerator: (q) => q.userId }));
  const heavy = rateLimit({ windowMs: 60_000, limit: 30, keyGenerator: (q) => q.userId, standardHeaders: true, legacyHeaders: false });

  const usage = async (owner: string) => {
    const { data } = await db.from('user_storage').select('quota_bytes, used_bytes, reserved_bytes').eq('owner_id', owner).single();
    const used = Number(data?.used_bytes ?? 0), quota = Number(data?.quota_bytes ?? 0), reserved = Number(data?.reserved_bytes ?? 0);
    return { quotaBytes: quota, usedBytes: used, reservedBytes: reserved, remainingBytes: Math.max(quota - used - reserved, 0),
      percentUsed: quota ? Math.round(((used + reserved) / quota) * 1000) / 10 : 0, maxFileBytes: env.MAX_FILE_SIZE_BYTES };
  };

  r.get('/me', h(async (q, s) => {
    const { data } = await db.from('profiles').select('display_name').eq('id', q.userId).maybeSingle();
    s.json({ id: q.userId, email: q.userEmail, displayName: data?.display_name ?? '' });
  }));
  r.patch('/me', h(async (q, s) => {
    const b = parse(S.patchProfile, q.body);
    await db.from('profiles').update({ display_name: b.displayName, updated_at: new Date().toISOString() }).eq('id', q.userId);
    s.json({ displayName: b.displayName });
  }));
  r.delete('/me', heavy, h(async (q, s) => { await files.purgeUser(q.userId); s.status(204).end(); }));
  r.get('/storage/usage', h(async (q, s) => s.json(await usage(q.userId))));
  r.get('/dashboard', h(async (q, s) => {
    const [u, f, c, recent] = await Promise.all([
      usage(q.userId),
      db.from('files').select('id', { count: 'exact', head: true }).eq('owner_id', q.userId).eq('status', 'ready'),
      db.from('folders').select('id', { count: 'exact', head: true }).eq('owner_id', q.userId),
      files.list(q.userId, { sort: 'created_at', dir: 'desc', limit: 8, offset: 0 }),
    ]);
    s.json({ storage: u, totalFiles: f.count ?? 0, totalFolders: c.count ?? 0, recentFiles: recent.items });
  }));

  r.get('/files', h(async (q, s) => s.json(await files.list(q.userId, parse(S.listFiles, q.query)))));
  r.post('/files/upload-intent', heavy, h(async (q, s) => s.status(201).json(await files.uploadIntent(q.userId, parse(S.uploadIntent, q.body)))));
  r.get('/files/:id', h(async (q, s) => s.json(await files.get(q.userId, parse(S.idParam, q.params).id))));
  r.post('/files/:id/complete-upload', heavy, h(async (q, s) => s.json(await files.completeUpload(q.userId, parse(S.idParam, q.params).id))));
  r.post('/files/:id/cancel-upload', h(async (q, s) => { await files.cancel(q.userId, parse(S.idParam, q.params).id); s.status(204).end(); }));
  r.get('/files/:id/download', heavy, h(async (q, s) => s.json(await files.downloadUrl(q.userId, parse(S.idParam, q.params).id, false))));
  r.get('/files/:id/preview', heavy, h(async (q, s) => s.json(await files.downloadUrl(q.userId, parse(S.idParam, q.params).id, true))));
  r.patch('/files/:id', h(async (q, s) => s.json(await files.update(q.userId, parse(S.idParam, q.params).id, parse(S.patchFile, q.body)))));
  r.delete('/files/:id', h(async (q, s) => { await files.remove(q.userId, parse(S.idParam, q.params).id); s.status(204).end(); }));

  r.get('/folders', h(async (q, s) => {
    const { data } = await db.from('folders').select('id, name, parent_id, created_at').eq('owner_id', q.userId).order('name');
    s.json({ items: data ?? [] });
  }));
  r.post('/folders', h(async (q, s) => {
    const b = parse(S.createFolder, q.body);
    if (b.parentId) { const { data } = await db.from('folders').select('id').eq('id', b.parentId).eq('owner_id', q.userId).maybeSingle();
      if (!data) throw new ApiError(404, 'FOLDER_NOT_FOUND', 'Folder not found.'); }
    const { data, error } = await db.from('folders').insert({ owner_id: q.userId, name: b.name, parent_id: b.parentId ?? null }).select('id, name, parent_id, created_at').single();
    if (error) throw fromDbError(error.message) ?? new ApiError(500, 'DB_ERROR', 'Could not create folder.');
    s.status(201).json(data);
  }));
  r.patch('/folders/:id', h(async (q, s) => {
    const id = parse(S.idParam, q.params).id, b = parse(S.patchFolder, q.body);
    const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (b.name !== undefined) upd.name = b.name;
    if (b.parentId !== undefined) {
      if (b.parentId) { const { data } = await db.from('folders').select('id').eq('id', b.parentId).eq('owner_id', q.userId).maybeSingle();
        if (!data) throw new ApiError(404, 'FOLDER_NOT_FOUND', 'Folder not found.'); }
      upd.parent_id = b.parentId;
    }
    const { data, error } = await db.from('folders').update(upd).eq('id', id).eq('owner_id', q.userId).select('id, name, parent_id').maybeSingle();
    if (error) throw fromDbError(error.message) ?? new ApiError(500, 'DB_ERROR', 'Could not update folder.');
    if (!data) throw new ApiError(404, 'FOLDER_NOT_FOUND', 'Folder not found.');
    s.json(data);
  }));
  // Deleting a folder removes subfolders (cascade) and moves contained files to the root; files are never silently destroyed.
  r.delete('/folders/:id', h(async (q, s) => {
    const id = parse(S.idParam, q.params).id;
    const { data } = await db.from('folders').select('id').eq('id', id).eq('owner_id', q.userId).maybeSingle();
    if (!data) throw new ApiError(404, 'FOLDER_NOT_FOUND', 'Folder not found.');
    await db.from('folders').delete().eq('id', id).eq('owner_id', q.userId);
    s.status(204).end();
  }));
  r.post('/maintenance/cleanup', h(async (q, s) => s.json(await files.cleanup())));
  return r;
}
