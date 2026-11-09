import { expect, test } from "@playwright/test";

test("MVP entry point is linked from the Arabic landing page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "لوحة العامل" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
});

test("worker and administrative MVP routes fail closed without authentication", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY),
    "This smoke check verifies the intentionally unconfigured environment.",
  );

  for (const path of [
    "/dashboard",
    "/tasks",
    "/tasks/example",
    "/submissions",
    "/account",
    "/account/balance",
    "/packages",
    "/deposit",
    "/withdrawal",
    "/admin",
    "/admin/tasks",
    "/admin/review",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "إعداد الحسابات مطلوب" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("demo role switching remains unavailable on the production server", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/demo/role", {
    headers: { origin: baseURL! },
    data: { account: "task-admin" },
  });
  expect(response.status()).toBe(404);
});
