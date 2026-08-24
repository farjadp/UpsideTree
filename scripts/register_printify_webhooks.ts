// Register (or verify) the Printify webhooks that power live catalog sync
// and order-tracking updates. Idempotent: skips topics already registered
// for the same URL.
// Run: npx -y tsx scripts/register_printify_webhooks.ts
import "dotenv/config";

const BASE = "https://api.printify.com/v1";
const WEBHOOK_URL = process.env.PRINTIFY_WEBHOOK_URL ?? "https://www.upsidetree.ca/api/printify/webhook";

const TOPICS = [
  "product:publish:started",
  "product:deleted",
  "order:sent-to-production",
  "order:shipment:created",
  "order:shipment:delivered",
];

type Webhook = { id: string; topic: string; url: string };

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : (undefined as T);
}

async function main() {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!shopId || !process.env.PRINTIFY_API_TOKEN) throw new Error("PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID missing");
  if (!secret) throw new Error("PRINTIFY_WEBHOOK_SECRET missing — generate one and set it in .env.local AND Vercel");

  const existing = await api<Webhook[]>(`/shops/${shopId}/webhooks.json`);
  console.log(`existing webhooks: ${existing.length}`);
  for (const w of existing) console.log(`  ${w.topic} -> ${w.url}`);

  for (const topic of TOPICS) {
    const match = existing.find((w) => w.topic === topic && w.url === WEBHOOK_URL);
    if (match) {
      console.log(`ok      ${topic} (already registered)`);
      continue;
    }
    // Same topic pointed elsewhere (old tunnel, old domain) — replace it.
    const stale = existing.find((w) => w.topic === topic);
    if (stale) {
      await api(`/shops/${shopId}/webhooks/${stale.id}.json`, { method: "DELETE" });
      console.log(`deleted ${topic} -> ${stale.url}`);
    }
    const created = await api<Webhook>(`/shops/${shopId}/webhooks.json`, {
      method: "POST",
      body: JSON.stringify({ topic, url: WEBHOOK_URL, secret }),
    });
    console.log(`created ${topic} (id ${created.id})`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
