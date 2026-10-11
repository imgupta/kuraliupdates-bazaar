import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "https://bazaar.kuraliupdates.com";

test.describe("KuraliUpdates Bazaar production-safe E2E", () => {
  test("site loads and exposes a usable login entry point", async ({ page }) => {
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    expect(response, "Navigation should return a response").toBeTruthy();
    expect(response!.status(), "Homepage should not return an HTTP error").toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();

    // Unauthenticated visitors are already shown AuthPageV2 at "/".
    const submit = page.getByRole("button", { name: /send 6-digit otp/i });
    await expect(submit).toBeVisible({ timeout: 15_000 });
  });

  test("login form validates required input", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });

    // AuthPageV2 is rendered directly at the root for unauthenticated visitors;
    // clicking a separate "Login" entry is unnecessary and brittle.
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    const submit = page.getByRole("button", { name: /send 6-digit otp/i });
    await expect(submit).toBeVisible();
    await submit.click();

    // Empty email should be rejected client-side without requesting an OTP.
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible({ timeout: 5_000 });
  });

  const roles = [
    { key: "BUYER", label: "Buyer" },
    { key: "SELLER", label: "Seller" },
    { key: "DELIVERY", label: "Delivery agent" },
    { key: "PROVIDER", label: "Service provider" },
    { key: "ADMIN", label: "Admin" },
  ];

  for (const role of roles) {
    test(`${role.label} login and post-login session`, async ({ page }) => {
      const identity = process.env[`E2E_${role.key}_IDENTITY`];
      const otp = process.env[`E2E_${role.key}_OTP`];

      test.skip(!identity || !otp,
        `Set E2E_${role.key}_IDENTITY and E2E_${role.key}_OTP secrets to enable this role's authenticated test. Use a dedicated test account and a current OTP only.`);

      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const identityInput = page.locator('input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]').first();
      await expect(identityInput).toBeVisible();
      await identityInput.fill(identity!);

      const requestOtp = page.getByRole("button", { name: /send 6-digit otp/i }).first();
      await requestOtp.click();

      const otpInput = page.locator('input[autocomplete="one-time-code"], input[name*="otp" i], input[placeholder*="otp" i], input[inputmode="numeric"]').last();
      await expect(otpInput).toBeVisible({ timeout: 15_000 });
      await otpInput.fill(otp!);
      await page.getByRole("button", { name: /verify.*continue/i }).last().click();

      await expect(page).not.toHaveURL(/login|sign-in|verify-otp/i, { timeout: 20_000 });
      await expect(page.locator("body")).not.toContainText(/internal server error|something went wrong/i);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).not.toContainText(/please log in to continue/i);

      const account = page.getByRole("link", { name: /my account|account|profile/i })
        .or(page.getByRole("button", { name: /my account|account|profile/i }));
      if (await account.count()) {
        await account.first().click();
        await expect(page.locator("body")).not.toContainText(/session expired|please log in/i);
      }
    });
  }
});
