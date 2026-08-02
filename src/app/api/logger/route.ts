import { NextRequest, NextResponse } from "next/server";
import { insertUserActivities } from "@/lib/logger/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    if (!data.activities || !Array.isArray(data.activities)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Extract headers for implicit info (IP, Country)
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "unknown";

    // Attach server-determined IP and location to events
    const activitiesWithIP = data.activities.map((a: any) => ({
      ...a,
      ip_address: a.ip_address || ip,
      country: a.country || country,
    }));

    // Insert to DB async
    await insertUserActivities(activitiesWithIP);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logger API Error:", error);
    // Always return 200 to client to avoid console errors/noise on the frontend
    return NextResponse.json({ success: false }); 
  }
}
