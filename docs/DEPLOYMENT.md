# Deployment
Use placeholders until you have real URLs.

## Supabase
1. Create a project. 2. SQL editor: run `supabase/migrations/0001_init.sql`. 3. Authentication > Providers: enable Email, require email confirmation. 4. Authentication > URL configuration: Site URL = `https://YOUR-APP.vercel.app`; redirect URLs: `.../login` and `.../reset-password`. 5. Project Settings > API: copy URL and publishable key (frontend) and secret key (backend only). 6. Table editor: confirm RLS is enabled on all five tables. Rollback: run `0001_init.down.sql`.

## Cloudflare R2
1. Enable R2. 2. Create bucket `cloudy-private` (leave public access / r2.dev disabled; attach no custom public domain). 3. R2 > Manage API tokens: create a token with Object Read & Write limited to this bucket; copy account ID, key ID, secret. 4. Bucket CORS (needed for direct browser upload and previews):
```json
[{"AllowedOrigins":["https://YOUR-APP.vercel.app","http://localhost:5173"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["content-type","range"],"ExposeHeaders":["etag"],"MaxAgeSeconds":3600}]
```
5. Verify: open an object URL without a signature; it must fail.

## Render (backend)
New Web Service from your repo; root directory `backend`; build `npm install && npm run build`; start `npm start`; health check `/health`; set every variable from `backend/.env.example` (FRONTEND_URL = your Vercel URL, exact origin, no trailing slash). Add an external cron (e.g. cron-job.org) calling `POST /api/v1/maintenance/cleanup` with a valid user token only if you accept that; otherwise rely on the in-process timer while awake.

## Vercel (frontend)
Import repo; root directory `frontend`; framework Vite; build `npm run build`; output `dist`; env vars from `frontend/.env.example` (`VITE_API_BASE_URL` = Render URL). `vercel.json` provides SPA rewrites.

## Verification checklist
- [ ] Sign up, receive verification email, sign in  - [ ] Password reset email arrives and works  - [ ] Upload PDF, image; appears in list  - [ ] Download and preview work  - [ ] A second account cannot see the first's files  - [ ] Upload over quota/size is refused  - [ ] Bucket URL without signature fails  - [ ] Account deletion removes files  - [ ] Browser devtools show no secret keys
