import fs from "fs";
import path from "path";

const filepath = path.join(process.cwd(), "src", "lib", "mock", "products.ts");
let content = fs.readFileSync(filepath, "utf-8");

// Regex to find images array and replace it based on the slug that comes right before it
// The structure is: slug: "...", ... images: [ "..." ],
// Let's use a simpler approach: we can just match each product block, extract the slug, and replace its images array.

const productRegex = /(slug:\s*"([^"]+)",[\s\S]*?)images:\s*\[[\s\S]*?\]/g;

content = content.replace(productRegex, (match, beforeImages, slug) => {
  const newImages = `images: [
      "/images/products/${slug}-mockup.png",
      "/images/products/${slug}-flat.png",
      "/images/products/${slug}-lifestyle.png"
    ]`;
  return `${beforeImages}${newImages}`;
});

fs.writeFileSync(filepath, content, "utf-8");
console.log("Updated products.ts to point to local DALL-E images.");
