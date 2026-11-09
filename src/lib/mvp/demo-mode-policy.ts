export type DemoRole = "worker" | "admin";
export type DemoAccountKey = "worker" | "task-admin" | "review-admin";

export const DEMO_ACCOUNT_COOKIE = "shoghly_local_demo_account";

export const DEMO_ACCOUNTS: Record<
  DemoAccountKey,
  { role: DemoRole; userId: string; label: string; path: string }
> = {
  worker: {
    role: "worker",
    userId: "demo-worker",
    label: "العامل التجريبي · DEMO WORKER",
    path: "/dashboard",
  },
  "task-admin": {
    role: "admin",
    userId: "demo-task-admin",
    label: "مدير المهام التجريبي · DEMO TASK ADMIN",
    path: "/admin",
  },
  "review-admin": {
    role: "admin",
    userId: "demo-review-admin",
    label: "مراجع تجريبي · DEMO REVIEWER",
    path: "/admin/review",
  },
};

const DEMO_PERMISSION_MAP: Record<DemoAccountKey, readonly string[]> = {
  worker: [],
  "task-admin": [
    "task.manage.read",
    "task.manage.write",
    "task.manage.publish",
  ],
  "review-admin": [
    "task.review.read",
    "task.review.approve",
    "task.review.reject",
  ],
};

export function isDemoModeAllowed(input: {
  nodeEnv: string | undefined;
  appEnv: string | undefined;
  enabled: string | undefined;
  host: string | null | undefined;
}): boolean {
  if (
    input.nodeEnv !== "development" ||
    input.appEnv !== "development" ||
    input.enabled !== "true" ||
    !input.host
  ) {
    return false;
  }

  try {
    const hostname = new URL(`http://${input.host}`).hostname.replace(
      /^\[|\]$/g,
      "",
    );
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

export function demoRoleHasPermission(
  account: DemoAccountKey,
  permission: string,
): boolean {
  return DEMO_PERMISSION_MAP[account].includes(permission);
}
