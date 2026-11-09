import { expect, test } from "@playwright/test";

const testSupabaseUrl = process.env.SUPABASE_TEST_URL;
const testPublishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const testMailpitUrl = process.env.SUPABASE_TEST_MAILPIT_URL;

function isLocalUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

const localAuthReady =
  isLocalUrl(testSupabaseUrl) &&
  isLocalUrl(testMailpitUrl) &&
  Boolean(testPublishableKey);

async function getExistingMessageIds(email: string) {
  if (!testMailpitUrl) throw new Error("Local Mailpit is not configured");
  const response = await fetch(`${testMailpitUrl}/api/v1/messages`);
  if (!response.ok) return new Set<string>();
  const list = (await response.json()) as {
    messages?: Array<{ ID: string; To?: Array<{ Address?: string }> }>;
  };
  return new Set(
    (list.messages ?? [])
      .filter((message) =>
        message.To?.some((recipient) => recipient.Address === email),
      )
      .map((message) => message.ID),
  );
}

async function waitForMessage(
  email: string,
  excludedIds = new Set<string>(),
  timeoutMs = 30_000,
) {
  if (!testMailpitUrl) throw new Error("Local Mailpit is not configured");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const listResponse = await fetch(`${testMailpitUrl}/api/v1/messages`);
    if (listResponse.ok) {
      const list = (await listResponse.json()) as {
        messages?: Array<{
          ID: string;
          To?: Array<{ Address?: string }>;
        }>;
      };
      const message = list.messages?.find(
        (candidate) =>
          !excludedIds.has(candidate.ID) &&
          candidate.To?.some((recipient) => recipient.Address === email),
      );
      if (message) {
        const detailResponse = await fetch(
          `${testMailpitUrl}/api/v1/message/${encodeURIComponent(message.ID)}`,
        );
        if (detailResponse.ok) {
          const detail = (await detailResponse.json()) as {
            HTML?: string;
            Text?: string;
          };
          const content = `${detail.HTML ?? ""}\n${detail.Text ?? ""}`;
          const links = [...content.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(
            (match) => match[0].replaceAll("&amp;", "&"),
          );
          const authLink = links.find(
            (link) =>
              link.includes("/auth/v1/verify?") ||
              link.includes("/auth/callback?"),
          );
          if (authLink) return authLink;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    "No matching local Auth email arrived before the test timeout",
  );
}

test.describe("Disposable local Supabase Auth integration", () => {
  test.skip(
    !localAuthReady,
    "Requires a disposable loopback Supabase project and local Mailpit; this suite never accepts hosted project URLs.",
  );

  test("registers, verifies email, signs in/out, updates profile, and resets password", async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `shoghly-${suffix}@example.invalid`;
    const initialPassword = "initial-local-password-123";
    const replacementPassword = "replacement-local-password-456";

    await page.goto("/register");
    await page.getByLabel("الاسم الظاهر").fill("مستخدم اختبار محلي");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور").fill(initialPassword);
    await page.getByRole("button", { name: "إنشاء حساب" }).click();
    await expect(page).toHaveURL(/\/auth\/verification-pending$/);

    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور").fill(initialPassword);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    const unverifiedLoginMessage = await page
      .locator('p[role="alert"]')
      .textContent();
    expect(unverifiedLoginMessage).toContain("تعذّر تسجيل الدخول");

    await page
      .getByLabel("البريد الإلكتروني")
      .fill(`unknown-${suffix}@example.invalid`);
    await page.getByLabel("كلمة المرور").fill(initialPassword);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page.locator('p[role="alert"]')).toHaveText(
      unverifiedLoginMessage!,
    );

    const confirmationUrl = await waitForMessage(email);
    await page.goto(confirmationUrl);
    await expect(page).toHaveURL(/\/auth\/verified$/);
    await expect(
      page.getByRole("heading", { name: "تم التحقق من بريدك" }),
    ).toBeVisible();
    const authCookie = (await page.context().cookies()).find((cookie) =>
      cookie.name.includes("auth-token"),
    );
    expect(authCookie).toBeDefined();
    expect(authCookie?.httpOnly).toBe(true);
    expect(authCookie?.sameSite).toBe("Lax");

    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: "الملف الشخصي" }),
    ).toBeVisible();
    await page.getByLabel("الاسم الظاهر").fill("اسم محدث للاختبار");
    await page.getByRole("button", { name: "حفظ التغييرات" }).click();
    await expect(page.getByRole("status")).toContainText(
      "تم تحديث الملف الشخصي",
    );

    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/forgot-password");
    const earlierMessageIds = await getExistingMessageIds(email);
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByRole("button", { name: "إرسال تعليمات الاستعادة" }).click();
    await expect(page.getByRole("status")).toContainText(
      "إذا كان البريد مرتبطاً بحساب",
    );

    const resetUrl = await waitForMessage(email, earlierMessageIds);
    await page.goto(resetUrl);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("كلمة المرور الجديدة").fill(replacementPassword);
    await page.getByLabel("تأكيد كلمة المرور").fill(replacementPassword);
    await page.getByRole("button", { name: "تحديث كلمة المرور" }).click();
    await expect(page).toHaveURL(/\/login\?password=updated$/);

    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور").fill(replacementPassword);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });
});
