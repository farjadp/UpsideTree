import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/admin/login") || 
                     request.nextUrl.pathname.startsWith("/admin/register") || 
                     request.nextUrl.pathname.startsWith("/admin/forgot-password") || 
                     request.nextUrl.pathname.startsWith("/admin/update-password");

  if (!user && request.nextUrl.pathname.startsWith("/admin") && !isAuthPage) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // RBAC: If user is logged in and trying to access /admin (not auth pages)
  if (user && request.nextUrl.pathname.startsWith("/admin") && !isAuthPage) {
    // Fetch user role from customer_profiles table
    const { data: profile } = await supabase
      .from('customer_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      // Not an admin, redirect to customer account page (or home)
      const url = request.nextUrl.clone();
      url.pathname = "/account/loyalty";
      return NextResponse.redirect(url);
    }
  }

  // Allow logged-in users to access /admin/login by redirecting them to /admin
  if (
    user &&
    request.nextUrl.pathname === "/admin/login"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
