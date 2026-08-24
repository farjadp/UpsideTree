import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { isPrintifyConfigured } from "@/lib/printify";
import { syncPrintifyCatalog } from "@/lib/printify-sync";

// Catalog mirror endpoint. Two legitimate callers:
//   1. Vercel Cron (vercel.json) — Vercel injects `Authorization: Bearer
//      ${CRON_SECRET}` on cron invocations when the env var is set.
//   2. A signed-in admin poking it manually (POST from the admin UI or curl
//      with their session cookie).
// Everything else is rejected; this route mutates the catalog.

export const maxDuration = 120;

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  const guard = await requireAdmin();
  return guard.ok;
}

async function handleSync(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isPrintifyConfigured()) {
    return NextResponse.json(
      { error: "PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID are not set." },
      { status: 503 }
    );
  }

  try {
    const result = await syncPrintifyCatalog(getAdminClient());
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog sync failed.";
    console.error("Printify catalog sync failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
