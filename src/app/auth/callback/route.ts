import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getServerEnv,
  getSupabaseEnv,
  MissingSupabaseConfigurationError,
} from "@/lib/env";
import { safeNextPath } from "@/lib/auth/schemas";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const isRecoveryFlow =
    requestUrl.searchParams.get("next") === "/reset-password";
  const expiredState = isRecoveryFlow
    ? "/auth/error?state=expired&flow=recovery"
    : "/auth/error?state=expired";
  let appUrl: string;
  try {
    appUrl = getServerEnv().APP_URL;
  } catch {
    return NextResponse.json(
      { error: "APP_URL_CONFIGURATION_REQUIRED" },
      { status: 503 },
    );
  }
  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL(expiredState, appUrl));
  }

  let env;
  try {
    env = getSupabaseEnv();
  } catch (error) {
    const destination =
      error instanceof MissingSupabaseConfigurationError
        ? "/auth/configuration"
        : "/auth/error";
    return NextResponse.redirect(new URL(destination, appUrl));
  }

  const { APP_URL } = getServerEnv();

  const cookiesToSet: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];
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
        setAll(cookies) {
          cookiesToSet.push(...cookies);
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const path = error
    ? expiredState
    : safeNextPath(requestUrl.searchParams.get("next"), "/profile");
  const response = NextResponse.redirect(new URL(path, appUrl));
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
