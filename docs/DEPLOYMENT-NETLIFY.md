# WMS Deployment Guide — Netlify (Frontend) + API Host

## Architecture Overview

WMS is a monorepo with two deployable units:

| Unit | Tech | Deploy Target |
|------|------|--------------|
| `artifacts/wms-app` | React + Vite SPA | **Netlify** (static) |
| `artifacts/api-server` | Express + Drizzle + BullMQ | **Separate host** (Railway / Render / Fly.io) |

Frontend talks to API via relative `/api/*` paths. In production, both must be on same domain (or use CORS). Two strategies below.

---

## Strategy A: API Subdomain + CORS (Recommended)

```
Frontend:  wms.yourdomain.com     → Netlify
API:       api.yourdomain.com     → Railway/Render/Fly
DB:        Neon Postgres          → already cloud-hosted
Auth:      Clerk                  → already SaaS
Email:     Resend                 → already SaaS
```

### Step 1: Deploy API Server

#### Option A1 — Railway (easiest)

1. Push repo to GitHub
2. Create new Railway project → connect repo
3. Set root directory to `artifacts/api-server`
4. Add environment variables (see [API Env Vars](#api-env-vars) below)
5. Railway auto-detects Node, runs `pnpm install && pnpm build && pnpm start`
6. Get Railway URL: `https://wms-api.up.railway.app`

#### Option A2 — Render

1. Create new Web Service → connect repo
2. Root: `artifacts/api-server`
3. Build: `pnpm install && pnpm build`
4. Start: `pnpm start`
5. Add env vars

#### Option A3 — Fly.io

```bash
cd artifacts/api-server
fly launch --dockerfile Dockerfile.api  # need to create Dockerfile
fly secrets set DATABASE_URL=... CLERK_SECRET_KEY=...  # etc
fly deploy
```

### Step 2: Update Frontend for Remote API

In `artifacts/wms-app/vite.config.ts`, the dev proxy targets `localhost:3001`. For production, frontend needs to hit the remote API.

**Create `artifacts/wms-app/.env.production`:**
```
VITE_API_BASE_URL=https://api.yourdomain.com
```

**Update all `fetch("/api/...")` calls** to use `VITE_API_BASE_URL`:

Option 1 — Create a fetch wrapper (`src/lib/api.ts`):
```typescript
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
export function api(path: string, opts?: RequestInit) {
  return fetch(`${BASE}${path}`, { credentials: "include", ...opts });
}
```

Option 2 — Use the existing `lib/api-client-react` package (already has typed clients). Wire it to the remote URL.

### Step 3: Enable CORS on API

In `artifacts/api-server/src/app.ts`, update CORS:

```typescript
app.use(cors({
  credentials: true,
  origin: [
    "https://wms.yourdomain.com",
    "http://localhost:5173",  // dev
  ],
}));
```

### Step 4: Deploy Frontend to Netlify

#### 4a. Build config

Create `artifacts/wms-app/netlify.toml`:
```toml
[build]
  base = "artifacts/wms-app"
  command = "pnpm build"
  publish = "dist/public"

[[redirects]]
  from = "/api/*"
  to = "https://api.yourdomain.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Note:** The `/api/*` redirect proxies API calls through Netlify to your API host. This avoids CORS entirely — frontend keeps using relative `/api/*` paths.

#### 4b. Netlify UI setup

1. New site → import from GitHub
2. Root directory: `artifacts/wms-app`
3. Build command: `pnpm build`
4. Publish directory: `dist/public`
5. Add env vars (see [Frontend Env Vars](#frontend-env-vars) below)

#### 4c. Custom domain

1. Domain settings → add `wms.yourdomain.com`
2. Add DNS CNAME: `wms` → `wms-app.netlify.app`

---

## Strategy B: Netlify Functions (API Rewrite)

Convert API routes to Netlify Functions. **Not recommended** for this app — BullMQ workers, schedulers, and in-process event bus need persistent processes. Serverless functions are stateless and short-lived.

Only viable if you:
- Replace BullMQ with a serverless queue (SQS, Upstash Q)
- Replace schedulers with Netlify Scheduled Functions
- Remove in-process workers

This is a significant refactor. Use Strategy A.

---

## Environment Variables

### API Env Vars

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Neon | `postgresql://user:pass@host/db?sslmode=require` |
| `PGDATABASE` | Neon | `neondb` |
| `PGHOST` | Neon | `ep-xxx.region.aws.neon.tech` |
| `PGPORT` | Neon | `5432` |
| `PGUSER` | Neon | `neondb_owner` |
| `PGPASSWORD` | Neon | `npg_xxx` |
| `CLERK_PUBLISHABLE_KEY` | Clerk Dashboard | `pk_live_xxx` |
| `CLERK_SECRET_KEY` | Clerk Dashboard | `sk_live_xxx` |
| `RESEND_API_KEY` | Resend | `re_xxx` |
| `SESSION_SECRET` | Generate | `openssl rand -base64 64` |
| `PORT` | Platform sets | `3001` |
| `REDIS_URL` | Upstash/Redis | `rediss://user:pass@host:6379` |

### Frontend Env Vars

| Variable | Source | Example |
|----------|--------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard | `pk_live_xxx` |
| `VITE_API_BASE_URL` | Your API host | `https://api.yourdomain.com` |
| `BASE_PATH` | Usually `/` | `/` |

---

## Database Migrations

Neon Postgres is already cloud-hosted. Run migrations from CI or locally:

```bash
cd lib/db
pnpm drizzle-kit push
# or
pnpm drizzle-kit generate && pnpm drizzle-kit migrate
```

For Railway/Render, add a deploy command:
```
pnpm --filter @workspace/db run migrate && pnpm start
```

---

## Auth (Clerk) Setup

1. Go to Clerk Dashboard → your app
2. Add production URLs:
   - Sign-in URL: `https://wms.yourdomain.com/sign-in`
   - Sign-up URL: `https://wms.yourdomain.com/sign-up`
   - After sign-in: `https://wms.yourdomain.com`
3. Remove Replit-specific proxy config from `vite.config.ts` (remove `@replit/vite-plugin-*` imports)
4. Update `VITE_CLERK_PROXY_URL` — not needed for custom domains, Clerk works directly

---

## Checklist

- [ ] Push repo to GitHub
- [ ] Deploy API to Railway/Render/Fly
- [ ] Set all API env vars
- [ ] Run DB migrations against Neon
- [ ] Update frontend `VITE_API_BASE_URL` or use Netlify redirect proxy
- [ ] Update CORS on API to allow Netlify domain
- [ ] Deploy frontend to Netlify
- [ ] Add custom domains + SSL
- [ ] Update Clerk allowed origins
- [ ] Test auth flow end-to-end
- [ ] Test API calls from deployed frontend

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page on routes | SPA routing | Ensure `_redirects` or `netlify.toml` redirects `/*` to `/index.html` |
| 401 on all API calls | Clerk session not sent | Check `credentials: "include"` in fetch, verify CORS `origin` matches |
| API timeout | Cold start on free tier | Upgrade Railway/Render plan, or use Fly.io |
| BullMQ workers not running | Redis not connected | Set `REDIS_URL` (Upstash Redis or Railway Redis) |
| Build fails on Netlify | pnpm not found | Add `NPM_FLAGS="--version"` build env var, or use `corepack enable` in build command |
