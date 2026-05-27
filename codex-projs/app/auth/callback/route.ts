import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Handles Supabase email links: invite, magic-link, password-reset, email-change.
 * Supabase redirects here with ?token_hash=...&type=...
 * We exchange the token for a session then redirect accordingly.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "invite"
    | "recovery"
    | "magiclink"
    | "email_change"
    | null;
  const next = searchParams.get("next") ?? "/admin/schedule";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=missing_token", origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => cookieStore.set({ name, value, ...options }),
      remove: (name, options) => cookieStore.set({ name, value: "", ...options, maxAge: 0 })
    }
  });

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    console.error("[auth/callback] verifyOtp error:", error.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
  }

  // For invites — send to set-password page so user can choose a password
  if (type === "invite") {
    return NextResponse.redirect(new URL("/auth/set-password", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
