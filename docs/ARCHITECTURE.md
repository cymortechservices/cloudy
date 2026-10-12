# Architecture
Browser (React/Vite on Vercel) ⇄ Express API (Render, `/api/v1`) ⇄ Supabase (Auth + Postgres) and Supabase Storage (default) or Cloudflare R2 (private bucket).

- **Auth:** the browser signs in with Supabase Auth and sends the access token as `Authorization: Bearer`. The API verifies it with `auth.getUser(token)` (Supabase checks signature and expiry). User identity is never taken from request bodies.
- **Data:** the API uses the service-role key, which bypasses RLS, so every query filters on the verified `owner_id`. RLS additionally protects direct client reads (browsers hold no write grants).
- **Uploads:** `upload-intent` validates name/type/size, atomically reserves quota in Postgres (`reserve_upload`), then returns a presigned R2 PUT URL for a server-generated key `<userId>/<uuid>`. The browser uploads straight to R2. `complete-upload` HEADs the object, checks size and magic bytes, and calls `finalize_upload` (idempotent). Failures call `release_upload`.
- **Downloads/previews:** 60-second presigned GET URLs after an ownership check; previews use `inline` disposition.
- **Storage adapter:** `backend/src/storage/adapter.ts` is the interface; `supabase.ts` (default) and `r2.ts` implement it, chosen by `STORAGE_PROVIDER`. Supabase uploads are signed single-object URLs sent as multipart; R2 uploads are signed PUTs. Signed Supabase upload URLs cannot enforce the reserved size, so `complete-upload` verifies size and file signature and deletes mismatches (the bucket's own size limit is a second guard).
- **Cleanup:** `cleanup()` expires stale reservations and drains `deletion_queue`. It runs every 10 minutes while the process is awake and via `POST /api/v1/maintenance/cleanup` (call it from an external cron because free Render instances sleep).
