import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { kbChunks, kbDocuments } from "@/db/schema";
import { HANDBOOK_SEED_CHUNKS } from "./handbook-seed";

export type RetrievedPassage = {
  heading: string;
  content: string;
  sourceRef: string;
  score: number;
};

/**
 * Ensure seed handbook chunks exist. Replaces chunks when SEED_REF changes.
 */
const SEED_TITLE = "FS Handbook (seed excerpts)";
const SEED_REF =
  "1295A 8/25 + FS Overview V6 + Form 365 due 6/30 + financial officer training 2024 + handbook domain rules";

export async function ensureHandbookSeeded(): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ id: kbDocuments.id, sourceRef: kbDocuments.sourceRef })
    .from(kbDocuments)
    .where(eq(kbDocuments.title, SEED_TITLE))
    .limit(1);

  if (existing[0]?.sourceRef === SEED_REF) return;

  let docId = existing[0]?.id;
  if (docId) {
    await db.delete(kbChunks).where(eq(kbChunks.documentId, docId));
    await db
      .update(kbDocuments)
      .set({ sourceRef: SEED_REF, ingestedAt: new Date() })
      .where(eq(kbDocuments.id, docId));
  } else {
    const [doc] = await db
      .insert(kbDocuments)
      .values({
        title: SEED_TITLE,
        sourceType: "handbook",
        sourceRef: SEED_REF,
      })
      .returning({ id: kbDocuments.id });
    docId = doc.id;
  }

  await db.insert(kbChunks).values(
    HANDBOOK_SEED_CHUNKS.map((c, i) => ({
      documentId: docId,
      chunkIndex: i,
      heading: c.heading,
      content: c.content,
      tokenCount: Math.ceil(c.content.length / 4),
    })),
  );
}

/**
 * Hybrid-ish retrieval: keyword scoring over chunk text (Voyage vectors optional later).
 */
export async function searchHandbook(
  query: string,
  topK = 6,
): Promise<RetrievedPassage[]> {
  await ensureHandbookSeeded();
  const db = getDb();
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

  const rows = await db
    .select({
      heading: kbChunks.heading,
      content: kbChunks.content,
      sourceRef: kbDocuments.sourceRef,
      documentTitle: kbDocuments.title,
    })
    .from(kbChunks)
    .innerJoin(kbDocuments, eq(kbChunks.documentId, kbDocuments.id))
    .orderBy(desc(kbChunks.chunkIndex))
    .limit(200);

  const scored = rows.map((r) => {
    const text = `${r.heading ?? ""} ${r.content}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (text.includes(t)) score += 1;
      if ((r.heading ?? "").toLowerCase().includes(t)) score += 2;
    }
    // phrase boost
    if (query.length > 4 && text.includes(query.toLowerCase())) score += 5;
    return {
      heading: r.heading ?? r.documentTitle,
      content: r.content,
      sourceRef: r.sourceRef ?? r.documentTitle,
      score,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Offline fallback when DB unavailable */
export function searchHandbookLocal(query: string, topK = 6): RetrievedPassage[] {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  return HANDBOOK_SEED_CHUNKS.map((c) => {
    const text = `${c.heading} ${c.content}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (text.includes(t)) score += 1;
      if (c.heading.toLowerCase().includes(t)) score += 2;
    }
    return {
      heading: c.heading,
      content: c.content,
      sourceRef: c.sourceRef,
      score,
    };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
