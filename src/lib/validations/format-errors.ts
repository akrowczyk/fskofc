import type { ZodError, ZodIssue } from "zod";

const FIELD_LABELS: Record<string, string> = {
  memberNumber: "Member number",
  firstName: "First name",
  lastName: "Last name",
  addressLine1: "Address",
  addressLine2: "Address line 2",
  city: "City",
  state: "State",
  zip: "ZIP",
  phone: "Phone",
  email: "Email",
  contactPref: "Contact preference",
  memberType: "Member type",
  degree: "Degree",
  joinDate: "Join date",
  status: "Status",
  duesRate: "Dues rate",
  notes: "Notes",
  addressRestricted: "Address restricted",
  councilNumber: "Council number",
  councilName: "Council name",
  fiscalYearEnd: "Fiscal year end",
  gkName: "Grand Knight",
  ddName: "District Deputy",
  trusteeNames: "Trustees",
  fromEmail: "From email",
  mailingAddress: "Mailing address",
  compPercent: "Compensation %",
  duesDefault: "Default dues",
  duesUnder26: "Dues under 26",
  bondingNote: "Bonding notes",
  year: "Year",
  duesCollected: "Dues collected",
  insuranceCerts: "Insurance certificates",
  title: "Title",
  detail: "Detail",
  dueDate: "Due date",
  category: "Category",
};

function humanizePath(path: PropertyKey[]): string {
  if (!path.length) return "Form";
  const key = String(path[0]);
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function humanizeIssue(issue: ZodIssue): string {
  const field = humanizePath(issue.path);
  const msg = issue.message;

  // Zod 4 often returns bare "Invalid input" / "Invalid type"
  if (
    !msg ||
    /^invalid input$/i.test(msg) ||
    /^invalid type$/i.test(msg) ||
    /^required$/i.test(msg)
  ) {
    if (issue.code === "invalid_type") {
      const expected = "expected" in issue ? String(issue.expected) : "";
      if (expected === "string" || expected.includes("string")) {
        return `${field} is required.`;
      }
      if (expected.includes("number") || expected === "number") {
        return `${field} must be a number (leave blank if none).`;
      }
      return `${field} has an invalid value.`;
    }
    if (issue.code === "too_small") {
      return `${field} is required or too short.`;
    }
    if (issue.code === "too_big") {
      return `${field} is too long.`;
    }
    if (issue.code === "invalid_format") {
      return `${field} format is invalid.`;
    }
    return `${field} is invalid.`;
  }

  // Already a custom message — prefix with field when path exists
  if (issue.path.length && !msg.toLowerCase().includes(field.toLowerCase())) {
    return `${field}: ${msg}`;
  }
  return msg;
}

/** Turn Zod issues into a single user-facing string (semicolon-separated). */
export function formatZodError(error: ZodError): string {
  const parts = error.issues.map(humanizeIssue);
  // Dedupe while preserving order
  return [...new Set(parts)].join(" · ");
}

/**
 * Empty form fields often arrive as "" — treat as null before number coercion
 * so optional degree / dues don't become 0 and fail min() checks.
 */
export function emptyToNull(value: unknown): unknown {
  if (value === "" || value === undefined) return null;
  return value;
}
