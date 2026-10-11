import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "https://bazaar.kuraliupdates.com";

test.describe("KuraliUpdates Bazaar production-safe E2E", () => {
  test("site loads and exposes a usable login entry point", async ({ page }) => {
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    expect(response, "Navigation should return a response").toBeTruthy();
    expect(response!.status(), "Homepage should not return an HTTP error").toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();

    const loginEntry = page.getByRole("link", { name: /login|sign in|my account/i })
      .or(page.getByRole("button", { name: /login|sign in|my account/i }));
    await expect(loginEntry.first()).toBeVisible({ timeout: 15_000 });
  });

  test("login form validates required input", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const entry = page.getByRole("link", { name: /login|sign in/i })
      .or(page.getByRole("button", { name: /login|sign in/i }));
    await entry.first().click();

    const submit = page.getByRole("button", { name: /send otp|continue|login|verify/i });
    await expect(submit.first()).toBeVisible({ timeout: 10_000 });
    await submit.first().click();

    // Browser-native required fields or application validation should prevent empty submission.
    const requiredField = page.locator("input:invalid");
    const validationMessage = page.getByText(/required|enter.*(email|mobile|phone)|invalid/i);
    await expect(requiredField.first().or(validationMessage.first())).toBeVisible({ timeout: 5_000 });
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
      const entry = page.getByRole("link", { name: /login|sign in/i })
        .or(page.getByRole("button", { name: /login|sign in/i }));
      await entry.first().click();

      const identityInput = page.locator('input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]').first();
      await expect(identityInput).toBeVisible();
      await identityInput.fill(identity!);

      const requestOtp = page.getByRole("button", { name: /send otp|request otp|get otp|continue/i }).first();
      await requestOtp.click();

      const otpInput = page.locator('input[autocomplete="one-time-code"], input[name*="otp" i], input[placeholder*="otp" i], input[inputmode="numeric"]').last();
      await expect(otpInput).toBeVisible({ timeout: 15_000 });
      await otpInput.fill(otp!);
      await page.getByRole("button", { name: /verify|verify and continue|login|continue/i }).last().click();

      await expect(page).not.toHaveURL(/login|sign-in|verify-otp/i, { timeout: 20_000 });
      await expect(page.locator("body")).not.toContainText(/internal server error|something went wrong/i);

      // Verify the authenticated session survives a refresh and account navigation.
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
