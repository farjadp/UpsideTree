import { NextResponse } from "next/server";
import { after } from "next/server";
import { handleTelegramUpdate } from "@/lib/social/approval";
import { getServiceClient, rerenderStory, runAutopost } from "@/lib/social/autopost";

// Telegram webhook for the approval bot. Register it once per deploy:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//     -d url=https://www.upsidetree.ca/api/social/telegram \
//     -d secret_token=$TELEGRAM_WEBHOOK_SECRET \
//     -d allowed_updates='["message","callback_query"]'
// Telegram retries an update until it gets a 200, so this always answers 200
// once the secret checks out, and does the slow work (images, re-rendering,
// publishing) after the response.

export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  if (!update || typeof update !== "object") return NextResponse.json({ ok: true });

  try {
    const supabase = getServiceClient();
    const outcome = await handleTelegramUpdate(supabase, update);
    const runProduct = outcome?.publish ?? outcome?.generate ?? outcome?.requeue;
    const rerender = outcome?.rerender;
    if (runProduct || rerender) {
      after(async () => {
        try {
          if (rerender) await rerenderStory(supabase, rerender);
          else await runAutopost(supabase, { productId: runProduct });
        } catch (error) {
          console.error("Work after a Telegram decision failed:", error);
        }
      });
    }
  } catch (error) {
    // Logged, not returned: a 500 would make Telegram resend the same tap.
    console.error("Telegram webhook failed:", error);
  }
  return NextResponse.json({ ok: true });
}
