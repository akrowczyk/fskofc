/**
 * Retention → suspension cadence state machine (handbook / PLAN Part 3).
 * Pure functions: given dates → next action + due. Unit-test thoroughly.
 */
import { addDays, compareIso, daysBetween, todayIso } from "./dates";
import { COUNCIL_ARREARAGE_SUSPENSION_THRESHOLD } from "./assessment-defaults";

export const RETENTION_STATES = [
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
] as const;

export type RetentionState = (typeof RETENTION_STATES)[number];

export const OPEN_RETENTION_STATES: RetentionState[] = [
  "current",
  "first_notice_sent",
  "second_notice_sent",
  "committee_handoff",
  "knight_alert_sent",
  "personal_contact_assigned",
  "intent_to_suspend_1845_filed",
  "suspension_eligible",
];

export const TERMINAL_RETENTION_STATES: RetentionState[] = [
  "resolved",
  "suspension_filed",
  "1845_expired",
];

export const GUARDRAILS = {
  financialDifficulty:
    "Financial difficulty is NOT a valid reason for suspension.",
  form100Requires1845:
    "Form 100 suspension will not process unless #1845 has been on file 60 days.",
  autoVoid90:
    "#1845 auto-voids 90 days after recording — if the member re-delinquents later, the whole cadence restarts.",
  undeliverable:
    "Undeliverable mail: still make a good-faith attempt incl. filing #1845; if contact fails, Form 100 with reason “unable to contact.”",
} as const;

export type RetentionCaseInput = {
  state: RetentionState;
  firstNoticeDate: string | null;
  secondNoticeDate: string | null;
  knightAlertDate: string | null;
  personalContactBy: string | null;
  personalContactReport: string | null;
  intent1845ProcessedDate: string | null;
  suspensionEligibleOn: string | null;
  voidOn: string | null;
  resolution: string | null;
};

export type NextRetentionAction = {
  /** Machine-readable code */
  code: string;
  /** Human label for task title / UI */
  label: string;
  detail: string;
  dueDate: string | null;
  overdue: boolean;
  daysUntilDue: number | null;
  /** Suggested next state when advancing */
  advanceTo: RetentionState | null;
  /** States currently allowed to transition to from UI */
  allowedTransitions: RetentionState[];
  guardrails: string[];
  isTerminal: boolean;
};

/** Days after first notice → second notice (#424) */
export const DAYS_TO_SECOND_NOTICE = 30;
/** Days after second notice → committee / KA1 */
export const DAYS_TO_COMMITTEE = 30;
/** Days after #1845 processed → Form 100 eligible */
export const DAYS_TO_SUSPENSION_ELIGIBLE = 60;
/** Days after #1845 processed → auto-void */
export const DAYS_TO_1845_VOID = 90;

export function compute1845Dates(processedIso: string): {
  suspensionEligibleOn: string;
  voidOn: string;
} {
  return {
    suspensionEligibleOn: addDays(processedIso, DAYS_TO_SUSPENSION_ELIGIBLE),
    voidOn: addDays(processedIso, DAYS_TO_1845_VOID),
  };
}

export function isTerminalState(state: RetentionState): boolean {
  return TERMINAL_RETENTION_STATES.includes(state);
}

/**
 * Compute the next required action and due date for an open (or just-expired) case.
 */
export function computeNextAction(
  c: RetentionCaseInput,
  today: string = todayIso(),
): NextRetentionAction {
  const baseGuardrails = [
    GUARDRAILS.financialDifficulty,
    GUARDRAILS.form100Requires1845,
    GUARDRAILS.autoVoid90,
  ];

  if (isTerminalState(c.state)) {
    return {
      code: "terminal",
      label:
        c.state === "resolved"
          ? "Case resolved"
          : c.state === "suspension_filed"
            ? "Suspension filed"
            : "#1845 expired",
      detail: c.resolution
        ? `Resolution: ${c.resolution}`
        : "No further cadence action required.",
      dueDate: null,
      overdue: false,
      daysUntilDue: null,
      advanceTo: null,
      allowedTransitions: [],
      guardrails: baseGuardrails,
      isTerminal: true,
    };
  }

  // Auto-void check before other actions if 1845 was filed
  if (
    c.intent1845ProcessedDate &&
    c.voidOn &&
    compareIso(today, c.voidOn) >= 0 &&
    c.state !== "suspension_filed" &&
    c.state !== "resolved"
  ) {
    return {
      code: "1845_expired",
      label: "Mark #1845 expired (90-day void)",
      detail:
        "#1845 has been on file 90+ days without resolution. It is null/void; re-delinquency restarts the full cadence.",
      dueDate: c.voidOn,
      overdue: true,
      daysUntilDue: daysBetween(today, c.voidOn),
      advanceTo: "1845_expired",
      allowedTransitions: ["1845_expired", "resolved", "suspension_filed"],
      guardrails: baseGuardrails,
      isTerminal: false,
    };
  }

  switch (c.state) {
    case "current": {
      // Not yet noticed — first notice is due immediately (billing period context)
      return {
        code: "send_first_notice",
        label: "Send First Notice (#423)",
        detail:
          "Mail #423 15 days before the billing period when possible; open the formal cadence by recording first notice date.",
        dueDate: today,
        overdue: false,
        daysUntilDue: 0,
        advanceTo: "first_notice_sent",
        allowedTransitions: ["first_notice_sent", "resolved"],
        guardrails: baseGuardrails,
        isTerminal: false,
      };
    }
    case "first_notice_sent": {
      const due = c.firstNoticeDate
        ? addDays(c.firstNoticeDate, DAYS_TO_SECOND_NOTICE)
        : today;
      return action(
        "send_second_notice",
        "Send Second Notice (#424)",
        "If unpaid 30 days after first notice, send #424.",
        due,
        today,
        "second_notice_sent",
        ["second_notice_sent", "resolved"],
        baseGuardrails,
      );
    }
    case "second_notice_sent": {
      const due = c.secondNoticeDate
        ? addDays(c.secondNoticeDate, DAYS_TO_COMMITTEE)
        : today;
      return action(
        "committee_handoff",
        "Hand to retention committee + prepare Knight Alert (#KA1)",
        "If unpaid 30 days after second notice: give names/addresses/phones/amounts to retention committee; send #KA1 (GK + trustees).",
        due,
        today,
        "committee_handoff",
        ["committee_handoff", "knight_alert_sent", "resolved"],
        baseGuardrails,
      );
    }
    case "committee_handoff": {
      return action(
        "send_knight_alert",
        "Send Knight Alert (#KA1)",
        "Knight Alert signed by GK + trustees. GK assigns personal contact.",
        c.secondNoticeDate
          ? addDays(c.secondNoticeDate, DAYS_TO_COMMITTEE)
          : today,
        today,
        "knight_alert_sent",
        ["knight_alert_sent", "resolved"],
        baseGuardrails,
      );
    }
    case "knight_alert_sent": {
      return action(
        "assign_personal_contact",
        "Assign personal contact + obtain written report",
        "GK assigns a member for personal contact; written report required.",
        c.knightAlertDate ? addDays(c.knightAlertDate, 14) : today,
        today,
        "personal_contact_assigned",
        ["personal_contact_assigned", "resolved"],
        baseGuardrails,
      );
    }
    case "personal_contact_assigned": {
      // End of 2nd month of arrears → prepare #1845
      const due = c.secondNoticeDate
        ? addDays(c.secondNoticeDate, 60)
        : today;
      return action(
        "file_1845",
        "Prepare / file Form #1845 Notice of Intent to Suspend",
        "Signed by FS + GK. Copies: member, Supreme, State Deputy, District Deputy, council file.",
        due,
        today,
        "intent_to_suspend_1845_filed",
        ["intent_to_suspend_1845_filed", "resolved"],
        [...baseGuardrails, GUARDRAILS.undeliverable],
      );
    }
    case "intent_to_suspend_1845_filed": {
      const eligible =
        c.suspensionEligibleOn ??
        (c.intent1845ProcessedDate
          ? addDays(c.intent1845ProcessedDate, DAYS_TO_SUSPENSION_ELIGIBLE)
          : null);
      if (eligible && compareIso(today, eligible) >= 0) {
        return action(
          "suspension_eligible",
          "Case is suspension-eligible (60 days post-#1845)",
          "Council may file Form 100. Will not process unless #1845 on file 60 days. Watch 90-day void.",
          eligible,
          today,
          "suspension_eligible",
          ["suspension_eligible", "suspension_filed", "resolved", "1845_expired"],
          baseGuardrails,
        );
      }
      return action(
        "wait_1845_60",
        "Wait for #1845 60-day period (then Form 100 eligible)",
        `Processed ${c.intent1845ProcessedDate ?? "—"}; eligible on ${eligible ?? "—"}; voids on ${c.voidOn ?? "—"}.`,
        eligible,
        today,
        null,
        ["suspension_eligible", "suspension_filed", "resolved", "1845_expired"],
        baseGuardrails,
      );
    }
    case "suspension_eligible": {
      return action(
        "file_or_resolve",
        "File Form 100 suspension — or resolve case",
        "May file Form 100 if #1845 has been on file ≥60 days. Prefer retention; financial difficulty is not a valid suspension reason.",
        c.voidOn,
        today,
        "suspension_filed",
        ["suspension_filed", "resolved", "1845_expired"],
        baseGuardrails,
      );
    }
    default:
      return {
        code: "unknown",
        label: "Review case",
        detail: `Unhandled state: ${c.state}`,
        dueDate: today,
        overdue: false,
        daysUntilDue: 0,
        advanceTo: null,
        allowedTransitions: [],
        guardrails: baseGuardrails,
        isTerminal: false,
      };
  }
}

function action(
  code: string,
  label: string,
  detail: string,
  dueDate: string | null,
  today: string,
  advanceTo: RetentionState | null,
  allowed: RetentionState[],
  guardrails: string[],
): NextRetentionAction {
  const overdue = dueDate ? compareIso(today, dueDate) > 0 : false;
  const daysUntilDue = dueDate ? daysBetween(today, dueDate) : null;
  return {
    code,
    label,
    detail,
    dueDate,
    overdue,
    daysUntilDue,
    advanceTo,
    allowedTransitions: allowed,
    guardrails,
    isTerminal: false,
  };
}

/**
 * Apply a state transition, stamping dates as appropriate.
 */
export function applyTransition(
  c: RetentionCaseInput,
  to: RetentionState,
  opts: {
    today?: string;
    personalContactBy?: string | null;
    personalContactReport?: string | null;
    resolution?: string | null;
    resolutionNote?: string | null;
    /** When #1845 was processed at Supreme (defaults to today) */
    intent1845ProcessedDate?: string | null;
  } = {},
): RetentionCaseInput & {
  resolution: string | null;
  resolutionNote?: string | null;
  closedAt?: boolean;
} {
  const today = opts.today ?? todayIso();
  const next: RetentionCaseInput & {
    resolution: string | null;
    resolutionNote?: string | null;
    closedAt?: boolean;
  } = { ...c, state: to, resolution: c.resolution };

  switch (to) {
    case "first_notice_sent":
      next.firstNoticeDate = c.firstNoticeDate ?? today;
      break;
    case "second_notice_sent":
      next.secondNoticeDate = c.secondNoticeDate ?? today;
      break;
    case "knight_alert_sent":
      next.knightAlertDate = c.knightAlertDate ?? today;
      break;
    case "personal_contact_assigned":
      next.personalContactBy =
        opts.personalContactBy ?? c.personalContactBy;
      next.personalContactReport =
        opts.personalContactReport ?? c.personalContactReport;
      break;
    case "intent_to_suspend_1845_filed": {
      const processed =
        opts.intent1845ProcessedDate ??
        c.intent1845ProcessedDate ??
        today;
      next.intent1845ProcessedDate = processed;
      const dates = compute1845Dates(processed);
      next.suspensionEligibleOn = dates.suspensionEligibleOn;
      next.voidOn = dates.voidOn;
      break;
    }
    case "resolved":
    case "suspension_filed":
    case "1845_expired":
      next.resolution =
        opts.resolution ??
        (to === "suspension_filed"
          ? "suspended"
          : to === "1845_expired"
            ? "expired"
            : (opts.resolution ?? "paid"));
      next.resolutionNote = opts.resolutionNote ?? null;
      next.closedAt = true;
      break;
  }

  return next;
}

/** Human labels for UI */
export const STATE_LABELS: Record<RetentionState, string> = {
  current: "Opened — first notice due",
  first_notice_sent: "First notice (#423) sent",
  second_notice_sent: "Second notice (#424) sent",
  committee_handoff: "Committee handoff",
  knight_alert_sent: "Knight Alert (#KA1) sent",
  personal_contact_assigned: "Personal contact assigned",
  intent_to_suspend_1845_filed: "#1845 filed",
  suspension_eligible: "Suspension eligible",
  resolved: "Resolved",
  suspension_filed: "Suspension filed (Form 100)",
  "1845_expired": "#1845 expired",
};

export function arrearageAlert(amount: number | null | undefined): string | null {
  if (amount == null || Number.isNaN(amount)) return null;
  if (amount >= COUNCIL_ARREARAGE_SUSPENSION_THRESHOLD) {
    return `Council arrearage $${amount.toFixed(2)} ≥ $${COUNCIL_ARREARAGE_SUSPENSION_THRESHOLD} — automatic council suspension threshold reached.`;
  }
  if (amount >= COUNCIL_ARREARAGE_SUSPENSION_THRESHOLD * 0.6) {
    return `Council arrearage $${amount.toFixed(2)} approaching $${COUNCIL_ARREARAGE_SUSPENSION_THRESHOLD} auto-suspension threshold.`;
  }
  return null;
}
