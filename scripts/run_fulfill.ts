// One-off: run fulfillOrder for a given order id (resume path included).
// Run: npx -y tsx scripts/run_fulfill.ts <order-uuid>
import "dotenv/config";
import { fulfillOrder } from "@/lib/fulfillment";

fulfillOrder(process.argv[2], "admin").then((r) => {
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
});
