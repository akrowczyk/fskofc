# Council 10325 Financial Secretary Companion — Implementation Plan

**Prepared for:** Financial Secretary, Holy Ghost Council 10325 (Wood Dale, IL)
**Target stack:** Next.js (App Router) on **Vercel** + **Neon** Postgres (with `pgvector`)
**Primary user:** you (single-officer app, with optional read access for GK/trustees later)
**Purpose:** a private operations cockpit for the parts of the FS role that live *outside* the official Knights of Columbus tools, plus a handbook-grounded chat agent that surfaces what's due and drafts/queues correspondence.

> **How to use this doc with Claude Code:** Each numbered "Ticket" in Part 7 is written to be pasted into Claude Code as a self-contained work item. Parts 1–6 are the shared context (domain rules, schema, architecture) Claude Code should read first. Drop this file in the repo as `docs/PLAN.md` and point Claude Code at it.

---

## Part 0 — The most important design decision: what this app is NOT

The Knights of Columbus already provide two systems of record. **Your app must not try to replace them or become a second ledger of truth**, or you'll create reconciliation nightmares and audit risk.

| Official system | Owns (system of record) | Where |
|---|---|---|
| **Member Management** | Member master data, rosters, degree dates, officer reports, Service Program personnel, data changes, deaths | Officers Online @ kofc.org (GK + FS access) |
| **Member Billing** (inside Member Management) | Member ledgers, dues **assessments**, receipts, vouchers, adjustments, official billing notices, Order-on-Treasurer | Officers Online @ kofc.org (**FS-only** access) |

**If you use Member Billing, your semi-annual audit Schedule A is auto-reconciled** (the handbook: those users "need not complete Schedule A, since there can be no discrepancies"). That's a strong reason to keep Member Billing as the ledger of record.

### The real gap this app fills

The official tools have concrete blind spots the handbook itself admits:

1. **No contact info.** Member Management/Billing *cannot store member phone numbers or email addresses* ("there is no way to import data, such as phone numbers and email addresses"). So there is nowhere official to hold the data you need to actually *reach* members.
2. **No workflow/deadline engine.** The retention→suspension cadence, the assessment pay-by dates, Form 990, Form 365, audit season, bonding renewal — these are date-driven obligations with hard consequences, and nothing tracks them for you.
3. **No correspondence system.** Drafting/sending member emails and queuing snail-mail (Knight Alert #KA1, #1845 follow-ups, welcome letters) is entirely manual.
4. **No personal to-do / notes / contact-history log.**

**So the app's job:** be the **contact database + workflow/deadline engine + correspondence hub + handbook-aware assistant** that sits *alongside* Member Billing. It holds a convenience **mirror** of roster data (imported from the weekly roster export) for reminders and mail-merge — clearly labeled "not the source of truth; verify against kofc.org."

---

## Part 1 — Scope: the FS duties, mapped to "official tool" vs "this app"

Derived from the Financial Secretary Handbook. This is the functional backbone.

| FS duty (Handbook §139 & sections) | Official tool | This app's role |
|---|---|---|
| Collect/receive all moneys; keep member ledgers; assessments; receipts | **Member Billing** | Optional light **payment log mirror** for reconciliation + reminders. Never the ledger of record. |
| Pay moneys to Treasurer; Order on Treasurer (#157, GK-countersigned) | Member Billing | **Voucher tracker + checklist** (draft #157 data, track approval/countersign/check#) |
| Billing notices #423 / #424 | Member Billing (or Peg-board manual) | **Supplemental reminders + printable letters** for the manual-billing fallback and for personal-contact logging |
| Retention → suspension cadence (#423→#424→KA1→personal contact→#1845→Form 100) | Form 100 filed via Member Management | **Retention case tracker** (the core workflow engine — see Part 3) |
| Notify Supreme of member transactions (Form 100), officer elections (Form 185) | Member Management | **Reminder + prep checklist** (which signatures, which form, retention-of-record) |
| Keep the roll / member records | Member Management (roster) | **Member mirror** with contact info + notes the official tool can't hold |
| Semi-annual Audit #1295 (Jan & Jul, done by GK+trustees) | Paper form #1295 | **Audit-prep companion**: records-gathering checklist + Schedule B/C worksheets (Part 5) |
| Council Statement review (monthly) | — | **Monthly reminder + reconciliation notes** |
| Per-capita / Catholic Advertising / Culture of Life levies; pay-by dates | Council Statement | **Deadline calendar + arrearage/suspension threshold alerts** (Part 2) |
| Form 990 federal filing | IRS e-file | **Deadline tracker + threshold guidance** (Part 5) |
| Bonding status (last 2 audits on file) | — | **Status tracker** (bond is void if 2 audits aren't on file) |
| Compensation (8–10% dues + $0.40/insurance cert; 1099; W-9) | — | **Compensation tracker** (Part 5) |
| Service Program Personnel Report (Form 365 by Aug 1) | Member Management | **Deadline reminder** (GK owns; you nudge) |
| Requisition supplies (Form #1, mail/fax) | — | **Supply-order to-do log** (can't order online per handbook) |
| Records retention & tax-ID obliteration | — | **Retention scheduler + destroy reminders** (Part 6 compliance) |
| Answer member insurance questions | Refer to agent/Supreme | **Handbook Q&A agent** drafts the referral |

---

## Part 2 — Domain rules & constants (encode these; make the dollar figures configurable)

> ⚠️ **The handbook is dated 12/2009.** Treat every dollar amount and IRS threshold below as a **configurable default**, not a hardcoded constant. Assessment amounts and the IRS 990-N gross-receipts threshold have very likely changed since 2009 (the IRS 990-N threshold is now higher than the $25k shown here). Store these in a `council_settings` / `assessment_config` table and add a "verify against current Supreme Council figures" note in the UI.

### Retention / suspension cadence (the workflow engine's rules)
- **First Notice (#423):** mailed **15 days before** the billing period.
- If unpaid after **30 days** → **Second Notice (#424).**
- If unpaid **30 days after the second notice** → hand names/addresses/phones/amounts to the **retention committee**; send **Knight Alert (#KA1)** signed by GK + trustees; GK assigns a member for **personal contact** (written report back).
- At **end of 2nd month of arrears** → prepare **Form #1845 Notice of Intent to Suspend** (signed by **FS + GK**). Copies: member, Supreme, State Deputy, District Deputy, council file.
- **60 days after #1845 is processed** with no resolution → council **may file Form 100 (suspension)**. Suspension **will not process** unless #1845 has been on file the required **60 days**.
- **#1845 becomes null/void 90 days** after it's recorded at Supreme (auto-removed; assume retention succeeded).
- **"Financial difficulty is not a valid reason for suspension."** (Surface this in the UI.)
- Undeliverable mail: still make a good-faith attempt incl. filing #1845; if contact fails, Form 100 suspension with reason "unable to contact."

### Supreme Council assessments (levied on total membership incl. inactive & honorary; **excl. honorary life & disabled**)
| Levy | Default amount (2009) | Levy date | Pay by |
|---|---|---|---|
| Per Capita Tax | $1.75 | Jan 1 & Jul 1 | Apr 10 / Oct 10 |
| Catholic Advertising | $0.50 | Jan 1 & Jul 1 | Apr 10 / Oct 10 |
| Culture of Life | $1.00 | Jan 1 & Jul 1 | Apr 10 / Oct 10 |
| Supplies | invoice | on statement | 40 days after invoice month |

- **100-day grace** per levy (Section 156). Automatic reminder notices generate **58–60 days** after assessment (not the official suspension notice).
- **Automatic council suspension when arrearage ≥ $50** on *any* account. → App should hard-alert well before this.
- **Inactive insurance member credit:** ~$9.00/yr each (offsets assessments). Suspension after a passed levy date can yield a ~$3.25 credit.

### Dues & fees (fixed by council; store as settings)
- Dues: **≥ $5/yr** (associate & insurance the same); insured **under 26** may be **≥ $3/yr**.
- Initiation fee: council-fixed; **under 26 ≤ $10**; juvenile→adult **≤ $5** if before 19th birthday; **none** for priests/religious.

### Compensation
- From council: **8–10% of dues collected** (council-set %), **dues only** — not initiation fees or other receipts. **Waivable** at FS discretion. No lump-sum.
- From Supreme: **$0.40 per in-force life insurance certificate** registered to the council at year-end, paid annually in January.
- **1099-MISC** issued if award **> $599.99**. **W-9 must be on file** at Supreme to receive comp.

### Bonding
- **$5,000 automatic, free** on the office (not the person). Additional at **$7/thousand**. Cap **$125,000 total** per council incl. the $5k each on FS & Treasurer.
- Runs **Mar 1 → end of Feb**; charge posted Mar/Apr, prorated if bought mid-year.
- **Bond is void if the last two audits (#1295) aren't on file at Supreme.** → status flag.

### Form 990 (federal, US councils are 501(c)(8))
- **990-N** ≤ $25k gross receipts *(2009 figure — verify current IRS threshold)*, e-file only.
- **990-EZ** > $25k and ≤ $100k. **990** > $100k.
- Due **15th day of the 5th month after fiscal year end.**
- **Miss 3 consecutive years → lose tax-exempt status.**

### Records retention (+ mandatory tax-ID obliteration)
- Current-member Form 100 (new members / re-entry not originally your council): **7 years.**
- Other current-member Form 100: **3 years.** Data changes: verify processed at Supreme, then destroy.
- Former-member Form 100 (all): verify processed, then destroy.
- Correspondence & accounting records: **3 years.**
- **In all cases, obliterate tax IDs including the last four digits.** **Never request or retain SSNs/Tax IDs at council level.** → the app must *refuse* to store these.

### Recurring calendar (seed these as recurring deadline rules)
- Monthly: review Council Statement; read at next meeting.
- Jan 1 / Jul 1: assessment levies. Apr 10 / Oct 10: pay-by.
- Jan & Jul: semi-annual audit (#1295); frozen rosters dated Jan 1 / Jul 1.
- Aug 1: Form 365 due at Supreme.
- Mar/Apr: bonding charge posts.
- 5th month + 15 days after FY end: Form 990.
- Roster reconcile after each Jan/Jul roster; Member Management updates post **Tuesdays**.

---

## Part 3 — The Retention Case Tracker (the highest-value feature)

A state machine, one instance per delinquent member per delinquency episode. This is the thing that will save you real work and real risk.

**States:** `current → first_notice_sent → second_notice_sent → committee_handoff → knight_alert_sent → personal_contact_assigned → intent_to_suspend_1845_filed → suspension_eligible → (resolved | suspension_filed | 1845_expired)`

**Each case stores:** member_id, current state, and the timestamped dates that drive the next deadline:
- `first_notice_date` (+30d → prompt second notice)
- `second_notice_date` (+30d → prompt committee handoff / KA1)
- `knight_alert_date`, `personal_contact_report` (free text + who)
- `intent_1845_processed_date` (drives **+60d suspension eligibility** AND **+90d auto-void**)
- `resolution` (paid / plan / suspended / expired) + notes

**Engine behavior (daily cron):** for every open case, compute the next required action and its due date, generate/refresh a `task`, and flag anything overdue. Reminders escalate as thresholds approach (e.g., "Council arrearage nearing $50 auto-suspension").

**Guardrails to surface in the UI:**
- "Financial difficulty is NOT a valid reason for suspension."
- "Form 100 suspension will not process unless #1845 has been on file 60 days."
- "#1845 auto-voids 90 days after recording — if the member re-delinquents later, the whole cadence restarts."

---

## Part 4 — Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Next.js App Router, TypeScript)                     │
│  • UI: dashboard, members, retention cases, correspondence,  │
│        calendar, audit-prep, compensation, chat              │
│  • Route Handlers / Server Actions = the API layer           │
│  • Vercel Cron  → /api/cron/daily  (deadline + digest engine)│
│  • Auth.js (allowlisted Google sign-in)                      │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
     ┌──────────▼─────────┐      ┌──────────▼───────────────┐
     │  Neon Postgres      │      │  External services        │
     │  • app data (Drizzle)│     │  • Anthropic (Claude) —   │
     │  • pgvector KB chunks│     │    chat agent + tool use  │
     └─────────────────────┘      │  • Voyage AI — embeddings │
                                  │  • Resend — outbound email│
                                  └───────────────────────────┘
```

### Stack choices (opinionated, Vercel/Neon-native)
- **Framework:** Next.js 15 App Router, TypeScript, Server Actions for mutations.
- **DB access:** **Drizzle ORM** + **`@neondatabase/serverless`** (HTTP driver — best fit for Vercel serverless/edge; avoids connection-pool exhaustion). Use Neon's pooled connection string.
- **Vectors:** **`pgvector`** extension in the *same* Neon DB — one datastore for app data + KB. No separate vector service needed at this scale.
- **Auth:** **Auth.js (NextAuth v5)** with Google provider, **email allowlist** (just you at first; add GK/trustees as read-only later via a `role` column). This app holds member PII — lock it down.
- **Embeddings:** **Voyage AI** (`voyage-3` / `voyage-3-lite`) — Anthropic's recommended embeddings partner. (Anthropic has no embeddings endpoint.)
- **Chat model:** **Claude** via the Anthropic Messages API with **tool use** (function calling) for the agent tools in Part 6.
- **Email:** **Resend** (clean Vercel DX). Send from a council/your domain you control; verify SPF/DKIM. **All member email is approval-gated** (Part 6).
- **File parsing:** **SheetJS (`xlsx`)** for the roster Excel export; `pdf-parse`/`pdfjs` if you import the PDF roster.
- **PDF letter generation:** **`@react-pdf/renderer`** or `pdf-lib` for printable #423/#424/#KA1/#1845/welcome letters with member mail-merge.
- **UI kit:** Tailwind + **shadcn/ui**, themed with the KofC palette (Part 8).
- **Validation:** **Zod** on every server action and every agent tool input.

### Repo layout
```
/app
  /(dashboard)/page.tsx          # "what's due" home
  /members/…                     # mirror CRUD + import
  /retention/…                   # case tracker
  /correspondence/…              # email queue + mail queue + letter PDFs
  /calendar/…                    # deadlines
  /audit/…                       # audit-prep worksheets
  /compensation/…                # comp + 1099 + bonding + 990 trackers
  /chat/…                        # agent UI
  /api/cron/daily/route.ts       # deadline engine + digest
  /api/agent/route.ts            # Claude tool-use loop
  /api/webhooks/resend/route.ts  # delivery/bounce status
/db
  schema.ts  index.ts  migrations/
/lib
  domain/         # cadence engine, deadline rules, assessment math (pure, unit-tested)
  agent/          # tool defs + handlers + RAG retriever
  email/  pdf/  rag/  auth/
/docs/PLAN.md     # this file
```

---

## Part 5 — Data model (Drizzle/Postgres sketch)

Names are guidance; refine in Ticket 1. All member data is a **mirror** — add a `source`/`synced_at` and a visible "not source of truth" banner.

```sql
-- Config
council_settings(id, council_number, council_name, fiscal_year_end,
  gk_name, dd_name, trustee_names jsonb, from_email, mailing_address,
  comp_percent numeric, dues_default numeric, dues_under26 numeric,
  bonding_note, updated_at)

assessment_config(id, kind,               -- per_capita | catholic_adv | culture_of_life
  amount numeric, effective_from date, verified_at)  -- editable; 2009 defaults seeded

-- Member mirror (NO SSN / Tax ID — enforce at app + DB level)
members(id, member_number, first_name, last_name,
  address_line1, address_line2, city, state, zip,
  phone, email, contact_pref,             -- email | mail | phone | none
  member_type,                            -- associate | insurance | inactive | honorary | honorary_life | disabled
  degree smallint, join_date, status,     -- active | suspended | withdrawn | deceased | transferred
  dues_rate numeric, notes text,
  address_restricted boolean,             -- the roster "*" returned-mail flag
  source, synced_at, created_at, updated_at)

-- Light local payment/assessment log (mirror only; reconcile to Member Billing)
member_ledger_entries(id, member_id, kind,   -- dues_assessment | initiation | payment | adjustment
  amount numeric, period_label, entry_date, reconciled boolean, note)

-- Retention state machine (Part 3)
retention_cases(id, member_id, state,
  first_notice_date, second_notice_date, knight_alert_date,
  personal_contact_by, personal_contact_report,
  intent_1845_processed_date, suspension_eligible_on,  -- +60d
  void_on,                                            -- +90d
  resolution, resolution_note, opened_at, closed_at)

-- Correspondence (email + snail mail); approval-gated
correspondence(id, member_id, channel,        -- email | mail
  template,                                    -- welcome | dues_reminder | 423 | 424 | KA1 | 1845 | event | insurance_referral | custom
  subject, body, status,                       -- draft | needs_approval | approved | queued | sent | mailed | failed
  scheduled_for, sent_at, mailed_at,
  resend_id, error, created_by, created_at)

-- Generic tasks / to-dos (auto from engine, manual, or agent-created)
tasks(id, title, detail, category,            -- retention | assessment | audit | 990 | 365 | bonding | supply | comp | member | general
  due_date, status,                            -- open | done | dismissed
  source,                                      -- auto | manual | agent
  related_member_id, related_case_id, created_at, completed_at)

-- Recurring deadline rules → expanded into dated tasks by the cron
deadline_rules(id, name, category, rrule text, lead_days int, active boolean)

-- Audit prep (semi-annual)
audit_periods(id, label,                       -- e.g. "2026-H1 (Jan)"
  status, gathered_checklist jsonb,
  schedule_b jsonb, schedule_c jsonb, notes, created_at)

-- Compensation / 990 / bonding trackers
comp_records(id, year, dues_collected numeric, comp_percent numeric,
  comp_from_council numeric, insurance_certs int, comp_from_supreme numeric,
  waived boolean, w9_on_file boolean, form_1099_expected boolean, note)
filing_records(id, kind,                        -- form_990 | form_365 | audit_1295 | bonding_renewal
  period_label, due_date, filed_date, status, note)

-- Knowledge base for the agent (pgvector)
kb_documents(id, title, source_type,           -- handbook | bylaws | policy | note
  source_ref, ingested_at)
kb_chunks(id, document_id, chunk_index, heading, content text,
  embedding vector(1024), token_count)         -- dim per Voyage model

-- Agent + governance
chat_threads(id, title, created_at)
chat_messages(id, thread_id, role, content jsonb, tool_calls jsonb, created_at)
audit_log(id, actor, action, entity, entity_id, detail jsonb, created_at)
```

**Hard rule to encode:** reject any write to `members`/notes that looks like an SSN/Tax ID (regex guard + Zod refinement), matching the handbook's "not to be requested nor retained at the council level."

---

## Part 6 — The chat agent

A Claude-powered assistant with three jobs: **answer from the handbook (RAG)**, **surface what's due**, and **draft/queue correspondence** — always with you as the approval gate for anything that sends or files.

### 6.1 Retrieval (RAG over the handbook)
- **Ingestion (Ticket 9):** chunk the FS Handbook by section/subsection (the section headers extract cleanly), ~300–600 tokens/chunk with heading metadata, embed with Voyage, store in `kb_chunks`. Re-runnable so you can add council bylaws, State Council directives, and your own notes later.
- **Retrieval:** hybrid — pgvector cosine similarity + a Postgres full-text (`tsvector`) filter, top-k (~6), passed to Claude as grounded context. Always show which handbook section an answer came from.
- **Grounding rule:** the agent answers dues/retention/990/audit questions **from retrieved chunks**, and when it states a dollar figure or threshold it flags "verify current value" because the handbook is 2009.

### 6.2 Agent tools (Claude tool use — Zod-validated handlers)
| Tool | Does | Write? |
|---|---|---|
| `search_handbook(query)` | RAG lookup, returns passages + section refs | read |
| `explain_form(form_number)` | e.g. "#1845", "Form 100", "#157" — purpose, signatures, distribution | read |
| `list_due_items(timeframe)` | open tasks + upcoming deadlines | read |
| `search_members(q)` / `get_member(id)` | mirror lookup | read |
| `get_retention_status(member)` | where the member is in the cadence + next action | read |
| `create_task(...)` / `complete_task(id)` | to-dos | write |
| `draft_email(member, purpose)` | creates a `correspondence` row **status=needs_approval** (never sends) | write (draft only) |
| `queue_mail_task(member, letter_type)` | creates a mail to-do + generates the letter PDF (#423/#424/#KA1/#1845/welcome) | write (draft only) |
| `open_retention_case(member)` / `advance_case(...)` | manage the state machine | write |

### 6.3 Correspondence guardrails (non-negotiable)
- **The agent never sends email or files anything with Supreme.** It only creates drafts/queued items in states `needs_approval` / `queued`.
- **You approve** in a review queue → then Resend sends (or you mark mail "mailed").
- **Bulk dues reminders** generate *individual* drafts you can approve in a batch, with an unsubscribe/contact-pref respect and a note that these **supplement** the official #423/#424 notices (which should still go through Member Billing).
- **Snail-mail items** become printable, address-merged PDFs + a "To Mail" checklist. Official notices #423/#424/#1845 remain the manual-billing fallback / personal-contact record — the app is not claiming to file them with Supreme.
- Every send/queue writes to `audit_log`.

### 6.4 Proactive surfacing
The **daily Vercel Cron** (`/api/cron/daily`) is the heartbeat:
1. Expand `deadline_rules` into concrete dated `tasks` (levy pay-by, 990 window, audit season, Form 365, bonding, roster reconcile).
2. Walk open `retention_cases`, compute next action + due date, refresh tasks, flag overdue and "approaching $50 auto-suspension."
3. Compose a **morning digest** (what's due today/this week, cases needing action, drafts awaiting approval) and email it via Resend.
4. The dashboard shows the same, and when you open the chat the agent greets with the live "here's what needs you" summary.

*(This is also a natural fit for a scheduled/recurring task if you later want it to run itself.)*

---

## Part 7 — Build plan: phased tickets for Claude Code

Each ticket is scoped to be handed to Claude Code more or less as-is. Do them in order; each ends in something runnable.

**Ticket 0 — Scaffold.** Next.js 15 + TS + Tailwind + shadcn/ui. Add Drizzle + `@neondatabase/serverless`. Add Auth.js (Google, single-email allowlist via env). Env: `DATABASE_URL`, `AUTH_*`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`. Theme tokens from Part 8. Deploy to Vercel + connect Neon. **Done when:** a protected empty dashboard deploys.

**Ticket 1 — Schema + council settings.** Implement Part 5 schema as Drizzle migrations; enable `pgvector`. Build a Settings page (council #10325 identity, GK/trustees/DD, from-email, comp %, dues defaults, assessment_config seeded with 2009 values + "verify" flags). Add the **SSN/Tax-ID reject guard**. **Done when:** settings persist and PII guard rejects a test SSN.

**Ticket 2 — Member mirror + roster import.** Members CRUD with contact fields the official tool lacks. Import from the weekly roster **Excel** export (SheetJS): map columns, upsert by member_number, flag the `*` returned-mail restriction, set `synced_at`, show a "mirror — verify at kofc.org" banner. **Done when:** a roster export imports and members are searchable.

**Ticket 3 — Deadline engine + tasks + daily cron.** Build the pure `lib/domain` deadline rules (Part 2 calendar) with unit tests. `tasks` CRUD + dashboard "what's due." `/api/cron/daily` (protected by `CRON_SECRET`) expands rules → tasks and sends the digest email. Register the Vercel Cron. **Done when:** cron produces dated tasks + a digest.

**Ticket 4 — Retention case tracker.** The Part 3 state machine as tested pure functions (given dates → next action + due). Case UI (open/advance/resolve), auto-generated tasks, the three guardrail banners, and the $50 auto-suspension proximity alert. **Done when:** a case walks the full cadence with correct computed dates.

**Ticket 5 — Correspondence: email.** `correspondence` model + review/approval queue. Resend integration (send only after approval). Templates: welcome, dues reminder (supplemental), event notice, insurance referral. Respect `contact_pref`. Resend webhook → delivery/bounce status. **Done when:** a draft can be approved and delivered, status tracked.

**Ticket 6 — Correspondence: snail mail + letter PDFs.** Address-merged PDF generation for #423/#424/#KA1/#1845/welcome. "To Mail" queue with mark-as-mailed. Wire letter generation into the retention cadence. **Done when:** a #1845 PDF renders with the right member address and appears in the mail queue.

**Ticket 7 — Audit-prep + filings.** Audit-period checklist (records to gather from FS/Treasurer/Recorder) + Schedule B (cash transactions) & Schedule C (assets/liabilities) worksheets that compute totals (prep only — not the official #1295). `filing_records` for 990 / 365 / audit / bonding with due-date logic (incl. "990 = FY end + 5 months + 15 days" and "bond void if <2 audits on file"). **Done when:** an audit period shows a complete checklist + computed Schedule B/C.

**Ticket 8 — Compensation tracker.** `comp_records`: dues collected → 8–10% council comp; insurance certs → $0.40 each Supreme comp; waive toggle; W-9-on-file flag; 1099 expectation when > $599.99. **Done when:** entering dues + cert count yields correct comp + 1099 flag.

**Ticket 9 — RAG ingestion.** Chunk the FS Handbook by section, embed with Voyage, load `kb_documents`/`kb_chunks`. Re-runnable ingest script + an "add a document" path for bylaws/notes. Hybrid retriever (pgvector + tsvector). **Done when:** a similarity query returns correct handbook passages with section refs.

**Ticket 10 — Chat agent.** Anthropic Messages tool-use loop at `/api/agent`, tools from 6.2, Zod-guarded handlers, streaming chat UI, thread history. Enforce the draft-only/approval-gated rules. Log to `audit_log`. **Done when:** "who's overdue and draft their reminders?" → agent retrieves cases, creates approval-gated drafts, and cites the handbook on the cadence.

**Ticket 11 — Proactive polish + governance.** Agent greets with the live digest; dashboard consolidates due items, cases, and pending approvals; records-retention/destroy reminders with tax-ID-obliteration prompts; full `audit_log` view. Optional: read-only role for GK/trustees. **Done when:** opening the app tells you exactly what needs you today.

---

## Part 8 — Branding (Knights of Columbus palette)

Official KofC legacy palette (Navy, Red, Gold). Use these as CSS variables/Tailwind theme tokens:

| Token | Hex | Notes |
|---|---|---|
| `--kofc-navy` | `#003595` | PMS 661 C — primary (headers, nav, primary buttons) |
| `--kofc-gold` | `#FAA514` | PMS 137 C — accents, highlights, active states |
| `--kofc-red` | `#C8102E` | emblem red (use `#E4002B`/`#FE0000` if you want brighter) — alerts/destructive |
| `--kofc-white` | `#FFFFFF` | backgrounds |
| neutrals | grays | body text, borders, cards |

- **Type:** the KofC **McGivney** typeface is *locked to Supreme/authorized use with the emblem only* — **do not use it.** The Order specifies **Arial** for body copy; use a clean system/Arial-style stack (or Inter/Source Sans) and reserve navy+gold for headings.
- **Logo/emblem:** fine to use the council emblem inside a **private, authenticated** app. **Do not expose it on any public page.** KofC actively enforces its Name & Emblem policy; official assets and rules live on the kofc.org Brand Assets / Officers' Desk Reference pages. Pull the exact emblem/wordmark files and any council-specific colors from **kofc10325.org** and the Brand Assets page when you build the theme.

---

## Part 9 — Security, privacy & compliance (bake in from day one)

- **Auth everywhere.** No unauthenticated routes touch member data. Allowlist emails; add roles before sharing with GK/trustees.
- **No SSNs/Tax IDs, ever.** App- and DB-level guards; matches handbook rule. Don't even store last-4.
- **PII minimization + retention.** Only what's needed to contact/serve members. Implement the records-retention timers (7yr / 3yr) and **destroy reminders with a tax-ID-obliteration prompt.**
- **Mirror, not master.** Persistent "verify against kofc.org" labeling so the app is never mistaken for the ledger of record; keeps you audit-clean.
- **Nothing auto-sends or auto-files.** Email and Supreme filings are always human-approved. `audit_log` on every send/queue/state change.
- **Secrets** in Vercel env vars only. `CRON_SECRET` on the cron route. Verify Resend SPF/DKIM on your sending domain.
- **Backups.** Neon point-in-time restore is on by default — confirm the retention window fits your comfort level.

---

## Part 10 — Sequencing recommendation

Ship a useful core first, add the agent once the data's real:
1. **Tickets 0–2** → a themed, authenticated app with your real roster and contact info (immediately useful).
2. **Tickets 3–4** → deadlines + retention tracker (the workflow payoff).
3. **Tickets 5–6** → correspondence (email + printable letters).
4. **Tickets 7–8** → audit-prep, filings, compensation.
5. **Tickets 9–11** → RAG + chat agent + proactive digest.

The domain logic (`lib/domain`: cadence dates, assessment math, deadline rules) should be **pure, unit-tested TypeScript** independent of the DB — it's the part where a wrong date has real consequences, and it's exactly where Claude Code + tests shine.
