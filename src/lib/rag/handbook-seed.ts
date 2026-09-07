/**
 * Seed passages derived from FS Handbook rules plus later Supreme training
 * (FS Overview V6, Financial Officer Training, 1295A 8/25).
 * Replace/extend by ingesting the full PDFs later (Ticket 9 re-runnable path).
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
      "Bond is $5,000 automatic free on the Treasurer and Financial Secretary offices (not the person). Additional coverage at $7 per thousand. Cap $125,000 total per council including $5k each on FS and Treasurer. Bond runs Mar 1 through end of February. Bond is void if the last two annual council audits (1295A) are not on file at Supreme.",
  },
  {
    heading: "Form 990",
    sourceRef: "Handbook / IRS 501(c)(8)",
    content:
      "US councils are 501(c)(8). Each council must have its own EIN (questions: Tax.EIN@KofC.org). File Form 990 annually. Gross receipts normally under $50,000: 990-N e-Postcard online. $50,000 and above: 990-EZ or full 990; council may need a tax advisor. Due 15th day of the 5th month after fiscal year end. Missing three consecutive years can lose tax-exempt status.",
  },
  {
    heading: "Annual council audit 1295A",
    sourceRef: "Financial officer training 2024 / form 1295A 8/25",
    content:
      "The Annual Council Audit Report (1295A) covers the period ending June 30 and is due August 15. Trustees conduct the audit using records from the Financial Secretary and Treasurer; FS and Treasurer should be available. Do not hold council money on June 30 (or December 31). Prep the worksheet locally, then submit the report in Officers Online — do not mail the worksheet to Supreme. The worksheet includes a balance sheet (including Square/PayPal/Venmo undeposited and credit cards), statement of cash flows, optional Knights of Columbus Charitable Fund (KCCF) council account, council EIN, and whether Form 990 was filed this year. Signatures: Grand Knight and at least two of three trustees. Older paper Form 1295 was semi-annual (Jan–Jun due Aug 15; Jul–Dec due Feb 15) with Schedule A skipped when Member Management / Member Billing is used.",
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
    heading: "Receipts and vouchers (Member Billing)",
    sourceRef: "FS Overview V6 / Financial officer training",
    content:
      "In Member Billing, receipts are incoming funds and vouchers are outgoing funds. FS enters receipts and bills-as-vouchers in Member Billing and produces reports from Print Center. Paper Order on Treasurer (#157), countersigned by the Grand Knight, is the older equivalent. Modern voucher: FS prepares it, FS and GK sign, voucher is given to the Treasurer, Treasurer writes the check. Official ledger remains Member Billing. Do not make this companion app a second ledger of record.",
  },
  {
    heading: "Council flow of received funds",
    sourceRef: "FS Overview V6",
    content:
      "All incoming monies go to the Financial Secretary (dues, donations, events, etc.). Event chairmen turn funds over to the FS; record amounts, dates, sources, and presenters; FS issues receipts to presenters. Then: FS turns monies over to the Treasurer; Treasurer fills out a receipt; FS retains the signed receipt; Treasurer retains a copy and deposits cash. Do not hold council money on June 30 or December 31.",
  },
  {
    heading: "Processing of council bills",
    sourceRef: "FS Overview V6",
    content:
      "Council bill flow: (1) FS receives bills; (2) Trustees review bills; (3) Bills are read at the officer planning meeting; (4) Payment is approved by the council; (5) FS prepares the voucher in Member Billing; (6) Voucher is signed by FS and Grand Knight; (7) Voucher is given to the Treasurer; (8) Treasurer writes the check. Do not skip trustee review or council approval.",
  },
  {
    heading: "Planning vs council meetings",
    sourceRef: "FS Overview V6",
    content:
      "At planning meetings, process Pending Receipts and Pending Vouchers in Member Billing. At council meetings, report finalized Receipts and Vouchers. The finalized Receipt Report is submitted by the FS and received by the Treasurer. The finalized Voucher Report is signed by the FS, Grand Knight, and Treasurer.",
  },
  {
    heading: "Form 365",
    sourceRef: "Supreme forms index / Form 365 9/25 / Star Council",
    content:
      "Service Program Personnel Report Form 365 is due June 30 (current Supreme forms index and Star Council). Paper Form 365 (rev 9/25) lists received-by July 1. Grand Knight owns filing via Member Management (preferred); Financial Secretary should nudge. Required roles include Program Director, Family Director, Community Director, Membership Director, and Retention Chairman. Mid-year changes should be updated in Member Management. The 2009 handbook listed August 1 — do not use that date. Some Officers Online screenshots label this report 385; the form number is 365.",
  },
  {
    heading: "Form 185",
    sourceRef: "Supreme forms index / FS Overview V6",
    content:
      "Report of Officers Chosen for Term (Form 185) is due June 30. File via Member Management (preferred). Grand Knight owns; Financial Secretary maintains membership/officer records and should nudge. Needed for Star Council. Officers Online screenshots may show July 1; current forms index is June 30. Form 185 plus Form 365 feed Safe Environment Program role setup.",
  },
  {
    heading: "Officers Online reports FS should know",
    sourceRef: "FS Overview V6 Officers Online",
    content:
      "Officers Online Reports include Membership Roster (current plus January 1 and July 1 freezes), Safe Environment Member Status, Safe Environment Participation Rate, Safe Environment Council Compliance, and past Council Billing Statements. Review Safe Environment reports; they are not stored in this companion app. Form 1728 Annual Survey of Fraternal Activity is due January 31 (GK/program owns; FS may nudge).",
  },
];
