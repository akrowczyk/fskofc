# Future enhancements — FS Companion (Council 10325)

Backlog captured after the initial build (Tickets 0–11).  
Use this as a working list; reorder by what matters most for day-to-day FS work.

**Related:** product plan in [`PLAN.md`](./PLAN.md). Auth is **email/password** (not Google). Agent is **xAI Grok** (`XAI_API_KEY`).

---

## Priority 1 — Before relying on it daily

| # | Enhancement | Why | Notes / starting points |
|---|-------------|-----|-------------------------|
| 1.1 | **Dry-run a real KofC roster Excel export** | Column mapping is best-effort; first real import may need header fixes | `src/lib/roster/import.ts`, Members → Import |
| 1.2 | **Hash login password** | Password is plain in env today | Prefer `AUTH_PASSWORD_HASH` (bcrypt/argon2) over `AUTH_USER_PASSWORD`; keep single-user credentials auth |
| 1.3 | **Wire retention advance → letter draft** | Advancing cadence does not auto-queue #423/#424/KA1/#1845 PDFs | `retention/actions.ts` + correspondence queue; optional checkbox “create letter draft” |
| 1.4 | **Council Statement arrearage input + $50 hard alert** | `arrearageAlert()` exists but nothing records current Supreme arrearage | Settings or dashboard field; alert when ≥ $50 on any account |
| 1.5 | **End-to-end production smoke test** | Neon + auth + cron + Resend + Grok not fully proven on Vercel | Follow README post-deploy checklist; verify cron sends `Authorization: Bearer CRON_SECRET` |

---

## Priority 2 — Plan features simplified in v1

| # | Enhancement | Why | Notes / starting points |
|---|-------------|-----|-------------------------|
| 2.1 | **Full handbook PDF ingest + re-runnable script** | RAG is seed excerpts + keyword search only | Chunk by section; UI “add document” for bylaws/notes |
| 2.2 | **Voyage embeddings + pgvector hybrid retrieval** | Plan Ticket 9; schema has `embeddingJson` placeholder | Enable `vector` on Neon; hybrid cosine + FTS |
| 2.3 | **Streaming chat UI + thread history browser** | Chat is request/response; threads stored but not listed | SSE/stream from `/api/agent`; `/chat` history sidebar |
| 2.4 | **Member ledger mirror UI** | Table exists; little/no UI | Light payment/assessment log for reconciliation notes only |
| 2.5 | **#157 Order on Treasurer voucher tracker** | Plan Part 1; draft checklist + countersign + check # | New small tracker, not a ledger of record |
| 2.6 | **Records-retention destroy workflow** | Governance states policy only | Timers 7yr / 3yr; destroy reminders + tax-ID obliteration prompt |
| 2.7 | **Bulk dues-reminder drafts** | Agent does one-offs; no batch UI | Generate individual `needs_approval` drafts respecting `contact_pref` |
| 2.8 | **Resend webhook signature verification** | Bounce → failed is stub-level | Verify Resend signatures; richer delivery states |
| 2.9 | **Formal Drizzle migrations for prod** | Currently `db:push`-oriented | `drizzle-kit generate` + migrate path for safer rollouts |
| 2.10 | **Optional read-only GK / trustee role** | Plan Ticket 11 | Second credential or role claim; read-only on writes |

---

## Priority 3 — Polish & ops

| # | Enhancement | Why | Notes / starting points |
|---|-------------|-----|-------------------------|
| 3.1 | **E2E tests (Playwright)** | Only domain unit tests today | Login, member import, retention walk, draft email |
| 3.2 | **2FA / passkey for login** | Single password is a single factor | Optional; env password may be enough if strong + private deploy |
| 3.3 | **Session revoke / multi-device control** | JWT-only sessions | Auth.js adapter or token versioning |
| 3.4 | **Cron reliability monitoring** | Silent cron failure = missed digests | Log last run in DB; surface “engine last ran” on dashboard |
| 3.5 | **Custom domain + Resend domain polish** | Production email deliverability | SPF/DKIM; `AUTH_URL` alignment |
| 3.6 | **Council emblem (authenticated only)** | Branding; never on public login if policy requires care | Private assets only; KofC name & emblem policy |
| 3.7 | **Cleanup unused dependencies** | Scaffold leftovers | e.g. `@auth/drizzle-adapter` if still unused |
| 3.8 | **Keep PLAN.md in sync** | Still mentions Google + Anthropic in places | Doc drift after product decisions |
| 3.9 | **Agent: “who’s overdue → draft all reminders” happy path** | Plan Ticket 10 done criteria | Integration test with Grok tools + approval queue |
| 3.10 | **Supply-order to-do log (Form #1)** | Handbook duty; thin today | Simple tasks category already supports `supply` |

---

## Explicitly out of scope (do not “fix” by making them systems of record)

These remain **outside** this app by design:

- Member master data / official roster (Member Management)
- Member ledgers, assessments, receipts as **ledger of record** (Member Billing)
- Official #423 / #424 / #1845 / Form 100 **filing with Supreme**
- Storing SSNs / tax IDs (including last-four)
- Auto-send email or auto-file without human approval

---

## Suggested next sprints

**Sprint A — Trust the data**  
1.1 roster dry-run → 1.4 arrearage field → 1.5 Vercel smoke test  

**Sprint B — Retention payoff**  
1.3 letter-on-advance → 2.7 bulk reminders → 3.9 agent overdue flow  

**Sprint C — Knowledge & agent**  
2.1 handbook ingest → 2.2 vectors → 2.3 streaming + history  

**Sprint D — Hardening**  
1.2 password hash → 2.9 migrations → 3.1 E2E → 3.4 cron health  

---

## Done in v1 (for orientation)

- Scaffold, KofC theme, simple credentials auth  
- Full schema, settings, PII guard  
- Member mirror + Excel import  
- Deadline engine + tasks + daily cron  
- Retention state machine + guardrails  
- Correspondence email (approval-gated) + letter PDFs  
- Audit prep worksheets + filings tracker  
- Compensation calculator  
- Handbook seed RAG + **Grok** tool-use agent  
- Dashboard digest + governance audit log  

---

*Last updated: 2026-07-22 — backlog from post-build review.*
