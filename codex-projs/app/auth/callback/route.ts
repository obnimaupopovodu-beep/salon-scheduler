import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

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
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: Partial<ResponseCookie>) =>
        cookieStore.set({ name, value, ...options }),
      remove: (name: string, options: Partial<ResponseCookie>) =>
        cookieStore.set({ name, value: "", ...options, maxAge: 0 })
    }
  });

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    console.error("[auth/callback] verifyOtp error:", error.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  if (type === "invite") {
    return NextResponse.redirect(new URL("/auth/set-password", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
