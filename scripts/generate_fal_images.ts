import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";
import https from "https";
import { products } from "../src/lib/mock/products"; 

// Configure Fal AI with the user's API key
process.env.FAL_KEY = "cc422817-6e6f-4c59-972f-8f0c51651369:8e9634091d16525da4d1e3bfcac466a2";

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "products");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download image from URL and save locally
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
  console.log(`Starting fal.ai (Flux) image generation for ${products.length} products...`);
  
  for (const product of products) {
    console.log(`\n--- Processing [${product.slug}] ---`);
    
    const types = ["flat", "mockup", "lifestyle"];
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const filename = `${product.slug}-${type}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      if (fs.existsSync(filepath)) {
        console.log(`[SKIP] ${filename} already exists.`);
        // We will overwrite anyway just in case the previous runs left empty files
        // uncomment continue if you want to skip
        // continue;
      }
      
      let prompt = "";
      const colors = product.colors && product.colors.length > 0 ? product.colors.join(", ") : "Warm Ivory and Matte Gold";
      
      if (type === "flat") {
        prompt = `Flat vector illustration, Persian pre-Islamic motif, geometric flat illustration. Concept: ${product.storyText}. Product Name: ${product.nameEn}. Color palette: ${colors}. Minimalist, contemporary, flat, no gradients, clean lines, Upside Tree brand identity. No Islamic references.`;
      } else if (type === "mockup") {
        prompt = `Product photography, natural light, minimalist mockup of a ${product.type}. Design features ${product.nameEn} (geometric Persian pre-Islamic motif). Warm ivory or stone/marble background, subtle Persian architectural context in the shadows, lifestyle product shot, minimalist.`;
      } else {
        prompt = `High fashion lifestyle photography, person holding/wearing/using a ${product.type} featuring ${product.nameEn}. Natural sunlight, warm architectural background with stone columns, pre-Islamic Persian aesthetic, modern and sophisticated, shallow depth of field.`;
      }
      
      console.log(`[GENERATE] ${type} for ${product.slug}...`);
      
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
          console.log(`[WARNING] No images returned for ${filename}:`, JSON.stringify(result));
        }
      } catch (error: any) {
        console.error(`[ERROR] Failed to generate ${filename}:`, error?.message || error);
      }
    }
  }
  
  console.log("\n✅ All images generated via fal.ai!");
}

main().catch(console.error);
