#!/usr/bin/env node
/**
 * Read-only staging API smoke checks. Never creates or modifies business data.
 * Set KURALI_API_BASE_URL to the explicitly verified staging API base URL.
 * This script deliberately refuses a known production hostname.
 */
const configuredBase = process.env.KURALI_API_BASE_URL;
if (!configuredBase) {
  console.error("BLOCKED: set KURALI_API_BASE_URL to the verified staging API base URL.");
  process.exit(2);
}
const base = configuredBase.replace(/\/$/, "");
const parsedBase = new URL(base);
const forbiddenHosts = new Set([
  "kuraliupdates.com",
  "www.kuraliupdates.com",
  "bazaar.kuraliupdates.com",
  "kuraliupdates-bazaar.onrender.com",
]);
if (forbiddenHosts.has(parsedBase.hostname.toLowerCase())) {
  console.error("BLOCKED: refusing to run staging smoke checks against a known production host.");
  process.exit(2);
}

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const readinessTimeoutMs = Number(process.env.SMOKE_READINESS_TIMEOUT_MS || 180000);
const retryIntervalMs = Number(process.env.SMOKE_RETRY_INTERVAL_MS || 5000);
const results = [];
const failures = [];

async function request(path, expected, label, requestTimeoutMs = timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(base + path, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      redirect: "error",
    });
    const body = await response.text();
    const result = { label, path, status: response.status, ok: expected(response.status, body) };
    // Do not echo response bodies: this keeps OTPs, tokens and PII out of CI logs.
    return result;
  } catch (error) {
    return {
      label,
      path,
      status: 0,
      ok: false,
      detail: error?.name === "AbortError" ? "request timeout" : (error?.name || "network error"),
    };
  } finally {
    clearTimeout(timer);
  }
}

const success = status => status >= 200 && status < 300;
const protectedRoute = status => status === 401 || status === 403;

async function waitForReadiness() {
  const started = Date.now();
  let attempts = 0;
  let last;
  while (Date.now() - started < readinessTimeoutMs) {
    attempts += 1;
    last = await request("/health", success, "API and database readiness", Math.min(timeoutMs, 12000));
    if (last.ok) {
      last.attempts = attempts;
      last.waitedMs = Date.now() - started;
      results.push(last);
      return true;
    }
    if (Date.now() - started + retryIntervalMs < readinessTimeoutMs) {
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    }
  }
  const failed = {
    label: "API and database readiness",
    path: "/health",
    status: last?.status || 0,
    ok: false,
    attempts,
    waitedMs: Date.now() - started,
    detail: "readiness timeout",
  };
  results.push(failed);
  failures.push(failed);
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
    ["/buyers/orders/__staging_smoke_missing_order__/track", status => status === 404, "Unknown order returns 404"],
  ];
  results.push(...await Promise.all(checks.map(([path, expected, label]) => request(path, expected, label))));
  failures.push(...results.filter(result => !result.ok));
}

console.log(JSON.stringify({
  environment: "staging",
  base,
  checkedAt: new Date().toISOString(),
  readinessReached: ready,
  passed: results.filter(result => result.ok).length,
  failed: failures.length,
  results,
}, null, 2));

if (failures.length) process.exit(1);
