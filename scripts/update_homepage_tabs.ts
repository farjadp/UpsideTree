import fs from "fs";
import path from "path";

const tsFile = path.join(process.cwd(), "src", "app", "(storefront)", "page.tsx");
let tsContent = fs.readFileSync(tsFile, "utf-8");

// 1. Add Tabs import if missing
if (!tsContent.includes("@/components/ui/tabs")) {
  tsContent = tsContent.replace(
    /import \{ Button \} from "@\/components\/ui\/Button";/,
    `import { Button } from "@/components/ui/Button";\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";`
  );
}

// 2. Rewrite ProductCarouselSection
const oldComponentRegex = /\/\/\s*-+\n\/\/ Helper: Product Carousel Section[\s\S]*?}\n/;

const newComponent = `// ------------------------------------------------------------------
// Helper: Product Carousel Section (Tabs version)
// ------------------------------------------------------------------
function ProductCarouselSection({ products }: { products: Product[] }) {
  if (!products || products.length === 0) return null;
  return (
    <div
      className={cn(
        "flex gap-5",
        "snap-container pb-4 pt-2 -mx-5 px-5 sm:-mx-8 sm:px-8"
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
  );
}
`;

tsContent = tsContent.replace(oldComponentRegex, newComponent);

// 3. Rewrite SECTION 3
const oldSection3 = /\{\/\*\s*={60}\n\s*SECTION 3: PRODUCT CAROUSELS[\s\S]*?<\/div>/;

const newSection3 = `{/* ============================================================
          SECTION 3: PRODUCT TABS
          ============================================================ */}
      <section className="py-24 bg-ivory-200">
        <div className="container mx-auto px-5 sm:px-8">
          <Tabs defaultValue="new" className="w-full">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6">
              <div>
                <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-2">
                  Discover
                </p>
                <h2 className="font-display text-display-sm text-lapis-500 font-semibold flex items-center gap-4">
                  <span>Curated Picks</span>
                  <span className="font-persian text-2xl text-ink-300">|</span>
                  <span className="font-persian text-2xl" dir="rtl">انتخاب‌های ویژه</span>
                </h2>
              </div>
              <TabsList className="bg-ivory-300/50 p-1">
                <TabsTrigger value="new" className="font-persian text-lg data-[state=active]:bg-ivory-100">جدیدترین ها</TabsTrigger>
                <TabsTrigger value="best" className="font-persian text-lg data-[state=active]:bg-ivory-100">پرفروش ترین ها</TabsTrigger>
                <TabsTrigger value="trending" className="font-persian text-lg data-[state=active]:bg-ivory-100">پر بازدیدترین ها</TabsTrigger>
                <TabsTrigger value="picks" className="font-persian text-lg data-[state=active]:bg-ivory-100">به انتخاب ما</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="new" className="mt-0 outline-none">
              <ProductCarouselSection products={newestProducts} />
            </TabsContent>
            <TabsContent value="best" className="mt-0 outline-none">
              <ProductCarouselSection products={bestSellingProducts} />
            </TabsContent>
            <TabsContent value="trending" className="mt-0 outline-none">
              <ProductCarouselSection products={mostVisitedProducts} />
            </TabsContent>
            <TabsContent value="picks" className="mt-0 outline-none">
              <ProductCarouselSection products={ourPicksProducts} />
            </TabsContent>
          </Tabs>
        </div>
      </section>`;

tsContent = tsContent.replace(oldSection3, newSection3);

fs.writeFileSync(tsFile, tsContent, "utf-8");
console.log("Homepage converted to Tabs.");
