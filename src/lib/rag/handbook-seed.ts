/**
 * Seed passages derived from FS Handbook rules encoded in the app plan.
 * Replace/extend by ingesting the full PDF later (Ticket 9 re-runnable path).
 * Dollar figures flagged as 2009 defaults — verify current Supreme/IRS values.
 */

export type HandbookChunkSeed = {
  heading: string;
  content: string;
  sourceRef: string;
};

export const HANDBOOK_SEED_CHUNKS: HandbookChunkSeed[] = [
  {
    heading: "Retention cadence overview",
    sourceRef: "Handbook § retention / billing notices",
    content:
      "First Notice (#423) is mailed 15 days before the billing period. If unpaid after 30 days, Second Notice (#424). If unpaid 30 days after the second notice, hand names/addresses/phones/amounts to the retention committee and send Knight Alert (#KA1) signed by GK and trustees; GK assigns personal contact with written report. At end of 2nd month of arrears prepare Form #1845 Notice of Intent to Suspend (FS + GK). 60 days after #1845 is processed with no resolution, council may file Form 100 (suspension). Suspension will not process unless #1845 has been on file 60 days. #1845 becomes null/void 90 days after recorded at Supreme. Financial difficulty is not a valid reason for suspension.",
  },
  {
    heading: "Form #1845",
    sourceRef: "Handbook Form 1845",
    content:
      "Form #1845 Notice of Intent to Suspend is signed by the Financial Secretary and Grand Knight. Copies go to the member, Supreme Council, State Deputy, District Deputy, and council file. After processing at Supreme, wait 60 days before Form 100 suspension is eligible. The notice auto-voids 90 days after recording — if the member later becomes delinquent again, restart the full cadence.",
  },
  {
    heading: "Form 100 suspension",
    sourceRef: "Handbook Form 100",
    content:
      "Form 100 is used for member transactions including suspension. Suspension will not process unless #1845 has been on file the required 60 days. For undeliverable mail, make good-faith contact attempts including #1845; if contact fails, Form 100 may use reason unable to contact. Never use financial difficulty as suspension reason.",
  },
  {
    heading: "Supreme assessments",
    sourceRef: "Handbook assessments / Section 156",
    content:
      "Per Capita Tax, Catholic Advertising, and Culture of Life are levied on total membership including inactive and honorary, excluding honorary life and disabled. Default 2009 amounts were $1.75, $0.50, and $1.00 respectively — VERIFY CURRENT SUPREME FIGURES. Levy dates Jan 1 and Jul 1; pay by Apr 10 and Oct 10. 100-day grace per levy. Automatic council suspension when arrearage is $50 or more on any account.",
  },
  {
    heading: "FS compensation",
    sourceRef: "Handbook compensation",
    content:
      "Council compensation is 8–10% of dues collected only (not initiation fees or other receipts), council-set percentage, waivable at FS discretion, no lump sum. Supreme pays $0.40 per in-force life insurance certificate registered to the council at year-end, paid annually in January. 1099-MISC if award exceeds $599.99. W-9 must be on file at Supreme to receive compensation.",
  },
  {
    heading: "Bonding",
    sourceRef: "Handbook bonding",
    content:
      "Bond is $5,000 automatic free on the office (not the person). Additional coverage at $7 per thousand. Cap $125,000 total per council including $5k each on FS and Treasurer. Bond runs Mar 1 through end of February. Bond is void if the last two semi-annual audits (#1295) are not on file at Supreme.",
  },
  {
    heading: "Form 990",
    sourceRef: "Handbook / IRS 501(c)(8)",
    content:
      "US councils are 501(c)(8). Form 990 due on the 15th day of the 5th month after fiscal year end. 2009 handbook referenced 990-N at ≤$25k gross receipts — VERIFY CURRENT IRS THRESHOLDS. Missing three consecutive years can lose tax-exempt status.",
  },
  {
    heading: "Semi-annual audit #1295",
    sourceRef: "Handbook audit",
    content:
      "Semi-annual audit Form #1295 is performed in January and July by the Grand Knight and trustees. FS prepares records. Frozen rosters dated Jan 1 and Jul 1. If Member Billing is used, Schedule A may be auto-reconciled. Bond depends on last two audits on file.",
  },
  {
    heading: "Records retention and tax IDs",
    sourceRef: "Handbook records retention",
    content:
      "Current-member Form 100 (new/re-entry not originally your council): 7 years. Other current-member Form 100: 3 years. Former-member Form 100: verify processed then destroy. Correspondence and accounting: 3 years. In all cases obliterate tax IDs including last four digits. Never request or retain SSNs/Tax IDs at council level.",
  },
  {
    heading: "Contact information gap",
    sourceRef: "Handbook / Member Management limits",
    content:
      "Member Management and Member Billing cannot store member phone numbers or email addresses. Contact data must be maintained locally for outreach, retention personal contact, and correspondence. This companion app is a mirror for contact and workflow — not the ledger of record.",
  },
  {
    heading: "Order on Treasurer #157",
    sourceRef: "Handbook vouchers",
    content:
      "Moneys are paid to the Treasurer via Order on Treasurer (#157), countersigned by the Grand Knight. Track draft data, approval, countersign, and check number in council process. Official ledger remains Member Billing when used.",
  },
  {
    heading: "Form 365",
    sourceRef: "Handbook Form 365",
    content:
      "Service Program Personnel Report Form 365 is due at Supreme by August 1. Grand Knight owns filing via Member Management; Financial Secretary should nudge.",
  },
];
