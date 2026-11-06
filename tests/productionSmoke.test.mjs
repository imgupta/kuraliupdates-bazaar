import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function runSmoke({ livenessStatus = 200 } = {}) {
  const requests = [];
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    requests.push(path);
    if (path === "/api/v1/health/live") {
      response.writeHead(livenessStatus, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: livenessStatus === 200 ? "UP" : "NOT_FOUND" }));
      return;
    }
    if (path === "/api/v1/v3/api-docs") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ openapi: "3.0.0" }));
      return;
    }
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "authentication required" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const directory = await mkdtemp(join(tmpdir(), "kurali-smoke-test-"));
  const reportPath = join(directory, "smoke-report.json");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  try {
    const child = spawn(process.execPath, ["scripts/production-smoke.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        KURALI_API_BASE_URL: baseUrl,
        SMOKE_TIMEOUT_MS: "1000",
        SMOKE_READINESS_TIMEOUT_MS: "2000",
        SMOKE_RETRY_INTERVAL_MS: "10",
        SMOKE_REPORT_PATH: reportPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const [code] = await once(child, "close");
    assert.equal(code, 0, `Smoke runner failed. stdout: ${stdout}\nstderr: ${stderr}`);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    return { report, requests, stdout, stderr };
  } finally {
    server.close();
    await once(server, "close").catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
}

test("smoke runner uses process liveness and never calls database-backed probes", async () => {
  const { report, requests } = await runSmoke();

  assert.equal(report.apiLive, true);
  assert.equal(report.databaseHealthChecked, false);
  assert.equal(report.failed, 0);
  assert.ok(requests.includes("/api/v1/health/live"));
  assert.ok(!requests.includes("/api/v1/health"));
  assert.ok(!requests.some(path => path.includes("/buyers/products/search")));
  assert.ok(!requests.includes("/api/v1/daily-help/services"));
  assert.ok(!requests.some(path => path.includes("/daily-help/availability")));
});

test("smoke runner falls back to existing OpenAPI endpoint when liveness route is absent (404)", async () => {
  const { report, requests } = await runSmoke({ livenessStatus: 404 });

  assert.equal(report.apiLive, true);
  assert.equal(report.databaseHealthChecked, false);
  assert.ok(requests.includes("/api/v1/health/live"));
  assert.ok(requests.includes("/api/v1/v3/api-docs"));
  assert.equal(report.failed, 0);
});

test("smoke runner also handles the framework generic-error response for an absent liveness route", async () => {
  const { report, requests } = await runSmoke({ livenessStatus: 500 });

  assert.equal(report.apiLive, true);
  assert.equal(report.databaseHealthChecked, false);
  assert.ok(requests.includes("/api/v1/health/live"));
  assert.ok(requests.includes("/api/v1/v3/api-docs"));
  assert.equal(report.failed, 0);
});
