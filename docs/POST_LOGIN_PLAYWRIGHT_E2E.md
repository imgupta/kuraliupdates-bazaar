# Post-login Playwright E2E and Private Report Hosting

Last updated: 2026-10-17  
Repository: `imgupta/kuraliupdates-bazaar`  
Workflow: `.github/workflows/e2e-login.yml`  
Playwright config: `playwright.config.ts`  
Test suite: `e2e/login.spec.ts`

## Purpose

This document records the implemented post-login browser checks, staging-only OTP flow, Playwright capture settings, GitHub Actions artifacts, and private Cloudflare Pages report publishing setup. It is intended to be a durable handoff for future sessions and maintainers.

## Current implementation at a glance

- Playwright runs Chromium against the designated staging frontend at `https://bazaar.kuraliupdates.com`.
- The designated staging API is `https://kuraliupdates-bazaar.onrender.com/api/v1`.
- The authenticated suite covers five dedicated role identities: buyer, seller, delivery agent, service provider, and admin.
- OTPs are retrieved through the authenticated staging-only E2E OTP capture endpoint; no OTP is hard-coded in the test.
- The test workflow runs with one worker and all refs share a single concurrency group because they use one staging environment and shared OTP cooldowns.
- Screenshots and videos are configured for every test; traces are retained on failure.
- The `playwright-e2e-report` artifact includes `playwright-report/` and `test-results/`, retained for 14 days.
- A separate job can publish only `playwright-report/` to Cloudflare Pages. It must not publish from pull-request runs.
- Cloudflare Access must protect the production Pages hostname. The repository variable `CLOUDFLARE_REPORT_ACCESS_CONFIGURED=true` is an explicit operator confirmation gate, not itself a security mechanism.

## Files and responsibilities

| Path | Responsibility |
|---|---|
| `playwright.config.ts` | Test discovery, retries/workers, HTML reporter, browser defaults, trace/screenshot/video settings |
| `e2e/login.spec.ts` | Basic site/login checks and authenticated post-login session checks for all five roles |
| `.github/workflows/e2e-login.yml` | Frontend/backend CI, staging guards, read-only API smoke tests, browser tests, artifact upload, gated Cloudflare publish |
| `scripts/production-smoke.mjs` | Read-only API smoke checks; never use this workflow to create orders or mutate customer data |
| `docs/POST_LOGIN_PLAYWRIGHT_E2E.md` | This end-to-end implementation and operations record |

## Playwright configuration

Current relevant settings in `playwright.config.ts`:

- `testDir: "./e2e"`
- `fullyParallel: false`
- `forbidOnly: !!process.env.CI`
- `retries: process.env.CI ? 1 : 0`
- `workers: process.env.CI ? 1 : undefined`
- Reporter: list reporter plus HTML reporter writing to `playwright-report`, with `open: "never"`
- Default base URL: `E2E_BASE_URL`, falling back to `https://bazaar.kuraliupdates.com`
- `trace: "retain-on-failure"`
- `screenshot: "on"`
- `video: "on"`
- Browser defaults from Playwright's `Desktop Chrome` device profile

### Capture behaviour

- `screenshot: "on"` captures a screenshot for each test, not only failures.
- `video: "on"` records a video for each test, including passing tests.
- `trace: "retain-on-failure"` retains traces on failures, limiting trace storage.
- Capture-on-every-test increases artifact size and runtime. Treat screenshots, videos, traces, and reports as sensitive test artifacts.
- The HTML report can display attachments that Playwright has associated with the test result. The workflow also uploads `test-results/` separately as part of the same artifact for debugging. Do not assume every file in `test-results/` is automatically embedded in the HTML report; validate the report UI and video playback when changing reporter or attachment configuration.

## Test coverage in `e2e/login.spec.ts`

### 1. Main site/login entry point
- Opens the configured base URL.
- Requires a navigation response with status below 400.
- Requires a non-empty page body.
- Checks the “Send 6-digit OTP” login button is visible.

### 2. Standalone role portal routing and browser history
- Checks seller portal root: `https://seller.kuraliupdates.com/`.
- Checks delivery portal root: `https://delivery.kuraliupdates.com/`.
- Verifies the OTP button and an email/mobile identity field are visible.
- Reloads the seller portal, then exercises back/forward navigation between seller and delivery roots.
- These are route/render checks, not authenticated seller/delivery workflows.

### 3. Required-input validation
- Opens the base URL.
- Submits the login form with an empty email.
- Expects the client-side “Please enter a valid email address” validation.
- This must not send an OTP.

### 4. Authenticated role login and post-login session checks
The suite generates one test for each role:

| Role | Environment identity key |
|---|---|
| Buyer | `E2E_BUYER_IDENTITY` |
| Seller | `E2E_SELLER_IDENTITY` |
| Delivery agent | `E2E_DELIVERY_IDENTITY` |
| Service provider | `E2E_PROVIDER_IDENTITY` |
| Admin | `E2E_ADMIN_IDENTITY` |

Each authenticated role test:
1. Is enabled only when the designated staging environment, exact allowed frontend/API hosts and path, an OTP capture token of at least 32 characters, and the role's identity are present. Otherwise Playwright marks that role test skipped.
2. Opens the staging frontend and fills the identity field.
3. Clicks the “Send 6-digit OTP” button and waits for the matching `POST .../auth/send-otp` response.
4. Allows at most two send attempts. A first HTTP 429 waits 61 seconds for the backend's known 60-second per-identifier cooldown before retrying once. Any other non-200 response, or a second 429, fails the test. This avoids polling for an OTP after a rejected send and avoids unbounded retries.
5. Polls the authenticated OTP capture endpoint for up to 90 seconds, every second, using `X-E2E-OTP-Token` and `Cache-Control: no-store`. HTTP 404 means the OTP is not available yet; other non-success statuses fail immediately. Only a six-digit OTP is accepted.
6. Enters the captured OTP and clicks the “Verify … Continue” button.
7. Checks the page does not show common internal-error text.
8. Reloads the page and checks it does not show “Please log in to continue”, exercising session persistence across reload.
9. If an account/profile control is present, opens it and checks for common session-expired/login-required text.

These are post-login/session smoke checks, not full business-workflow coverage. They do not place orders, create service bookings, change delivery state, or intentionally mutate customer records.

## Staging-only safety guards

The repository has one deployed environment that the owner designates as staging. The workflow is intentionally defensive:

- `E2E_ENVIRONMENT` must equal `staging`.
- Frontend must be HTTPS on exactly `bazaar.kuraliupdates.com`.
- Authenticated E2E API must be HTTPS on exactly `kuraliupdates-bazaar.onrender.com` with path `/api/v1`.
- The read-only smoke API has a separate guard for the same designated API host and path.
- A sufficiently long `E2E_OTP_CAPTURE_TOKEN` and all five role identities are required for authenticated tests.
- Do not change these guards to accept arbitrary hostnames or production targets.
- The OTP capture token and role identities must be stored as GitHub Actions secrets, never committed into the repository or copied into logs.
- The E2E tests must continue to use dedicated test identities and synthetic test data. Never delete real/customer records, and never create transactional test data against production. Keep production checks read-only.

## GitHub Actions workflow

Workflow file: `.github/workflows/e2e-login.yml`

### Triggers
- Pull requests targeting `main`, except changes that are documentation-only.
- Pushes to `main`, except documentation-only changes.
- Manual `workflow_dispatch`.
- Weekday schedule: cron `30 3 * * 1-5` (GitHub cron is UTC).

Documentation-only changes are excluded by `paths-ignore` patterns for Markdown and `docs/**`, per repository maintenance preference. Mixed documentation/code changes still run CI.

### Concurrency
All refs share concurrency group `kuraliupdates-single-staging-e2e` with `cancel-in-progress: false`. This queues runs rather than racing requests against the same staging identities and their OTP cooldowns.

### Jobs
1. **Frontend checks** — installs Bun dependencies and Playwright, runs TypeScript/lint checks, route/redirect/data mapping regression tests, delivery OTP validator regression, shared production build, independent portal builds, and checks expected portal HTML outputs.
2. **Backend tests** — runs focused Maven regression tests and then `mvn clean verify` in `backend-java-spring` using Java 17.
3. **Browser E2E and read-only smoke checks** — installs Chromium, validates the designated frontend/API targets, runs the read-only API smoke script, validates the five role secrets and staging OTP configuration, runs Playwright, and uploads artifacts even when tests fail.
4. **Publish private Playwright report** — only eligible for trusted non-PR runs on `main`, and only when the report-access confirmation variable is exactly `true`. It downloads the artifact from that same workflow run, copies only `downloaded-artifact/playwright-report/` to `site/`, verifies `site/index.html`, then deploys the report directory to Cloudflare Pages using Wrangler v4.

The publish job intentionally excludes `test-results/` and traces from the deployed site. Those remain in the access-controlled GitHub artifact for debugging. The job condition includes `always()` with `needs: e2e`, so it can publish a report after a failed E2E run if the artifact exists, but never from a pull request. Check the actual run's job result to know whether it deployed.

## GitHub Actions secrets and variables

### Required for authenticated staging E2E
Secrets:
- `E2E_OTP_CAPTURE_TOKEN`
- `E2E_BUYER_IDENTITY`
- `E2E_SELLER_IDENTITY`
- `E2E_DELIVERY_IDENTITY`
- `E2E_PROVIDER_IDENTITY`
- `E2E_ADMIN_IDENTITY`

Variables:
- `E2E_ENVIRONMENT=staging`
- `E2E_API_BASE_URL` (if set, it must be the designated staging API URL)
- `KURALI_API_BASE_URL` or `KURALI_STAGING_API_BASE_URL` may override the smoke API URL, but the runtime guard still restricts it to the designated staging API.

### Required for Cloudflare report publishing
Repository variables:
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID containing the Pages project.
- `CLOUDFLARE_PAGES_PROJECT=kuraliupdates-playwright-report` — exact Pages project name.
- `CLOUDFLARE_REPORT_ACCESS_CONFIGURED=true` — set only after the Pages production hostname has been tested and confirmed protected by Cloudflare Access.

Repository secret:
- `CLOUDFLARE_API_TOKEN` — scoped to the intended Cloudflare account with Account → Cloudflare Pages → Edit permission. Do not share or log the value.

The confirmation variable is an operator-controlled publishing gate. It does not configure Access, validate the allowlist, or prove the URL is protected. The human operator must verify Cloudflare Access separately.

## Cloudflare Pages and Access setup record

The report project name used in the workflow is `kuraliupdates-playwright-report`. The expected production hostname is normally:

`https://kuraliupdates-playwright-report.pages.dev`

Confirm the exact URL in the Cloudflare dashboard; do not assume it if Cloudflare has assigned a different hostname.

Access setup performed by the owner during this task:
- Created/configured the report-hosting project in Cloudflare.
- Configured a Cloudflare Access policy with an allowlist of explicit email addresses.
- Changed the Worker/Pages access scope from “Previews only” to “All traffic”.
- Reported that opening the report URL in Safari then behaved as expected.

Before every initial deployment or after changing the hostname/policy, re-test in Safari Private Browsing while signed out. The production hostname must require Access authentication. If preview URLs exist, verify their policy separately; they are not the primary report URL.

## Artifact and report access

- Artifact name: `playwright-e2e-report`
- Uploaded paths: `playwright-report/` and `test-results/`
- Retention: 14 days
- Artifact upload step uses `if: always()` so a failed test run still provides diagnostics when files exist.
- On a trusted `main` run, publishing copies only the HTML report folder. Traces and the separate `test-results` folder are not deployed.
- A successful artifact upload does not mean E2E passed.
- A successful Pages deploy does not prove Access is correctly configured; open the actual URL in a signed-out/private browser.
- A successful CI run does not by itself prove all screenshots/videos are visible in the HTML report; open the report and verify playback.

## Validation history (2026-10-17)

- PR #110, “Add private Cloudflare hosting for Playwright reports”, was squash-merged to `main`.
- Merge commit: `8e99ac380aad04c4a8fdb4d0ad2de1fbbae6dc6c`.
- The PR branch commit tested for the latest pre-merge run was `4399a344208f41f90b4a4014206e06f84bec80c1`.
- The corresponding browser E2E job reported **8 passed** in approximately 4.6 minutes: main login entry point, seller/delivery portal routing and history, required-input validation, and authenticated login/session checks for all five roles.
- The `playwright-e2e-report` artifact upload completed successfully; log reported 28 files and approximately 33.5 MB, artifact ID `12099632715`, retained for 14 days. Artifact URL: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/39028816883/artifacts/12099632715
- On the PR run, **Publish private Playwright report** was skipped as designed because publishing from pull requests is prohibited.
- A post-merge run started on `main`: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/39029779332. At the time of this document, frontend checks were observed passing while backend and browser E2E were still running. Do not record post-merge CI or Cloudflare deployment as passed until that run is rechecked.
- External Vercel deployments had previously encountered rate limiting on earlier attempts. The later status check for commit `4399a344208f41f90b4a4014206e06f84bec80c1` showed the six Vercel deployment statuses succeeded. This is distinct from the Cloudflare report publishing job.

## Troubleshooting

### Authenticated test receives HTTP 429
- The backend enforces a 60-second per-identifier OTP cooldown.
- The test handles one 429 by waiting 61 seconds and retrying once.
- The workflow serializes all runs sharing staging identities.
- Do not remove rate limits or add repeated retries. Investigate overlapping/manual workflows or stale use of the dedicated identity.

### OTP capture endpoint returns 404
- The test polls for up to 90 seconds after the send-OTP API returns 200.
- Check that the secure E2E OTP capture endpoint is enabled only for the designated staging environment and that the secret is correct.
- A non-404 response fails immediately; inspect backend logs without exposing OTPs or tokens.

### Report artifact is missing
- Inspect the E2E job's “Upload Playwright report and traces” step.
- Check whether `playwright-report/index.html` exists. The upload step is allowed to run after failures, but an HTML report may not exist if the test runner never started.
- Download artifact from the exact run that produced it; artifacts are run-scoped.

### Cloudflare publish job is skipped
- Skipped on pull-request runs intentionally.
- For publishing, confirm the run is on `main`, the event is not `pull_request`, and `CLOUDFLARE_REPORT_ACCESS_CONFIGURED` equals the exact string `true`.
- If it runs but fails, inspect its configuration verification, artifact download, report-index check, and Wrangler deployment logs.
- Confirm the project is Cloudflare Pages Direct Upload and the name matches `CLOUDFLARE_PAGES_PROJECT`.
- Never make the Pages hostname public just to make the deployment succeed.

### Video or screenshot not visible
- Confirm `screenshot: "on"` and `video: "on"` are still in `playwright.config.ts`.
- Confirm the test generated media in `test-results/` and inspect the HTML report attachment links.
- The Pages deployment intentionally copies only `playwright-report/`. If the report HTML does not contain/reference the media assets, change the reporter/artifact arrangement deliberately so the required media are included in the report folder, then test on a real run. Do not blindly copy all of `test-results/` to the hosted site because it may contain traces and sensitive diagnostic material.
- Test the hosted report on iPhone/iPad Safari after Access authentication.

## Safe operating checklist

- [ ] Keep E2E targets pinned to the designated staging frontend and API.
- [ ] Use dedicated test identities; never reuse customer identities.
- [ ] Never create transactional data in production or delete real records.
- [ ] Keep OTP capture credentials, role identities, and Cloudflare token in GitHub secrets.
- [ ] Preserve serialized E2E concurrency for the shared staging environment.
- [ ] Confirm Cloudflare Access protects the exact production Pages hostname.
- [ ] Publish only from trusted `main` workflow runs.
- [ ] Deploy only `playwright-report/`, not `test-results/` or raw traces.
- [ ] Verify report attachments/video playback and signed-out Access behaviour after deployment.
- [ ] Record actual run outcomes; do not treat a skipped publish job as a successful deployment.
