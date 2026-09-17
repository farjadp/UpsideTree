import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const asTree = searchParams.get("tree");

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ collections: [], tree: [] });
  }

  const all = data || [];

  if (asTree) {
    const parents = all.filter((c: any) => !c.parent_id);
    const tree = parents.map((parent: any) => ({
      ...parent,
      children: all.filter((c: any) => String(c.parent_id) === String(parent.id)),
    }));
    return NextResponse.json({ tree });
  }

  return NextResponse.json({ collections: all });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({
        ...body,
        created_by: guard.userId,
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
