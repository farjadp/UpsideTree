import fs from "fs";
import path from "path";

const tsFile = path.join(process.cwd(), "src", "app", "(storefront)", "page.tsx");
let tsContent = fs.readFileSync(tsFile, "utf-8");

// 1. Replace imports
tsContent = tsContent.replace(
  /import \{ getFeaturedProducts \} from "@\/lib\/mock\/products";/,
  `import { getNewestProducts, getBestSellingProducts, getMostVisitedProducts, getOurPicksProducts } from "@/lib/mock/products";\nimport type { Product } from "@/lib/mock/products";`
);

// 2. Replace data fetching
tsContent = tsContent.replace(
  /const featuredProducts\s*=\s*getFeaturedProducts\(6\);/,
  `const newestProducts      = getNewestProducts(6);\nconst bestSellingProducts = getBestSellingProducts(6);\nconst mostVisitedProducts = getMostVisitedProducts(6);\nconst ourPicksProducts    = getOurPicksProducts(6);`
);

// 3. Define the new Carousel component right above export default function HomePage() {
const carouselComponent = `
// ------------------------------------------------------------------
// Helper: Product Carousel Section
// ------------------------------------------------------------------
function ProductCarouselSection({ titleEn, titleFa, subtitle, products }: { titleEn: string, titleFa: string, subtitle: string, products: Product[] }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="py-16 overflow-hidden bg-ivory-200/50">
      <div className="container mx-auto mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-2">
              {subtitle}
            </p>
            <h2 className="font-display text-display-sm text-lapis-500 font-semibold flex items-center gap-4">
              <span>{titleEn}</span>
              <span className="font-persian text-2xl text-ink-300">|</span>
              <span className="font-persian text-2xl" dir="rtl">{titleFa}</span>
            </h2>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "flex gap-5 px-5 sm:px-8 lg:px-[max(2.5rem,calc((100vw-80rem)/2))]",
          "snap-container pb-4"
        )}
        role="region"
        tabIndex={0}
      >
        {products.map((product) => (
          <div key={product.id} className="snap-item w-[260px] sm:w-[280px] shrink-0">
            <ProductCard product={product} variant="default" />
          </div>
        ))}
      </div>
    </section>
  );
}
`;

tsContent = tsContent.replace(
  "export default function HomePage() {",
  `${carouselComponent}\nexport default function HomePage() {`
);

// 4. Replace SECTION 3 block
const oldSection3 = /\/\* ============================================================\s*SECTION 3: FEATURED PRODUCTS[\s\S]*?<\/section>/;

const newSection3 = `      {/* ============================================================
          SECTION 3: PRODUCT CAROUSELS
          ============================================================ */}
      <div className="bg-ivory-200">
        <ProductCarouselSection titleEn="New Arrivals" titleFa="جدیدترین ها" subtitle="Just Landed" products={newestProducts} />
        <ProductCarouselSection titleEn="Best Sellers" titleFa="پرفروش ترین ها" subtitle="Loved by Many" products={bestSellingProducts} />
        <ProductCarouselSection titleEn="Trending" titleFa="پر بازدیدترین ها" subtitle="Most Visited" products={mostVisitedProducts} />
        <ProductCarouselSection titleEn="Our Picks" titleFa="به انتخاب ما" subtitle="Curated for You" products={ourPicksProducts} />
      </div>`;

tsContent = tsContent.replace(oldSection3, newSection3);

fs.writeFileSync(tsFile, tsContent, "utf-8");
console.log("Homepage updated successfully.");
