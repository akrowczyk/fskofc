/**
 * Annual Council Audit Worksheet (form 1295A 8/25) — prep only.
 * File the official report in Officers Online. Do not mail this worksheet to Supreme.
 */
import { parseCouncilEin } from "./ein";

export const AUDIT_WORKSHEET_VERSION = "1295A" as const;

/** Period ending June 30, YYYY — due August 15 of the same year. */
export const AUDIT_1295A_DUE_MONTH = 8;
export const AUDIT_1295A_DUE_DAY = 15;
export const AUDIT_1295A_PERIOD_END_MONTH = 6;
export const AUDIT_1295A_PERIOD_END_DAY = 30;

export type YesNo = "yes" | "no" | "";

export type MoneyField = {
  key: string;
  label: string;
  hint?: string;
};

export const CURRENT_ASSET_FIELDS = [
  { key: "undepositedMoney", label: "Undeposited Money" },
  { key: "savingsAccount", label: "Savings Account" },
  { key: "checkingAccount", label: "Checking Account" },
  { key: "moneyMarketAccounts", label: "Money Market Accounts" },
  {
    key: "electronicPaymentsUndeposited",
    label: "Electronic Payments Undeposited",
    hint: "Square, PayPal, Venmo, etc.",
  },
  { key: "creditCardBalance", label: "Credit Card Balance" },
  { key: "other1", label: "Other" },
  { key: "other2", label: "Other" },
] as const satisfies readonly MoneyField[];

export const LIABILITY_FIELDS = [
  { key: "unpaidBills", label: "Unpaid Bills" },
  { key: "uncashedChecks", label: "Uncashed Checks" },
  { key: "unpaidCreditCard", label: "Unpaid Credit Card Balance" },
  { key: "loansDebt", label: "Loans/Debt Repayment" },
  { key: "other1", label: "Other" },
  { key: "other2", label: "Other" },
  { key: "other3", label: "Other" },
  { key: "other4", label: "Other" },
] as const satisfies readonly MoneyField[];

export const INVESTMENT_FIELDS = [
  { key: "mutualFunds", label: "Mutual Funds" },
  { key: "cdsBonds", label: "CDs & Bonds" },
  { key: "other1", label: "Other" },
  { key: "other2", label: "Other" },
] as const satisfies readonly MoneyField[];

export const PROPERTY_FIELDS = [
  { key: "realEstate", label: "Real Estate" },
  { key: "vehicles", label: "Vehicles (inc. Trailers)" },
  { key: "largeEquipment", label: "Large Equipment" },
  { key: "other1", label: "Other" },
  { key: "other2", label: "Other" },
  { key: "other3", label: "Other" },
] as const satisfies readonly MoneyField[];

export const INCOMING_FIELDS = [
  { key: "eventRevenues", label: "Event Revenues" },
  { key: "dues", label: "Dues" },
  {
    key: "incomingDonations",
    label: "Incoming Donations",
    hint: "Excluding donations from the KCCF Council Account",
  },
  { key: "investmentIncome", label: "Investment Income" },
  { key: "interestEarned", label: "Interest Earned" },
  { key: "other1", label: "Other" },
  { key: "other2", label: "Other" },
  { key: "other3", label: "Other" },
] as const satisfies readonly MoneyField[];

export const OUTGOING_FIELDS = [
  {
    key: "perCapitaAssessments",
    label: "State and Supreme Per Capita Assessments",
  },
  { key: "donationsOut", label: "Donations Out" },
  { key: "supplies", label: "Supplies" },
  { key: "programExpenses", label: "Program Expenses" },
  { key: "eventExpenses", label: "Event Expenses" },
  { key: "councilInsurancePremiums", label: "Council Insurance Premiums" },
  { key: "other1", label: "Other" },
  { key: "other2", label: "Other" },
] as const satisfies readonly MoneyField[];

export type MoneyMap<T extends readonly { key: string }[]> = Record<
  T[number]["key"],
  number
>;

export const DEFAULT_AUDIT_CHECKLIST: Record<string, boolean> = {
  "Turned over all cash to Treasurer (do not hold money on Jun 30)": false,
  "FS report of receipts for the period": false,
  "FS report of vouchers (Member Billing / Print Center; FS + GK signed)": false,
  "Paper copies of transactions": false,
  "Treasurer ledger and/or register": false,
  "Treasurer receipt books": false,
  "Bank statements for the period": false,
  "Council Statement copies": false,
  "Member Billing / dues records (MM/MB)": false,
  "Prior annual audit on file at Supreme": false,
  "Bonding status confirmation": false,
  "Audit meeting scheduled with trustees": false,
  "GK + at least 2 of 3 trustees will sign": false,
  "Copy for council file": false,
  "Ready to enter in Officers Online (do not mail worksheet to Supreme)": false,
};

export type AuditReviewers = {
  grandKnight: boolean;
  trustee1: boolean;
  trustee2: boolean;
  trustee3: boolean;
  treasurer: boolean;
  financialSecretary: boolean;
};

export type AuditDistributionEmails = {
  trustee1: string;
  trustee2: string;
  trustee3: string;
  treasurer: string;
  financialSecretary: string;
  districtDeputy: string;
};

export type Audit1295AWorksheet = {
  version: typeof AUDIT_WORKSHEET_VERSION;
  periodEndingYear: number;
  jurisdiction: string;
  hasKccfAccount: YesNo;
  ein: string;
  form990Filed: YesNo;
  currentAssets: MoneyMap<typeof CURRENT_ASSET_FIELDS>;
  currentAssetOtherNote: string;
  liabilities: MoneyMap<typeof LIABILITY_FIELDS>;
  liabilityOtherNote: string;
  investments: MoneyMap<typeof INVESTMENT_FIELDS>;
  investmentOtherNote: string;
  property: MoneyMap<typeof PROPERTY_FIELDS>;
  propertyOtherNote: string;
  cashOnHandBegin: number;
  incoming: MoneyMap<typeof INCOMING_FIELDS>;
  incomingOtherNote: string;
  outgoing: MoneyMap<typeof OUTGOING_FIELDS>;
  outgoingOtherNote: string;
  cashOnHandEnd: number;
  kccfBegin: number;
  kccfContributions: number;
  kccfGrants: number;
  comments: string;
  reviewedBy: AuditReviewers;
  distributionEmails: AuditDistributionEmails;
  submittedByFirstName: string;
  submittedByLastName: string;
  submittedByEmail: string;
};

export type WorksheetTotals = {
  currentAssets: number;
  liabilities: number;
  investments: number;
  property: number;
  otherAssets: number;
  incoming: number;
  outgoing: number;
};

export type EmptyWorksheetOpts = {
  year?: number;
  ein?: string | null;
  jurisdiction?: string | null;
  gkName?: string | null;
  fromEmail?: string | null;
};

export function defaultAuditPeriodYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function auditPeriodLabel(year: number): string {
  return `Period ending June 30, ${year}`;
}

export function emptyMoney<const T extends readonly { key: string }[]>(
  fields: T,
): MoneyMap<T> {
  return Object.fromEntries(fields.map((f) => [f.key, 0])) as MoneyMap<T>;
}

export function sumMoney(values: Record<string, number>): number {
  return round2(
    Object.values(values).reduce((s, n) => s + (Number(n) || 0), 0),
  );
}

export function emptyWorksheet(
  opts: EmptyWorksheetOpts = {},
): Audit1295AWorksheet {
  const year = opts.year ?? defaultAuditPeriodYear();
  const gk = splitName(opts.gkName);
  return {
    version: AUDIT_WORKSHEET_VERSION,
    periodEndingYear: year,
    jurisdiction: opts.jurisdiction?.trim() || "Illinois",
    hasKccfAccount: "",
    ein: opts.ein?.trim() || "",
    form990Filed: "",
    currentAssets: emptyMoney(CURRENT_ASSET_FIELDS),
    currentAssetOtherNote: "",
    liabilities: emptyMoney(LIABILITY_FIELDS),
    liabilityOtherNote: "",
    investments: emptyMoney(INVESTMENT_FIELDS),
    investmentOtherNote: "",
    property: emptyMoney(PROPERTY_FIELDS),
    propertyOtherNote: "",
    cashOnHandBegin: 0,
    incoming: emptyMoney(INCOMING_FIELDS),
    incomingOtherNote: "",
    outgoing: emptyMoney(OUTGOING_FIELDS),
    outgoingOtherNote: "",
    cashOnHandEnd: 0,
    kccfBegin: 0,
    kccfContributions: 0,
    kccfGrants: 0,
    comments: "",
    reviewedBy: {
      grandKnight: false,
      trustee1: false,
      trustee2: false,
      trustee3: false,
      treasurer: false,
      financialSecretary: false,
    },
    distributionEmails: {
      trustee1: "",
      trustee2: "",
      trustee3: "",
      treasurer: "",
      financialSecretary: opts.fromEmail?.trim() || "",
      districtDeputy: "",
    },
    submittedByFirstName: gk.first,
    submittedByLastName: gk.last,
    submittedByEmail: "",
  };
}

export function coerceWorksheet(
  raw: unknown,
  opts: EmptyWorksheetOpts = {},
): Audit1295AWorksheet {
  const base = emptyWorksheet(opts);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== AUDIT_WORKSHEET_VERSION) return base;

  return {
    ...base,
    periodEndingYear: num(obj.periodEndingYear, base.periodEndingYear),
    jurisdiction: str(obj.jurisdiction, base.jurisdiction),
    hasKccfAccount: yesNo(obj.hasKccfAccount),
    ein: str(obj.ein, base.ein),
    form990Filed: yesNo(obj.form990Filed),
    currentAssets: mergeMoney(CURRENT_ASSET_FIELDS, obj.currentAssets, base.currentAssets),
    currentAssetOtherNote: str(obj.currentAssetOtherNote),
    liabilities: mergeMoney(LIABILITY_FIELDS, obj.liabilities, base.liabilities),
    liabilityOtherNote: str(obj.liabilityOtherNote),
    investments: mergeMoney(INVESTMENT_FIELDS, obj.investments, base.investments),
    investmentOtherNote: str(obj.investmentOtherNote),
    property: mergeMoney(PROPERTY_FIELDS, obj.property, base.property),
    propertyOtherNote: str(obj.propertyOtherNote),
    cashOnHandBegin: num(obj.cashOnHandBegin),
    incoming: mergeMoney(INCOMING_FIELDS, obj.incoming, base.incoming),
    incomingOtherNote: str(obj.incomingOtherNote),
    outgoing: mergeMoney(OUTGOING_FIELDS, obj.outgoing, base.outgoing),
    outgoingOtherNote: str(obj.outgoingOtherNote),
    cashOnHandEnd: num(obj.cashOnHandEnd),
    kccfBegin: num(obj.kccfBegin),
    kccfContributions: num(obj.kccfContributions),
    kccfGrants: num(obj.kccfGrants),
    comments: str(obj.comments),
    reviewedBy: {
      ...base.reviewedBy,
      ...(isRecord(obj.reviewedBy)
        ? {
            grandKnight: Boolean(obj.reviewedBy.grandKnight),
            trustee1: Boolean(obj.reviewedBy.trustee1),
            trustee2: Boolean(obj.reviewedBy.trustee2),
            trustee3: Boolean(obj.reviewedBy.trustee3),
            treasurer: Boolean(obj.reviewedBy.treasurer),
            financialSecretary: Boolean(obj.reviewedBy.financialSecretary),
          }
        : {}),
    },
    distributionEmails: {
      ...base.distributionEmails,
      ...(isRecord(obj.distributionEmails)
        ? {
            trustee1: str(obj.distributionEmails.trustee1),
            trustee2: str(obj.distributionEmails.trustee2),
            trustee3: str(obj.distributionEmails.trustee3),
            treasurer: str(obj.distributionEmails.treasurer),
            financialSecretary: str(obj.distributionEmails.financialSecretary),
            districtDeputy: str(obj.distributionEmails.districtDeputy),
          }
        : {}),
    },
    submittedByFirstName: str(obj.submittedByFirstName, base.submittedByFirstName),
    submittedByLastName: str(obj.submittedByLastName, base.submittedByLastName),
    submittedByEmail: str(obj.submittedByEmail),
  };
}

export function worksheetTotals(w: Audit1295AWorksheet): WorksheetTotals {
  const investments = sumMoney(w.investments);
  const property = sumMoney(w.property);
  return {
    currentAssets: sumMoney(w.currentAssets),
    liabilities: sumMoney(w.liabilities),
    investments,
    property,
    otherAssets: round2(investments + property),
    incoming: sumMoney(w.incoming),
    outgoing: sumMoney(w.outgoing),
  };
}

export function mergeChecklist(
  saved: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const next = { ...DEFAULT_AUDIT_CHECKLIST };
  if (!saved) return next;
  for (const key of Object.keys(next)) {
    if (typeof saved[key] === "boolean") next[key] = saved[key];
  }
  return next;
}

/** Scan free-text worksheet fields for member tax IDs; validate council EIN separately. */
export function worksheetPiiFields(
  w: Audit1295AWorksheet,
): Record<string, string> {
  return {
    jurisdiction: w.jurisdiction,
    currentAssetOtherNote: w.currentAssetOtherNote,
    liabilityOtherNote: w.liabilityOtherNote,
    investmentOtherNote: w.investmentOtherNote,
    propertyOtherNote: w.propertyOtherNote,
    incomingOtherNote: w.incomingOtherNote,
    outgoingOtherNote: w.outgoingOtherNote,
    comments: w.comments,
    submittedByFirstName: w.submittedByFirstName,
    submittedByLastName: w.submittedByLastName,
    submittedByEmail: w.submittedByEmail,
    ...w.distributionEmails,
  };
}

export function validateWorksheetEin(w: Audit1295AWorksheet) {
  return parseCouncilEin(w.ein);
}

function mergeMoney<const T extends readonly { key: string }[]>(
  fields: T,
  raw: unknown,
  fallback: MoneyMap<T>,
): MoneyMap<T> {
  if (!isRecord(raw)) return fallback;
  const next = { ...fallback };
  for (const f of fields) {
    const key = f.key as T[number]["key"];
    if (key in raw) next[key] = num(raw[key]);
  }
  return next;
}

function yesNo(v: unknown): YesNo {
  return v === "yes" || v === "no" ? v : "";
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function splitName(name: string | null | undefined): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
