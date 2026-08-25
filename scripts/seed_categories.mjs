// ============================================================================
// File: scripts/seed_categories.mjs
// Why: Rebuild the collections table as a Printify-style category tree:
//      5 main categories (Men, Women, Kids, Accessories, Home and Living),
//      each with subcategories. Deletes ALL existing collections first
//      (approved fresh start) and remaps the live products onto the new
//      subcategories so nothing is left orphaned.
//
// Requires: supabase/migrations/20260824000001_collections_parent_id.sql
// Run:      node scripts/seed_categories.mjs
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ------------------------------------------------------------------
// Taxonomy (EN/FA). Sub slugs are prefixed with the parent slug since
// collections.slug is globally UNIQUE (Sweatshirts exists under both
// Men and Women).
// ------------------------------------------------------------------

const TAXONOMY = [
  {
    slug: "men",
    name_en: "Men",
    name_fa: "مردانه",
    description_en: "Menswear carrying the weight of three millennia — heavyweight tees, hoodies, and layers marked with Persian geometry and script.",
    description_fa: "پوشاک مردانه با میراث سه‌هزارساله — تی‌شرت، هودی و لایه‌هایی با نقوش و خط ایرانی.",
    story_en: "Worn history. Cut for the present.",
    story_fa: "تاریخِ پوشیدنی، بریده‌شده برای امروز.",
    color_palette: ["#1D4E89", "#18231F", "#F4EFE3"],
    children: [
      ["sweatshirts", "Sweatshirts", "سویشرت"],
      ["hoodies", "Hoodies", "هودی"],
      ["t-shirts", "T-shirts", "تی‌شرت"],
      ["long-sleeves", "Long Sleeves", "آستین‌بلند"],
      ["tank-tops", "Tank Tops", "تاپ رکابی"],
      ["sportswear", "Sportswear", "لباس ورزشی"],
      ["bottoms", "Bottoms", "شلوار"],
      ["swimwear", "Swimwear", "لباس شنا"],
      ["shoes", "Shoes", "کفش"],
      ["outerwear", "Outerwear", "بیرون‌پوش"],
    ],
  },
  {
    slug: "women",
    name_en: "Women",
    name_fa: "زنانه",
    description_en: "Womenswear where Simorgh feathers, calligraphy, and lapis geometry meet contemporary silhouettes.",
    description_fa: "پوشاک زنانه؛ جایی که پر سیمرغ، خوشنویسی و هندسه لاجوردی به فرم‌های امروزی می‌رسند.",
    story_en: "Grace inherited, worn anew.",
    story_fa: "وقاری موروثی، با پوششی نو.",
    color_palette: ["#8C2F39", "#B48635", "#F4EFE3"],
    children: [
      ["sweatshirts", "Sweatshirts", "سویشرت"],
      ["t-shirts", "T-shirts", "تی‌شرت"],
      ["hoodies", "Hoodies", "هودی"],
      ["long-sleeves", "Long Sleeves", "آستین‌بلند"],
      ["tank-tops", "Tank Tops", "تاپ رکابی"],
      ["skirts-dresses", "Skirts & Dresses", "دامن و پیراهن"],
      ["sportswear", "Sportswear", "لباس ورزشی"],
      ["bottoms", "Bottoms", "شلوار"],
      ["swimwear", "Swimwear", "لباس شنا"],
      ["shoes", "Shoes", "کفش"],
      ["outerwear", "Outerwear", "بیرون‌پوش"],
    ],
  },
  {
    slug: "kids",
    name_en: "Kids",
    name_fa: "بچگانه",
    description_en: "Passing the stories of Shahnameh to the next generation — soft, playful pieces for little heirs of a long story.",
    description_fa: "انتقال داستان‌های شاهنامه به نسل بعد — لباس‌هایی نرم و شاد برای وارثان کوچک یک قصه بلند.",
    story_en: "Small clothes. A very old story.",
    story_fa: "جامه‌های کوچک، قصه‌ای بسیار کهن.",
    color_palette: ["#1F8A8A", "#B48635", "#F4EFE3"],
    children: [
      ["t-shirts", "T-shirts", "تی‌شرت"],
      ["long-sleeves", "Long Sleeves", "آستین‌بلند"],
      ["sweatshirts", "Sweatshirts", "سویشرت"],
      ["baby-clothing", "Baby Clothing", "لباس نوزاد"],
      ["sportswear", "Sportswear", "لباس ورزشی"],
      ["bottoms", "Bottoms", "شلوار"],
      ["other", "Other", "سایر"],
    ],
  },
  {
    slug: "accessories",
    name_en: "Accessories",
    name_fa: "اکسسوری",
    description_en: "Everyday objects carrying Persian motifs — jewelry, bags, phone cases, and keepsakes designed to travel with you.",
    description_fa: "اشیای روزمره با نقوش ایرانی — جواهرات، کیف، قاب موبایل و یادگاری‌هایی که همراه شما سفر می‌کنند.",
    story_en: "Heritage, carried in the hand.",
    story_fa: "میراث، در دستان شما.",
    color_palette: ["#B48635", "#18231F", "#F4EFE3"],
    children: [
      ["jewelry", "Jewelry", "جواهرات"],
      ["books", "Books", "کتاب"],
      ["phone-cases", "Phone Cases", "قاب موبایل"],
      ["bags", "Bags", "کیف"],
      ["socks", "Socks", "جوراب"],
      ["hats", "Hats", "کلاه"],
      ["underwear", "Underwear", "لباس زیر"],
      ["baby-accessories", "Baby Accessories", "لوازم نوزاد"],
      ["mouse-pads", "Mouse Pads", "پد موس"],
      ["pets", "Pets", "حیوانات خانگی"],
      ["kitchen-accessories", "Kitchen Accessories", "لوازم آشپزخانه"],
      ["car-accessories", "Car Accessories", "لوازم خودرو"],
      ["tech-accessories", "Tech Accessories", "لوازم دیجیتال"],
      ["travel-accessories", "Travel Accessories", "لوازم سفر"],
      ["stationery-accessories", "Stationery Accessories", "لوازم تحریر"],
      ["sports-games", "Sports & Games", "ورزش و سرگرمی"],
      ["face-masks", "Face Masks", "ماسک صورت"],
      ["other", "Other", "سایر"],
    ],
  },
  {
    slug: "home-and-living",
    name_en: "Home and Living",
    name_fa: "خانه و زندگی",
    description_en: "Bring the warmth of Persian hospitality home — mugs, canvas art, candles, and textiles rooted in ancient geometry.",
    description_fa: "گرمای مهمان‌نوازی ایرانی را به خانه بیاورید — ماگ، تابلو، شمع و منسوجاتی ریشه‌دار در هندسه کهن.",
    story_en: "A home that remembers.",
    story_fa: "خانه‌ای که به یاد می‌آورد.",
    color_palette: ["#697A4D", "#B6653B", "#F4EFE3"],
    children: [
      ["mugs", "Mugs", "ماگ"],
      ["candles", "Candles", "شمع"],
      ["ornaments", "Ornaments", "آویز تزئینی"],
      ["seasonal-decorations", "Seasonal Decorations", "تزئینات فصلی"],
      ["glassware", "Glassware", "ظروف شیشه‌ای"],
      ["bottles-tumblers", "Bottles & Tumblers", "بطری و تامبلر"],
      ["canvas", "Canvas", "تابلو بوم"],
      ["posters", "Posters", "پوستر"],
      ["postcards", "Postcards", "کارت‌پستال"],
      ["journals-notebooks", "Journals & Notebooks", "دفترچه و ژورنال"],
      ["magnets-stickers", "Magnets & Stickers", "مگنت و استیکر"],
      ["home-decor", "Home Decor", "دکور خانه"],
      ["blankets", "Blankets", "پتو"],
      ["pillows-covers", "Pillows & Covers", "بالش و روبالشی"],
      ["towels", "Towels", "حوله"],
      ["bathroom", "Bathroom", "حمام"],
      ["rugs-mats", "Rugs & Mats", "فرشینه و پادری"],
      ["bedding", "Bedding", "ملافه و روتختی"],
    ],
  },
];

// Old collection name -> new subcategory slug, for remapping live products
const PRODUCT_REMAP = {
  "Wall Art": "home-and-living-canvas",
  "Jewelry & Keepsakes": "accessories-jewelry",
  "Drinkware": "home-and-living-mugs",
};

async function main() {
  // 0. Verify parent_id exists (migration applied)
  const probe = await supabase.from("collections").select("parent_id").limit(1);
  if (probe.error) {
    console.error("parent_id column missing — apply supabase/migrations/20260824000001_collections_parent_id.sql first.");
    process.exit(1);
  }

  // 1. Snapshot products -> old collection names before deleting
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name_en, collection_id, collections(name_en)");
  if (productsError) throw productsError;

  // 2. Delete all existing collections (fresh start, approved)
  const { data: oldCollections } = await supabase.from("collections").select("id, name_en");
  for (const old of oldCollections || []) {
    const { error } = await supabase.from("collections").delete().eq("id", old.id);
    if (error) throw new Error(`Failed deleting "${old.name_en}": ${error.message}`);
    console.log(`deleted collection: ${old.name_en}`);
  }

  // 3. Insert main categories, then subcategories
  const slugToId = {};
  let mainSort = 1;
  for (const main of TAXONOMY) {
    const { children, ...mainRow } = main;
    const { data: inserted, error } = await supabase
      .from("collections")
      .insert({ ...mainRow, status: "active", featured: true, sort_order: mainSort++ })
      .select("id")
      .single();
    if (error) throw new Error(`Failed inserting "${main.name_en}": ${error.message}`);
    slugToId[main.slug] = inserted.id;
    console.log(`created main category: ${main.name_en}`);

    const subRows = children.map(([slug, name_en, name_fa], index) => ({
      parent_id: inserted.id,
      slug: `${main.slug}-${slug}`,
      name_en,
      name_fa,
      status: "active",
      featured: false,
      sort_order: index + 1,
    }));
    const { data: subs, error: subError } = await supabase
      .from("collections")
      .insert(subRows)
      .select("id, slug");
    if (subError) throw new Error(`Failed inserting subcategories of "${main.name_en}": ${subError.message}`);
    for (const sub of subs) slugToId[sub.slug] = sub.id;
    console.log(`  + ${subs.length} subcategories`);
  }

  // 4. Remap products onto the new subcategories
  for (const product of products || []) {
    const oldName = product.collections?.name_en;
    const newSlug = oldName ? PRODUCT_REMAP[oldName] : undefined;
    const newId = newSlug ? slugToId[newSlug] : null;
    const { error } = await supabase
      .from("products")
      .update({ collection_id: newId })
      .eq("id", product.id);
    if (error) throw new Error(`Failed remapping "${product.name_en}": ${error.message}`);
    console.log(`remapped product: ${product.name_en} -> ${newSlug || "(none)"}`);
  }

  console.log("\nDone. 5 main categories + subcategories seeded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
