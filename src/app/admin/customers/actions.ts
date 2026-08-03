"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Helper to get an admin client for creating/deleting auth users
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Cannot perform admin operations on users.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createCustomer(formData: FormData): Promise<void> {
  const supabaseClient = await createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const role = formData.get("role") as string;
  const phone = formData.get("phone") as string;
  const birth_date = formData.get("birth_date") as string;
  const gender = formData.get("gender") as string;
  const preferred_language = formData.get("preferred_language") as string;
  const preferred_currency = formData.get("preferred_currency") as string;
  const bio = formData.get("bio") as string;
  const is_iranian_diaspora = formData.get("is_iranian_diaspora") === "on";

  const adminAuthClient = getAdminClient();

  // Create the user in Auth
  const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name,
      last_name,
    }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("Failed to create user in Auth.");
  }

  // Wait briefly for the trigger to insert the customer_profile
  // We just need to update it with the correct role and new details
  
  const { error: profileError } = await adminAuthClient
    .from("customer_profiles")
    .update({
      first_name,
      last_name,
      role: role || "CUSTOMER",
      phone: phone || null,
      birth_date: birth_date || null,
      gender: gender || null,
      preferred_language: preferred_language || 'en',
      preferred_currency: preferred_currency || 'CAD',
      bio: bio || null,
      is_iranian_diaspora
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error("Error updating profile after creation:", profileError);
    throw new Error("User created, but failed to update profile details.");
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export async function updateCustomer(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const phone = formData.get("phone") as string;
  const role = formData.get("role") as string;
  const account_status = formData.get("account_status") as string;
  const birth_date = formData.get("birth_date") as string;
  const gender = formData.get("gender") as string;
  const preferred_language = formData.get("preferred_language") as string;
  const preferred_currency = formData.get("preferred_currency") as string;
  const bio = formData.get("bio") as string;
  const is_iranian_diaspora = formData.get("is_iranian_diaspora") === "on";

  const { error } = await supabase
    .from("customer_profiles")
    .update({
      first_name,
      last_name,
      phone: phone || null,
      role,
      account_status,
      birth_date: birth_date || null,
      gender: gender || null,
      preferred_language: preferred_language || 'en',
      preferred_currency: preferred_currency || 'CAD',
      bio: bio || null,
      is_iranian_diaspora,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}/edit`);
  redirect("/admin/customers");
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabaseClient = await createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Don't let the user delete themselves
  if (user.id === id) {
    throw new Error("You cannot delete your own account.");
  }

  const adminAuthClient = getAdminClient();
  const { error } = await adminAuthClient.auth.admin.deleteUser(id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
