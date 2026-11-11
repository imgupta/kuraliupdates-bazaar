import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    return ["127.0.0.1", "localhost"].includes(host) ? route.continue() : route.abort();
  });
  await page.route("**/api/v1/**", route => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ message: "Authentication required" }),
  }));
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
