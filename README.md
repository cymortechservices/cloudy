# Cloudy — by CymorTechServices
*Your files. Your space. Your Cloudy.* · Developed by Legendary Smiley Cymor · © 2026 CymorTechServices.

Private multi-user document storage: React + Vite + TypeScript + Tailwind (Vercel) → Express API (Render) → Supabase Auth/Postgres/Storage (Cloudflare R2 optional).

## Status — read first
Complete source is included, but it has **never been compiled or run** (no network where it was written). Install, build and fix any small errors before deploying. See `docs/TESTING.md`.

## Prerequisites
Node 20+, Supabase account, Cloudflare account (R2), Render and Vercel accounts. R2 or others may require billing details to activate.

## Setup (PowerShell)
```powershell
npm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
# fill both files, then apply supabase\migrations\0001_init.sql and 0002_storage.sql in the Supabase SQL editor
npm run dev:backend      # terminal 1, http://localhost:8080
npm run dev:frontend     # terminal 2, http://localhost:5173
npm test                 # backend tests
```
Configure Supabase as in `docs/DEPLOYMENT.md`. No card is needed with the default Supabase Storage provider.

## Quotas
100 MB per user (set in the signup trigger in `0002_storage.sql`; edit there or update `user_storage.quota_bytes` as admin), 25 MB per file, plus `GLOBAL_STORAGE_CAP_BYTES` (default 900 MB) across all users. Reservations expire after `UPLOAD_RESERVATION_TTL_SECONDS`. Details: `docs/DATABASE.md`, `docs/FREE_TIER_LIMITS.md`.

## Testing user isolation
Sign up two accounts, upload with the first, then try the file id with the second token: every endpoint returns 404. Automated version: `isolation.test.ts`.

## Backup / credentials
Back up Postgres with Supabase backups or `pg_dump`; back up R2 with `rclone sync` to another bucket. Rotate: Supabase keys (dashboard) → update Render env → redeploy; R2 token → create new, update Render, delete old.

## Known limitations
- Storage providers: Supabase Storage (default) and R2. The Supabase adapter, like the rest, has never been run against a real project.
- Not implemented: file copy, bulk download, Google OAuth, image thumbnails, Office preview (download fallback), SQL-level/integration/frontend tests, automated R2↔DB reconciliation script, installable PNG icons (SVG icon only), signup quota read from env.
- Folder delete removes subfolders and moves their files to the root.
- Privacy/Terms/Contact pages are placeholders needing review.
- Service worker is minimal; no offline functionality beyond the app shell.
