/**
 * Council EIN (organizational). Store only in dedicated settings / 1295A fields.
 * Member SSNs and other tax IDs remain forbidden everywhere else.
 */

export const COUNCIL_EIN_PATTERN = /^\d{2}-\d{7}$/;

export function parseCouncilEin(
  value: string | null | undefined,
): { ok: true; ein: string | null } | { ok: false; error: string } {
  const v = (value ?? "").trim();
  if (!v) return { ok: true, ein: null };
  if (!COUNCIL_EIN_PATTERN.test(v)) {
    return {
      ok: false,
      error: "Council EIN must look like 12-3456789 (two digits, hyphen, seven digits).",
    };
  }
  return { ok: true, ein: v };
}
