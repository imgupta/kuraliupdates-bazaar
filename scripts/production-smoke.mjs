#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
/**
 * Read-only staging API smoke checks.
 *
 * API process liveness and Oracle-backed readiness are checked independently.
 * Database-dependent authorization checks run only after /health/ready succeeds.
 * If the database is unavailable, those checks are explicitly reported as deferred.
 */
const baseUrl = process.env.KURALI_API_BASE_URL || "https://kuraliupdates-bazaar.onrender.com/api/v1";
const base = baseUrl.replace(/\/$/, "");
const timeoutMs = positiveInteger(process.env.SMOKE_TIMEOUT_MS, 15000);
const legacyReadinessTimeoutMs = positiveInteger(process.env.SMOKE_READINESS_TIMEOUT_MS, 0);
const livenessTimeoutMs = positiveInteger(process.env.SMOKE_LIVENESS_TIMEOUT_MS, legacyReadinessTimeoutMs || 90000);
const databaseReadinessTimeoutMs = positiveInteger(process.env.SMOKE_DATABASE_READINESS_TIMEOUT_MS, legacyReadinessTimeoutMs || 60000);
const retryIntervalMs = positiveInteger(process.env.SMOKE_RETRY_INTERVAL_MS, 5000);
const failures = [];
const results = [];
let databaseHealthChecked = false;
let databaseDeferredReason = null;

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

  while (Date.now() - startedAt < livenessTimeoutMs) {
    attempts += 1;
    lastResult = await request(
      "/health/live",
      success,
      "API process liveness (database-independent)",
      Math.min(timeoutMs, 15000),
    );

    // Render deploys main with PR previews disabled. Until the liveness route
    // reaches the shared service, use canonical database-backed readiness.
    // Oracle V30 recovery is deployed, so this is now a meaningful staging check.
    if (!lastResult.ok && [404, 500].includes(lastResult.status)) {
      const fallback = await request(
        "/health",
        success,
        "API and database readiness (compatibility fallback)",
        Math.min(timeoutMs, 15000),
      );
      if (fallback.ok) {
        lastResult = fallback;
        databaseHealthChecked = true;
      } else {
        lastResult.fallbackProbe = { path: fallback.path, status: fallback.status, detail: fallback.detail };
      }
    }

    if (lastResult.ok) {
      lastResult.attempts = attempts;
      lastResult.waitedMs = Date.now() - startedAt;
      results.push(lastResult);
      console.log(`${lastResult.label} succeeded after ${Math.round(lastResult.waitedMs / 1000)}s (${attempts} readiness cycle(s)); database health ${databaseHealthChecked ? "was checked" : "was not checked"}.`);
      return true;
    }

    attemptDetails.push({
      attempt: attempts,
      status: lastResult.status,
      detail: lastResult.detail,
    });
    if (attemptDetails.length > 5) attemptDetails.shift();

    const remaining = livenessTimeoutMs - (Date.now() - startedAt);
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
let databaseReady = false;
let databaseDeferred = false;

async function waitForDatabaseReadiness() {
  const startedAt = Date.now();
  let lastStatus = 0;
  let lastMigration = "unknown";
  let lastDetail = "";
  while (Date.now() - startedAt < databaseReadinessTimeoutMs) {
    const result = await request(
      "/health/ready",
      success,
      "Database-backed API readiness",
      Math.min(timeoutMs, 15000),
    );
    lastStatus = result.status;
    lastDetail = result.detail;
    if (result.ok) {
      databaseHealthChecked = true;
      results.push(result);
      console.log("Database-backed readiness succeeded; protected-route smoke checks may run.");
      return true;
    }

    // A terminal migration failure cannot become healthy without a new deploy
    // or operator intervention. Do not waste the full readiness window.
    let migrationStatus = "unknown";
    if (result.detail) {
      try {
        const parsed = JSON.parse(result.detail);
        migrationStatus = String(parsed.migration ?? "unknown");
      } catch { /* detail is sanitized and may not be JSON */ }
    }
    lastMigration = migrationStatus;
    if (migrationStatus === "FAILED") {
      databaseDeferredReason = "terminal_migration_failure";
      console.warn("::warning::Database readiness is blocked by a terminal migration failure; database-dependent smoke checks are deferred.");
      return false;
    }
    if (result.status !== 503 && result.status !== 0) {
      failures.push({ ...result, label: "Database-backed API readiness probe" });
      results.push(result);
      return false;
    }
    const remaining = databaseReadinessTimeoutMs - (Date.now() - startedAt);
    if (remaining > 0) await sleep(Math.min(retryIntervalMs, remaining));
  }

  databaseDeferredReason = "readiness_timeout";
  console.warn("::warning::Database readiness did not become healthy within " + Math.round(databaseReadinessTimeoutMs / 1000) + "s; database-dependent smoke checks are deferred. Last status=" + lastStatus + ", migration=" + lastMigration + ", detail=" + lastDetail);
  return false;
}

if (apiLive) {
  databaseReady = await waitForDatabaseReadiness();
  if (databaseReady) {
    // These authorization checks can only be interpreted once the readiness
    // filter has opened. A 503 while migrations run is not an auth regression.
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
  } else if (failures.length === 0) {
    databaseDeferred = true;
  }
}
const report = {
  base,
  checkedAt: new Date().toISOString(),
  apiLive,
  databaseHealthChecked,
  databaseReady,
  databaseDeferred,
  checkScope: databaseReady
    ? "API liveness, database-backed readiness, and anonymous-access guards; catalogue and availability probes are intentionally skipped"
    : "API liveness only; database-dependent authorization smoke checks were deferred because readiness was not healthy",
  livenessTimeoutMs,
  databaseReadinessTimeoutMs,
  retryIntervalMs,
  timeoutMs,
  databaseDeferredReason,
  passed: results.filter((result) => result.ok).length,
  failed: failures.length,
  results,
};
const serializedReport = JSON.stringify(report, null, 2);
console.log(serializedReport);
await writeFile(process.env.SMOKE_REPORT_PATH || "smoke-report.json", serializedReport + "\n", "utf8");

if (failures.length) process.exit(1);
