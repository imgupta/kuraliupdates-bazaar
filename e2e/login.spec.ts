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
  && process.env.E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED === "true"
  && isDesignatedStagingTarget(baseURL, "bazaar.kuraliupdates.com")
  && isDesignatedStagingTarget(apiBaseURL, "kuraliupdates-bazaar.onrender.com", "/api/v1")
  && otpCaptureToken.length >= 32;

async function readCapturedOtpIfAvailable(page: import("@playwright/test").Page, identifier: string): Promise<string | null> {
  const response = await page.request.get(
    apiBaseURL + "/e2e/otp/latest?identifier=" + encodeURIComponent(identifier),
    { headers: { "X-E2E-OTP-Token": otpCaptureToken, "Cache-Control": "no-store" }, timeout: 5_000 },
  );
  if (response.status() === 404) return null;
  if (!response.ok()) {
    throw new Error("Staging OTP capture endpoint returned HTTP " + response.status() + "; verify staging configuration.");
  }
  const body = await response.json() as { otp?: string };
  if (body.otp && /^\d{6}$/.test(body.otp)) return body.otp;
  throw new Error("Staging OTP capture endpoint returned an invalid response.");
}

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

  test("one authenticated multi-role account switches portals without another login", async ({ page }) => {
    test.setTimeout(180_000);
    const identities = [
      process.env.E2E_BUYER_IDENTITY,
      process.env.E2E_SELLER_IDENTITY,
      process.env.E2E_DELIVERY_IDENTITY,
      process.env.E2E_PROVIDER_IDENTITY,
      process.env.E2E_ADMIN_IDENTITY,
    ].map(value => (value ?? "").trim().toLowerCase());
    test.skip(
      !stagingE2EEnabled || identities.some(value => !value) || new Set(identities).size !== 1,
      "Requires the five staging role secrets to identify the same authorized multi-role test account.",
    );

    const identity = identities[0];
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const identityInput = page.locator('input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]').first();
    await expect(identityInput).toBeVisible({ timeout: 15_000 });
    await identityInput.fill(identity);

    const sendOtpButton = page.getByRole("button", { name: /send 6-digit otp/i }).first();
    const responsePromise = page.waitForResponse(response =>
      response.request().method() === "POST"
      && new URL(response.url()).pathname.endsWith("/auth/send-otp"),
    { timeout: 30_000 });
    await sendOtpButton.click();
    const sendOtpResponse = await responsePromise;
    let otp: string;
    if (sendOtpResponse.status() === 200) {
      otp = await waitForCapturedOtp(page, identity);
    } else if (sendOtpResponse.status() === 429) {
      const existingOtp = await readCapturedOtpIfAvailable(page, identity);
      if (!existingOtp) {
        throw new Error("Multi-role staging identity is in the OTP cooldown and no captured OTP is available.");
      }
      otp = existingOtp;
    } else {
      throw new Error("Multi-role send-OTP request returned HTTP " + sendOtpResponse.status());
    }

    const otpInput = page.locator('input[autocomplete="one-time-code"], input[name*="otp" i], input[placeholder*="otp" i], input[inputmode="numeric"]').last();
    await expect(otpInput).toBeVisible({ timeout: 15_000 });
    await otpInput.fill(otp);
    await page.getByRole("button", { name: /verify.*continue/i }).last().click();

    const transitions = [
      { button: /Seller Portal/, active: /Seller Portal/, url: "https://seller.kuraliupdates.com/" },
      { button: /Delivery Agent/, active: /Delivery Agent/, url: "https://bazaar.kuraliupdates.com/" },
      { button: /Daily Help/, active: /Daily Help/, url: "https://dailyhelp.kuraliupdates.com/" },
      { button: /Admin Desk/, active: /Admin Desk/, url: "https://bazaar.kuraliupdates.com/" },
      { button: /Buyer/, active: /Buyer/, url: "https://buyer.kuraliupdates.com/" },
    ];

    for (const transition of transitions) {
      const switchButton = page.getByRole("button", { name: transition.button }).first();
      await expect(switchButton, "The currently authenticated account should expose its authorized role switcher").toBeVisible({ timeout: 20_000 });
      await switchButton.click();
      await expect(page).toHaveURL(transition.url, { timeout: 30_000 });
      await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: transition.active }).first()).toBeVisible({ timeout: 20_000 });

      if (transition.active.source === "Admin Desk") {
        const helpersTab = page.getByRole("button", { name: /Daily Help \/ Helpers/ }).first();
        await expect(helpersTab, "admin portal exposes the Daily Help verification queue").toBeVisible({ timeout: 20_000 });
        await helpersTab.click();
        await expect(page.getByText("Daily Help Helpers", { exact: true })).toBeVisible({ timeout: 20_000 });
      }
    }
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
      test.setTimeout(180_000);
      const identity = process.env["E2E_" + role.key + "_IDENTITY"];
      test.skip(!stagingE2EEnabled || !identity,
        "Authenticated E2E is staging-only; requires exact designated frontend/API targets, a 32+ character OTP token, and a dedicated role test identity.");

      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const identityInput = page.locator('input[type="email"], input[type="tel"], input[name*="email" i], input[name*="mobile" i], input[placeholder*="email" i], input[placeholder*="mobile" i]').first();
      await expect(identityInput).toBeVisible();
      await identityInput.fill(identity!);

      // Wait for the send-OTP response before polling, so capture cannot race persistence.
      // A 429 means the identifier is still in its 60-second cooldown. Do not sleep
      // for the full cooldown in CI: reuse an already-captured OTP if one is still
      // available; otherwise fail fast with a clear message and use a fresh dedicated
      // staging identity. Production rate limiting remains unchanged.
      const sendOtpButton = page.getByRole("button", { name: /send 6-digit otp/i }).first();
      const responsePromise = page.waitForResponse(response =>
        response.request().method() === "POST"
        && new URL(response.url()).pathname.endsWith("/auth/send-otp"),
      { timeout: 30_000 });
      await sendOtpButton.click();
      const sendOtpResponse = await responsePromise;
      let otp: string;
      if (sendOtpResponse.status() === 200) {
        otp = await waitForCapturedOtp(page, identity!);
      } else if (sendOtpResponse.status() === 429) {
        const existingOtp = await readCapturedOtpIfAvailable(page, identity!);
        if (!existingOtp) {
          throw new Error("Send-OTP returned HTTP 429 because this staging identity is in the 60-second cooldown, and no captured OTP is available. Use a fresh dedicated E2E identity or rerun after cooldown; CI no longer waits 61 seconds.");
        }
        otp = existingOtp;
      } else {
        throw new Error("Send-OTP request returned HTTP " + sendOtpResponse.status()
          + "; verify staging OTP delivery and per-identity rate limits.");
      }

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
