"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const name_en = formData.get("name_en") as string;
  const name_fa = formData.get("name_fa") as string;
  const slug = formData.get("slug") as string;
  const price = parseFloat(formData.get("price") as string);
  const status = formData.get("status") as string;
  // In a real app we would parse more fields, but keeping it simple for the placeholder

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name_en,
        name_fa,
        slug,
        price,
        status,
      },
    ]);

  if (error) {
    console.error("Error creating product:", error);
    return { error: error.message };
  }

  redirect("/admin/products");
}

export async function deleteProducts(productIds: string[]) {
  const ids = Array.from(new Set(productIds.filter(Boolean)));

  if (ids.length === 0) {
    return { error: "No products selected." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("products").delete().in("id", ids);

  if (error) {
    console.error("Error deleting products:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/products");

  return { success: true, deletedCount: ids.length };
}

export async function updateProduct(productId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const payload = {
    name_en: (formData.get("name_en") as string)?.trim() || null,
    name_fa: (formData.get("name_fa") as string)?.trim() || null,
    slug: (formData.get("slug") as string)?.trim() || null,
    description_en: (formData.get("description_en") as string)?.trim() || null,
    description_fa: (formData.get("description_fa") as string)?.trim() || null,
    price: Number(formData.get("price") || 0),
    currency: ((formData.get("currency") as string) || "CAD").trim(),
    stock_level: Number(formData.get("stock_level") || 0),
    status: ((formData.get("status") as string) || "Draft").trim(),
  };

  const { error } = await supabase.from("products").update(payload).eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/products/${payload.slug}`);
  redirect("/admin/products");
}
