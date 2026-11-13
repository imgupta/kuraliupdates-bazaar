# Development acceleration and release checklist

Last audited: 13 November 2026  
Repository: `imgupta/kuraliupdates-bazaar`  
Environment: the owner-designated shared staging environment

## Current deployment topology

- One React/Vite monorepo feeds the combined Bazaar app and five role portals.
- Vercel has six projects: Bazaar, Buyer, Seller, Delivery, Admin and Daily Help.
- Render hosts the Spring Boot API from `backend-java-spring/` on `main`; automatic deploy-on-commit is enabled.
- Render currently has one backend service in Singapore, configured with a no-cache build profile. Do not trigger a manual deploy after a push while auto-deploy is enabled.
- Do not assume a separate production environment or isolated staging database. Verify the Oracle target before any mutating test.

## CI workflow ownership after this change

| Workflow | Responsibility | Trigger policy |
|---|---|---|
| `e2e-login.yml` | Frontend checks, backend verification, read-only API smoke and browser E2E | PRs and pushes to `main`; scheduled read-only checks; optional manual transactional opt-in |
| `quality-gates.yml` | Build and inspect the final backend Docker image; reject wallet artifacts and CI placeholder values | Only backend changes, workflow changes, or manual dispatch |
| `phase1-staging-transactional-e2e.yml` | Synthetic COD order and Daily Help lifecycle tests | Manual dispatch only, with explicit staging-mutation confirmation |
| `staging-buyer-token-smoke.yml` | Narrow read-only Buyer token exchange | Auth-related paths only, plus manual dispatch |
| `staging-role-fixture-preflight.yml` | Verify role sessions and dedicated staging fixtures without business mutations | Auth/fixture-related paths and manual dispatch |

The separate quality-gates workflow no longer repeats frontend lint/build or Maven verification already performed by `e2e-login.yml`. Its unique Docker image inspection remains independent.

Transactional E2E no longer runs automatically on every push to `main`. This protects the shared staging data and avoids spending up to 35 minutes on a mutation suite for unrelated commits.

## Playwright execution policy

- Keep one CI worker while the suite uses one shared five-role staging account and shared OTP lane. Increase workers only after tests use isolated identities/fixtures and a concurrency test proves there is no cross-test interference.
- Keep `fullyParallel: false` and the existing staging concurrency group.
- Capture screenshots and video only on failures; retain traces on failure. This reduces artifact I/O and upload volume without losing failure diagnostics.
- Keep Chromium browser caching keyed by `bun.lock`.
- Do not weaken API/database readiness checks to make a run green. A database-unready result is deferred, not a pass.
- Remaining improvement: add `@playwright/test` as a pinned development dependency and regenerate `bun.lock` with Bun, rather than running `bun add --dev` during CI. This requires a package-manager lockfile update and full validation in a Bun-enabled checkout.

## Recent failure evidence and interpretation

- Main CI run #1161 failed two browser cases. The cancellation test reached cleanup, which safely refused to write because two run-tagged orders were outside the cleanup allowlist. PR #341 adds regression coverage for cancelled unpaid COD orders; its latest inspected CI run #1163 passed. Do not merge PR #341 or this acceleration PR without checking their own current required checks.
- Transactional workflow run #66 failed its readiness gate after eight minutes: the API returned HTTP 503 with `database=NOT_CHECKED` and reported a commit different from the backend commit expected by that run. This is a deployment/database-readiness issue, not a reason to shorten the timeout or mark the test passed. Check Render deployment SHA, startup logs, Oracle connectivity and the readiness endpoint before dispatching the transactional suite again.
- The read-only smoke runner has separate liveness and database-readiness budgets. If Oracle is unavailable, protected-route checks are deferred and reported as such.

## Vercel deployment policy

- Vercel's latest Bazaar deployment was marked `CANCELED`, but its deployment details linked to the documented **Ignored Build Step** behavior. This is consistent with the repository's portal-impact/ignore-build tests and can mean the build was intentionally skipped, not that a build failed.
- Treat an ignored build as a no-op only when the exact commit/path decision is confirmed. For a runtime change, require a READY deployment on the intended SHA and verify the correct custom-domain alias.
- Role-only changes should build only the affected portal. Shared runtime, dependencies, Vite configuration and global CSS changes must fan out to all affected portals. Unknown paths must fail safe and build rather than skip.
- Do not create artificial deployments just to test quota behavior.

## Render deployment policy

- Pushes to `main` automatically deploy the backend. Do not manually trigger another deploy after the same commit.
- Verify the deployed commit SHA and `LIVE` state, then inspect sanitized startup logs and health/readiness separately.
- The current Render service uses a no-cache build profile. Do not change caching until Maven/Docker build reproducibility and Oracle wallet handling are validated.
- A successful image build is not proof of application readiness; a live process is not proof of database readiness.

## SonarCloud activation

The CI scan step is prepared in `e2e-login.yml` and runs after Maven verification so Java binaries are available. It remains inactive until the repository is configured with:

- Repository variable `SONAR_PROJECT_KEY`
- Repository variable `SONAR_ORGANIZATION`
- Repository secret `SONAR_TOKEN`

After configuring these values, run the workflow on a PR, confirm the SonarCloud quality gate is returned, then make the SonarCloud check a required branch-protection check. Until that is done, the scan is prepared but is not an enforced quality gate. Do not add a fake project key or token to source control.

## Sentry activation

Sentry SDK code and dependencies are not yet enabled. The repository currently has no Sentry SDK/configuration or project DSNs. Create separate frontend and backend Sentry projects, then provide the DSNs through hosting environment settings:

- Frontend Vite build variable: `VITE_SENTRY_DSN` (public DSN only; never use an auth token here).
- Backend Render secret: `SENTRY_DSN`.
- Set environment/release labels to `staging` and the deployed commit SHA.
- Configure event filtering to remove authorization headers, cookies, OTPs, tokens, request bodies, email addresses, phone numbers and private seller-document data. Keep Session Replay disabled initially.

Once the DSNs and project ownership are confirmed, add the matching pinned React/Vite and Spring Boot SDK dependencies, initialize both SDKs with PII-safe filtering, and validate one synthetic handled exception in each project. Do not claim Sentry is active until both events arrive.

## Unified PR and deployment checklist

### Before opening a PR

- [ ] Confirm the change is on a feature branch and based on current `main`.
- [ ] Review the diff for secrets, wallet files, generated reports and unrelated changes.
- [ ] Run `bun install`, `bun run lint`, `bun run build`, relevant Node regression tests and the affected-portal build-impact tests.
- [ ] Run `cd backend-java-spring && mvn --batch-mode --no-transfer-progress clean verify` for backend changes.
- [ ] Validate workflow YAML and ensure path filters/concurrency groups do not bypass required checks.
- [ ] For staging E2E, confirm the designated staging target and dedicated synthetic fixtures. Never expose secrets or OTPs.

### Before merging

- [ ] All required PR checks pass on the exact head SHA.
- [ ] Review SonarCloud quality gate when configured; do not treat a skipped scan as a pass.
- [ ] Confirm wallet/image-content verification passes for backend changes.
- [ ] Confirm no migration is edited after application; use a new Flyway version for schema changes.
- [ ] Do not merge an unverified PR or merge while a relevant check is pending.

### After merging

- [ ] Confirm Vercel READY on the intended SHA for every affected portal; an intentional ignored build must have a verified path decision.
- [ ] Confirm Render LIVE on the expected backend SHA; do not trigger a duplicate manual deploy.
- [ ] Inspect sanitized startup logs, Flyway result and database-backed readiness.
- [ ] Run read-only API smoke first.
- [ ] Run mutating transactional E2E only via confirmed manual dispatch after Oracle target and fixture safety checks.
- [ ] Record results as PASS, FAIL or BLOCKED with timestamps and sanitized evidence.

## Remaining owner actions

- [ ] Create/configure the SonarCloud project and add the two repository variables plus `SONAR_TOKEN` secret.
- [ ] Create separate Sentry frontend/backend projects and supply both DSNs through hosting settings.
- [ ] Regenerate the Bun lockfile after adding a pinned Playwright dev dependency; remove runtime `bun add` from CI only after frozen-lockfile validation succeeds.
- [ ] Investigate the staging database readiness failure before the next transactional run.
