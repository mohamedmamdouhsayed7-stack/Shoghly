import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getServerEnv,
  getSupabaseEnv,
  MissingSupabaseConfigurationError,
} from "@/lib/env";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const env = getSupabaseEnv();
    const { APP_URL } = getServerEnv();
    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_PUBLISHABLE_KEY,
      {
        cookieOptions: {
          httpOnly: true,
          sameSite: "lax",
          secure: new URL(APP_URL).protocol === "https:",
          path: "/",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet, headers) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
            for (const [name, value] of Object.entries(headers ?? {})) {
              if (value) response.headers.set(name, value);
            }
          },
        },
      },
    );

    await supabase.auth.getClaims();
  } catch (error) {
    if (!(error instanceof MissingSupabaseConfigurationError)) throw error;
  }

  if (
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/admin")
  ) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}
