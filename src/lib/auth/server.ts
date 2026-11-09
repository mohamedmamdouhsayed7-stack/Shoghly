import "server-only";

import type { User } from "@supabase/supabase-js";
import { getSupabaseEnv, MissingSupabaseConfigurationError } from "@/lib/env";
import type { Permission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export type AccountAccess =
  | { kind: "unconfigured" }
  | { kind: "anonymous" }
  | { kind: "unverified"; user: User }
  | { kind: "suspended"; user: User }
  | { kind: "disabled"; user: User }
  | { kind: "unavailable" }
  | { kind: "active"; user: User; supabase: SupabaseServerClient };

export async function getAccountAccess(): Promise<AccountAccess> {
  try {
    getSupabaseEnv();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return { kind: "unavailable" };
    if (!user) return { kind: "anonymous" };
    if (!user.email_confirmed_at) return { kind: "unverified", user };

    const { data: accountStatus, error: statusError } = await supabase.rpc(
      "get_my_account_status",
    );
    if (statusError || typeof accountStatus !== "string") {
      return { kind: "unavailable" };
    }
    if (accountStatus === "suspended") return { kind: "suspended", user };
    if (accountStatus === "disabled") return { kind: "disabled", user };
    if (accountStatus !== "active") return { kind: "unavailable" };

    return { kind: "active", user, supabase };
  } catch (error) {
    if (error instanceof MissingSupabaseConfigurationError) {
      return { kind: "unconfigured" };
    }
    return { kind: "unavailable" };
  }
}

export type PermissionAccess =
  | Exclude<AccountAccess, { kind: "active" }>
  | { kind: "forbidden"; user: User }
  | { kind: "allowed"; user: User; supabase: SupabaseServerClient };

export async function getPermissionAccess(
  permission: Permission,
): Promise<PermissionAccess> {
  const access = await getAccountAccess();
  if (access.kind !== "active") return access;

  try {
    const { data, error } = await access.supabase.rpc("has_permission", {
      permission_name: permission,
    });
    if (error) return { kind: "unavailable" };
    if (data !== true) return { kind: "forbidden", user: access.user };

    return {
      kind: "allowed",
      user: access.user,
      supabase: access.supabase,
    };
  } catch {
    return { kind: "unavailable" };
  }
}
