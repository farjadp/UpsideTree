import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder");
  const fileType = searchParams.get("file_type");
  const search = searchParams.get("search");

  const supabase = await createClient();

  let query = supabase.from("media_library").select("*").order("created_at", { ascending: false });

  if (folder && folder !== "all") {
    query = query.eq("folder", folder);
  }

  if (fileType && fileType !== "all") {
    query = query.eq("file_type", fileType);
  }

  if (search) {
    query = query.or(`original_name.ilike.%${search}%,alt_text_en.ilike.%${search}%,alt_text_fa.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uncategorized";
    const altTextEn = (formData.get("alt_text_en") as string) || "";
    const altTextFa = (formData.get("alt_text_fa") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage bucket 'media-library'
    const { data: storageData, error: storageError } = await supabase.storage
      .from("media-library")
      .upload(filePath, file);

    if (storageError) {
      // If bucket doesn't exist yet, fallback to public URL or return error
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("media-library")
      .getPublicUrl(filePath);

    // Determine file type
    let fileType = "document";
    if (file.type.startsWith("image/")) fileType = "image";
    else if (file.type.startsWith("video/")) fileType = "video";

    // Insert record in DB
    const { data: mediaRecord, error: dbError } = await supabase
      .from("media_library")
      .insert({
        filename: fileName,
        original_name: file.name,
        url: publicUrl,
        thumbnail_url: publicUrl,
        file_type: fileType,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text_en: altTextEn,
        alt_text_fa: altTextFa,
        folder: folder,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ media: mediaRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process upload" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing media ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("media_library").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
