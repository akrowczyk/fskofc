/**
 * Full data model from docs/PLAN.md Part 5.
 * Member data is a convenience mirror — not the source of truth.
 */
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const memberTypeEnum = pgEnum("member_type", [
  "associate",
  "insurance",
  "inactive",
  "honorary",
  "honorary_life",
  "disabled",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "active",
  "suspended",
  "withdrawn",
  "deceased",
  "transferred",
]);

export const contactPrefEnum = pgEnum("contact_pref", [
  "email",
  "mail",
  "phone",
  "none",
]);

export const ledgerKindEnum = pgEnum("ledger_kind", [
  "dues_assessment",
  "initiation",
  "payment",
  "adjustment",
]);

export const retentionStateEnum = pgEnum("retention_state", [
  "current",
  "first_notice_sent",
  "second_notice_sent",
  "committee_handoff",
  "knight_alert_sent",
  "personal_contact_assigned",
  "intent_to_suspend_1845_filed",
  "suspension_eligible",
  "resolved",
  "suspension_filed",
  "1845_expired",
]);

export const retentionResolutionEnum = pgEnum("retention_resolution", [
  "paid",
  "plan",
  "suspended",
  "expired",
  "other",
]);

export const correspondenceChannelEnum = pgEnum("correspondence_channel", [
  "email",
  "mail",
]);

export const correspondenceTemplateEnum = pgEnum("correspondence_template", [
  "welcome",
  "dues_reminder",
  "423",
  "424",
  "KA1",
  "1845",
  "event",
  "insurance_referral",
  "custom",
]);

export const correspondenceStatusEnum = pgEnum("correspondence_status", [
  "draft",
  "needs_approval",
  "approved",
  "queued",
  "sent",
  "mailed",
  "failed",
]);

export const taskCategoryEnum = pgEnum("task_category", [
  "retention",
  "assessment",
  "audit",
  "990",
  "365",
  "bonding",
  "supply",
  "comp",
  "member",
  "general",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "done",
  "dismissed",
]);

export const taskSourceEnum = pgEnum("task_source", [
  "auto",
  "manual",
  "agent",
]);

export const assessmentKindEnum = pgEnum("assessment_kind", [
  "per_capita",
  "catholic_adv",
  "culture_of_life",
]);

export const filingKindEnum = pgEnum("filing_kind", [
  "form_990",
  "form_365",
  "audit_1295",
  "bonding_renewal",
]);

export const filingStatusEnum = pgEnum("filing_status", [
  "upcoming",
  "due",
  "filed",
  "overdue",
  "n_a",
]);

export const kbSourceTypeEnum = pgEnum("kb_source_type", [
  "handbook",
  "bylaws",
  "policy",
  "note",
]);

export const userRoleEnum = pgEnum("user_role", ["fs", "gk", "trustee", "readonly"]);

// ─── Config ──────────────────────────────────────────────────────────────────

export const councilSettings = pgTable("council_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  councilNumber: text("council_number").notNull().default("10325"),
  councilName: text("council_name")
    .notNull()
    .default("Holy Ghost Council"),
  fiscalYearEnd: text("fiscal_year_end").notNull().default("12-31"), // MM-DD
  gkName: text("gk_name"),
  ddName: text("dd_name"),
  trusteeNames: jsonb("trustee_names").$type<string[]>().default([]),
  fromEmail: text("from_email"),
  mailingAddress: text("mailing_address"),
  compPercent: numeric("comp_percent", { precision: 5, scale: 2 }).default(
    "8.00",
  ),
  duesDefault: numeric("dues_default", { precision: 10, scale: 2 }).default(
    "30.00",
  ),
  duesUnder26: numeric("dues_under26", { precision: 10, scale: 2 }).default(
    "15.00",
  ),
  bondingNote: text("bonding_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const assessmentConfig = pgTable("assessment_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: assessmentKindEnum("kind").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  /** When last verified against current Supreme figures */
  verifiedAt: date("verified_at"),
  note: text("note"),
});

// ─── Members (mirror — NO SSN / Tax ID) ──────────────────────────────────────

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberNumber: text("member_number").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    phone: text("phone"),
    email: text("email"),
    contactPref: contactPrefEnum("contact_pref").default("email"),
    memberType: memberTypeEnum("member_type").default("associate"),
    degree: smallint("degree"),
    joinDate: date("join_date"),
    status: memberStatusEnum("status").default("active"),
    duesRate: numeric("dues_rate", { precision: 10, scale: 2 }),
    notes: text("notes"),
    /** Roster "*" returned-mail / address-restricted flag */
    addressRestricted: boolean("address_restricted").default(false).notNull(),
    source: text("source").default("manual"),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("members_member_number_uidx").on(t.memberNumber),
    index("members_last_name_idx").on(t.lastName),
    index("members_status_idx").on(t.status),
  ],
);

export const memberLedgerEntries = pgTable(
  "member_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    kind: ledgerKindEnum("kind").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    periodLabel: text("period_label"),
    entryDate: date("entry_date").notNull(),
    reconciled: boolean("reconciled").default(false).notNull(),
    note: text("note"),
  },
  (t) => [index("ledger_member_idx").on(t.memberId)],
);

// ─── Retention state machine ─────────────────────────────────────────────────

export const retentionCases = pgTable(
  "retention_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    state: retentionStateEnum("state").notNull().default("current"),
    firstNoticeDate: date("first_notice_date"),
    secondNoticeDate: date("second_notice_date"),
    knightAlertDate: date("knight_alert_date"),
    personalContactBy: text("personal_contact_by"),
    personalContactReport: text("personal_contact_report"),
    intent1845ProcessedDate: date("intent_1845_processed_date"),
    /** intent_1845 + 60 days */
    suspensionEligibleOn: date("suspension_eligible_on"),
    /** intent_1845 + 90 days (auto-void) */
    voidOn: date("void_on"),
    resolution: retentionResolutionEnum("resolution"),
    resolutionNote: text("resolution_note"),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("retention_member_idx").on(t.memberId),
    index("retention_state_idx").on(t.state),
  ],
);

// ─── Correspondence ──────────────────────────────────────────────────────────

export const correspondence = pgTable(
  "correspondence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    channel: correspondenceChannelEnum("channel").notNull(),
    template: correspondenceTemplateEnum("template").notNull(),
    subject: text("subject"),
    body: text("body"),
    status: correspondenceStatusEnum("status").notNull().default("draft"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    mailedAt: timestamp("mailed_at", { withTimezone: true }),
    resendId: text("resend_id"),
    error: text("error"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("correspondence_status_idx").on(t.status),
    index("correspondence_member_idx").on(t.memberId),
  ],
);

// ─── Tasks & deadline rules ──────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    detail: text("detail"),
    category: taskCategoryEnum("category").notNull().default("general"),
    dueDate: date("due_date"),
    status: taskStatusEnum("status").notNull().default("open"),
    source: taskSourceEnum("source").notNull().default("manual"),
    /** Dedupe key for auto-generated tasks (cron / retention engine) */
    externalKey: text("external_key"),
    relatedMemberId: uuid("related_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    relatedCaseId: uuid("related_case_id").references(() => retentionCases.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_status_due_idx").on(t.status, t.dueDate),
    index("tasks_category_idx").on(t.category),
    uniqueIndex("tasks_external_key_uidx").on(t.externalKey),
  ],
);

export const deadlineRules = pgTable("deadline_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  category: taskCategoryEnum("category").notNull(),
  /** iCal RRULE or app-specific recurrence key */
  rrule: text("rrule").notNull(),
  leadDays: integer("lead_days").default(14).notNull(),
  active: boolean("active").default(true).notNull(),
});

// ─── Audit prep ──────────────────────────────────────────────────────────────

export const auditPeriods = pgTable("audit_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  status: text("status").notNull().default("open"),
  gatheredChecklist: jsonb("gathered_checklist")
    .$type<Record<string, boolean>>()
    .default({}),
  scheduleB: jsonb("schedule_b").$type<Record<string, unknown>>().default({}),
  scheduleC: jsonb("schedule_c").$type<Record<string, unknown>>().default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Compensation / filings ──────────────────────────────────────────────────

export const compRecords = pgTable("comp_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  year: integer("year").notNull(),
  duesCollected: numeric("dues_collected", { precision: 12, scale: 2 }),
  compPercent: numeric("comp_percent", { precision: 5, scale: 2 }),
  compFromCouncil: numeric("comp_from_council", { precision: 12, scale: 2 }),
  insuranceCerts: integer("insurance_certs"),
  compFromSupreme: numeric("comp_from_supreme", { precision: 12, scale: 2 }),
  waived: boolean("waived").default(false).notNull(),
  w9OnFile: boolean("w9_on_file").default(false).notNull(),
  form1099Expected: boolean("form_1099_expected").default(false).notNull(),
  note: text("note"),
});

export const filingRecords = pgTable("filing_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: filingKindEnum("kind").notNull(),
  periodLabel: text("period_label").notNull(),
  dueDate: date("due_date").notNull(),
  filedDate: date("filed_date"),
  status: filingStatusEnum("status").notNull().default("upcoming"),
  note: text("note"),
});

// ─── Knowledge base (pgvector added in SQL migration / raw) ──────────────────

export const kbDocuments = pgTable("kb_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  sourceType: kbSourceTypeEnum("source_type").notNull(),
  sourceRef: text("source_ref"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Embeddings stored as text JSON until pgvector extension is enabled,
 * then migrated to vector(1024). Ticket 9 uses real vectors.
 */
export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    heading: text("heading"),
    content: text("content").notNull(),
    /** JSON array of floats until vector column is wired */
    embeddingJson: text("embedding_json"),
    tokenCount: integer("token_count"),
  },
  (t) => [index("kb_chunks_document_idx").on(t.documentId)],
);

// ─── Agent + governance ──────────────────────────────────────────────────────

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | tool
    content: jsonb("content").$type<unknown>().notNull(),
    toolCalls: jsonb("tool_calls").$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("chat_messages_thread_idx").on(t.threadId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);

// ─── Types ───────────────────────────────────────────────────────────────────

export type CouncilSettings = typeof councilSettings.$inferSelect;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type RetentionCase = typeof retentionCases.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Correspondence = typeof correspondence.$inferSelect;
