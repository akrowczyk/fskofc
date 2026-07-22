import type { Member } from "@/db/schema";

export type EmailTemplateId =
  | "welcome"
  | "dues_reminder"
  | "event"
  | "insurance_referral"
  | "custom";

export type RenderedTemplate = {
  subject: string;
  body: string;
};

function memberName(m: Pick<Member, "firstName" | "lastName">) {
  return `${m.firstName} ${m.lastName}`.trim();
}

/**
 * Supplemental templates only — official #423/#424 still go through Member Billing.
 */
export function renderEmailTemplate(
  template: EmailTemplateId,
  member: Pick<Member, "firstName" | "lastName" | "email">,
  opts?: { councilName?: string; customSubject?: string; customBody?: string },
): RenderedTemplate {
  const name = memberName(member);
  const council = opts?.councilName ?? "Holy Ghost Council 10325";

  switch (template) {
    case "welcome":
      return {
        subject: `Welcome to ${council}`,
        body: `Dear Brother ${name},\n\nWelcome to ${council}, Knights of Columbus. We are glad to have you among us.\n\nIf you have questions about meetings, degrees, or dues, please reply to this message or contact the Financial Secretary.\n\nVivat Jesus,\nFinancial Secretary\n${council}`,
      };
    case "dues_reminder":
      return {
        subject: `Friendly dues reminder — ${council}`,
        body: `Dear Brother ${name},\n\nThis is a personal, supplemental reminder regarding council dues. Official billing notices (#423 / #424) are issued through Member Billing when applicable.\n\nIf you have already paid, thank you — please disregard this note. If you are experiencing hardship, please contact the Financial Secretary; financial difficulty is never a reason for suspension, and we want to help.\n\nVivat Jesus,\nFinancial Secretary\n${council}`,
      };
    case "event":
      return {
        subject: `Council event notice — ${council}`,
        body: `Dear Brother ${name},\n\nPlease join us for an upcoming council event. Details will follow (or are included below).\n\nVivat Jesus,\n${council}`,
      };
    case "insurance_referral":
      return {
        subject: `Knights of Columbus insurance — referral`,
        body: `Dear Brother ${name},\n\nFor questions about Knights of Columbus insurance products, please contact our field agent or Supreme Council. The Financial Secretary does not provide insurance advice.\n\nYour local agent can review your needs and existing coverage.\n\nVivat Jesus,\nFinancial Secretary\n${council}`,
      };
    case "custom":
    default:
      return {
        subject: opts?.customSubject ?? `Message from ${council}`,
        body: opts?.customBody ?? `Dear Brother ${name},\n\n\n\nVivat Jesus,\nFinancial Secretary\n${council}`,
      };
  }
}

export function renderLetterBody(
  template: "423" | "424" | "KA1" | "1845" | "welcome",
  member: Pick<
    Member,
    | "firstName"
    | "lastName"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "state"
    | "zip"
    | "memberNumber"
  >,
  opts?: { councilName?: string; amount?: string; gkName?: string },
): { title: string; body: string } {
  const name = memberName(member);
  const council = opts?.councilName ?? "Holy Ghost Council 10325";
  const addr = [
    member.addressLine1,
    member.addressLine2,
    [member.city, member.state, member.zip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const common = `Member: ${name} (#${member.memberNumber})\n${addr}\n\n`;

  switch (template) {
    case "423":
      return {
        title: "First Notice — Form #423 (supplemental draft)",
        body: `${common}This is a working draft of First Notice (#423) for council records and personal-contact logging.\n\nOfficial notices should still be produced via Member Billing when used.\n\nAmount due (if known): ${opts?.amount ?? "[enter amount]"}\n\n${council}\nFinancial Secretary`,
      };
    case "424":
      return {
        title: "Second Notice — Form #424 (supplemental draft)",
        body: `${common}This is a working draft of Second Notice (#424).\n\nIf unpaid after 30 days from first notice, second notice is due.\n\nAmount due: ${opts?.amount ?? "[enter amount]"}\n\n${council}`,
      };
    case "KA1":
      return {
        title: "Knight Alert — #KA1 (draft)",
        body: `${common}Knight Alert for retention committee action.\n\nRequires signatures of Grand Knight and Trustees.\nGK: ${opts?.gkName ?? "[GK name]"}\n\n${council}`,
      };
    case "1845":
      return {
        title: "Notice of Intent to Suspend — Form #1845 (draft)",
        body: `${common}NOTICE OF INTENT TO SUSPEND (working draft for council use).\n\nMust be signed by Financial Secretary and Grand Knight.\nCopies: member, Supreme, State Deputy, District Deputy, council file.\n\nForm 100 suspension will not process unless #1845 has been on file 60 days.\n#1845 auto-voids 90 days after recording at Supreme.\n\nFinancial difficulty is NOT a valid reason for suspension.\n\n${council}`,
      };
    case "welcome":
      return {
        title: "Welcome letter",
        body: `${common}Welcome to ${council}, Knights of Columbus.\n\nWe look forward to your participation in our council.\n\nVivat Jesus,\nFinancial Secretary`,
      };
  }
}
