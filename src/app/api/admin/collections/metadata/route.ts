import { getCollectionMetadata } from "@/lib/collection-metadata";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing collection id" }, { status: 400 });
  }

  try {
    const metadata = await getCollectionMetadata(id);
    return NextResponse.json({ metadata });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load collection metadata" }, { status: 500 });
  }
}
