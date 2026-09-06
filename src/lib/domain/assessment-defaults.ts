/**
 * 2009 handbook defaults — treat as configurable seeds, not gospel.
 * UI must show "verify against current Supreme Council figures."
 */
export const ASSESSMENT_DEFAULTS_2009 = [
  {
    kind: "per_capita" as const,
    amount: "1.75",
    label: "Per Capita Tax",
    levyDates: "Jan 1 & Jul 1",
    payBy: "Apr 10 / Oct 10",
  },
  {
    kind: "catholic_adv" as const,
    amount: "0.50",
    label: "Catholic Advertising",
    levyDates: "Jan 1 & Jul 1",
    payBy: "Apr 10 / Oct 10",
  },
  {
    kind: "culture_of_life" as const,
    amount: "1.00",
    label: "Culture of Life",
    levyDates: "Jan 1 & Jul 1",
    payBy: "Apr 10 / Oct 10",
  },
] as const;

/** Handbook: automatic council suspension when arrearage ≥ this on any account */
export const COUNCIL_ARREARAGE_SUSPENSION_THRESHOLD = 50;

/** 100-day grace per levy (Section 156) */
export const LEVY_GRACE_DAYS = 100;

/** Supreme insurance-certificate FS compensation (handbook $0.40) */
export const SUPREME_CERT_COMP = 0.4;

/** 1099-MISC threshold */
export const FORM_1099_THRESHOLD = 599.99;

/** IRS 990-N (e-Postcard) gross-receipts ceiling — training 2024 / current IRS */
export const IRS_990N_GROSS_RECEIPTS = 50_000;

/** 990-EZ vs full Form 990 (from IRS 990-EZ instructions; verify current) */
export const IRS_990EZ_GROSS_RECEIPTS = 200_000;
export const IRS_990EZ_TOTAL_ASSETS = 500_000;
