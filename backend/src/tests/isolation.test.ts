// Authorization tests using an in-memory fake of the Supabase client. They exercise the real Express app, routes and services,
// so they run locally with no credentials. They do NOT test the SQL functions/RLS (see docs/TESTING.md for the DB-level tests).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const FILE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', FILE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tables: Record<string, any[]> = {};
const reset = () => {
  tables.files = [
    { id: FILE_A, owner_id: A, folder_id: null, original_name: 'a.pdf', object_key: `${A}/k1`, mime_type: 'application/pdf', file_extension: 'pdf', size_bytes: 10, status: 'ready' },
    { id: FILE_B, owner_id: B, folder_id: null, original_name: 'b.pdf', object_key: `${B}/k2`, mime_type: 'application/pdf', file_extension: 'pdf', size_bytes: 10, status: 'ready' },
  ];
  tables.folders = [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', owner_id: B, name: 'Bs', parent_id: null }];
  tables.user_storage = [{ owner_id: A, quota_bytes: 100, used_bytes: 10, reserved_bytes: 0 }];
  tables.profiles = [{ id: A, display_name: 'A' }];
};
class QB {
  f: ((r: any) => boolean)[] = []; op = 'select'; payload: any; constructor(public t: string) {}
  select() { return this; } order() { return this; } range() { return this; } ilike() { return this; } lt() { return this; } limit() { return this; }
  eq(k: string, v: any) { this.f.push((r) => r[k] === v); return this; } is(k: string, v: any) { this.f.push((r) => r[k] === v); return this; }
  update(p: any) { this.op = 'update'; this.payload = p; return this; } delete() { this.op = 'delete'; return this; }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this; }
  rows() { return (tables[this.t] ?? []).filter((r) => this.f.every((x) => x(r))); }
  maybeSingle() { return Promise.resolve({ data: this.rows()[0] ?? null, error: null }); } single() { return this.maybeSingle(); }
  then(res: any) {
    const m = this.rows();
    if (this.op === 'update') m.forEach((r) => Object.assign(r, this.payload));
    if (this.op === 'delete') tables[this.t] = tables[this.t].filter((r) => !m.includes(r));
    return Promise.resolve({ data: m, count: m.length, error: null }).then(res);
  }
}
vi.mock('../db.js', () => ({ db: {
  from: (t: string) => new QB(t),
  rpc: async (fn: string, a: any) => {
    if (fn === 'delete_file') { const r = tables.files.find((x) => x.id === a.p_file && x.owner_id === a.p_owner && x.status === 'ready'); if (!r) return { data: null, error: null }; tables.files = tables.files.filter((x) => x !== r); return { data: r.object_key, error: null }; }
    return { data: null, error: null };
  },
  auth: { getUser: async (t: string) => (t === 'tokA' ? { data: { user: { id: A, email: 'a@x.com' } }, error: null } : { data: { user: null }, error: { message: 'bad' } }) },
} }));

let base = ''; let server: any; const removed: string[] = [];
beforeAll(async () => {
  Object.assign(process.env, { FRONTEND_URL: 'http://localhost:5173', SUPABASE_URL: 'http://x.test', SUPABASE_SECRET_KEY: 'k', R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'a', R2_SECRET_ACCESS_KEY: 'a', R2_BUCKET_NAME: 'b', NODE_ENV: 'test' });
  const { createApp } = await import('../app.js');
  const storage: any = { presignDownload: async (k: string) => `https://signed.test/${k}`, presignUpload: async () => ({ url: 'https://up.test', headers: {} }), remove: async (k: string) => { removed.push(k); } };
  server = createApp(storage).listen(0); base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});
afterAll(() => server.close());
const call = (path: string, init: RequestInit = {}, token = 'tokA') => fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });

describe('authentication', () => {
  it('rejects missing and invalid tokens', async () => { reset(); expect((await call('/files', {}, '')).status).toBe(401); expect((await call('/files', {}, 'forged')).status).toBe(401); });
});
describe('user isolation (User A vs User B)', () => {
  it("cannot read B's file by id", async () => { reset(); expect((await call(`/files/${FILE_B}`)).status).toBe(404); });
  it('can read own file', async () => { reset(); expect((await call(`/files/${FILE_A}`)).status).toBe(200); });
  it("cannot get a download link for B's file, can for own", async () => { reset(); expect((await call(`/files/${FILE_B}/download`)).status).toBe(404); const r = await call(`/files/${FILE_A}/download`); expect(r.status).toBe(200); expect((await r.json()).url).toContain(A); });
  it("cannot rename B's file", async () => { reset(); const r = await call(`/files/${FILE_B}`, { method: 'PATCH', body: JSON.stringify({ name: 'pwned.pdf' }) }); expect(r.status).toBe(404); expect(tables.files.find((f) => f.id === FILE_B)!.original_name).toBe('b.pdf'); });
  it("cannot delete B's file", async () => { reset(); expect((await call(`/files/${FILE_B}`, { method: 'DELETE' })).status).toBe(404); expect(tables.files.some((f) => f.id === FILE_B)).toBe(true); expect(removed.some((k) => k.startsWith(B))).toBe(false); });
  it("cannot move own file into B's folder", async () => { reset(); const r = await call(`/files/${FILE_A}`, { method: 'PATCH', body: JSON.stringify({ folderId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }) }); expect(r.status).toBe(404); });
  it("cannot modify B's folder", async () => { reset(); const r = await call('/folders/cccccccc-cccc-4ccc-8ccc-cccccccccccc', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) }); expect(r.status).toBe(404); expect(tables.folders[0].name).toBe('Bs'); });
  it('listing never includes B files', async () => { reset(); const j = await (await call('/files')).json(); expect(j.items.every((f: any) => f.id !== FILE_B)).toBe(true); });
  it('ignores/rejects a forged owner id and quota edits (strict schemas)', async () => {
    reset();
    expect((await call('/folders', { method: 'POST', body: JSON.stringify({ name: 'x', ownerId: B }) })).status).toBe(400);
    expect((await call('/me', { method: 'PATCH', body: JSON.stringify({ displayName: 'x', quota_bytes: 9e12 }) })).status).toBe(400);
    expect((await call('/files/upload-intent', { method: 'POST', body: JSON.stringify({ name: 'a.pdf', mimeType: 'application/pdf', size: 5, objectKey: `${B}/k2` }) })).status).toBe(400);
  });
});
describe('upload validation', () => {
  it('rejects oversized files and disallowed types before reserving anything', async () => {
    reset();
    expect((await call('/files/upload-intent', { method: 'POST', body: JSON.stringify({ name: 'a.pdf', mimeType: 'application/pdf', size: 10 ** 10 }) })).status).toBe(413);
    expect((await call('/files/upload-intent', { method: 'POST', body: JSON.stringify({ name: 'evil.exe', mimeType: 'application/x-msdownload', size: 10 }) })).status).toBe(415);
    expect((await call('/files/upload-intent', { method: 'POST', body: JSON.stringify({ name: 'page.html', mimeType: 'text/html', size: 10 }) })).status).toBe(415);
  });
});
