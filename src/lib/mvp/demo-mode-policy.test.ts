import { describe, expect, it } from "vitest";
import {
  demoRoleHasPermission,
  isDemoModeAllowed,
} from "@/lib/mvp/demo-mode-policy";

const localDevelopment = {
  nodeEnv: "development",
  appEnv: "development",
  enabled: "true",
  host: "127.0.0.1:3000",
};

describe("local Demo Mode safety policy", () => {
  it("requires explicit development opt-in on loopback", () => {
    expect(isDemoModeAllowed(localDevelopment)).toBe(true);
    expect(isDemoModeAllowed({ ...localDevelopment, enabled: undefined })).toBe(
      false,
    );
    expect(
      isDemoModeAllowed({ ...localDevelopment, host: "192.168.1.50" }),
    ).toBe(false);
  });

  it("cannot run in production even when the flag and host are set", () => {
    expect(
      isDemoModeAllowed({ ...localDevelopment, nodeEnv: "production" }),
    ).toBe(false);
    expect(
      isDemoModeAllowed({ ...localDevelopment, appEnv: "production" }),
    ).toBe(false);
  });

  it("keeps worker authorization separate from local demo admin permissions", () => {
    expect(demoRoleHasPermission("worker", "task.manage.write")).toBe(false);
    expect(demoRoleHasPermission("task-admin", "task.manage.write")).toBe(true);
    expect(demoRoleHasPermission("task-admin", "task.review.approve")).toBe(
      false,
    );
    expect(demoRoleHasPermission("review-admin", "task.review.approve")).toBe(
      true,
    );
    expect(demoRoleHasPermission("review-admin", "task.manage.write")).toBe(
      false,
    );
    expect(demoRoleHasPermission("review-admin", "user.roles.manage")).toBe(
      false,
    );
  });
});
