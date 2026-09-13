import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runAutopost } from "@/lib/social/autopost";

// Social auto-post queue runner. Called by Vercel Cron (vercel.json) with
// `Authorization: Bearer ${CRON_SECRET}`, or by a signed-in admin.
// Handles one product per call: copy + image generation + three API posts
// can take a couple of minutes.

export const maxDuration = 300;

async function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) return true;
  return (await requireAdmin()).ok;
}

async function handle(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await runAutopost());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social autopost failed.";
    console.error("Social autopost run failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
