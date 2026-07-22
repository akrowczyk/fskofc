# FS Companion — Holy Ghost Council 10325

Private **Financial Secretary** operations cockpit for Knights of Columbus **Holy Ghost Council 10325** (Wood Dale, IL).

This app is **not** a system of record. **Member Management** and **Member Billing** at [kofc.org](https://www.kofc.org) remain authoritative for rosters, ledgers, assessments, and official notices. This companion holds:

- Contact info the official tools cannot store (phone / email)
- Retention → suspension **workflow** tracker
- Deadline calendar and task engine
- Approval-gated email + printable letter PDFs
- Audit-prep worksheets, filings & compensation trackers
- Handbook-grounded chat assistant (drafts only — never auto-sends)

Full product plan: [`docs/PLAN.md`](./docs/PLAN.md).

---

## Stack

| Layer | Choice |
|--------|--------|
| App | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Hosting | **Vercel** |
| Database | **Neon** Postgres + Drizzle ORM |
| Auth | Auth.js (NextAuth v5) — single-user email + password |
| Email | Resend (approval-gated) |
| Agent | **xAI Grok** (`XAI_API_KEY`, OpenAI-compatible tool calling) |
| Cron | Vercel Cron → `/api/cron/daily` |

---

## Local development

```bash
pnpm install
cp .env.example .env.local
# Fill env vars (see below)
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Local server |
| `pnpm build` / `pnpm start` | Production build |
| `pnpm test` | Domain unit tests |
| `pnpm db:push` | Push schema to Neon |
| `pnpm db:studio` | Drizzle Studio |

---

## Environment variables

Copy `.env.example` → `.env.local` (local) and the same keys into **Vercel → Project → Settings → Environment Variables**.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon **pooled** connection string |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_USER_EMAIL` | Yes | Your login email |
| `AUTH_USER_PASSWORD` | Yes | Strong password (only you know it) |
| `AUTH_USER_NAME` | Optional | Display name (default: Financial Secretary) |
| `AUTH_URL` | Prod | e.g. `https://your-app.vercel.app` |
| `CRON_SECRET` | Yes | Protects daily cron route |
| `RESEND_API_KEY` | For email | Resend API key |
| `RESEND_FROM` | For email | Verified from-address |
| `DIGEST_EMAIL` | Optional | Daily digest recipient (defaults to first allowlist email) |
| `XAI_API_KEY` | For full agent | Grok via https://api.x.ai/v1 (console.x.ai) |
| `XAI_MODEL` | Optional | Default `grok-4.5` |
| `VOYAGE_API_KEY` | Optional | Future vector embeddings (seeded keyword RAG works without it) |

---

## Deploy to Vercel (full checklist)

### 1. Push this repo to GitHub

```bash
# If you have not created a GitHub repo yet:
gh repo create fskofc --private --source=. --remote=origin --push

# Or: create empty private repo on github.com, then:
git remote add origin git@github.com:YOUR_USER/fskofc.git
git push -u origin main
```

### 2. Create a Neon database

1. Sign up / log in at [neon.tech](https://neon.tech).
2. Create a project (e.g. `fs-companion`).
3. Copy the **pooled** connection string (`-pooler` host).
4. Optional: open SQL editor and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

(pgvector is for future RAG; keyword handbook seed works without it.)

### 3. Choose your login credentials

You only need an email + password of your choosing (stored as Vercel env vars — no Google Cloud project):

```bash
# Example
AUTH_USER_EMAIL=you@example.com
AUTH_USER_PASSWORD='use-a-long-random-password'
AUTH_SECRET=$(openssl rand -base64 32)
```

### 4. Import project on Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Import the GitHub repo.
3. Framework: **Next.js** (auto-detected).
4. Root directory: `.` · Install: `pnpm install` · Build: `pnpm build`.
5. **Do not deploy yet** until env vars are set (or redeploy after).

### 5. Set Vercel environment variables

Project → **Settings → Environment Variables** → add every required key for **Production** (and Preview if you want).

Important:

- `DATABASE_URL` = Neon pooled URL  
- `AUTH_URL` = `https://<your-deployment>.vercel.app` (or custom domain)  
- `AUTH_USER_EMAIL` / `AUTH_USER_PASSWORD` = your login  
- `AUTH_SECRET` / `CRON_SECRET` = long random strings  

After saving, **Redeploy** (Deployments → … → Redeploy).

### 6. Apply database schema

From your laptop (with `DATABASE_URL` pointing at Neon):

```bash
pnpm db:push
```

Or use Neon SQL + Drizzle Kit generate/migrate if you prefer migration files.

Then open the app, sign in, go to **Settings**, save council identity, and **Seed 2009 assessment defaults** (then verify amounts against current Supreme figures).

### 7. Vercel Cron

`vercel.json` already schedules:

```json
{ "path": "/api/cron/daily", "schedule": "0 12 * * *" }
```

(UTC 12:00 daily — adjust as needed.)

Vercel Hobby/Pro injects cron calls. The route expects:

```http
Authorization: Bearer <CRON_SECRET>
```

Vercel Cron on newer projects may send this automatically when `CRON_SECRET` is set; if not, use a [Cron Job](https://vercel.com/docs/cron-jobs) config or an external scheduler that includes the header.

Manual test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/daily
```

Or sign in and click **Refresh deadlines** on the dashboard.

### 8. Resend (optional but needed for real email / digests)

1. [resend.com](https://resend.com) → API key.  
2. Verify your sending domain (SPF/DKIM).  
3. Set `RESEND_API_KEY` + `RESEND_FROM` (e.g. `fs@yourdomain.org`).  
4. Optional webhook: `https://YOUR_DOMAIN/api/webhooks/resend` for bounce status.  

**Nothing emails members until you Approve & send** in Correspondence.

### 9. xAI Grok (optional — full chat agent)

1. Create an API key at [console.x.ai](https://console.x.ai).  
2. Set `XAI_API_KEY` (and optionally `XAI_MODEL=grok-4.5`).  
3. Without it, Assistant still returns handbook seed excerpts (offline mode).

### 10. Custom domain (optional)

Vercel → Project → Domains → add `fs.yourcouncil.org`. Update:

- `AUTH_URL`
- Resend domain alignment if needed  

### 11. Post-deploy smoke test

1. Sign in with `AUTH_USER_EMAIL` / `AUTH_USER_PASSWORD` (wrong password must fail).  
2. **Settings** → save council 10325.  
3. **Members** → import roster Excel or add a test member with email.  
4. **Calendar** → Refresh deadlines → see assessment/audit/990 tasks.  
5. **Retention** → open a case → advance states → confirm +60 / +90 for #1845.  
6. **Correspondence** → draft email → Approve & send (if Resend configured).  
7. **Audit** → seed filings + new audit period.  
8. **Compensation** → enter dues + certs → check 1099 flag.  
9. **Assistant** → “explain form 1845” (needs `XAI_API_KEY` for full Grok tools).  
10. **Governance** → confirm audit log entries.

---

## App map

| Route | Feature |
|-------|---------|
| `/` | What’s due + retention snapshot |
| `/members` | Contact mirror + Excel roster import |
| `/retention` | Cadence state machine |
| `/correspondence` | Email queue + letter PDFs |
| `/calendar` | Tasks / deadlines |
| `/audit` | #1295 prep + filings |
| `/compensation` | FS comp + 1099 |
| `/chat` | Handbook agent |
| `/governance` | Audit log + retention policy notes |
| `/settings` | Council + assessment config |

---

## Security & compliance (baked in)

- Auth on all member routes; single env-based login  
- No SSNs / tax IDs (app-level reject guard)  
- Persistent “mirror — not source of truth” labeling  
- Email never sends without human approval  
- Agent never files with Supreme  
- Cron protected by `CRON_SECRET`  
- `robots: noindex` on the app  

---

## Build tickets status

| Ticket | Status |
|--------|--------|
| 0 Scaffold | Done |
| 1 Schema + settings + PII guard | Done |
| 2 Member mirror + roster import | Done |
| 3 Deadline engine + cron | Done |
| 4 Retention tracker | Done |
| 5–6 Correspondence email + PDFs | Done |
| 7–8 Audit + compensation | Done |
| 9–11 RAG seed + agent + governance | Done |

Domain logic under `src/lib/domain/` is pure TypeScript with unit tests (`pnpm test`).

---

## License / use

Private council operations tool. KofC name & emblem policies apply — do not expose council emblem on public unauthenticated pages. Do not use the locked McGivney typeface.
