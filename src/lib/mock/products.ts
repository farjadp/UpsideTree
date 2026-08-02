// ============================================================================
// File: upside-tree/src/lib/mock/products.ts
// Version: 2.0.0 — 2026-08-01
// Why: Complete 30-product Persian heritage seed catalog across 5 collections
//      and 10 product categories.
// ============================================================================

export type ProductType =
  | "apparel-tshirt"
  | "apparel-tote"
  | "mug"
  | "poster"
  | "art-print"
  | "ceramic-handmade"
  | "digital-download";

export type InventoryType = "unlimited" | "limited";
export type Currency = "CAD" | "USD" | "EUR" | "GBP";

export interface Product {
  id:                 string;
  slug:               string;
  collectionSlug:     string;
  type:               ProductType;

  nameEn:             string;
  nameFa:             string;

  emotionalHeadline:  string;
  emotionalFa:        string;
  description:        string;
  descriptionFa:      string;
  storyText:          string;
  storyFa:            string;

  price:              number;
  originalPrice?:     number;
  currency:           Currency;

  images:             string[];
  featured:           boolean;
  inStock:            boolean;
  inventoryType:      InventoryType;
  stockCount?:        number;
  inventory?:         InventoryType;
  stock?:             number;
  lowStockThreshold?: number;
  badge?:             string;

  motifSource?:       string;
  sku?:               string;
  colors?:            string[];
  sizes?:             string[];
}

export const products: Product[] = [
  // 1. T-SHIRTS
  {
    id: "p-01",
    slug: "lion-and-sun-geometric-tee",
    collectionSlug: "roots",
    type: "apparel-tshirt",
    nameEn: "Geometric Lion & Sun Heavyweight Tee",
    nameFa: "تی‌شرت شیر و خورشید هندسی",
    emotionalHeadline: "Carries the fierce dignity of ancient solar sovereignty in a sharp, modern silhouette.",
    emotionalFa: "حامل وقار سهمگین اقتدار خورشیدی ایران باستان در قالبی مدرن.",
    description: "100% Organic Ring-Spun Cotton, 220 GSM heavyweight knit, pre-shrunk, reinforced neckline.",
    descriptionFa: "۱۰۰٪ پنبه ارگانیک، پارچه سنگین ۲۲۰ گرمی، آبرفت گرفته‌شده، یقه تقویت‌شده.",
    storyText: "Reinterprets the historic Lion and Sun (شیر و خورشید) emblem using Constructivist triangular planes and a 12-ray solar star referencing ancient Iranian solar calendar cycles.",
    storyFa: "بازطراحی نماد تاریخی شیر و خورشید با مثلث‌ها و زوایای هندسی و خورشید ۱۲ پر گاه‌شماری خورشیدی ایران باستان.",
    price: 48.00,
    currency: "CAD",
    images: [
      "/images/products/lion-and-sun-geometric-tee-mockup.png",
      "/images/products/lion-and-sun-geometric-tee-flat.png",
      "/images/products/lion-and-sun-geometric-tee-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-TSHIRT-01",
    colors: ["Warm Ivory", "Ink Black"],
    sizes: ["S", "M", "L", "XL", "2XL"]
  },
  {
    id: "p-02",
    slug: "cyrus-cuneiform-charter-tee",
    collectionSlug: "words",
    type: "apparel-tshirt",
    nameEn: "Cyrus Cuneiform Charter Graphic Tee",
    nameFa: "تی‌شرت منشور کتیبه میخی کوروش",
    emotionalHeadline: "Wear the first declaration of human dignity as a subtle visual texture.",
    emotionalFa: "نخستین منشور رواداری و کرامت انسانی را به عنوان بافتی تصویری بپوشید.",
    description: "100% Combed Cotton, 180 GSM, tailored unisex fit, soft touch screenprint.",
    descriptionFa: "۱۰۰٪ پنبه شانه خورده، ۱۸۰ گرم، برش مدرن اسپرت، چاپ نرم.",
    storyText: "Features Old Persian cuneiform script directly transcribed from the Cyrus Cylinder (539 BCE).",
    storyFa: "استفاده مستقیم از خط میخی پارسی باستان کتیبه منشور کوروش بزرگ (۵۳۹ پیش از میلاد).",
    price: 45.00,
    currency: "CAD",
    images: [
      "/images/products/cyrus-cuneiform-charter-tee-mockup.png",
      "/images/products/cyrus-cuneiform-charter-tee-flat.png",
      "/images/products/cyrus-cuneiform-charter-tee-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-TSHIRT-02",
    colors: ["Warm Ivory", "White"],
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "p-03",
    slug: "persepolis-bull-capital-tee",
    collectionSlug: "roots",
    type: "apparel-tshirt",
    nameEn: "Persepolis Twin Bull Capital Tee",
    nameFa: "تی‌شرت سرستون دو سر گاو تخت جمشید",
    emotionalHeadline: "Architectural monumentalism translated into a clean, confident emblem.",
    emotionalFa: "عظمت معماری آپادانا در قالبی نشان‌واره و مقتدر.",
    description: "100% Premium Cotton, Matte Gold screenprint on Ink Black garment.",
    descriptionFa: "۱۰۰٪ پنبه پرمیوم، چاپ طلا مات روی پارچه مشکی مرکبی.",
    storyText: "Inspired by the twin-bull capitals supporting the 20-meter ceilings of the Apadana Palace at Persepolis (5th century BCE).",
    storyFa: "با الهام از سرستون‌های دو سر گاو کاخ آپادانای تخت جمشید (قرن پنجم پیش از میلاد).",
    price: 48.00,
    currency: "CAD",
    images: [
      "/images/products/persepolis-bull-capital-tee-mockup.png",
      "/images/products/persepolis-bull-capital-tee-flat.png",
      "/images/products/persepolis-bull-capital-tee-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-TSHIRT-03"
  },

  // 2. SWEATSHIRTS
  {
    id: "p-04",
    slug: "simorgh-feather-geometric-sweatshirt",
    collectionSlug: "roots",
    type: "apparel-tshirt",
    nameEn: "Simorgh Geometric Feather Crewneck",
    nameFa: "دورس طرح پرهای سیمرغ",
    emotionalHeadline: "The legendary bird of wisdom protecting your back with geometric plumage.",
    emotionalFa: "مرغ افسانه‌ای دانایی و پناه، با پرهای هندسی بر پشت شما.",
    description: "80% Organic Cotton / 20% Recycled Poly, 350 GSM fleece lined, relaxed fit.",
    descriptionFa: "۸۰٪ پنبه ارگانیک / ۲۰٪ پلی‌استر بازیافتی، پارچه کرکی ۳۵۰ گرم.",
    storyText: "Depicts the Simorgh (سیمرغ), the mythical healer and guardian bird from Ferdowsi's Shahnameh.",
    storyFa: "تصویرگری سیمرغ، مرغ افسانه‌ای و درمانگر شاهنامه فردوسی.",
    price: 85.00,
    currency: "CAD",
    images: [
      "/images/products/simorgh-feather-geometric-sweatshirt-mockup.png",
      "/images/products/simorgh-feather-geometric-sweatshirt-flat.png",
      "/images/products/simorgh-feather-geometric-sweatshirt-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-SWEAT-01"
  },
  {
    id: "p-05",
    slug: "chahar-bagh-garden-plan-sweatshirt",
    collectionSlug: "roots",
    type: "apparel-tshirt",
    nameEn: "Chahar-Bagh Garden Blueprint Sweatshirt",
    nameFa: "دورس نقشه چهارباغ ایرانی",
    emotionalHeadline: "An aerial sanctuary of symmetry, water, and cypress green.",
    emotionalFa: "پناهگاهی هوایی از تقارن، آب و سرسبزی سرو.",
    description: "80% Heavyweight Cotton Fleece, Cypress Green and Cream tone on tone print.",
    descriptionFa: "۸۰٪ پنبه سنگین داخل کرک، چاپ سبز سروی و کرم.",
    storyText: "Based on the ancient Persian four-quadrant garden layout (چهارباغ) dating back to Pasargadae.",
    storyFa: "برگرفته از ساختار هندسی چهارباغ ایرانی با قدمت پاسارگاد.",
    price: 82.00,
    currency: "CAD",
    images: [
      "/images/products/chahar-bagh-garden-plan-sweatshirt-mockup.png",
      "/images/products/chahar-bagh-garden-plan-sweatshirt-flat.png",
      "/images/products/chahar-bagh-garden-plan-sweatshirt-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-SWEAT-02"
  },
  {
    id: "p-06",
    slug: "ferdowsi-wisdom-typography-sweatshirt",
    collectionSlug: "words",
    type: "apparel-tshirt",
    nameEn: "Ferdowsi Wisdom Verse Sweatshirt",
    nameFa: "دورس توانا بود هر که دانا بود",
    emotionalHeadline: "A classic line of Persian enlightenment rendered in architectural typography.",
    emotionalFa: "بیتی جاویدان از خرد ایرانی در قالبی ساختارمند و استوار.",
    description: "100% Cotton Fleece, High-density Puff Print in Ink Black on Warm Ivory.",
    descriptionFa: "۱۰۰٪ پنبه کرکی، چاپ برجسته مشکی مرکبی روی عاجی.",
    storyText: "Features Ferdowsi's famous Shahnameh verse: 'توانا بود هر که دانا بود' (Capable is the one who is wise).",
    storyFa: "بیت معروف شاهنامه فردوسی: «توانا بود هر که دانا بود».",
    price: 80.00,
    currency: "CAD",
    images: [
      "/images/products/ferdowsi-wisdom-typography-sweatshirt-mockup.png",
      "/images/products/ferdowsi-wisdom-typography-sweatshirt-flat.png",
      "/images/products/ferdowsi-wisdom-typography-sweatshirt-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-SWEAT-03"
  },

  // 3. MUGS
  {
    id: "p-07",
    slug: "apadana-procession-ceramic-mug",
    collectionSlug: "roots",
    type: "mug",
    nameEn: "Apadana Procession Wrap Ceramic Mug",
    nameFa: "ماگ سرامیکی کتیبه فرستادگان آپادانا",
    emotionalHeadline: "Hold 2,500 years of gift-bearing nations in your morning ritual.",
    emotionalFa: "آیین صبحگاهی شما با ۲۵۰۰ سال تاریخ اقوام و هدایا.",
    description: "15 oz Ceramic Mug, Glossy Ink Black exterior, Matte Gold graphic wrap.",
    descriptionFa: "ماگ سرامیکی ۴۵۰ میلی‌لیتر، بدنه مشکی براق، چاپ طلا مات.",
    storyText: "Wraps the famous procession of nations from the Eastern Staircase of the Apadana Palace (Persepolis, 500 BCE).",
    storyFa: "تصویرگری رژه اقوام ۲۳ گانه از پلکان شرقی کاخ آپادانای تخت جمشید.",
    price: 35.00,
    currency: "CAD",
    images: [
      "/images/products/apadana-procession-ceramic-mug-mockup.png",
      "/images/products/apadana-procession-ceramic-mug-flat.png",
      "/images/products/apadana-procession-ceramic-mug-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-MUG-01"
  },
  {
    id: "p-08",
    slug: "nowruz-goldfish-mosaic-mug",
    collectionSlug: "rituals",
    type: "mug",
    nameEn: "Nowruz Goldfish Mosaic Mug",
    nameFa: "ماگ ماهی سرخ نوروزی",
    emotionalHeadline: "A splash of ancient spring and new beginnings on your desk.",
    emotionalFa: "موجی از رستاخیز بهار و آغاز نو بر روی میز کار شما.",
    description: "11 oz Warm Ivory Ceramic, Turquoise and Matte Gold glaze print.",
    descriptionFa: "ماگ سرامیکی ۳۳۰ میلی‌لیتر عاجی گرم، چاپ فیروزه‌ای و طلا مات.",
    storyText: "Celebrates the Haft-Seen goldfish symbol of life and liquidity during Nowruz.",
    storyFa: "گرامیداشت نماد ماهی سفره هفت‌سین نوروز به عنوان نشان حیات.",
    price: 32.00,
    currency: "CAD",
    images: [
      "/images/products/nowruz-goldfish-mosaic-mug-mockup.png",
      "/images/products/nowruz-goldfish-mosaic-mug-flat.png",
      "/images/products/nowruz-goldfish-mosaic-mug-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-MUG-02"
  },
  {
    id: "p-09",
    slug: "khayyam-quatrain-typography-mug",
    collectionSlug: "words",
    type: "mug",
    nameEn: "Khayyam Quatrain Bilingual Mug",
    nameFa: "ماگ رباعیات حکیم عمر خیام",
    emotionalHeadline: "Seize the present moment with Khayyam's timeless philosophical clarity.",
    emotionalFa: "دم را غنیمت شمار با حکمت جاویدان خیام نیشابوری.",
    description: "15 oz Ceramic Mug, Pomegranate Red typography with English translation.",
    descriptionFa: "ماگ ۴۵۰ میلی‌لیتر سرامیکی، تایپوگرافی سرخ اناری با ترجمه انگلیسی.",
    storyText: "Features Omar Khayyam's celebrated quatrain celebrating mindfulness and the present moment.",
    storyFa: "رباعی معروف حکیم عمر خیام نیشابوری در ستایش حضور در لحظه حال.",
    price: 34.00,
    currency: "CAD",
    images: [
      "/images/products/khayyam-quatrain-typography-mug-mockup.png",
      "/images/products/khayyam-quatrain-typography-mug-flat.png",
      "/images/products/khayyam-quatrain-typography-mug-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-MUG-03"
  },

  // 4. HOODIES
  {
    id: "p-10",
    slug: "faravahar-winged-disc-hoodie",
    collectionSlug: "roots",
    type: "apparel-tshirt",
    nameEn: "Faravahar Geometric Reconstruction Hoodie",
    nameFa: "هودی طرح فروهر هندسی",
    emotionalHeadline: "A personal armor of good thoughts, good words, and good deeds.",
    emotionalFa: "زرهی از اندیشه نیک، گفتار نیک و کردار نیک.",
    description: "85% Organic Cotton / 15% Recycled Polyester, Heavyweight 400 GSM, Matte Gold print.",
    descriptionFa: "۸۵٪ پنبه ارگانیک / ۱۵٪ پلی‌استر بازیافتی، ۴۰۰ گرم سنگین، چاپ طلایی روی مشکی.",
    storyText: "Reconstructs the Achaemenid winged disc (Faravahar) using strict geometric lines.",
    storyFa: "بازسازی نماد بالدار هخامنشی (فروهر) با خطوط هندسی دقیق.",
    price: 92.00,
    currency: "CAD",
    images: [
      "/images/products/faravahar-winged-disc-hoodie-mockup.png",
      "/images/products/faravahar-winged-disc-hoodie-flat.png",
      "/images/products/faravahar-winged-disc-hoodie-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-HOODIE-01"
  },
  {
    id: "p-11",
    slug: "azargoshasb-eternal-flame-hoodie",
    collectionSlug: "rituals",
    type: "apparel-tshirt",
    nameEn: "Azargoshasb Eternal Flame Heavy Hoodie",
    nameFa: "هودی آتشکده آذرگشسب",
    emotionalHeadline: "The unquenchable flame of ancient sanctuary on your back.",
    emotionalFa: "شعله خاموش‌نشدنی پرستشگاه‌های کهن بر دوش شما.",
    description: "100% Heavyweight Cotton Fleece, 380 GSM, Charcoal Grey garment.",
    descriptionFa: "۱۰۰٪ پنبه کرکی سنگین، ۳۸۰ گرم، زغالی.",
    storyText: "Abstracts the eternal fire temple architecture of Takht-e Soleyman (Azargoshasb).",
    storyFa: "انتزاعی از معماری آتشکده آذرگشسب تخت سلیمان.",
    price: 88.00,
    currency: "CAD",
    images: [
      "/images/products/azargoshasb-eternal-flame-hoodie-mockup.png",
      "/images/products/azargoshasb-eternal-flame-hoodie-flat.png",
      "/images/products/azargoshasb-eternal-flame-hoodie-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-HOODIE-02"
  },
  {
    id: "p-12",
    slug: "made-in-persia-statement-hoodie",
    collectionSlug: "roots",
    type: "apparel-tshirt",
    nameEn: "Made in Persia Statement Hoodie",
    nameFa: "هودی ساخت پارس",
    emotionalHeadline: "Unapologetic cultural identity presented with Bauhaus minimalism.",
    emotionalFa: "هویتی بی‌واسطه و استوار با ابهت باستانی.",
    description: "100% Organic Cotton Fleece, Lapis Blue garment, Warm Ivory typography.",
    descriptionFa: "۱۰۰٪ پنبه ارگانیک داخل کرک، پارچه آبی لاجوردی، تایپوگرافی عاجی.",
    storyText: "Pairs bold, geometric serif typography spelling 'MADE IN PERSIA' with a cuneiform border strip.",
    storyFa: "ترکیب تایپوگرافی جسورانه عبارت «MADE IN PERSIA» با نوار ظریف خط میخی.",
    price: 85.00,
    currency: "CAD",
    images: [
      "/images/products/made-in-persia-statement-hoodie-mockup.png",
      "/images/products/made-in-persia-statement-hoodie-flat.png",
      "/images/products/made-in-persia-statement-hoodie-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-HOODIE-03"
  },

  // 5. POSTERS & PRINTS
  {
    id: "p-22",
    slug: "cyrus-cylinder-data-visualization-poster",
    collectionSlug: "words",
    type: "poster",
    nameEn: "The Cyrus Charter Data Art Poster (18x24\")",
    nameFa: "پوستر هنری کتیبه حقوق بشر کوروش",
    emotionalHeadline: "Bauhaus precision meets ancient human rights history for your wall.",
    emotionalFa: "دقت مکتب باوهاوس در کنار تاریخ منشور حقوق بشر بر دیوار شما.",
    description: "Museum-quality archival matte paper (250 GSM), Giclée print technology, 18x24 inches.",
    descriptionFa: "کاغذ مات آرشیوی با کیفیت موزه (۲۵۰ گرم)، ابعاد ۴۵ در ۶۰ سانتی‌متر.",
    storyText: "Visualizes the 45 lines of the Cyrus Cylinder (539 BCE) as a modern architectural infographic.",
    storyFa: "به تصویر کشیدن ۴۵ سطر منشور کوروش به عنوان اینفوگرافیک معماری و هنر مدرن.",
    price: 52.00,
    currency: "CAD",
    images: [
      "/images/products/cyrus-cylinder-data-visualization-poster-mockup.png",
      "/images/products/cyrus-cylinder-data-visualization-poster-flat.png",
      "/images/products/cyrus-cylinder-data-visualization-poster-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-POSTER-01"
  },
  {
    id: "p-23",
    slug: "persepolis-architectural-blueprint-poster",
    collectionSlug: "roots",
    type: "poster",
    nameEn: "Persepolis Blueprint Architectural Art Print",
    nameFa: "پوستر پلان معماری تخت جمشید",
    emotionalHeadline: "An imperial blueprint of Pasargadae & Persepolis palace complexes.",
    emotionalFa: "پلان مهندسی و باستانی کاخ‌های شکوه تخت جمشید.",
    description: "Archival matte paper, Lapis Blue lines with Gold Foil accent details on Ivory backdrop.",
    descriptionFa: "کاغذ مات آرشیوی، خطوط لاجوردی و جزئیات فویل طلایی روی زمینه عاجی.",
    storyText: "Recreates technical floor plans of the Gate of All Nations and Apadana Palace at Persepolis.",
    storyFa: "بازآفرینی نقشه‌های فنی و معماری دروازه ملل و کاخ آپادانای تخت جمشید.",
    price: 58.00,
    currency: "CAD",
    images: [
      "/images/products/persepolis-architectural-blueprint-poster-mockup.png",
      "/images/products/persepolis-architectural-blueprint-poster-flat.png",
      "/images/products/persepolis-architectural-blueprint-poster-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-POSTER-02"
  },
  {
    id: "p-24",
    slug: "persian-alphabet-bauhaus-poster",
    collectionSlug: "words",
    type: "poster",
    nameEn: "Persian Alphabet Bauhaus Grid Poster",
    nameFa: "پوستر تایپوگرافی الفبای فارسی",
    emotionalHeadline: "All 32 letters of the Persian alphabet sculpted as modern geometric art.",
    emotionalFa: "۳۲ حرف الفبای پارسی مجسم‌شده در قالب هنر هندسی مدرن.",
    description: "24x36 inches, 250 GSM heavy matte paper, Giclée archival print.",
    descriptionFa: "ابعاد ۶۰ در ۹۰ سانتی‌متر، کاغذ سنگین ۲۵۰ گرمی، چاپ موزه.",
    storyText: "Arranges all 32 letters of the Persian alphabet in a 4x8 geometric grid with phonetic Latin counterparts.",
    storyFa: "چیدمان تمامی ۳۲ حرف الفبای فارسی در شبکه‌ای هندسی ۴ در ۸.",
    price: 65.00,
    currency: "CAD",
    images: [
      "/images/products/persian-alphabet-bauhaus-poster-mockup.png",
      "/images/products/persian-alphabet-bauhaus-poster-flat.png",
      "/images/products/persian-alphabet-bauhaus-poster-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-POSTER-03"
  },

  // 6. CANDLES
  {
    id: "p-25",
    slug: "yalda-night-pomegranate-scented-candle",
    collectionSlug: "rituals",
    type: "ceramic-handmade",
    nameEn: "Yalda Night Pomegranate & Sandalwood Soy Candle",
    nameFa: "شمع معطر انار و صندل شب یلدا",
    emotionalHeadline: "Illuminate the longest night of the year with sweet pomegranate and warm amber.",
    emotionalFa: "روشنی‌بخش طولانی‌ترین شب سال با عطر انار و کهربا.",
    description: "9 oz 100% Soy Wax, 50-hour burn time, Pomegranate + Rose + Sandalwood essential oils.",
    descriptionFa: "شمع مومی ۲۵۰ گرمی ۱۰۰٪ سویا، ۵۰ ساعت زمان سوخت، اسانس انار، گل سرخ و صندل.",
    storyText: "Honors Yalda Night (شب یلدا), the ancient winter solstice festival celebrating the victory of light over dark.",
    storyFa: "گرامیداشت شب یلدا، جشن کهن ایرانی در پیروزی نور بر تاریکی.",
    price: 38.00,
    currency: "CAD",
    images: [
      "/images/products/yalda-night-pomegranate-scented-candle-mockup.png",
      "/images/products/yalda-night-pomegranate-scented-candle-flat.png",
      "/images/products/yalda-night-pomegranate-scented-candle-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "limited",
    stockCount: 45,
    sku: "UT-CANDLE-01"
  },
  {
    id: "p-26",
    slug: "nowruz-fire-saffron-amber-candle",
    collectionSlug: "rituals",
    type: "ceramic-handmade",
    nameEn: "Nowruz Fire Saffron & Cedar Soy Candle",
    nameFa: "شمع معطر زعفران و سدر آتش نوروز",
    emotionalHeadline: "Purify your space with the sacred flame scent of saffron and cedarwood.",
    emotionalFa: "پاکسازی محیط با عطر اصیل زعفران ایرانی و چوب سدر.",
    description: "9 oz Natural Soy Wax Candle, Saffron + Cedar + Amber blend, Black glass vessel.",
    descriptionFa: "شمع مومی ۲۵۰ گرمی، ترکیب عطر زعفران، سدر و عنبر، ظرف مشکی مات.",
    storyText: "References Chaharshanbe Suri and the ancient Zoroastrian sacred flame (آتش مقدس).",
    storyFa: "الهام‌گرفته از چهارشنبه‌سوری و آتش مقدس ایرانیان باستان.",
    price: 40.00,
    currency: "CAD",
    images: [
      "/images/products/nowruz-fire-saffron-amber-candle-mockup.png",
      "/images/products/nowruz-fire-saffron-amber-candle-flat.png",
      "/images/products/nowruz-fire-saffron-amber-candle-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "limited",
    stockCount: 35,
    sku: "UT-CANDLE-02"
  },

  // 7. BAGS
  {
    id: "p-28",
    slug: "simorgh-flying-heavyweight-tote-bag",
    collectionSlug: "roots",
    type: "apparel-tote",
    nameEn: "Simorgh Flying Heavyweight Canvas Tote Bag",
    nameFa: "توت‌بگ پارچه‌ای سیمرغ",
    emotionalHeadline: "Carry your daily essentials under the wings of the mythical guardian.",
    emotionalFa: "وسایل روزمره خود را زیر بال‌های مرغ افسانه‌ای دانایی حمل کنید.",
    description: "100% Heavyweight Organic Cotton Canvas (12 oz), inner zip pocket, reinforced handles.",
    descriptionFa: "۱۰۰٪ متقال پنبه ارگانیک سنگین، جیب زیپ‌دار داخلی، دسته‌های تقویت‌شده.",
    storyText: "Features a large-scale geometric Simorgh illustration wrapping across the left panel of the bag.",
    storyFa: "دارای تصویرگری بزرگ و هندسی از سیمرغ باستانی بر روی دیواره توت‌بگ.",
    price: 38.00,
    currency: "CAD",
    images: [
      "/images/products/simorgh-flying-heavyweight-tote-bag-mockup.png",
      "/images/products/simorgh-flying-heavyweight-tote-bag-flat.png",
      "/images/products/simorgh-flying-heavyweight-tote-bag-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-BAG-01"
  },
  {
    id: "p-29",
    slug: "zan-zendegi-azadi-typographic-tote",
    collectionSlug: "words",
    type: "apparel-tote",
    nameEn: "Zan Zendegi Azadi Typographic Statement Tote",
    nameFa: "توت‌بگ زن زندگی آزادی",
    emotionalHeadline: "A powerful contemporary resonance of human dignity and cultural freedom.",
    emotionalFa: "طنین پرقدرت کرامت انسانی و آزادی در قالبی مدرن.",
    description: "100% Organic Heavyweight Canvas, Pomegranate Red screenprint on Natural Canvas.",
    descriptionFa: "۱۰۰٪ متقال پنبه ارگانیک، چاپ سرخ اناری روی متقال طبیعی.",
    storyText: "Features the historic human rights mantra 'زن زندگی آزادی' (Women, Life, Freedom) in bold modern Persian typography.",
    storyFa: "دارای تایپوگرافی جسورانه و مدرن عبارت «زن زندگی آزادی» همگام با منشور حقوق بشر.",
    price: 35.00,
    currency: "CAD",
    images: [
      "/images/products/zan-zendegi-azadi-typographic-tote-mockup.png",
      "/images/products/zan-zendegi-azadi-typographic-tote-flat.png",
      "/images/products/zan-zendegi-azadi-typographic-tote-lifestyle.png"
    ],
    featured: true,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-BAG-02"
  },
  {
    id: "p-30",
    slug: "sassanid-geometric-mosaic-pattern-bag",
    collectionSlug: "roots",
    type: "apparel-tote",
    nameEn: "Sassanid Geometric Mosaic All-Over Canvas Bag",
    nameFa: "توت‌بگ نقش‌مایه موزاییک ساسانی",
    emotionalHeadline: "Tessellating 6th-century royal silk patterns for modern urban journeys.",
    emotionalFa: "الگوهای هندسی پارچه‌های ابریشمی دوره ساسانی برای سفرهای شهری امروز.",
    description: "100% Organic Cotton Canvas, All-over geometric print in Lapis Blue and Gold.",
    descriptionFa: "۱۰۰٪ پارچه متقال ارگانیک، چاپ سرتاسری هندسی لاجوردی و طلایی.",
    storyText: "Inspired by Sassanid royal silk textiles and Bishapur mosaic pavements (6th century CE).",
    storyFa: "با الهام از پارچه‌های ابریشمی شاهنشاهی ساسانی و موزاییک‌های بیشاپور.",
    price: 42.00,
    currency: "CAD",
    images: [
      "/images/products/sassanid-geometric-mosaic-pattern-bag-mockup.png",
      "/images/products/sassanid-geometric-mosaic-pattern-bag-flat.png",
      "/images/products/sassanid-geometric-mosaic-pattern-bag-lifestyle.png"
    ],
    featured: false,
    inStock: true,
    inventoryType: "unlimited",
    sku: "UT-BAG-03"
  }
];

// Helper functions
export function getAllProducts(): Product[] {
  return products;
}

export function getFeaturedProducts(limit = 6): Product[] {
  return products.filter((p) => p.featured).slice(0, limit);
}

export function getProductsByCollection(collectionSlug: string): Product[] {
  return products.filter((p) => p.collectionSlug === collectionSlug);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
