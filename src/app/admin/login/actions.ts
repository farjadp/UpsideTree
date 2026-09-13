"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const errorUrl = next
      ? `/admin/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
      : `/admin/login?error=${encodeURIComponent(error.message)}`;
    return redirect(errorUrl);
  }

  // Only ever redirect to a path within this app — `next` comes from a
  // query param, so treat it as untrusted rather than handing it straight
  // to redirect().
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  return redirect(safeNext);
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = (formData.get("first_name") as string) || "";
  const lastName = (formData.get("last_name") as string) || "";
  const supabase = await createClient();

  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The public.handle_new_user() trigger reads these two keys straight
      // out of raw_user_meta_data to fill in customer_profiles.first_name /
      // last_name — without sending them here, every new profile silently
      // keeps blank names forever with no way to backfill them later.
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return redirect(`/admin/register?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/admin/login?message=" + encodeURIComponent("Check your email to confirm your account"));
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    // Google sign-in isn't enabled on this Supabase project yet (checked
    // via /auth/v1/settings). Previously this failed with no redirect and
    // no message at all — the button just did nothing.
    return redirect(`/admin/login?error=${encodeURIComponent("Google sign-in isn't available yet. Use email instead.")}`);
  }

  redirect(data.url);
}

export async function signInWithGithub() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    return redirect(`/admin/login?error=${encodeURIComponent("GitHub sign-in isn't available yet. Use email instead.")}`);
  }

  redirect(data.url);
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // The reset link carries a one-time code that must be exchanged for a
  // session before the password can be changed. Sending it straight to
  // /admin/update-password skipped that exchange, so saving the new
  // password failed with no session. The callback exchanges, then forwards.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/admin/update-password")}`,
  });

  if (error) {
    return redirect(`/admin/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/admin/login?message=" + encodeURIComponent("Check your email for a password reset link"));
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return redirect(`/admin/update-password?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/admin/login?message=" + encodeURIComponent("Password updated successfully, please login"));
}

// Deliberately NOT exported: every export from a "use server" module is a
// callable server-action endpoint, so exporting this would expose one that
// takes a caller-supplied redirect target — an open-redirect waiting to
// happen. The two exported wrappers below hard-code their destination.
//
// They're also separate zero-arg actions rather than one parameterised
// action because a server action bound to <form action={fn}> is always
// invoked with the form's FormData as its first argument — passing this
// straight to a form would quietly pass FormData as `redirectTo`.
async function signOut(redirectTo: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect(redirectTo);
}

// Storefront customers should never land on the admin login screen after
// signing out — /account (a customer surface) was reusing the admin sign-out
// as-is and bouncing shoppers into the admin login page.
export async function signOutToHome() {
  return signOut("/");
}

export async function signOutFromAdmin() {
  return signOut("/admin/login");
}
