import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost"].includes(url.hostname)) return route.continue();
    if (url.hostname === "seller.kuraliupdates.com") {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>Local seller portal mock</title><main>Mock seller portal</main>",
      });
    }
    return route.abort();
  });
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status: number, body: unknown) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (request.method() === "POST" && url.pathname.endsWith("/auth/send-otp")) {
      return json(200, { success: true, message: "Synthetic test OTP sent", resendAfterSeconds: 20 });
    }
    if (request.method() === "POST" && url.pathname.endsWith("/auth/verify-otp")) {
      const payload = request.postDataJSON();
      if (payload.mode !== "LOGIN" || payload.otp !== "123456") {
        return json(401, { success: false, message: "Invalid synthetic test OTP" });
      }
      return json(200, {
        success: true,
        token: "local-synthetic-session",
        user: {
          userId: "local-buyer-1",
          email: "buyer@example.test",
          name: "Local Synthetic Buyer",
          phone: "9876500000",
          role: "BUYER",
          isAdmin: 0,
        },
      });
    }
    if (request.method() === "POST" && url.pathname.endsWith("/auth/logout")) {
      return json(200, { success: true, message: "Synthetic session invalidated" });
    }
    if (request.method() === "GET" && url.pathname.endsWith("/auth/me/roles")) {
      return json(200, { success: true, roles: ["BUYER", "SELLER"] });
    }
    if (request.method() === "POST" && url.pathname.endsWith("/auth/portal-handoff")) {
      return json(200, { success: true, code: "local-synthetic-handoff", role: "SELLER" });
    }
    if (request.method() === "POST" && url.pathname.endsWith("/auth/portal-handoff/redeem")) {
      const payload = request.postDataJSON();
      if (payload.code !== "local-synthetic-handoff") {
        return json(401, { success: false, message: "Invalid synthetic handoff" });
      }
      return json(200, {
        success: true,
        token: "local-synthetic-seller-session",
        role: "SELLER",
        roles: ["BUYER", "SELLER"],
        user: {
          userId: "local-buyer-1",
          email: "buyer@example.test",
          name: "Local Synthetic Buyer",
          phone: "9876500000",
          role: "BUYER",
          isAdmin: 0,
        },
      });
    }
    if (request.method() === "GET" && url.pathname.endsWith("/auth/me")) {
      return json(200, {
        authenticated: url.searchParams.get("token") === "local-synthetic-session",
        user: {
          userId: "local-buyer-1",
          email: "buyer@example.test",
          name: "Local Synthetic Buyer",
          phone: "9876500000",
          role: "BUYER",
          isAdmin: 0,
        },
        addresses: [],
      });
    }
    if (request.method() === "GET" && url.pathname.endsWith("/auth/onboarding-status")) {
      return json(200, { success: true, status: "APPROVED" });
    }
    if (request.method() === "GET" && url.pathname.endsWith("/sellers/me")) {
      return json(200, {
        sellerId: "LOCAL-SELLER-1",
        userId: "local-buyer-1",
        storeName: "Synthetic Local Store",
        ownerName: "Local Synthetic Buyer",
        locality: "Kurali",
        status: "APPROVED",
        storeOpen: true,
        rating: 4.8,
      });
    }
    if (request.method() === "GET" && [
      "/sellers/me/products",
      "/sellers/me/orders",
      "/sellers/me/discounts",
      "/sellers/me/documents",
    ].some(path => url.pathname.endsWith(path))) {
      return json(200, []);
    }
    return json(401, { message: "Authentication required" });
  });
});

test("local unauthenticated entry renders OTP login without contacting a remote API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible();
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
});

test("empty login submission is rejected before an OTP request", async ({ page }) => {
  let otpRequests = 0;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().includes("/auth/send-otp")) otpRequests += 1;
  });

  await page.goto("/");
  await page.getByRole("button", { name: /send 6-digit otp/i }).click();
  await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
  expect(otpRequests).toBe(0);
});

test("synthetic OTP login stores a server-issued session and restores it after refresh", async ({ page }) => {
  let verified = false;
  let restored = false;
  page.on("request", request => {
    if (request.url().endsWith("/auth/verify-otp")) verified = true;
    if (request.url().includes("/auth/me?token=local-synthetic-session")) restored = true;
  });

  await page.goto("/");
  await page.locator('input[type="email"]').first().fill("buyer@example.test");
  await page.getByRole("button", { name: /send 6-digit otp/i }).click();
  await expect(page.getByText("Verification code sent")).toBeVisible();
  await page.locator('input[autocomplete="one-time-code"]').fill("123456");
  await page.getByRole("button", { name: /verify & continue/i }).click();

  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBe("local-synthetic-session");
  expect(verified).toBe(true);

  await page.reload();
  await expect.poll(() => restored).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBe("local-synthetic-session");
});

test("logout invalidates the synthetic session and clears browser authentication", async ({ page }) => {
  let logoutAuthorization: string | undefined;
  page.on("request", request => {
    if (request.url().endsWith("/auth/logout")) {
      logoutAuthorization = request.headers()["authorization"];
    }
  });

  await page.goto("/");
  await page.locator('input[type="email"]').first().fill("buyer@example.test");
  await page.getByRole("button", { name: /send 6-digit otp/i }).click();
  await page.locator('input[autocomplete="one-time-code"]').fill("123456");
  await page.getByRole("button", { name: /verify & continue/i }).click();
  await expect(page.getByRole("button", { name: /local/i })).toBeVisible();
  await page.getByRole("button", { name: /local/i }).click();
  await page.getByRole("button", { name: /sign out/i }).click();

  await expect.poll(() => logoutAuthorization).toBe("Bearer local-synthetic-session");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_session")))
    .toBeNull();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("rejected synthetic OTP leaves the browser signed out", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="email"]').first().fill("buyer@example.test");
  await page.getByRole("button", { name: /send 6-digit otp/i }).click();
  await page.locator('input[autocomplete="one-time-code"]').fill("000000");
  await page.getByRole("button", { name: /verify & continue/i }).click();

  await expect(page.getByText("Invalid synthetic test OTP")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBeNull();
});

test("rejected portal handoff clears stale browser authentication", async ({ page }) => {
  let redeemedCode: string | undefined;
  page.on("request", request => {
    if (request.url().endsWith("/auth/portal-handoff/redeem")) {
      redeemedCode = request.postDataJSON().code;
    }
  });
  await page.addInitScript(() => {
    localStorage.setItem("kurali_auth_token", "stale-synthetic-session");
    localStorage.setItem("kurali_auth_session", JSON.stringify({
      email: "previous@example.test",
      name: "Previous Synthetic Session",
      role: "seller",
      isSignedIn: true,
    }));
  });

  await page.goto("/#sso_code=expired-synthetic-handoff");

  await expect.poll(() => redeemedCode).toBe("expired-synthetic-handoff");
  await expect(page).not.toHaveURL(/sso_code=/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_session")))
    .toBeNull();
  await expect(page.getByRole("button", { name: /send 6-digit otp/i })).toBeVisible();
});

test("role switching requests an authenticated one-time handoff and puts its code in the URL fragment", async ({ page }) => {
  let handoffAuthorization: string | undefined;
  let handoffPayload: unknown;
  let redeemedCode: string | undefined;
  let destination = "";
  page.on("request", request => {
    if (request.url().endsWith("/auth/portal-handoff")) {
      handoffAuthorization = request.headers()["authorization"];
      handoffPayload = request.postDataJSON();
    }
    if (request.url().endsWith("/auth/portal-handoff/redeem")) {
      redeemedCode = request.postDataJSON().code;
    }
  });
  page.on("framenavigated", frame => {
    if (frame === page.mainFrame()) destination = frame.url();
  });

  await page.goto("/");
  await page.locator('input[type="email"]').first().fill("buyer@example.test");
  await page.getByRole("button", { name: /send 6-digit otp/i }).click();
  await page.locator('input[autocomplete="one-time-code"]').fill("123456");
  await page.getByRole("button", { name: /verify & continue/i }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBe("local-synthetic-session");
  await expect(page.getByRole("button", { name: /seller portal/i })).toBeVisible();

  await page.getByRole("button", { name: /seller portal/i }).click();
  await expect.poll(() => handoffPayload).toEqual({ role: "SELLER" });
  expect(handoffAuthorization).toBe("Bearer local-synthetic-session");
  await expect.poll(() => destination).toContain("#sso_code=local-synthetic-handoff");
  expect(destination).not.toContain("?sso_code=");
  await expect(page.getByText("Mock seller portal")).toBeVisible();

  // Exercise the real portal bootstrap on localhost using the same synthetic fragment.
  await page.goto("http://127.0.0.1:4173/#sso_code=local-synthetic-handoff");
  await expect.poll(() => redeemedCode).toBe("local-synthetic-handoff");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_auth_token")))
    .toBe("local-synthetic-seller-session");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurali_role")))
    .toBe("seller");
  await expect(page).not.toHaveURL(/sso_code=/);
  await expect(page.getByRole("heading", { name: "Synthetic Local Store" })).toBeVisible();
  await expect(page.getByText("Store Inventory (0)")).toBeVisible();
});
