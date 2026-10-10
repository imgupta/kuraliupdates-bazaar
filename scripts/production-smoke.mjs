#!/usr/bin/env node
/**
 * Read-only production smoke checks for KuraliUpdates Bazaar.
 * Never creates/modifies customer data. Set KURALI_API_BASE_URL to override.
 */
const base = (process.env.KURALI_API_BASE_URL || "https://kuraliupdates-bazaar.onrender.com/api/v1").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const failures = [];
const results = [];

async function request(path, expected, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let body = "";
  try {
    response = await fetch(base + path, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      redirect: "follow",
    });
    body = await response.text();
    const ok = expected(response.status, body);
    const result = { label, path, status: response.status, ok, detail: ok ? "" : body.slice(0, 300) };
    results.push(result);
    if (!ok) failures.push(result);
  } catch (error) {
    const result = { label, path, status: 0, ok: false, detail: String(error) };
    results.push(result);
    failures.push(result);
  } finally {
    clearTimeout(timer);
  }
}

const success = (status) => status >= 200 && status < 300;
const protectedRoute = (status) => status === 401 || status === 403;
const noServerError = (status) => status > 0 && status < 500;

await request("/health", success, "API + database health");
await request("/buyers/products/search?query=", success, "Buyer product search");
await request("/daily-help/services", success, "Daily Help service catalogue");
await request("/daily-help/availability?date=2099-01-01&requestedHours=1", success, "Daily Help availability query");
await request("/delivery/me", protectedRoute, "Delivery profile requires authentication");
await request("/delivery/jobs/available", protectedRoute, "Pickup jobs require authentication");
await request("/sellers/me/orders", protectedRoute, "Seller orders require authentication");
await request("/daily-help/bookings/latest?buyerPhone=0000000000", protectedRoute, "Daily Help booking data requires authentication");
await request("/daily-help/professionals/by-phone/0000000000", protectedRoute, "Professional profile requires authentication");
await request("/buyers/orders/__smoke_test_missing_order__/track", (status) => status === 404, "Unknown order returns 404");

console.log(JSON.stringify({
  base,
  checkedAt: new Date().toISOString(),
  passed: results.filter((r) => r.ok).length,
  failed: failures.length,
  results,
}, null, 2));

if (failures.length) process.exit(1);
