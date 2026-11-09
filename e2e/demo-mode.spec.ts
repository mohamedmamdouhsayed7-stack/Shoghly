import { expect, test } from "@playwright/test";

test("local demo completes the task submission and review journey", async ({
  page,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_DEMO_SUITE !== "true",
    "Run this walkthrough with npm run test:e2e:demo.",
  );
  const taskTitle = `مهمة DEMO ${Date.now()}`;
  await page.goto("/dashboard");
  await expect(page.getByText("DEMO MODE")).toBeVisible();
  await expect(page.getByText("ربح المهمة · DEMO")).toBeVisible();
  await expect(page.getByText(/1×/).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  await page
    .getByRole("button", { name: /التبديل إلى.*DEMO TASK ADMIN/ })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: /إدارة المهام/ }).click();
  await page.getByRole("button", { name: "مهمة جديدة" }).click();
  await page.getByLabel("عنوان المهمة *").fill(taskTitle);
  await page
    .getByLabel("رابط المهمة الآمن *")
    .fill("https://example.com/demo-task");
  await page.getByLabel("وصف مختصر *").fill("مهمة للعرض التوضيحي فقط");
  await page.getByLabel("الوصف الكامل *").fill("وصف مهمة محلية تجريبية.");
  await page
    .getByLabel("تعليمات الإنجاز *")
    .fill("أكمل الخطوة التجريبية واكتب إثباتاً.");
  await page.getByRole("button", { name: "حفظ المهمة" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.getByRole("button", { name: /التبديل إلى.*DEMO WORKER/ }).click();
  await page.getByRole("link", { name: "عرض المهام" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();
  await page
    .getByRole("link", { name: /عرض التفاصيل/ })
    .first()
    .click();
  await expect(page.getByText("مكافأتك · DEMO")).toBeVisible();
  await page
    .getByLabel(/ملاحظات للمراجع/)
    .fill("تم إنجاز المهمة في العرض التجريبي.");
  await page.getByRole("button", { name: /إرسال للمراجعة/ }).click();
  await expect(page.getByRole("status")).toContainText("قيد المراجعة");

  await page
    .getByRole("button", { name: /التبديل إلى.*DEMO TASK ADMIN/ })
    .click();
  await page
    .getByRole("button", { name: /التبديل إلى.*DEMO REVIEWER/ })
    .click();
  await expect(page).toHaveURL(/\/admin\/review$/);
  await expect(page.getByText(taskTitle)).toBeVisible();
  await page.getByRole("button", { name: "اعتماد" }).click();
  await expect(page.getByText("لا توجد مشاركات قيد المراجعة")).toBeVisible();

  await page.getByRole("button", { name: /التبديل إلى.*DEMO WORKER/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/submissions");
  await expect(page.getByText(taskTitle)).toBeVisible();
  await expect(page.getByText("مقبولة")).toBeVisible();
  await expect(page.getByText(/DEMO/).last()).toBeVisible();
  await page.goto("/account/balance");
  await expect(page.getByText(/الرصيد · DEMO/)).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(/24 ساعة|23 ساعة/)).toBeVisible();
  await expect(page.getByText(/٢٥٠/).first()).toBeVisible();
});
