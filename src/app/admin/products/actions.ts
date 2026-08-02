"use server";

import { createClient } from "@/utils/supabase/server";
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
