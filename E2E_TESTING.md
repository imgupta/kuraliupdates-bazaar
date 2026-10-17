# KuraliUpdates Bazaar E2E testing

## Current workflow

The single workflow is [`.github/workflows/e2e-login.yml`](.github/workflows/e2e-login.yml). It runs frontend type checks/regressions/builds, backend Maven verification, guarded read-only staging API smoke checks, and Playwright browser checks.

- Playwright config: [`playwright.config.ts`](playwright.config.ts)
- Browser tests: [`e2e/login.spec.ts`](e2e/login.spec.ts)
- Private report and OTP operations guide: [`docs/POST_LOGIN_PLAYWRIGHT_E2E.md`](docs/POST_LOGIN_PLAYWRIGHT_E2E.md)
- Staging-only OTP setup: [`docs/STAGING_E2E_SETUP.md`](docs/STAGING_E2E_SETUP.md)

## Run locally

```bash
bun install --frozen-lockfile
bun add --dev @playwright/test
bunx playwright install chromium
E2E_BASE_URL=https://bazaar.kuraliupdates.com bunx playwright test
```

For TypeScript/frontend regression tests:

```bash
bun run lint
node --import tsx --test tests/routeConfig.test.ts
node --import tsx --test tests/roleRouteAccess.test.ts
node --import tsx --test tests/portalRedirect.test.ts
node --import tsx --test tests/savedAddress.test.ts
node --import tsx --test tests/userProfile.test.ts
node --import tsx --test tests/sellerProduct.test.ts
node --import tsx --test tests/moduleBoundaries.test.ts
bun run build
bun run build:portals
```

## Authenticated role tests

The suite has dedicated test cases for Buyer, Seller, Delivery Agent, Service Provider, and Admin. CI obtains each identity from GitHub Actions secrets:

- `E2E_BUYER_IDENTITY`
- `E2E_SELLER_IDENTITY`
- `E2E_DELIVERY_IDENTITY`
- `E2E_PROVIDER_IDENTITY`
- `E2E_ADMIN_IDENTITY`

Authenticated runs also require `E2E_ENVIRONMENT=staging`, the exact designated staging frontend/API targets, and `E2E_OTP_CAPTURE_TOKEN` of at least 32 characters. The token is used only to retrieve an OTP through the staging-only capture endpoint; OTPs are never stored in source control.

Each role test sends one OTP request. If the endpoint returns HTTP 200, Playwright polls the protected capture endpoint for up to 90 seconds. If it returns HTTP 429, the test checks once for an already captured OTP and fails promptly with guidance if none is available. The test no longer sleeps 61 seconds or retries OTP sending. Use dedicated, allowlisted test identities; the backend's normal cooldown remains in force for ordinary identities and production.

Tests skip when required configuration or identity is absent. A green workflow job alone does not prove all five role tests executed; check the HTML report for each role's actual passed/skipped/failed result.

## Safety

- The repository's single deployed environment is designated staging by the owner. Keep authenticated E2E pinned to the approved staging host and API.
- API smoke checks are read-only. Do not create orders/bookings, change profiles/addresses, mutate seller inventory, approve accounts, claim delivery jobs, resend/verify delivery OTPs, or publish location as part of smoke tests.
- Do not delete real records or run destructive reset migrations for routine tests.
- Business-flow mutation coverage requires dedicated synthetic records and an explicitly verified isolated database/test-data strategy.
- Playwright screenshots and videos are configured for every test; traces are retained on failure. Reports, screenshots, videos, traces, and test-results can contain sensitive data.
- Cloudflare report publishing is restricted to trusted main-branch runs and gated by `CLOUDFLARE_REPORT_ACCESS_CONFIGURED=true`. That variable is only an operator confirmation; Cloudflare Access itself must be configured and verified. PR runs must not publish reports.
