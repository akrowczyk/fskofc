import { describe, expect, it } from "vitest";
import {
  applyTransition,
  arrearageAlert,
  compute1845Dates,
  computeNextAction,
  DAYS_TO_SECOND_NOTICE,
  DAYS_TO_SUSPENSION_ELIGIBLE,
  DAYS_TO_1845_VOID,
  type RetentionCaseInput,
} from "./retention";

function base(over: Partial<RetentionCaseInput> = {}): RetentionCaseInput {
  return {
    state: "current",
    firstNoticeDate: null,
    secondNoticeDate: null,
    knightAlertDate: null,
    personalContactBy: null,
    personalContactReport: null,
    intent1845ProcessedDate: null,
    suspensionEligibleOn: null,
    voidOn: null,
    resolution: null,
    ...over,
  };
}

describe("compute1845Dates", () => {
  it("sets +60 eligibility and +90 void", () => {
    const d = compute1845Dates("2026-01-01");
    expect(d.suspensionEligibleOn).toBe("2026-03-02");
    expect(d.voidOn).toBe("2026-04-01");
    expect(DAYS_TO_SUSPENSION_ELIGIBLE).toBe(60);
    expect(DAYS_TO_1845_VOID).toBe(90);
  });
});

describe("computeNextAction cadence", () => {
  it("current → first notice due today", () => {
    const a = computeNextAction(base(), "2026-03-01");
    expect(a.code).toBe("send_first_notice");
    expect(a.advanceTo).toBe("first_notice_sent");
  });

  it("first notice +30d → second notice", () => {
    const a = computeNextAction(
      base({
        state: "first_notice_sent",
        firstNoticeDate: "2026-01-01",
      }),
      "2026-01-20",
    );
    expect(a.code).toBe("send_second_notice");
    expect(a.dueDate).toBe("2026-01-31");
    expect(a.overdue).toBe(false);
    expect(DAYS_TO_SECOND_NOTICE).toBe(30);
  });

  it("marks second notice overdue after 30 days", () => {
    const a = computeNextAction(
      base({
        state: "first_notice_sent",
        firstNoticeDate: "2026-01-01",
      }),
      "2026-02-05",
    );
    expect(a.overdue).toBe(true);
  });

  it("second notice +30d → committee", () => {
    const a = computeNextAction(
      base({
        state: "second_notice_sent",
        firstNoticeDate: "2026-01-01",
        secondNoticeDate: "2026-02-01",
      }),
      "2026-02-15",
    );
    expect(a.advanceTo).toBe("committee_handoff");
    expect(a.dueDate).toBe("2026-03-03");
  });

  it("1845 wait then becomes suspension eligible", () => {
    const processed = "2026-01-01";
    const dates = compute1845Dates(processed);
    const waiting = computeNextAction(
      base({
        state: "intent_to_suspend_1845_filed",
        intent1845ProcessedDate: processed,
        suspensionEligibleOn: dates.suspensionEligibleOn,
        voidOn: dates.voidOn,
      }),
      "2026-01-15",
    );
    expect(waiting.code).toBe("wait_1845_60");
    expect(waiting.overdue).toBe(false);

    const eligible = computeNextAction(
      base({
        state: "intent_to_suspend_1845_filed",
        intent1845ProcessedDate: processed,
        suspensionEligibleOn: dates.suspensionEligibleOn,
        voidOn: dates.voidOn,
      }),
      dates.suspensionEligibleOn,
    );
    expect(eligible.code).toBe("suspension_eligible");
    expect(eligible.advanceTo).toBe("suspension_eligible");
  });

  it("flags 1845 expired after 90 days", () => {
    const processed = "2026-01-01";
    const dates = compute1845Dates(processed);
    const a = computeNextAction(
      base({
        state: "suspension_eligible",
        intent1845ProcessedDate: processed,
        suspensionEligibleOn: dates.suspensionEligibleOn,
        voidOn: dates.voidOn,
      }),
      dates.voidOn,
    );
    expect(a.code).toBe("1845_expired");
    expect(a.advanceTo).toBe("1845_expired");
  });

  it("terminal states need no action", () => {
    const a = computeNextAction(
      base({ state: "resolved", resolution: "paid" }),
      "2026-06-01",
    );
    expect(a.isTerminal).toBe(true);
    expect(a.advanceTo).toBeNull();
  });
});

describe("applyTransition", () => {
  it("walks full cadence with correct 1845 dates", () => {
    let c = base();
    c = applyTransition(c, "first_notice_sent", { today: "2026-01-01" });
    expect(c.firstNoticeDate).toBe("2026-01-01");

    c = applyTransition(c, "second_notice_sent", { today: "2026-02-01" });
    expect(c.secondNoticeDate).toBe("2026-02-01");

    c = applyTransition(c, "committee_handoff", { today: "2026-03-01" });
    c = applyTransition(c, "knight_alert_sent", { today: "2026-03-05" });
    expect(c.knightAlertDate).toBe("2026-03-05");

    c = applyTransition(c, "personal_contact_assigned", {
      today: "2026-03-10",
      personalContactBy: "Brother Jones",
      personalContactReport: "Will pay by month end",
    });
    expect(c.personalContactBy).toBe("Brother Jones");

    c = applyTransition(c, "intent_to_suspend_1845_filed", {
      today: "2026-04-01",
    });
    expect(c.intent1845ProcessedDate).toBe("2026-04-01");
    expect(c.suspensionEligibleOn).toBe("2026-05-31");
    expect(c.voidOn).toBe("2026-06-30");

    c = applyTransition(c, "suspension_eligible", { today: "2026-05-31" });
    c = applyTransition(c, "resolved", {
      today: "2026-06-01",
      resolution: "paid",
    });
    expect(c.state).toBe("resolved");
    expect(c.resolution).toBe("paid");
    expect(c.closedAt).toBe(true);
  });
});

describe("arrearageAlert", () => {
  it("warns near and at $50", () => {
    expect(arrearageAlert(20)).toBeNull();
    expect(arrearageAlert(30)).toMatch(/approaching/);
    expect(arrearageAlert(50)).toMatch(/threshold reached/);
  });
});
