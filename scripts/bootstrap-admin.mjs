import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";

const {
  APP_ENV,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BOOTSTRAP_ADMIN_USER_ID,
} = process.env;

function isLoopback(hostname) {
  const normalizedHostname =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    (isIP(normalizedHostname) === 4 && normalizedHostname.startsWith("127."))
  );
}

if (APP_ENV !== "development" || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Bootstrap requires APP_ENV=development and a local Supabase URL with a service role key.",
  );
  process.exit(1);
}

let projectUrl;
try {
  projectUrl = new URL(SUPABASE_URL);
} catch {
  console.error("SUPABASE_URL is invalid.");
  process.exit(1);
}

if (!isLoopback(projectUrl.hostname)) {
  console.error("Bootstrap is restricted to a local Supabase instance.");
  process.exit(1);
}

if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    BOOTSTRAP_ADMIN_USER_ID ?? "",
  )
) {
  console.error(
    "Set BOOTSTRAP_ADMIN_USER_ID to the verified local user's UUID.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const { data, error: userError } = await supabase.auth.admin.getUserById(
  BOOTSTRAP_ADMIN_USER_ID,
);
if (userError || !data.user?.email_confirmed_at) {
  console.error(
    "The requested account must exist locally and have a verified email.",
  );
  process.exit(1);
}

const { error } = await supabase.rpc("bootstrap_first_super_admin", {
  target_user_id: BOOTSTRAP_ADMIN_USER_ID,
});
if (error) {
  console.error(
    `Bootstrap failed with database code ${error.code ?? "unknown"}.`,
  );
  process.exit(1);
}

console.log(
  "The initial local security administrator was provisioned and audited.",
);
