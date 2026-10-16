import { test, expect } from "@playwright/test";

const portals = [
  { name: "Bazaar", url: "https://bazaar.kuraliupdates.com/" },
  { name: "Buyer", url: "https://buyer.kuraliupdates.com/" },
  { name: "Seller", url: "https://seller.kuraliupdates.com/" },
  { name: "Delivery", url: "https://delivery.kuraliupdates.com/" },
  { name: "Daily Help", url: "https://dailyhelp.kuraliupdates.com/" },
  { name: "Admin", url: "https://admin.kuraliupdates.com/" },
];

test.describe("KuraliUpdates development smoke tests (no login)", () => {
  for (const portal of portals) {
    test(portal.name + " portal loads without authentication", async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));

      const response = await page.goto(portal.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(response, portal.name + " should return a navigation response").toBeTruthy();
      expect(response!.status(), portal.name + " should not return an HTTP error").toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();

      // Allow the app shell to hydrate without depending on any account, OTP,
      // login, session, or role-specific fixture.
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await expect(page.locator("body")).not.toBeEmpty();
      expect(pageErrors, portal.name + " should not throw uncaught JavaScript errors").toEqual([]);
    });
  }

  test("main site portal paths survive direct navigation, refresh, and browser history", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));

    for (const path of ["/", "/buyer", "/seller", "/delivery", "/daily-help", "/admin"]) {
      const response = await page.goto("https://bazaar.kuraliupdates.com" + path, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      expect(response, path + " should return a navigation response").toBeTruthy();
      expect(response!.status(), path + " should not return an HTTP error").toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toBeEmpty();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toBeEmpty();
    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toBeEmpty();
    expect(errors, "Portal navigation should not throw uncaught JavaScript errors").toEqual([]);
  });
});
