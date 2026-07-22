/**
 * Handbook: tax IDs (incl. last four) are not to be requested or retained
 * at the council level. Reject any write that looks like an SSN / ITIN / EIN.
 *
 * Patterns are intentionally separator-aware to avoid false positives on
 * member numbers (e.g. "10325-0042") and ZIP+4 codes.
 */

/** SSN / ITIN with required separators: XXX-XX-XXXX or XXX XX XXXX */
const SSN_SEPARATED =
  /\b(?!000|666|9\d{2})\d{3}([-\s.])(?!00)\d{2}\1(?!0000)\d{4}\b/;

/** EIN: XX-XXXXXXX (hyphen required) */
const EIN_PATTERN = /\b\d{2}-\d{7}\b/;

/** Explicit label + digits (catches last-four dumps, unseparated IDs, etc.) */
const TAX_ID_LABEL =
  /\b(ssn|social\s*security(?:\s*number)?|tax\s*id(?:entification)?(?:\s*number)?|itin|ein|tin)\b[\s:#=-]*[\dX*]{3,}/i;

/** Unseparated 9-digit ID only when near a tax-related keyword in the same string */
const UNSEPARATED_NINE = /\b\d{9}\b/;
const TAX_KEYWORD = /\b(ssn|social\s*security|tax\s*id|itin|ein|tin)\b/i;

export type PiiGuardResult =
  | { ok: true }
  | { ok: false; reason: string; field?: string };

/**
 * Returns true if the string appears to contain an SSN, ITIN, EIN, or similar.
 */
export function containsTaxId(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;

  if (TAX_ID_LABEL.test(v)) return true;
  if (EIN_PATTERN.test(v)) return true;
  if (SSN_SEPARATED.test(v)) return true;

  // Bare 9 digits only when a tax keyword is also present
  if (TAX_KEYWORD.test(v) && UNSEPARATED_NINE.test(v)) return true;

  return false;
}

/**
 * Scan a bag of string fields (e.g. member notes, form values).
 * Fails on the first suspicious field.
 */
export function rejectTaxIdFields(
  fields: Record<string, string | null | undefined>,
): PiiGuardResult {
  for (const [field, value] of Object.entries(fields)) {
    if (containsTaxId(value)) {
      return {
        ok: false,
        field,
        reason:
          "Tax IDs (SSN, ITIN, EIN, including last-four) must not be stored at the council level. Remove any tax identification numbers and try again.",
      };
    }
  }
  return { ok: true };
}

/** Fields on a member write that must be scanned */
export const MEMBER_PII_SCAN_FIELDS = [
  "firstName",
  "lastName",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zip",
  "phone",
  "email",
  "notes",
  "memberNumber",
] as const;
