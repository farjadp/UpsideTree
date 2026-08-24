// Manual trigger for the Printify catalog mirror (same code path as the
// cron/webhook). Run: npx -y tsx scripts/run_catalog_sync.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { syncPrintifyCatalog } from "@/lib/printify-sync";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const result = await syncPrintifyCatalog(supabase, { forceRefresh: true });
  console.log(JSON.stringify(result, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
