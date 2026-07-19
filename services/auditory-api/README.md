# bsuir-auditory-api

A thin service on top of the public iis.bsuir.by API that answers the question
"is this auditory free right now, and when does it free up".

## How it works

```
┌─────────────────────┐     nightly     ┌──────────────────────┐
│ GitHub Actions cron │───────────────▶│  Cloudflare Worker    │
│  services/auditory- │  POST /index    │  + KV (bsuir-auditory │
│  api/src/crawler.ts │  (Bearer auth)  │  -api)                │
└─────────────────────┘                 └──────────────────────┘
                                                 │  GET /index
                                                 ▼
                                        ┌──────────────────────┐
                                        │  Mobile app (RN)     │
                                        │  fetches once/day    │
                                        │  computes status     │
                                        │  locally             │
                                        └──────────────────────┘
```

The Cloudflare Worker does no crawling itself — on the free tier it is limited
to **50 subrequests per invocation**, and BSUIR has ~1500 groups. So the
crawling is done by a GitHub Action (which has no such limits), and the Worker
only serves the prebuilt JSON from KV.

## Endpoints

| Method | Path     | Purpose                                              |
| ------ | -------- | ---------------------------------------------------- |
| GET    | `/`      | healthcheck                                          |
| GET    | `/index` | full index `{ auditory → day → slots[] }` (~200 KB)  |
| GET    | `/meta`  | metadata only (last update time, auditory count)     |
| POST   | `/index` | accepts a fresh index from the crawler (Bearer auth) |

The `/index` response is CDN-cached for 1 hour, so actual KV reads are almost
never consumed.

## One-time setup (10 minutes)

### 1. Cloudflare

1. Create a free account at https://dash.cloudflare.com (no credit card needed).
2. Install wrangler and log in:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. From this folder:
   ```bash
   cd services/auditory-api
   npm install
   wrangler kv namespace create AUDITORY_KV
   ```
   Copy the `id` the command prints and put it into `wrangler.toml`
   in place of `REPLACE_ME_KV_NAMESPACE_ID`.
4. Generate a random token and store it as a Worker secret:
   ```bash
   # somewhere: openssl rand -hex 32  → copy the result
   wrangler secret put CRAWL_TOKEN
   # paste the same token when prompted
   ```
5. Deploy:
   ```bash
   npm run deploy
   ```
   The output contains a URL like `https://bsuir-auditory-api.<your-subdomain>.workers.dev`.
   Save it.

### 2. GitHub Actions

In the repository settings → Settings → Secrets and variables → Actions →
New repository secret, add two secrets:

- `AUDITORY_WORKER_URL` — the URL from step 5 above (no trailing slash)
- `AUDITORY_CRAWL_TOKEN` — the same token from step 4

Trigger the first run manually: Actions → "Crawl auditory occupancy" → Run
workflow. After that it runs on its own nightly at 00:00 UTC (03:00 Minsk).

### 3. Mobile app

Set `EXPO_PUBLIC_AUDITORY_API_URL` in your `.env` (see `.env.example` in the
repo root) to the URL from step 5 — `app.config.ts` surfaces it to the app as
`expo.extra.auditoryApiUrl`.

That's it. The app downloads a fresh index once every 24h and keeps it in
AsyncStorage. The lesson modal shows the status instantly, with no network
requests.

## Cost

Everything is free:

- Cloudflare Workers free: 100k requests/day, 100k KV reads/day (only reachable
  with tens of thousands of users)
- Cloudflare KV free: 1000 writes/day (we need 2 per day)
- GitHub Actions: 2000 minutes/month on private repos, unlimited on public
  ones. One run takes ~5 minutes.

## Local development

```bash
# Full crawler run locally (needs .env with WORKER_URL and CRAWL_TOKEN):
MAX_GROUPS=20 npm run crawl        # quick test on 20 groups

# Local Worker:
npm run dev

# Type-check:
npm run typecheck
```
