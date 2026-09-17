import "server-only";

// Classical Persian library for the copywriter, served live from Ganjoor's
// public API (https://api.ganjoor.net). Every hit comes back verbatim with
// its exact source (poet » book » poem), which is what the Brand Charter's
// quote rule (§2.2) needs. Poets are limited to the Charter's approved list
// (§3); religious references are filtered at the verse level.

const API = "https://api.ganjoor.net/api/ganjoor";

// Ganjoor poet ids for the Charter §3 list.
export const APPROVED_POETS: Record<string, number> = {
  hafez: 2,
  khayyam: 3,
  ferdowsi: 4,
  rumi: 5,
  nezami: 6,
  saadi: 7,
  attar: 9,
  rudaki: 12,
  babataher: 28,
};

// Charter §3: verses with explicit religious references are skipped.
const RELIGIOUS = /قرآن|پیامبر|پیغمبر|رسول|محمد|علی|امام|نماز|حج|کعبه|مسجد|رمضان|روزه|آیه|الله|خدای\s+رحمان|عاشورا|کربلا|زکات|شریعت|شیخ\s+صنعان|کافر|مؤمن/;

export type LibraryHit = {
  poet: string;
  source: string;
  url: string;
  couplets: { fa: string }[];
};

type GanjoorPoem = { id: number; fullTitle: string; fullUrl: string; plainText: string };

async function searchPoet(term: string, poetId: number, pageSize: number): Promise<GanjoorPoem[]> {
  const url = `${API}/poems/search?term=${encodeURIComponent(term)}&PageNumber=1&PageSize=${pageSize}&poetId=${poetId}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { accept: "application/json" } });
  if (!response.ok) return [];
  return (await response.json()) as GanjoorPoem[];
}

/**
 * Couplets from approved poets that contain the term. Only the couplet(s)
 * containing the term plus one neighbour are returned, so the writer quotes
 * a line, not a whole ghazal.
 */
export async function searchLibrary(term: string, poets: string[] = Object.keys(APPROVED_POETS), limit = 6): Promise<LibraryHit[]> {
  const ids = poets.map((poet) => APPROVED_POETS[poet]).filter(Boolean);
  const pages = await Promise.all(ids.map((id) => searchPoet(term, id, 4).catch(() => [])));
  const hits: LibraryHit[] = [];
  for (const poem of pages.flat()) {
    const lines = poem.plainText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    // Ganjoor's plain text lists hemistichs one per line; pair them into couplets.
    const couplets: string[] = [];
    for (let i = 0; i + 1 < lines.length; i += 2) couplets.push(`${lines[i]} / ${lines[i + 1]}`);
    const matched = couplets.filter((couplet) => couplet.includes(term) && !RELIGIOUS.test(couplet));
    if (!matched.length) continue;
    hits.push({
      poet: poem.fullTitle.split(" » ")[0],
      source: poem.fullTitle,
      url: `https://ganjoor.net${poem.fullUrl}`,
      couplets: matched.slice(0, 2).map((fa) => ({ fa })),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}
