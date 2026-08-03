import fs from "fs";
import path from "path";
import https from "https";
import { products } from "../src/lib/mock/products"; 

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "products");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
  console.log(`Starting fal.ai (Flux) image generation...`);
  
  const aesthetic = "Placed on a warm beige/ivory surface or worn by a model in a minimalist room. Soft, natural sunlight with architectural window shadows falling across the scene. Clean, calm, high-end premium photography aesthetic, warm tones, photorealistic.";
  
  for (const product of products) {
    console.log(`\n--- Processing [${product.slug}] ---`);
    
    const filename = `${product.slug}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      console.log(`[SKIP] ${filename} already exists.`);
      continue;
    }
    
    const prompt = `Realistic premium product photography of a ${(product as any).name}. ${(product as any).description} ${aesthetic}`;
    
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
  
  console.log("\n✅ All images generated via fal.ai!");
}

main().catch(console.error);
