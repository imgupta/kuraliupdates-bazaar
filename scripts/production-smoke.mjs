#!/usr/bin/env node
/**
 * Read-only staging API smoke checks.
 *
 * Startup readiness uses /health/live, which verifies only that the API process
 * can serve requests. It deliberately does not require Oracle/database health.
 * The database-backed /health endpoint is not called by this smoke suite.
 */
const baseUrl = process.env.KURALI_API_BASE_URL || "https://kuraliupdates-bazaar.onrender.com/api/v1";
const base = baseUrl.replace(/\/$/, "");
const timeoutMs = positiveInteger(process.env.SMOKE_TIMEOUT_MS, 45000);
const readinessTimeoutMs = positiveInteger(process.env.SMOKE_READINESS_TIMEOUT_MS, 360000);
const retryIntervalMs = positiveInteger(process.env.SMOKE_RETRY_INTERVAL_MS, 10000);
const failures = [];
const results = [];

function positiveInteger(raw, fallback) {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, expected, label, requestTimeoutMs = timeoutMs) {
  const startedAt = Date.now();
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
    return {
      label,
      path,
      status: response.status,
      ok,
      elapsedMs: Date.now() - startedAt,
      detail: ok ? "" : sanitize(body).slice(0, 300),
    };
  } catch (error) {
    return {
      label,
      path,
      status: 0,
      ok: false,
      elapsedMs: Date.now() - startedAt,
      detail: error?.name === "AbortError"
        ? `Timed out after ${requestTimeoutMs}ms`
        : `${error?.name || "Error"}: ${error?.message || String(error)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function sanitize(value) {
  return String(value || "")
    .replace(/(password|token|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b\+?\d[\d ()-]{7,}\d\b/g, "[PHONE]");
}

const success = (status) => status >= 200 && status < 300;
const protectedRoute = (status) => status === 401 || status === 403;

async function waitForApiLiveness() {
  const startedAt = Date.now();
  let attempts = 0;
  let lastResult;
  const attemptDetails = [];

  while (Date.now() - startedAt < readinessTimeoutMs) {
    attempts += 1;
    lastResult = await request(
      "/health/live",
      success,
      "API process liveness (database-independent)",
      Math.min(timeoutMs, 15000),
    );

    // Render currently deploys main with PR previews disabled. Until the new
    // liveness route is deployed there, accept the existing public OpenAPI route
    // as a database-independent compatibility probe on the shared staging service.
    if (!lastResult.ok && lastResult.status === 404) {
      const fallback = await request(
        "/v3/api-docs",
        success,
        "API HTTP liveness (OpenAPI compatibility fallback)",
        Math.min(timeoutMs, 15000),
      );
      if (fallback.ok) lastResult = fallback;
    }

    if (lastResult.ok) {
      lastResult.attempts = attempts;
      lastResult.waitedMs = Date.now() - startedAt;
      results.push(lastResult);
      console.log(`${lastResult.label} succeeded after ${Math.round(lastResult.waitedMs / 1000)}s (${attempts} readiness cycle(s)); database health was not checked.`);
      return true;
    }

    attemptDetails.push({
      attempt: attempts,
      status: lastResult.status,
      detail: lastResult.detail,
    });
    if (attemptDetails.length > 5) attemptDetails.shift();

    const remaining = readinessTimeoutMs - (Date.now() - startedAt);
    if (remaining > 0) await sleep(Math.min(retryIntervalMs, remaining));
  }

  const failure = {
    label: "API process liveness (database-independent)",
    path: "/health/live",
    status: lastResult?.status ?? 0,
    ok: false,
    attempts,
    waitedMs: Date.now() - startedAt,
    detail: "API process did not become reachable before the readiness deadline. Recent probes: " + JSON.stringify(attemptDetails),
  };
  results.push(failure);
  failures.push(failure);
  return false;
}

const apiLive = await waitForApiLiveness();
if (apiLive) {
  // Only probe endpoints that reject anonymous requests before touching repositories.
  // Public catalog/availability reads are intentionally excluded because they require
  // database access, which is outside this Phase 0 tranche.
  const checks = [
    ["/delivery/me", protectedRoute, "Delivery profile rejects anonymous access"],
    ["/delivery/jobs/available", protectedRoute, "Delivery jobs reject anonymous access"],
    ["/sellers/me/orders", protectedRoute, "Seller orders reject anonymous access"],
    ["/daily-help/bookings/latest?buyerPhone=0000000000", protectedRoute, "Daily Help booking data rejects anonymous access"],
    ["/daily-help/professionals/by-phone/0000000000", protectedRoute, "Professional profile rejects anonymous access"],
    ["/buyers/orders/__smoke_test_missing_order__/track", protectedRoute, "Buyer order tracking rejects anonymous access"],
  ];

  for (const [path, expected, label] of checks) {
    const result = await request(path, expected, label);
    results.push(result);
    if (!result.ok) failures.push(result);
  }
}

const report = {
  base,
  checkedAt: new Date().toISOString(),
  apiLive,
  databaseHealthChecked: false,
  checkScope: "API process liveness and pre-service anonymous-access guards only; database-backed catalogue and availability probes are intentionally skipped",
  readinessTimeoutMs,
  timeoutMs,
  passed: results.filter((result) => result.ok).length,
  failed: failures.length,
  results,
};
console.log(JSON.stringify(report, null, 2));

if (failures.length) process.exit(1);
