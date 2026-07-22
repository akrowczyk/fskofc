import {
  FORM_1099_THRESHOLD,
  SUPREME_CERT_COMP,
} from "./assessment-defaults";

export type CompInput = {
  duesCollected: number;
  compPercent: number; // 8–10
  insuranceCerts: number;
  waived?: boolean;
};

export type CompResult = {
  compFromCouncil: number;
  compFromSupreme: number;
  total: number;
  form1099Expected: boolean;
  note: string;
};

/**
 * FS compensation: 8–10% of dues collected (council) + $0.40/cert (Supreme).
 * Not initiation fees or other receipts. Waivable at FS discretion.
 */
export function calculateCompensation(input: CompInput): CompResult {
  const pct = Math.min(10, Math.max(8, input.compPercent));
  const council = input.waived
    ? 0
    : round2((input.duesCollected * pct) / 100);
  const supreme = round2(input.insuranceCerts * SUPREME_CERT_COMP);
  const total = round2(council + supreme);
  return {
    compFromCouncil: council,
    compFromSupreme: supreme,
    total,
    form1099Expected: total > FORM_1099_THRESHOLD,
    note: input.waived
      ? "Council portion waived by FS."
      : `Council ${pct}% of dues only; Supreme $${SUPREME_CERT_COMP}/cert.`,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const DEFAULT_AUDIT_CHECKLIST: Record<string, boolean> = {
  "Member Billing ledgers / dues records": false,
  "Receipts and vouchers for period": false,
  "Order on Treasurer (#157) copies": false,
  "Bank statements (Treasurer)": false,
  "Council Statement copies": false,
  "Minutes / Recorder reports as needed": false,
  "Frozen roster (Jan 1 or Jul 1)": false,
  "Bonding status confirmation": false,
  "Prior audit #1295 copy": false,
};

export type ScheduleBLine = { label: string; amount: number };
export type ScheduleCLine = { label: string; amount: number };

export function sumSchedule(lines: ScheduleBLine[]): number {
  return round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0));
}
