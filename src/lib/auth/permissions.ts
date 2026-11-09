export const ROLE_KEYS = [
  "user",
  "task_reviewer",
  "task_manager",
  "finance_reviewer",
  "security_admin_owner",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const PERMISSIONS = [
  "task.review.read",
  "task.review.approve",
  "task.review.reject",
  "task.manage.read",
  "task.manage.write",
  "task.manage.publish",
  "subscription.payment.read",
  "subscription.payment.approve",
  "subscription.payment.reject",
  "deposit.review.read",
  "deposit.review.approve",
  "deposit.review.reject",
  "withdrawal.review.read",
  "withdrawal.review.approve",
  "withdrawal.review.reject",
  "financial.settings.read",
  "financial.settings.write",
  "user.read",
  "user.status.manage",
  "user.roles.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSION_MAP: Readonly<
  Record<RoleKey, readonly Permission[]>
> = {
  user: [],
  task_reviewer: [
    "task.review.read",
    "task.review.approve",
    "task.review.reject",
  ],
  task_manager: [
    "task.manage.read",
    "task.manage.write",
    "task.manage.publish",
  ],
  finance_reviewer: [
    "subscription.payment.read",
    "subscription.payment.approve",
    "subscription.payment.reject",
    "deposit.review.read",
    "deposit.review.approve",
    "deposit.review.reject",
    "withdrawal.review.read",
    "withdrawal.review.approve",
    "withdrawal.review.reject",
    "financial.settings.read",
  ],
  security_admin_owner: PERMISSIONS,
};

export function resolvePermissions(
  roleKeys: readonly string[],
): Set<Permission> {
  const result = new Set<Permission>();
  for (const roleKey of roleKeys) {
    if (ROLE_KEYS.includes(roleKey as RoleKey)) {
      for (const permission of ROLE_PERMISSION_MAP[roleKey as RoleKey]) {
        result.add(permission);
      }
    }
  }
  return result;
}

export function roleHasPermission(
  roleKeys: readonly string[],
  permission: Permission,
): boolean {
  return resolvePermissions(roleKeys).has(permission);
}
