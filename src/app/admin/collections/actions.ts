"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function createCollection(formData: FormData) {
  const name_en = formData.get("name_en") as string;
  const name_fa = formData.get("name_fa") as string;
  const slug = formData.get("slug") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();

  // Validate user is authenticated (RLS will also block, but good to check)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("collections")
    .insert([
      {
        name_en,
        name_fa,
        slug,
        status,
      },
    ]);

  if (error) {
    console.error("Error creating collection:", error);
    return { error: error.message };
  }

  redirect("/admin/collections");
}
