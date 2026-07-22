/**
 * Parse weekly KofC roster Excel export into member mirror rows.
 * Column names vary slightly by export version — map flexibly.
 */
import * as XLSX from "xlsx";

export type RosterImportRow = {
  memberNumber: string;
  firstName: string;
  lastName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  memberType?:
    | "associate"
    | "insurance"
    | "inactive"
    | "honorary"
    | "honorary_life"
    | "disabled";
  degree?: number | null;
  joinDate?: string | null;
  status?: "active" | "suspended" | "withdrawn" | "deceased" | "transferred";
  addressRestricted: boolean;
  raw?: Record<string, unknown>;
};

export type RosterParseResult = {
  rows: RosterImportRow[];
  skipped: number;
  warnings: string[];
};

function normKey(k: string): string {
  return k
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Map various roster header labels → canonical field */
const FIELD_ALIASES: Record<string, keyof RosterImportRow | "name" | "fullAddress"> = {
  "member number": "memberNumber",
  "member no": "memberNumber",
  "member #": "memberNumber",
  membership: "memberNumber",
  "membership number": "memberNumber",
  "kofc number": "memberNumber",
  "first name": "firstName",
  firstname: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  surname: "lastName",
  name: "name",
  "street address": "addressLine1",
  address: "addressLine1",
  "address 1": "addressLine1",
  "address line 1": "addressLine1",
  "address 2": "addressLine2",
  "address line 2": "addressLine2",
  city: "city",
  state: "state",
  zip: "zip",
  "zip code": "zip",
  postal: "zip",
  phone: "phone",
  "home phone": "phone",
  "cell phone": "phone",
  mobile: "phone",
  email: "email",
  "e mail": "email",
  "email address": "email",
  type: "memberType",
  "member type": "memberType",
  class: "memberType",
  degree: "degree",
  "join date": "joinDate",
  "date joined": "joinDate",
  status: "status",
};

function pick(row: Record<string, unknown>, field: string): string | null {
  const target = normKey(field);
  for (const [k, v] of Object.entries(row)) {
    if (normKey(k) === target && v != null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  // alias scan
  for (const [k, v] of Object.entries(row)) {
    const alias = FIELD_ALIASES[normKey(k)];
    if (alias === field && v != null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return null;
}

function mapMemberType(
  raw: string | null,
): RosterImportRow["memberType"] | undefined {
  if (!raw) return undefined;
  const t = raw.toLowerCase();
  if (t.includes("honorary life") || t.includes("hon life"))
    return "honorary_life";
  if (t.includes("honorary") || t.includes("hon.")) return "honorary";
  if (t.includes("inactive")) return "inactive";
  if (t.includes("insur")) return "insurance";
  if (t.includes("disab")) return "disabled";
  if (t.includes("assoc")) return "associate";
  return undefined;
}

function mapStatus(raw: string | null): RosterImportRow["status"] | undefined {
  if (!raw) return undefined;
  const t = raw.toLowerCase();
  if (t.includes("susp")) return "suspended";
  if (t.includes("withdr") || t.includes("resign")) return "withdrawn";
  if (t.includes("deceas") || t.includes("death")) return "deceased";
  if (t.includes("transf")) return "transferred";
  if (t.includes("active") || t.includes("good")) return "active";
  return undefined;
}

function parseName(name: string): { firstName: string; lastName: string } {
  // "Last, First" or "First Last"
  if (name.includes(",")) {
    const [last, rest] = name.split(",").map((s) => s.trim());
    return { lastName: last || "Unknown", firstName: rest || "Unknown" };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Detect address-restricted flag: roster uses trailing "*" on address or name.
 */
function isRestricted(row: Record<string, unknown>): boolean {
  for (const v of Object.values(row)) {
    if (typeof v === "string" && (v.trim().endsWith("*") || v.includes(" *"))) {
      return true;
    }
  }
  return false;
}

function stripStar(s: string | null): string | null {
  if (!s) return s;
  return s.replace(/\s*\*\s*$/, "").trim() || null;
}

export function parseRosterWorkbook(
  buffer: ArrayBuffer | Buffer,
): RosterParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], skipped: 0, warnings: ["Workbook has no sheets"] };
  }
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows: RosterImportRow[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  for (let i = 0; i < json.length; i++) {
    const raw = json[i];
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[normKey(k)] = v;
    }

    let memberNumber: string | null =
      pick(raw, "memberNumber") ??
      pick(raw, "member number") ??
      (typeof normalized["member number"] === "string"
        ? String(normalized["member number"]).trim() || null
        : null) ??
      (typeof normalized["membership number"] === "string"
        ? String(normalized["membership number"]).trim() || null
        : null);

    let firstName: string | null =
      pick(raw, "firstName") ?? pick(raw, "first name");
    let lastName: string | null =
      pick(raw, "lastName") ?? pick(raw, "last name");

    if ((!firstName || !lastName) && pick(raw, "name")) {
      const parsed = parseName(pick(raw, "name")!);
      firstName = firstName ?? parsed.firstName;
      lastName = lastName ?? parsed.lastName;
    }

    // Fallback: first two string columns if headers unknown
    if (!memberNumber) {
      const values = Object.values(raw).map((v) => String(v ?? "").trim());
      memberNumber = values[0] ? values[0] : null;
      if (!firstName && !lastName && values[1]) {
        const parsed = parseName(values[1]);
        firstName = parsed.firstName;
        lastName = parsed.lastName;
      }
    }

    if (!memberNumber || !firstName || !lastName) {
      skipped++;
      continue;
    }

    const restricted = isRestricted(raw);

    rows.push({
      memberNumber: String(memberNumber).replace(/\s*\*$/, "").trim(),
      firstName: stripStar(firstName) ?? firstName,
      lastName: stripStar(lastName) ?? lastName,
      addressLine1: stripStar(pick(raw, "addressLine1") ?? pick(raw, "address")),
      addressLine2: stripStar(pick(raw, "addressLine2")),
      city: stripStar(pick(raw, "city")),
      state: stripStar(pick(raw, "state")),
      zip: stripStar(pick(raw, "zip") ?? pick(raw, "zip code")),
      phone: stripStar(pick(raw, "phone")),
      email: stripStar(pick(raw, "email")),
      memberType: mapMemberType(pick(raw, "memberType") ?? pick(raw, "type")),
      degree: (() => {
        const d = pick(raw, "degree");
        if (!d) return null;
        const n = parseInt(d, 10);
        return Number.isFinite(n) ? n : null;
      })(),
      joinDate: pick(raw, "joinDate") ?? pick(raw, "join date"),
      status: mapStatus(pick(raw, "status")) ?? "active",
      addressRestricted: restricted,
      raw,
    });
  }

  if (rows.length === 0 && json.length > 0) {
    warnings.push(
      "No rows mapped. Check that the export has member number and name columns.",
    );
  }

  return { rows, skipped, warnings };
}
