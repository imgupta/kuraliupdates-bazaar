import { test, expect, type Page } from "@playwright/test";

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
const stagingTargetIsSafe = process.env.E2E_ENVIRONMENT === "staging"
  && isDesignatedStagingTarget(baseURL, "bazaar.kuraliupdates.com")
  && isDesignatedStagingTarget(apiBaseURL, "kuraliupdates-bazaar.onrender.com", "/api/v1")
  && otpCaptureToken.length >= 32;

async function waitForCapturedOtp(page: Page, identifier: string): Promise<string> {
  const deadline = Date.now() + 30_000;
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

async function assertAuthenticatedBackendSession(page: Page, identity: string): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("kurali_auth_token"));
  expect(token, "Successful OTP verification must persist the backend auth token").toBeTruthy();

  const session = await page.evaluate(() => {
    const raw = localStorage.getItem("kurali_auth_session");
    return raw ? JSON.parse(raw) as { isSignedIn?: boolean; email?: string; phone?: string } : null;
  });
  expect(session?.isSignedIn, "Successful login must persist the signed-in session").toBe(true);
  expect(
    [session?.email, session?.phone].some(value => (value ?? "").trim().toLowerCase() === identity.trim().toLowerCase()),
    "Persisted session must match the dedicated E2E identity",
  ).toBe(true);

  const response = await page.request.get(apiBaseURL + "/auth/me", {
    headers: { Authorization: "Bearer " + token, Accept: "application/json", "Cache-Control": "no-store" },
    timeout: 15_000,
  });
  expect(response.status(), "Persisted token must authenticate against GET /auth/me").toBe(200);
  const payload = await response.json() as {
    authenticated?: boolean;
    user?: { email?: string; phone?: string; role?: string; isAdmin?: boolean };
  };
  expect(payload.authenticated, "Backend must confirm authenticated state").toBe(true);
  expect(payload.user, "Backend must return the current user").toBeTruthy();
  expect(
    [payload.user?.email, payload.user?.phone].some(value => (value ?? "").trim().toLowerCase() === identity.trim().toLowerCase()),
    "Backend session identity must match the dedicated E2E identity",
  ).toBe(true);
  return token!;
}

test.describe("KuraliUpdates Bazaar post-login E2E", () => {
  test("site loads and exposes a usable login entry point", async ({ page }) => {
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    expect(response, "Navigation should return a response").toBeTruthy();
    expect(response!.status(), "Homepage should not return an HTTP error").toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });
  });

  test("direct dashboard URLs remain navigable and guarded through refresh and browser history", async ({ page }) => {
    const sellerUrl = new URL("/seller", baseURL).toString();
    const deliveryUrl = new URL("/delivery", baseURL).toString();

    await page.goto(sellerUrl, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(sellerUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible({ timeout: 15_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(sellerUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible();
    await page.goto(deliveryUrl, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(deliveryUrl);
    await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(sellerUrl);
    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(deliveryUrl);
  });

  test("login form validates required input", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    const submit = page.getByRole("button", { name: /send 6-digit otp/i });
    await expect(submit).toBeVisible();
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
    test(role.label + " login, backend session, and refresh persistence", async ({ page }) => {
      const identity = process.env["E2E_" + role.key + "_IDENTITY"];
      test.skip(!stagingTargetIsSafe,
        "Authenticated E2E is staging-only; configure the designated staging targets and 32+ character OTP capture token.");
      test.skip(!identity,
        "Configure a dedicated E2E_" + role.key + "_IDENTITY for this role; do not reuse real customer accounts.");

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

      // Prove the UI completed login, the persisted token is accepted by the backend,
      // and the returned current-user identity matches the test account.
      await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeHidden({ timeout: 15_000 });
      const tokenBeforeRefresh = await assertAuthenticatedBackendSession(page, identity!);

      // A reload must restore the same authenticated session rather than only showing
      // a client-side signed-in screen with a stale/invalid token.
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeHidden({ timeout: 15_000 });
      const tokenAfterRefresh = await assertAuthenticatedBackendSession(page, identity!);
      expect(tokenAfterRefresh, "Refresh must preserve the same session token").toBe(tokenBeforeRefresh);
      await expect(page.locator("body")).not.toContainText(/internal server error|something went wrong|session expired/i);
    });
  }
});
