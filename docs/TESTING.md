# Testing
`npm install` then `npm test` (backend, Vitest).

| File | Needs credentials? | Covers |
|---|---|---|
| `backend/src/tests/files.test.ts` | No | type allowlist, filename sanitising, magic bytes, object keys |
| `backend/src/tests/isolation.test.ts` | No (in-memory fake of Supabase) | 401 on bad tokens; User A cannot read/download/rename/delete/move B's files or modify B's folders; forged owner/quota/object-key fields rejected; oversize and disallowed types rejected |

**Execution status: NOT RUN.** The environment where this code was written had no network access, so dependencies were never installed; nothing has been compiled or executed. Expect small type errors on the first build.

**Not written yet (need a dev Supabase project):** SQL-level tests for concurrent reservations, idempotent `finalize_upload`, reservation expiry, RLS checks via the Supabase client, and R2 round-trips. The frontend has no tests.
