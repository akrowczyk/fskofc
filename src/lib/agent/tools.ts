import { z } from "zod";

/** Anthropic tool definitions for the FS assistant */
export const agentTools = [
  {
    name: "search_handbook",
    description:
      "Search the Financial Secretary handbook knowledge base. Always cite section/source. Flag 2009 dollar figures for verification.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "explain_form",
    description:
      "Explain a KofC form by number (e.g. 1845, 100, 157, 423, 424, 1295, 365, 990).",
    input_schema: {
      type: "object" as const,
      properties: {
        form_number: { type: "string" },
      },
      required: ["form_number"],
    },
  },
  {
    name: "list_due_items",
    description: "List open tasks and upcoming deadlines.",
    input_schema: {
      type: "object" as const,
      properties: {
        timeframe: {
          type: "string",
          description: "today | week | all",
        },
      },
      required: [],
    },
  },
  {
    name: "search_members",
    description: "Search the member mirror by name, number, email, or phone.",
    input_schema: {
      type: "object" as const,
      properties: { q: { type: "string" } },
      required: ["q"],
    },
  },
  {
    name: "get_retention_status",
    description: "Get retention case status and next action for a member.",
    input_schema: {
      type: "object" as const,
      properties: {
        member_id: { type: "string" },
        member_number: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description: "Create a manual to-do task.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        detail: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        category: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task done by id.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "draft_email",
    description:
      "Create an email draft with status needs_approval. NEVER sends. Templates: welcome, dues_reminder, event, insurance_referral, custom.",
    input_schema: {
      type: "object" as const,
      properties: {
        member_id: { type: "string" },
        purpose: {
          type: "string",
          description: "welcome | dues_reminder | event | insurance_referral | custom",
        },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["member_id", "purpose"],
    },
  },
  {
    name: "queue_mail_task",
    description:
      "Queue a snail-mail letter task (draft PDF). letter_type: 423, 424, KA1, 1845, welcome. Never files with Supreme.",
    input_schema: {
      type: "object" as const,
      properties: {
        member_id: { type: "string" },
        letter_type: { type: "string" },
      },
      required: ["member_id", "letter_type"],
    },
  },
  {
    name: "open_retention_case",
    description: "Open a retention case for a member if none is open.",
    input_schema: {
      type: "object" as const,
      properties: { member_id: { type: "string" } },
      required: ["member_id"],
    },
  },
  {
    name: "advance_case",
    description: "Advance a retention case to a new state.",
    input_schema: {
      type: "object" as const,
      properties: {
        case_id: { type: "string" },
        to_state: { type: "string" },
      },
      required: ["case_id", "to_state"],
    },
  },
];

export const toolInputSchemas = {
  search_handbook: z.object({ query: z.string() }),
  explain_form: z.object({ form_number: z.string() }),
  list_due_items: z.object({ timeframe: z.string().optional() }),
  search_members: z.object({ q: z.string() }),
  get_retention_status: z.object({
    member_id: z.string().optional(),
    member_number: z.string().optional(),
  }),
  create_task: z.object({
    title: z.string(),
    detail: z.string().optional(),
    due_date: z.string().optional(),
    category: z.string().optional(),
  }),
  complete_task: z.object({ id: z.string() }),
  draft_email: z.object({
    member_id: z.string(),
    purpose: z.string(),
    subject: z.string().optional(),
    body: z.string().optional(),
  }),
  queue_mail_task: z.object({
    member_id: z.string(),
    letter_type: z.string(),
  }),
  open_retention_case: z.object({ member_id: z.string() }),
  advance_case: z.object({
    case_id: z.string(),
    to_state: z.string(),
  }),
};
