#!/usr/bin/env node
/**
 * Read-only production smoke checks for KuraliUpdates Bazaar.
 * Never creates/modifies customer data. Set KURALI_API_BASE_URL to override.
 *
 * Render free instances can take several minutes to wake up. Wait for /health
 * before running endpoint checks, then probe independent endpoints in parallel.
 */
const base = (process.env.KURALI_API_BASE_URL || "https://kuraliupdates-bazaar.onrender.com/api/v1").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const readinessTimeoutMs = Number(process.env.SMOKE_READINESS_TIMEOUT_MS || 360000);
const retryIntervalMs = Number(process.env.SMOKE_RETRY_INTERVAL_MS || 10000);
const failures = [];
const results = [];

async function request(path, expected, label, requestTimeoutMs = timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(base + path, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await response.text();
    const ok = expected(response.status, body);
    const result = {
      label,
      path,
      status: response.status,
      ok,
      detail: ok ? "" : body.slice(0, 300),
    };
    return result;
  } catch (error) {
    return {
      label,
      path,
      status: 0,
      ok: false,
      detail: error?.name === "AbortError"
        ? `Timed out after ${requestTimeoutMs}ms`
        : `${error?.name || "Error"}: ${error?.message || String(error)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

const success = (status) => status >= 200 && status < 300;
const protectedRoute = (status) => status === 401 || status === 403;

async function waitForReadiness() {
  const startedAt = Date.now();
  let attempts = 0;
  let lastResult;
  while (Date.now() - startedAt < readinessTimeoutMs) {
    attempts += 1;
    lastResult = await request("/health", success, "API + database health", Math.min(timeoutMs, 15000));
    if (lastResult.ok) {
      lastResult.label = "API + database health (readiness)";
      lastResult.attempts = attempts;
      lastResult.waitedMs = Date.now() - startedAt;
      results.push(lastResult);
      console.log(`Production API became ready after ${Math.round(lastResult.waitedMs / 1000)}s (${attempts} probe(s)).`);
      return true;
    }

    // A non-retryable HTTP response is still useful evidence, but allow startup
    // to continue because Render may return a transient gateway response while waking.
    if (Date.now() - startedAt + retryIntervalMs < readinessTimeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }

  const failure = {
    ...(lastResult || {
      label: "API + database health (readiness)",
      path: "/health",
      status: 0,
      ok: false,
      detail: "No health response received",
    }),
    label: "API + database health (readiness)",
    ok: false,
    attempts,
    waitedMs: Date.now() - startedAt,
    detail: `Readiness not reached within ${Math.round(readinessTimeoutMs / 1000)}s after ${attempts} probe(s). Last result: ${lastResult?.detail || `HTTP ${lastResult?.status}`}`,
  };
  results.push(failure);
  failures.push(failure);
  return false;
}

const ready = await waitForReadiness();
if (ready) {
  const checks = [
    ["/buyers/products/search?query=", success, "Buyer product search"],
    ["/daily-help/services", success, "Daily Help service catalogue"],
    ["/daily-help/availability?date=2099-01-01&requestedHours=1", success, "Daily Help availability query"],
    ["/delivery/me", protectedRoute, "Delivery profile requires authentication"],
    ["/delivery/jobs/available", protectedRoute, "Pickup jobs require authentication"],
    ["/sellers/me/orders", protectedRoute, "Seller orders require authentication"],
    ["/daily-help/bookings/latest?buyerPhone=0000000000", protectedRoute, "Daily Help booking data requires authentication"],
    ["/daily-help/professionals/by-phone/0000000000", protectedRoute, "Professional profile requires authentication"],
    ["/buyers/orders/__smoke_test_missing_order__/track", (status) => status === 404, "Unknown order returns 404"],
  ];
  const endpointResults = await Promise.all(checks.map(([path, expected, label]) => request(path, expected, label)));
  results.push(...endpointResults);
  failures.push(...endpointResults.filter((result) => !result.ok));
}

console.log(JSON.stringify({
  base,
  checkedAt: new Date().toISOString(),
  readinessReached: ready,
  readinessTimeoutMs,
  timeoutMs,
  passed: results.filter((result) => result.ok).length,
  failed: failures.length,
  results,
}, null, 2));

if (failures.length) process.exit(1);
