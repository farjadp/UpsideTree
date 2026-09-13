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

function audienceFor(tags: Set<string>): Audience {
  if (tags.has("kids' clothing") || tags.has("kids")) return "kids";
  // Unisex apparel is tagged both Men's and Women's; a product has a single
  // collection, so it lives under Men unless it's women-only.
  if (tags.has("men's clothing") || tags.has("unisex")) return "men";
  if (tags.has("women's clothing")) return "women";
  return "men";
}

export function categorySlugForTags(rawTags: string[] | undefined): string | null {
  const tags = new Set((rawTags ?? []).map((tag) => tag.trim().toLowerCase().replace(/[’`]/g, "'")));
  if (tags.size === 0) return null;

  for (const rule of RULES) {
    if (rule.tags.some((tag) => tags.has(tag))) {
      return typeof rule.slug === "function" ? rule.slug(audienceFor(tags)) : rule.slug;
    }
  }

  return MAIN_CATEGORY_TAGS.find(([tag]) => tags.has(tag))?.[1] ?? null;
}

/** Collection id for a Printify product's tags, or null if none fits. */
export async function resolveCategoryId(
  supabase: SupabaseClient,
  tags: string[] | undefined
): Promise<string | null> {
  const slug = categorySlugForTags(tags);
  if (!slug) return null;

  const { data } = await supabase.from("collections").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
