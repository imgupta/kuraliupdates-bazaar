import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "https://bazaar.kuraliupdates.com";
const apiBaseURL = (process.env.E2E_API_BASE_URL ?? "").replace(/\/$/, "");
const otpCaptureToken = process.env.E2E_OTP_CAPTURE_TOKEN ?? "";
const isDesignatedStagingTarget = (value: string, expectedHost: string, expectedPath?: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === "https:"
      && u.hostname.toLowerCase() === expectedHost
      && (expectedPath === undefined || u.pathname.replace(/\/$/, "") === expectedPath);
  } catch {
    return false;
  }
};
const stagingE2EEnabled = process.env.E2E_ENVIRONMENT === "staging"
  && isDesignatedStagingTarget(baseURL, "bazaar.kuraliupdates.com")
  && isDesignatedStagingTarget(apiBaseURL, "kuraliupdates-bazaar.onrender.com", "/api/v1")
  && otpCaptureToken.length >= 32;

async function waitForCapturedOtp(page: import("@playwright/test").Page, identifier: string): Promise<string> {
  const deadline = Date.now() + 90_000;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    const response = await page.request.get(
      apiBaseURL + "/e2e/otp/latest?identifier=" + encodeURIComponent(identifier),
      { headers: { "X-E2E-OTP-Token": otpCaptureToken, "Cache-Control": "no-store" }, timeout: 5_000 },
    );
    lastStatus = response.status();
    if (response.ok()) {
      const body = await response.json() as { otp?: string };
      if (body.otp && /^\d{6}$/.test(body.otp)) return body.otp;
      throw new Error("Staging OTP capture endpoint returned an invalid response.");
    }
    if (lastStatus !== 404) {
      throw new Error("Staging OTP capture endpoint returned HTTP " + lastStatus + "; verify staging configuration.");
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error("Timed out waiting for a fresh staging OTP (last HTTP status " + lastStatus + ").");
}

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


  test("standalone role portals load at their hostname roots and survive refresh/history", async ({ page }) => {
    // Role dashboards are independently deployed micro-frontends. Their
    // canonical entry points are each hostname's "/" route, not legacy
    // monolith paths such as bazaar.kuraliupdates.com/seller.
    const sellerUrl = "https://seller.kuraliupdates.com/";
    const deliveryUrl = "https://delivery.kuraliupdates.com/";
    const authIdentityInput = 'input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]';

    await page.goto(sellerUrl, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(sellerUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(authIdentityInput).first()).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(sellerUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });

    await page.goto(deliveryUrl, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(deliveryUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(authIdentityInput).first()).toBeVisible();

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(sellerUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });
    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(deliveryUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });
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
    test(role.label + " login and post-login session", async ({ page }) => {
      // OTP capture can lag behind the login request on a cold staging service.
      // Allow a bounded 90-second capture window while still failing on non-404 errors.
      test.setTimeout(120_000);
      const identity = process.env["E2E_" + role.key + "_IDENTITY"];
      test.skip(!stagingE2EEnabled || !identity,
        "Authenticated E2E is staging-only; requires exact designated frontend/API targets, a 32+ character OTP token, and a dedicated role test identity.");

      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const identityInput = page.locator('input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]').first();
      await expect(identityInput).toBeVisible();
      await identityInput.fill(identity!);

      // The UI click does not wait for the backend's synchronous email-delivery call.
      // Wait for the send-OTP API response first; otherwise OTP polling can start
      // before the backend has persisted/captured the OTP, producing a false 404 timeout.
      const sendOtpResponsePromise = page.waitForResponse(response =>
        response.request().method() === "POST"
        && new URL(response.url()).pathname.endsWith("/auth/send-otp"),
      { timeout: 120_000 });
      await page.getByRole("button", { name: /send 6-digit otp/i }).first().click();
      const sendOtpResponse = await sendOtpResponsePromise;
      expect(sendOtpResponse.status(), "Send-OTP request should succeed before polling for its captured OTP").toBe(200);
      const otp = await waitForCapturedOtp(page, identity!);

      const otpInput = page.locator('input[autocomplete="one-time-code"], input[name*="otp" i], input[placeholder*="otp" i], input[inputmode="numeric"]').last();
      await expect(otpInput).toBeVisible({ timeout: 15_000 });
      await otpInput.fill(otp);
      await page.getByRole("button", { name: /verify.*continue/i }).last().click();

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
