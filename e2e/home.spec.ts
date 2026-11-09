import { expect, test } from "@playwright/test";

test("Arabic landing shell is RTL and navigable", async ({
  page,
  isMobile,
}) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect
    .poll(() =>
      page.locator("body").evaluate((body) => getComputedStyle(body).direction),
    )
    .toBe("rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "وقتك له قيمة",
  );
  const navigation = isMobile
    ? page.getByRole("navigation", { name: "التنقل للشاشات الصغيرة" })
    : page.getByRole("navigation", { name: "التنقل الرئيسي" });
  await expect(navigation).toBeVisible();
});

test("mobile layout has no horizontal document overflow", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "This viewport check is specific to the mobile project.",
  );
  await page.goto("/");
  await expect(page.locator("#navigation")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
