import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Printify has no notion of our category tree, but every product carries
// catalog tags that name its type ("Sweatshirts", "Canvas", "Totes") and,
// for apparel, its audience ("Men's Clothing", "Kids' Clothing"). Those map
// onto the collection slugs seeded by scripts/seed_categories.mjs.

type Rule = { tags: string[]; slug: string | ((audience: Audience) => string) };
type Audience = "men" | "women" | "kids";

const apparel = (type: string) => (audience: Audience) => `${audience}-${type}`;

// First matching rule wins, so more specific types come before broad ones
// (e.g. "Tote" before the generic "Bags").
const RULES: Rule[] = [
  { tags: ["sweatshirts", "crewnecks"], slug: apparel("sweatshirts") },
  { tags: ["hoodies"], slug: apparel("hoodies") },
  { tags: ["long sleeves", "long-sleeves"], slug: apparel("long-sleeves") },
  { tags: ["tank tops"], slug: apparel("tank-tops") },
  { tags: ["t-shirts", "tees"], slug: apparel("t-shirts") },
  { tags: ["canvas"], slug: "home-and-living-canvas" },
  { tags: ["posters"], slug: "home-and-living-posters" },
  { tags: ["mugs", "coffee mugs"], slug: "home-and-living-mugs" },
  { tags: ["stickers", "magnets & stickers", "magnets"], slug: "home-and-living-magnets-stickers" },
  { tags: ["candles"], slug: "home-and-living-candles" },
  { tags: ["ornaments"], slug: "home-and-living-ornaments" },
  { tags: ["tumblers", "bottles & tumblers", "water bottles"], slug: "home-and-living-bottles-tumblers" },
  { tags: ["glassware"], slug: "home-and-living-glassware" },
  { tags: ["postcards"], slug: "home-and-living-postcards" },
  { tags: ["journals", "notebooks", "journals & notebooks"], slug: "home-and-living-journals-notebooks" },
  { tags: ["blankets"], slug: "home-and-living-blankets" },
  { tags: ["pillows", "pillows & covers"], slug: "home-and-living-pillows-covers" },
  { tags: ["towels"], slug: "home-and-living-towels" },
  { tags: ["rugs", "rugs & mats"], slug: "home-and-living-rugs-mats" },
  { tags: ["jewelry"], slug: "accessories-jewelry" },
  { tags: ["phone cases"], slug: "accessories-phone-cases" },
  { tags: ["totes", "bags"], slug: "accessories-bags" },
  { tags: ["hats"], slug: "accessories-hats" },
  { tags: ["socks"], slug: "accessories-socks" },
  { tags: ["mouse pads"], slug: "accessories-mouse-pads" },
];

// Fallback when no type matched: park the product under its main category
// so it's at least browsable there.
const MAIN_CATEGORY_TAGS: Array<[string, string]> = [
  ["kids' clothing", "kids"],
  ["men's clothing", "men"],
  ["women's clothing", "women"],
  ["home & living", "home-and-living"],
  ["accessories", "accessories"],
];

// Apparel audiences, primary first. Unisex apparel (tagged both Men's and
// Women's, or "Unisex") is listed under Men and also appears under Women.
function audiencesFor(tags: Set<string>): Audience[] {
  if (tags.has("kids' clothing") || tags.has("kids")) return ["kids"];
  const men = tags.has("men's clothing");
  const women = tags.has("women's clothing");
  if ((men && women) || tags.has("unisex")) return ["men", "women"];
  if (women) return ["women"];
  return ["men"];
}

export type CategorySlugs = { primary: string; additional: string[] };

export function categorySlugsForTags(rawTags: string[] | undefined): CategorySlugs | null {
  const tags = new Set((rawTags ?? []).map((tag) => tag.trim().toLowerCase().replace(/[’`]/g, "'")));
  if (tags.size === 0) return null;

  for (const rule of RULES) {
    if (!rule.tags.some((tag) => tags.has(tag))) continue;
    if (typeof rule.slug === "string") return { primary: rule.slug, additional: [] };
    const [primary, ...rest] = audiencesFor(tags).map(rule.slug);
    return { primary, additional: rest };
  }

  const main = MAIN_CATEGORY_TAGS.find(([tag]) => tags.has(tag))?.[1];
  return main ? { primary: main, additional: [] } : null;
}

export type CategoryIds = { primaryId: string; additionalIds: string[] };

/** Collection ids for a Printify product's tags, or null if none fits. */
export async function resolveCategoryIds(
  supabase: SupabaseClient,
  tags: string[] | undefined
): Promise<CategoryIds | null> {
  const slugs = categorySlugsForTags(tags);
  if (!slugs) return null;

  const all = [slugs.primary, ...slugs.additional];
  const { data } = await supabase.from("collections").select("id, slug").in("slug", all);
  const idBySlug = new Map((data ?? []).map((row) => [row.slug as string, row.id as string]));

  const primaryId = idBySlug.get(slugs.primary);
  if (!primaryId) return null;
  return {
    primaryId,
    additionalIds: slugs.additional.map((slug) => idBySlug.get(slug)).filter((id): id is string => Boolean(id)),
  };
}
