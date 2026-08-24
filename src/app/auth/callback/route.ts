import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Every non-admin visitor landing on /admin gets bounced straight
      // back out by middleware anyway — send them to the right place the
      // first time instead of round-tripping through /admin.
      let next = explicitNext;
      if (!next) {
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        // /account itself has no page yet (only /account/loyalty exists) —
        // land customers there until the rest of the account section is built.
        next = profile?.role === "ADMIN" ? "/admin" : "/account/loyalty";
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/admin/login?error=auth-callback-failed`);
}
