import fs from "fs";
import path from "path";
import https from "https";

// 1. Define the 5 new products
const newProducts = [
  {
    id: "p-words-iran-1",
    slug: "iran-typography-t-shirt",
    nameEn: "Iran (ایران) Typography T-Shirt",
    nameFa: "تی‌شرت با تایپوگرافی ایران",
    descriptionEn: "A minimalist, premium cotton t-shirt featuring the word 'ایران' (Iran) in modern, elegant Persian typography. Celebrating the rich cultural heritage and pre-Islamic history of the land in a contemporary style.",
    descriptionFa: "تی‌شرت نخی پریمیوم با تایپوگرافی مدرن و مینیمال کلمه «ایران». ادای احترامی به تاریخ و فرهنگ غنی ایران باستان با طراحی امروزی.",
    price: 45.00,
    stock: 100,
    collection_slug: "words",
    images: ["/images/products/iran-typography-t-shirt.png"],
    colors: ["Warm Ivory", "Charcoal"],
    sizes: ["S", "M", "L", "XL"],
    storyTitle: "The Name of the Land",
    storyText: "The word 'Iran' originates from 'Eran', meaning 'Land of the Aryans' in Middle Persian, a testament to a civilization that has stood the test of time.",
    type: "clothing"
  },
  {
    id: "p-words-iran-2",
    slug: "iran-gold-necklace",
    nameEn: "Iran (ایران) 18k Gold Necklace",
    nameFa: "گردنبند طلای ۱۸ عیار ایران",
    descriptionEn: "An exquisite 18k gold necklace where the word 'ایران' is crafted in a geometric, pre-Islamic inspired modern twist. A subtle yet powerful statement of identity.",
    descriptionFa: "گردنبند ظریف و زیبای طلای ۱۸ عیار که کلمه «ایران» با طراحی هندسی و الهام‌گرفته از هنر ایران باستان در آن نقش بسته است.",
    price: 320.00,
    stock: 30,
    collection_slug: "words",
    images: ["/images/products/iran-gold-necklace.png"],
    colors: ["Gold"],
    sizes: ["One Size"],
    storyTitle: "Golden Heritage",
    storyText: "Inspired by the legendary gold smithing of the Achaemenid empire, this piece brings ancient craftsmanship into modern luxury.",
    type: "jewelry"
  },
  {
    id: "p-words-iran-3",
    slug: "iran-canvas-tote-bag",
    nameEn: "Iran (ایران) Minimalist Tote Bag",
    nameFa: "کیف پارچه‌ای مینیمال ایران",
    descriptionEn: "A heavy-duty canvas tote bag featuring the word 'ایران' in bold, contemporary typography. Perfect for everyday use while carrying a piece of your roots.",
    descriptionFa: "کیف پارچه‌ای مقاوم با تایپوگرافی مدرن و درشت «ایران». همراهی ایده‌آل برای استفاده روزمره و گرامیداشت ریشه‌ها.",
    price: 35.00,
    stock: 150,
    collection_slug: "words",
    images: ["/images/products/iran-canvas-tote-bag.png"],
    colors: ["Natural Canvas", "Black"],
    sizes: ["One Size"],
    storyTitle: "Carrying History",
    storyText: "A functional piece of art that blends the enduring name of Iran with everyday modern utility.",
    type: "accessory"
  },
  {
    id: "p-words-iran-4",
    slug: "iran-ceramic-mug",
    nameEn: "Iran (ایران) Artisan Ceramic Mug",
    nameFa: "ماگ سرامیکی دست‌ساز ایران",
    descriptionEn: "A handcrafted ceramic mug featuring the word 'ایران' in a beautifully debossed, subtle styling. Fired with earthy tones reminiscent of the Iranian plateau.",
    descriptionFa: "ماگ سرامیکی دست‌ساز با حکاکی ظریف و زیبای کلمه «ایران». رنگ‌آمیزی شده با تناژهای خاکی با الهام از فلات ایران.",
    price: 28.00,
    stock: 80,
    collection_slug: "words",
    images: ["/images/products/iran-ceramic-mug.png"],
    colors: ["Terracotta", "Stone"],
    sizes: ["One Size"],
    storyTitle: "Earth and Fire",
    storyText: "Crafted with techniques passed down through generations, connecting the modern user with ancient Persian pottery traditions.",
    type: "home"
  },
  {
    id: "p-words-iran-5",
    slug: "iran-neon-wall-art",
    nameEn: "Iran (ایران) Neon LED Wall Art",
    nameFa: "دیوارکوب نئونی ایران",
    descriptionEn: "An aesthetic LED neon sign spelling 'ایران' in an elegant, flowing script. A striking, modern decor piece that lights up any space with cultural pride.",
    descriptionFa: "تابلوی نئون LED با طراحی تایپوگرافی روان و زیبای «ایران». قطعه‌ای مدرن برای دکوراسیون که به فضا جلوه‌ای از افتخار و اصالت می‌بخشد.",
    price: 150.00,
    stock: 20,
    collection_slug: "words",
    images: ["/images/products/iran-neon-wall-art.png"],
    colors: ["Warm White"],
    sizes: ["Medium", "Large"],
    storyTitle: "Illuminating the Name",
    storyText: "A modern interpretation of cultural pride, bringing the timeless name of Iran into the glowing contemporary era.",
    type: "decor"
  }
];

const tsFile = path.join(process.cwd(), "src", "lib", "mock", "products.ts");
let tsContent = fs.readFileSync(tsFile, "utf-8");

const newTsArray = newProducts.map(p => `
  {
    id: "${p.id}",
    slug: "${p.slug}",
    nameEn: "${p.nameEn}",
    nameFa: "${p.nameFa}",
    descriptionEn: "${p.descriptionEn}",
    descriptionFa: "${p.descriptionFa}",
    price: ${p.price},
    originalPrice: null,
    stock: ${p.stock},
    collectionId: "col-words",
    images: ${JSON.stringify(p.images)},
    colors: ${JSON.stringify(p.colors)},
    sizes: ${JSON.stringify(p.sizes)},
    featuresEn: ["Premium Quality", "Exclusive Design"],
    featuresFa: ["کیفیت عالی", "طراحی اختصاصی"],
    storyTitle: "${p.storyTitle}",
    storyText: "${p.storyText}"
  }`).join(",");

const closingBracketIndex = tsContent.lastIndexOf("];");
tsContent = tsContent.substring(0, closingBracketIndex) + "," + newTsArray + "\\n" + tsContent.substring(closingBracketIndex);
fs.writeFileSync(tsFile, tsContent, "utf-8");
console.log("Appended to products.ts");

const sqlFile = path.join(process.cwd(), "seed_catalog.sql");
let sqlContent = fs.readFileSync(sqlFile, "utf-8");

let sqlInserts = "";
for (const p of newProducts) {
  sqlInserts += `
INSERT INTO public.products (id, slug, name_en, name_fa, description_en, description_fa, price, stock, collection_id, images, category)
VALUES (
  '${p.id}',
  '${p.slug}',
  '${p.nameEn.replace(/'/g, "''")}',
  '${p.nameFa.replace(/'/g, "''")}',
  '${p.descriptionEn.replace(/'/g, "''")}',
  '${p.descriptionFa.replace(/'/g, "''")}',
  ${p.price},
  ${p.stock},
  'col-words',
  ARRAY[${p.images.map(img => `'${img}'`).join(", ")}]::text[],
  '${p.type}'
) ON CONFLICT (id) DO NOTHING;
`;
}

sqlContent += `\\n-- New Iran Words Products\\n${sqlInserts}`;
fs.writeFileSync(sqlFile, sqlContent, "utf-8");
console.log("Appended to seed_catalog.sql");

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "products");

const downloadImage = (url: string, filepath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
        return;
      }
      const file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", (err) => {
        fs.unlink(filepath, () => reject(err));
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
};

async function main() {
  console.log(`Starting fal.ai (Flux) image generation for Iran Words products...`);
  
  const aesthetic = "Placed on a warm beige/ivory surface or worn by a model in a minimalist room. Soft, natural sunlight with architectural window shadows falling across the scene. Clean, calm, high-end premium photography aesthetic, warm tones, photorealistic. Very modern and sophisticated. Completely secular and pre-Islamic ancient Persian aesthetic or purely modern. No Islamic symbols, no mosques, no Arabic writing, no traditional religious clothing. Just modern, minimalist, luxury.";
  
  for (const product of newProducts) {
    const filename = `${product.slug}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      console.log(`[SKIP] ${filename} already exists.`);
      continue;
    }
    
    const prompt = `Realistic premium product photography of a ${product.type}: ${product.nameEn}. ${product.descriptionEn} ${aesthetic}`;
    
    console.log(`[GENERATE] image for ${product.slug}...`);
    
    try {
      const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Authorization": "Key cc422817-6e6f-4c59-972f-8f0c51651369:8e9634091d16525da4d1e3bfcac466a2",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: "square_hd",
          num_images: 1,
          num_inference_steps: 4,
          enable_safety_checker: false
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} - ${text}`);
      }
      
      const result = await response.json();
      
      if (result && result.images && result.images.length > 0) {
        const imageUrl = result.images[0].url;
        await downloadImage(imageUrl, filepath);
        console.log(`[SUCCESS] Saved ${filename}`);
      } else {
        console.log(`[WARNING] No images returned for ${filename}`);
      }
    } catch (error: any) {
      console.error(`[ERROR] Failed to generate ${filename}:`, error?.message || error);
    }
  }
  
  console.log("\\n✅ All images generated via fal.ai!");
}

main().catch(console.error);
