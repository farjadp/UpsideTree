"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function isMissingCollectionsColumnError(error?: { message?: string | null; code?: string | null } | null, columnName?: string) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    ((columnName ? message.includes(columnName.toLowerCase()) : true) &&
      (message.includes("schema cache") ||
        message.includes("could not find the") ||
        message.includes("column")))
  );
}

async function insertCollectionWithCompatibleImageColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  basePayload: Record<string, unknown>,
  imageUrl: string,
) {
  const attempts = [
    { ...basePayload, cover_image_url: imageUrl || null },
    { ...basePayload, banner_image_url: imageUrl || null },
    basePayload,
  ];

  let lastError: { message?: string | null; code?: string | null } | null = null;

  for (const payload of attempts) {
    const { error } = await supabase.from("collections").insert([payload]);
    if (!error) {
      return null;
    }

    lastError = error;

    if (!isMissingCollectionsColumnError(error)) {
      return error;
    }
  }

  return lastError;
}

async function updateCollectionWithCompatibleImageColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  basePayload: Record<string, unknown>,
  imageUrl: string,
) {
  const attempts = [
    { ...basePayload, cover_image_url: imageUrl || null },
    { ...basePayload, banner_image_url: imageUrl || null },
    basePayload,
  ];

  let lastError: { message?: string | null; code?: string | null } | null = null;

  for (const payload of attempts) {
    const { error } = await supabase.from("collections").update(payload).eq("id", id);
    if (!error) {
      return null;
    }

    lastError = error;

    if (!isMissingCollectionsColumnError(error)) {
      return error;
    }
  }

  return lastError;
}

export async function createCollection(formData: FormData) {
  const name_en = formData.get("name_en") as string;
  const name_fa = formData.get("name_fa") as string;
  const slug = formData.get("slug") as string;
  const status = formData.get("status") as string;
  const cover_image_url = formData.get("cover_image_url") as string;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const payload = {
    name_en,
    name_fa,
    slug,
    status,
    created_by: user.id,
  };

  const error = await insertCollectionWithCompatibleImageColumn(supabase, payload, cover_image_url);

  if (error) {
    console.error("Error creating collection:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/collections");
  redirect("/admin/collections");
}

export async function editCollection(id: string, formData: FormData) {
  const name_en = formData.get("name_en") as string;
  const name_fa = formData.get("name_fa") as string;
  const slug = formData.get("slug") as string;
  const status = formData.get("status") as string;
  const cover_image_url = formData.get("cover_image_url") as string;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) {
    return { error: "This is a sample/mock collection. Please create a real collection before editing." };
  }

  const payload = {
    name_en,
    name_fa,
    slug,
    status,
  };

  const error = await updateCollectionWithCompatibleImageColumn(supabase, id, payload, cover_image_url);

  if (error) {
    console.error("Error updating collection:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}/edit`);
  redirect("/admin/collections");
}
