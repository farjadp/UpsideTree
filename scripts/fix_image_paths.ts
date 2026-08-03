import fs from "fs";
import path from "path";

const tsFile = path.join(process.cwd(), "src", "lib", "mock", "products.ts");
let tsContent = fs.readFileSync(tsFile, "utf-8");

tsContent = tsContent.replace(/\/images\/products\/UT(\d+)-1\.jpg/g, "/images/products/IMG_$1.PNG");
tsContent = tsContent.replace(/\/images\/products\/UT(\d+)-2\.jpg/g, "/images/products/IMG_$1.PNG");

const productRegex = /(slug:\s*"([^"]+)",[\s\S]*?)images:\s*\[[\s\S]*?\]/g;

tsContent = tsContent.replace(productRegex, (match, beforeImages, slug) => {
  const imgPath = path.join(process.cwd(), "public", "images", "products", `${slug}.png`);
  if (fs.existsSync(imgPath)) {
    return `${beforeImages}images: ["/images/products/${slug}.png"]`;
  }
  return match;
});

tsContent = tsContent.replace(/\/images\/placeholder\.jpg/g, "/images/products/lion-and-sun-t-shirts.png");
tsContent = tsContent.replace(/\/images\/products\/yalda-night-ceremony-mug-mockup\.png/g, "/images/products/IMG_3526.PNG");
tsContent = tsContent.replace(/\/images\/products\/handmade-ceramic-bowl\.png/g, "/images/products/made-by-hand-item-1.png");
tsContent = tsContent.replace(/\/images\/products\/limited-story-print\.png/g, "/images/products/limited-stories-item-1.png");

fs.writeFileSync(tsFile, tsContent, "utf-8");
console.log("Fixed 404 image paths in products.ts");
