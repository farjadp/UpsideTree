import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function isMissingMediaLibraryError(error?: { message?: string | null; code?: string | null } | null) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "PGRST205" ||
    message.includes("media_library") ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("relation \"media_library\" does not exist")
  );
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

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

  if (error && !isMissingMediaLibraryError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminClient = getAdminClient();

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

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json({ error: bucketsError.message }, { status: 500 });
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === "media-library");

    if (!bucketExists) {
      const { error: bucketError } = await adminClient.storage.createBucket("media-library", {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
      });

      if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: bucketError.message }, { status: 500 });
      }
    } else {
      await adminClient.storage.updateBucket("media-library", {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
      });
    }

    // Upload to Supabase Storage bucket 'media-library'
    const { error: storageError } = await adminClient.storage
      .from("media-library")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = adminClient.storage
      .from("media-library")
      .getPublicUrl(filePath);

    // Determine file type
    let fileType = "document";
    if (file.type.startsWith("image/")) fileType = "image";
    else if (file.type.startsWith("video/")) fileType = "video";

    // Insert record in DB
    const { data: mediaRecord, error: dbError } = await adminClient
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

    if (dbError && !isMissingMediaLibraryError(dbError)) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      media:
        mediaRecord || {
          id: filePath,
          filename: fileName,
          original_name: file.name,
          url: publicUrl,
          thumbnail_url: publicUrl,
          file_type: fileType,
          mime_type: file.type,
          size_bytes: file.size,
          alt_text_en: altTextEn,
          alt_text_fa: altTextFa,
          folder,
          uploaded_by: user.id,
        },
    });
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

  const adminClient = getAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: mediaItem, error: mediaLookupError } = await adminClient
    .from("media_library")
    .select("url")
    .eq("id", id)
    .single();

  if (mediaLookupError && !isMissingMediaLibraryError(mediaLookupError)) {
    return NextResponse.json({ error: mediaLookupError.message }, { status: 500 });
  }

  if (mediaItem?.url) {
    const url = new URL(mediaItem.url);
    const marker = "/media-library/";
    const index = url.pathname.indexOf(marker);
    if (index >= 0) {
      const filePath = decodeURIComponent(url.pathname.slice(index + marker.length));
      await adminClient.storage.from("media-library").remove([filePath]);
    }
  }

  const { error } = await adminClient.from("media_library").delete().eq("id", id);

  if (error && !isMissingMediaLibraryError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
