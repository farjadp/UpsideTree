import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { applyCollectionMetadata, getCollectionMetadataMap } from "@/lib/collection-metadata";

export async function GET() {
  const supabase = await createClient();
  const attempts = [
    () => supabase.from("collections").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    () => supabase.from("collections").select("*").order("created_at", { ascending: false }),
    () => supabase.from("collections").select("*"),
  ];

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error) {
      const metadata = await getCollectionMetadataMap();
      return NextResponse.json({ collections: applyCollectionMetadata(data || [], metadata) });
    }
  }

  return NextResponse.json({ collections: [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("collections")
      .insert({
        ...body,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ collection: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
