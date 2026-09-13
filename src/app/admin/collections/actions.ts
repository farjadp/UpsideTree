"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

export async function createCollection(formData: FormData) {
  const name_en = formData.get("name_en") as string;
  const name_fa = formData.get("name_fa") as string;
  const slug = formData.get("slug") as string;
  const status = formData.get("status") as string;
  const cover_image_url = formData.get("cover_image_url") as string;
  const parent_id = formData.get("parent_id") as string;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const uniqueSlug = await ensureUniqueCollectionSlug(supabase, slug || name_en);

  const { error } = await supabase.from("collections").insert({
    name_en,
    name_fa,
    slug: uniqueSlug,
    parent_id: parent_id || null,
    status,
    cover_image_url: cover_image_url || null,
    banner_image_url: cover_image_url || null,
    created_by: user.id,
  });

  if (error) {
    console.error("Error creating collection:", error);
    return { error: error.message };
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
  const parent_id = formData.get("parent_id") as string;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) {
    return { error: "Invalid collection id." };
  }

  const uniqueSlug = await ensureUniqueCollectionSlug(supabase, slug || name_en, id);

  const { error } = await supabase
    .from("collections")
    .update({
      name_en,
      name_fa,
      slug: uniqueSlug,
      parent_id: parent_id || null,
      status,
      cover_image_url: cover_image_url || null,
      banner_image_url: cover_image_url || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating collection:", error);
    return { error: error.message };
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

  const { error } = await supabase
    .from("collections")
    .update({ featured: !currentFeatured })
    .eq("id", id);

  if (error) {
    console.error("Error toggling collection homepage visibility:", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/admin/collections");
}

export async function deleteCollection(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) {
    console.error("Error deleting collection:", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/admin/collections");
}
