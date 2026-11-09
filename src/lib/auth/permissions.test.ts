import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSION_MAP,
  resolvePermissions,
  roleHasPermission,
} from "@/lib/auth/permissions";

describe("role and permission definitions", () => {
  it("keeps task review permissions separate from financial permissions", () => {
    expect(roleHasPermission(["task_reviewer"], "task.review.read")).toBe(true);
    expect(roleHasPermission(["task_reviewer"], "deposit.review.approve")).toBe(
      false,
    );
    expect(
      roleHasPermission(["task_reviewer"], "withdrawal.review.approve"),
    ).toBe(false);
    expect(
      roleHasPermission(["task_reviewer"], "financial.settings.write"),
    ).toBe(false);
  });

  it("grants finance reviewers review rights without task or wallet write rights", () => {
    const finance = resolvePermissions(["finance_reviewer"]);
    expect(finance.has("deposit.review.approve")).toBe(true);
    expect(finance.has("task.review.approve")).toBe(false);
    expect(finance.has("financial.settings.write")).toBe(false);
  });

  it("does not resolve unknown role names and keeps the permission catalog unique", () => {
    expect(resolvePermissions(["unknown_role"])).toEqual(new Set());
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    expect(ROLE_PERMISSION_MAP.user).toEqual([]);
  });
});
