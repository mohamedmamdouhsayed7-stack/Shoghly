import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv, getSupabaseEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  const { APP_URL } = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(APP_URL).protocol === "https:",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The Proxy refreshes sessions.
        }
      },
    },
  });
}
