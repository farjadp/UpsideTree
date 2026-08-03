"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { updateCollectionMetadata } from "@/lib/collection-metadata";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function ensureUniqueCollectionSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawSlug: string,
  currentId?: string,
) {
  const baseSlug = slugify(rawSlug) || `collection-${Date.now()}`;

  const { data, error } = await supabase
    .from("collections")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    return baseSlug;
  }

  const usedSlugs = new Set(
    (data || [])
      .filter((entry) => entry.id !== currentId)
      .map((entry) => String(entry.slug).toLowerCase())
  );

  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let nextSlug = `${baseSlug}-${suffix}`;
  while (usedSlugs.has(nextSlug)) {
    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }

  return nextSlug;
}

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

function getMissingCollectionsColumn(error?: { message?: string | null; code?: string | null } | null) {
  if (!isMissingCollectionsColumnError(error)) {
    return null;
  }

  const match = error?.message?.match(/Could not find the '([^']+)' column of 'collections'/i);
  return match?.[1] || null;
}

async function insertCollectionWithCompatibleImageColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  basePayload: Record<string, unknown>,
  imageUrl: string,
) {
  const payloadVariants = [
    { ...basePayload, cover_image_url: imageUrl || null },
    { ...basePayload, banner_image_url: imageUrl || null },
    basePayload,
  ];

  let lastError: { message?: string | null; code?: string | null } | null = null;

  for (const initialPayload of payloadVariants) {
    const payload = { ...initialPayload };

    while (Object.keys(payload).length > 0) {
      const { data, error } = await supabase.from("collections").insert([payload]).select("*").single();
      if (!error) {
        return { data, error: null };
      }

      lastError = error;

      const missingColumn = getMissingCollectionsColumn(error);
      if (!missingColumn || !(missingColumn in payload)) {
        break;
      }

      delete payload[missingColumn];
    }

    if (lastError && !isMissingCollectionsColumnError(lastError)) {
      return { data: null, error: lastError };
    }
  }

  return { data: null, error: lastError };
}

async function updateCollectionWithCompatibleImageColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  basePayload: Record<string, unknown>,
  imageUrl: string,
) {
  const payloadVariants = [
    { ...basePayload, cover_image_url: imageUrl || null },
    { ...basePayload, banner_image_url: imageUrl || null },
    basePayload,
  ];

  let lastError: { message?: string | null; code?: string | null } | null = null;

  for (const initialPayload of payloadVariants) {
    const payload = { ...initialPayload };

    while (Object.keys(payload).length > 0) {
      const { error } = await supabase.from("collections").update(payload).eq("id", id);
      if (!error) {
        return null;
      }

      lastError = error;

      const missingColumn = getMissingCollectionsColumn(error);
      if (!missingColumn || !(missingColumn in payload)) {
        break;
      }

      delete payload[missingColumn];
    }

    if (lastError && !isMissingCollectionsColumnError(lastError)) {
      return lastError;
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

  const uniqueSlug = await ensureUniqueCollectionSlug(supabase, slug || name_en);

  const payload = {
    name_en,
    name_fa,
    slug: uniqueSlug,
    status,
    created_by: user.id,
  };

  const { data: collection, error } = await insertCollectionWithCompatibleImageColumn(supabase, payload, cover_image_url);

  if (error) {
    console.error("Error creating collection:", error);
    return { error: error.message };
  }

  if (collection?.id && cover_image_url) {
    await updateCollectionMetadata(String(collection.id), {
      cover_image_url,
      banner_image_url: cover_image_url,
    });
  }

  revalidatePath("/");
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

  const uniqueSlug = await ensureUniqueCollectionSlug(supabase, slug || name_en, id);

  const payload = {
    name_en,
    name_fa,
    slug: uniqueSlug,
    status,
  };

  const error = await updateCollectionWithCompatibleImageColumn(supabase, id, payload, cover_image_url);

  if (error) {
    console.error("Error updating collection:", error);
    return { error: error.message };
  }

  if (cover_image_url) {
    await updateCollectionMetadata(id, {
      cover_image_url,
      banner_image_url: cover_image_url,
    });
  }

  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}/edit`);
  redirect("/admin/collections");
}

export async function toggleCollectionHomepage(id: string, currentFeatured: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await updateCollectionMetadata(id, { featured: !currentFeatured });
  } catch (error) {
    console.error("Error toggling collection homepage visibility:", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/admin/collections");
}
