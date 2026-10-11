import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "https://bazaar.kuraliupdates.com";
const apiBaseURL = (process.env.E2E_API_BASE_URL ?? "").replace(/\/$/, "");
const otpCaptureToken = process.env.E2E_OTP_CAPTURE_TOKEN ?? "";
const productionHosts = new Set(["kuraliupdates.com", "www.kuraliupdates.com", "bazaar.kuraliupdates.com", "kuraliupdates-bazaar.onrender.com"]);
const isNonProductionTarget = (value: string): boolean => {
  try { return !productionHosts.has(new URL(value).hostname.toLowerCase()); } catch { return false; }
};
const stagingE2EEnabled = process.env.E2E_ENVIRONMENT === "staging"
  && isNonProductionTarget(baseURL)
  && isNonProductionTarget(apiBaseURL)
  && otpCaptureToken.length >= 32;

async function waitForCapturedOtp(page: import("@playwright/test").Page, identifier: string): Promise<string> {
  const deadline = Date.now() + 30_000;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    const response = await page.request.get(
      `${apiBaseURL}/e2e/otp/latest?identifier=${encodeURIComponent(identifier)}`,
      {
        headers: { "X-E2E-OTP-Token": otpCaptureToken, "Cache-Control": "no-store" },
        timeout: 5_000,
      },
    );
    lastStatus = response.status();
    if (response.ok()) {
      const body = await response.json() as { otp?: string };
      if (body.otp && /^\d{6}$/.test(body.otp)) return body.otp;
      throw new Error("Staging OTP capture endpoint returned an invalid response.");
    }
    if (lastStatus !== 404) {
      throw new Error(`Staging OTP capture endpoint returned HTTP ${lastStatus}; verify staging configuration.`);
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for a fresh staging OTP (last HTTP status ${lastStatus}).`);
}

test.describe("KuraliUpdates Bazaar browser E2E", () => {
  test("site loads and exposes a usable login entry point", async ({ page }) => {
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    expect(response, "Navigation should return a response").toBeTruthy();
    expect(response!.status(), "Homepage should not return an HTTP error").toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();

    const submit = page.getByRole("button", { name: /send 6-digit otp/i });
    await expect(submit).toBeVisible({ timeout: 15_000 });
  });

  test("login form validates required input", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    const submit = page.getByRole("button", { name: /send 6-digit otp/i });
    await submit.click();
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
      test.skip(!stagingE2EEnabled || !identity,
        "Authenticated E2E is staging-only. Configure E2E_ENVIRONMENT=staging, E2E_API_BASE_URL, E2E_OTP_CAPTURE_TOKEN, and a dedicated role test identity.");

      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const identityInput = page.locator('input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]').first();
      await expect(identityInput).toBeVisible();
      await identityInput.fill(identity!);

      await page.getByRole("button", { name: /send 6-digit otp/i }).first().click();
      const otp = await waitForCapturedOtp(page, identity!);

      const otpInput = page.locator('input[autocomplete="one-time-code"], input[name*="otp" i], input[placeholder*="otp" i], input[inputmode="numeric"]').last();
      await expect(otpInput).toBeVisible({ timeout: 15_000 });
      await otpInput.fill(otp);
      await page.getByRole("button", { name: /verify.*continue/i }).last().click();

      await expect(page.locator("body")).not.toContainText(/internal server error|something went wrong/i);
      await page.waitForTimeout(1_000);
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
