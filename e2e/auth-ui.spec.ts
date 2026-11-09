import { expect, test } from "@playwright/test";

test("Arabic registration form exposes accessible identity fields", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "أنشئ حسابك" })).toBeVisible();
  await expect(page.getByLabel("الاسم الظاهر")).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني")).toHaveAttribute(
    "type",
    "email",
  );
  await expect(page.getByLabel("كلمة المرور")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
});

test("auth routes provide responsive headings and correct recovery errors", async ({
  page,
}) => {
  for (const path of [
    "/register",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/auth/verification-pending",
    "/auth/verified",
    "/auth/configuration",
    "/auth/error?state=expired",
    "/auth/error?state=expired&flow=recovery",
    "/account/suspended",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }

  await page.goto("/auth/error?state=expired&flow=recovery");
  await expect(
    page.getByRole("heading", { name: "رابط الاستعادة انتهت صلاحيته" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "طلب تعليمات استعادة جديدة" }),
  ).toHaveAttribute("href", "/forgot-password");
});

test("protected account pages fail closed when Supabase is not configured", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY),
    "This check is only for the intentionally unconfigured local setup.",
  );
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "إعداد الحسابات مطلوب" }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "إعداد الحسابات مطلوب" }),
  ).toBeVisible();
});

test("registration never reports success without a configured Auth service", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY),
    "The Auth service is configured in this environment; run the local integration suite instead.",
  );
  await page.goto("/register");
  await page.getByLabel("الاسم الظاهر").fill("مستخدم اختبار");
  await page.getByLabel("البريد الإلكتروني").fill("phase2@example.invalid");
  await page.getByLabel("كلمة المرور").fill("local-test-password-123");
  await page.getByRole("button", { name: "إنشاء حساب" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(
    "خدمة الحسابات غير مهيأة",
  );
  await expect(page).toHaveURL(/\/register$/);
});

test("admin mutation endpoints reject cross-origin and fail closed when unconfigured", async ({
  page,
  request,
}) => {
  test.skip(
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY),
    "This check verifies fail-closed behavior for the intentionally unconfigured local setup.",
  );
  await page.goto("/");
  const userId = "123e4567-e89b-42d3-a456-426614174000";
  const crossOrigin = await request.post(`/api/admin/users/${userId}/roles`, {
    headers: { origin: "https://attacker.example" },
    data: { roleKey: "task_reviewer" },
  });
  expect(crossOrigin.status()).toBe(403);
  await expect(crossOrigin.json()).resolves.toEqual({
    error: "INVALID_ORIGIN",
  });

  const anonymous = await page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/users/${id}/roles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleKey: "task_reviewer" }),
    });
    return { status: response.status, body: await response.json() };
  }, userId);
  expect(anonymous.status).toBe(503);
  expect(anonymous.body).toEqual({
    error: "AUTH_CONFIGURATION_REQUIRED",
  });
});
