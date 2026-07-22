import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseRosterWorkbook } from "./import";

function makeXlsx(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Roster");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseRosterWorkbook", () => {
  it("maps standard headers and * restriction flag", () => {
    const buf = makeXlsx([
      {
        "Member Number": "1234567",
        "First Name": "Joseph*",
        "Last Name": "Smith",
        Address: "100 Main St*",
        City: "Wood Dale",
        State: "IL",
        Zip: "60191",
        Type: "Insurance",
        Status: "Active",
      },
      {
        "Member Number": "7654321",
        "First Name": "Patrick",
        "Last Name": "Murphy",
        Email: "pm@example.com",
        Phone: "630-555-0100",
      },
    ]);

    const result = parseRosterWorkbook(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].memberNumber).toBe("1234567");
    expect(result.rows[0].firstName).toBe("Joseph");
    expect(result.rows[0].addressRestricted).toBe(true);
    expect(result.rows[0].memberType).toBe("insurance");
    expect(result.rows[1].email).toBe("pm@example.com");
    expect(result.rows[1].addressRestricted).toBe(false);
  });

  it("parses Last, First name column", () => {
    const buf = makeXlsx([
      {
        "Membership Number": "999",
        Name: "McGivney, Michael",
      },
    ]);
    const result = parseRosterWorkbook(buf);
    expect(result.rows[0].lastName).toBe("McGivney");
    expect(result.rows[0].firstName).toBe("Michael");
  });
});
