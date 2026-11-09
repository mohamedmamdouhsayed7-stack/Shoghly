import { describe, expect, it } from "vitest";
import {
  profileUpdateSchema,
  resetPasswordSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schemas";

describe("authentication and profile schemas", () => {
  it("normalizes registration email and validates the display name", () => {
    expect(
      signUpSchema.parse({
        displayName: "  زينب  ",
        email: "USER@example.com",
        password: "a-long-password-123",
      }),
    ).toEqual({
      displayName: "زينب",
      email: "user@example.com",
      password: "a-long-password-123",
    });
    expect(
      signUpSchema.safeParse({
        displayName: "A",
        email: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects unexpected fields in auth and profile updates", () => {
    expect(
      signInSchema.safeParse({
        email: "user@example.com",
        password: "some-password",
        role: "security_admin_owner",
      }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({
        displayName: "User Name",
        account_status: "active",
        role: "security_admin_owner",
      }).success,
    ).toBe(false);
  });

  it("requires matching new password confirmation", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "new-password-123",
        confirmPassword: "different-password",
      }).success,
    ).toBe(false);
  });

  it("allows only safe local redirect paths", () => {
    expect(safeNextPath("/profile?tab=info")).toBe("/profile?tab=info");
    expect(safeNextPath("//evil.example/path")).toBe("/profile");
    expect(safeNextPath("https://evil.example/path")).toBe("/profile");
    expect(safeNextPath("/\\evil.example")).toBe("/profile");
    expect(safeNextPath("///evil.example/path")).toBe("/profile");
    expect(safeNextPath("/%2f%2fevil.example/path")).toBe(
      "/%2f%2fevil.example/path",
    );
  });
});
