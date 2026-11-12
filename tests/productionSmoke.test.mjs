import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function runSmoke({ livenessStatus = 200, readinessStatus = 200, migration = "READY" } = {}) {
  const requests = [];
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    requests.push(path);
    if (path === "/api/v1/health/live") {
      response.writeHead(livenessStatus, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: livenessStatus === 200 ? "UP" : "NOT_FOUND" }));
      return;
    }
    if (path === "/api/v1/health/ready") {
      response.writeHead(readinessStatus, { "content-type": "application/json" });
      response.end(JSON.stringify({
        status: readinessStatus === 200 ? "UP" : "DEGRADED",
        database: readinessStatus === 200 ? "UP" : "NOT_CHECKED",
        migration,
      }));
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
        SMOKE_READINESS_TIMEOUT_MS: "50",
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

test("database-ready smoke runs protected-route authorization checks", async () => {
  const { report, requests } = await runSmoke();

  assert.equal(report.apiLive, true);
  assert.equal(report.databaseReady, true);
  assert.equal(report.databaseDeferred, false);
  assert.equal(report.failed, 0);
  assert.ok(requests.includes("/api/v1/health/live"));
  assert.ok(requests.includes("/api/v1/health/ready"));
  assert.ok(requests.includes("/api/v1/delivery/me"));
});

test("database-unready smoke defers protected-route checks without a false failure", async () => {
  const { report, requests } = await runSmoke({ readinessStatus: 503, migration: "RUNNING" });

  assert.equal(report.apiLive, true);
  assert.equal(report.databaseReady, false);
  assert.equal(report.databaseDeferred, true);
  assert.equal(report.failed, 0);
  assert.ok(requests.includes("/api/v1/health/ready"));
  assert.ok(!requests.includes("/api/v1/delivery/me"));
});

test("terminal migration failure defers protected-route checks immediately", async () => {
  const { report, requests } = await runSmoke({ readinessStatus: 503, migration: "FAILED" });

  assert.equal(report.databaseReady, false);
  assert.equal(report.databaseDeferred, true);
  assert.equal(report.failed, 0);
  assert.ok(!requests.includes("/api/v1/delivery/me"));
});

test("unavailable liveness remains a real smoke failure", async () => {
  const { report, requests } = await runSmoke({ livenessStatus: 404 });

  assert.equal(report.apiLive, false);
  assert.ok(report.failed > 0);
  assert.ok(!requests.includes("/api/v1/delivery/me"));
});
