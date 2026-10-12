# Deployment
Use placeholders until you have real URLs.

## Supabase
1. Create a project. 2. SQL editor: run `supabase/migrations/0001_init.sql`, then `0002_storage.sql`. 3. Authentication > Providers: enable Email, require email confirmation. 4. Authentication > URL configuration: Site URL = `https://YOUR-APP.vercel.app`; redirect URLs: `.../login` and `.../reset-password`. 5. Project Settings > API: copy URL and publishable key (frontend) and secret key (backend only). 6. Table editor: confirm RLS is enabled on all five tables. Rollback: run `0001_init.down.sql`.

## Storage: Supabase Storage (default, no card needed)
1. In the Supabase SQL editor run `supabase/migrations/0002_storage.sql` (after 0001). It creates the private bucket `cloudy-private` with a 25 MB per-file limit and a MIME allowlist, and sets the default quota to 100 MB per user.
2. Storage > check that `cloudy-private` shows as **Private**. Do not add public policies.
3. Backend env: `STORAGE_PROVIDER=supabase`, `SUPABASE_STORAGE_BUCKET=cloudy-private`, `GLOBAL_STORAGE_CAP_BYTES` below your plan's total (free plan is about 1 GB: verify; the default is 900 MB). If your plan's per-file limit is under 25 MB, lower `MAX_FILE_SIZE_BYTES` and the bucket limit.
4. No CORS setup is needed for Supabase signed URLs.
5. Verify: open an object URL without a signed token; it must fail.

## Optional: Cloudflare R2 (needs a payment method)
Set `STORAGE_PROVIDER=r2` and the four `R2_*` variables. Create a private bucket and a bucket-scoped Object Read & Write token. Bucket CORS:
```json
[{"AllowedOrigins":["https://YOUR-APP.vercel.app","http://localhost:5173"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["content-type","range"],"ExposeHeaders":["etag"],"MaxAgeSeconds":3600}]
```

## Render (backend)
New Web Service from your repo; root directory `backend`; build `npm install && npm run build`; start `npm start`; health check `/health`; set every variable from `backend/.env.example` (FRONTEND_URL = your Vercel URL, exact origin, no trailing slash). Add an external cron (e.g. cron-job.org) calling `POST /api/v1/maintenance/cleanup` with a valid user token only if you accept that; otherwise rely on the in-process timer while awake.

## Vercel (frontend)
Import repo; root directory `frontend`; framework Vite; build `npm run build`; output `dist`; env vars from `frontend/.env.example` (`VITE_API_BASE_URL` = Render URL). `vercel.json` provides SPA rewrites.

## Verification checklist
- [ ] Sign up, receive verification email, sign in  - [ ] Password reset email arrives and works  - [ ] Upload PDF, image; appears in list  - [ ] Download and preview work  - [ ] A second account cannot see the first's files  - [ ] Upload over quota/size is refused  - [ ] Bucket URL without signature fails  - [ ] Account deletion removes files  - [ ] Browser devtools show no secret keys
