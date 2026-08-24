// One-off: import Printify products that don't yet exist locally.
// Run: npx -y tsx --conditions react-server scripts/import_printify_missing.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { listPrintifyProducts } from "@/lib/printify";
import { createProductFromPrintify } from "@/lib/printify-catalog";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const remote = await listPrintifyProducts();
  const { data: local, error } = await supabase
    .from("products")
    .select("printify_product_id")
    .not("printify_product_id", "is", null);
  if (error) throw new Error(error.message);

  const linked = new Set(local.map((p) => p.printify_product_id));
  const missing = remote.filter((p) => !linked.has(p.id));
  console.log(`Printify: ${remote.length} products, already linked: ${linked.size}, importing: ${missing.length}`);

  for (const p of missing) {
    process.stdout.write(`importing ${p.id} "${p.title}" ... `);
    try {
      const res = await createProductFromPrintify(supabase, p.id);
      console.log(`OK slug=${res.slug} variants=${JSON.stringify(res).slice(0, 120)}`);
    } catch (e) {
      console.log(`FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
