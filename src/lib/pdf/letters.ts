import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderLetterBody } from "@/lib/email/templates";
import type { Member } from "@/db/schema";

export type LetterTemplate = "423" | "424" | "KA1" | "1845" | "welcome";

/**
 * Address-merged printable letter PDF (supplemental / personal-contact record).
 * Not a Supreme filing.
 */
export async function buildLetterPdf(
  template: LetterTemplate,
  member: Member,
  opts?: { councilName?: string; amount?: string; gkName?: string },
): Promise<Uint8Array> {
  const { title, body } = renderLetterBody(template, member, opts);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]); // US Letter
  const margin = 54;
  let y = 742;

  const draw = (text: string, size: number, f = font) => {
    const lines = wrapText(text, 90);
    for (const line of lines) {
      if (y < 72) {
        page = doc.addPage([612, 792]);
        y = 742;
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: f,
        color: rgb(0.05, 0.1, 0.2),
      });
      y -= size + 6;
    }
  };

  page.drawText("Knights of Columbus — Council use only", {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.45),
  });
  y -= 20;
  draw(title, 14, bold);
  y -= 8;
  draw(
    "SUPPLEMENTAL DRAFT — verify and file official forms via Member Management / Member Billing as required.",
    8,
  );
  y -= 12;
  draw(body, 11);
  y -= 24;
  draw(
    `Generated ${new Date().toISOString().slice(0, 10)} · FS Companion (not a system of record)`,
    8,
  );

  return doc.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      out.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (next.length > maxChars) {
        if (line) out.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out;
}
