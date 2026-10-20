# KuraliUpdates Bazaar E2E testing

## Current workflow

The single workflow is [`.github/workflows/e2e-login.yml`](.github/workflows/e2e-login.yml). It runs frontend type checks/regressions/builds, backend Maven verification, guarded read-only staging API smoke checks, and Playwright browser checks.

- Playwright config: [`playwright.config.ts`](playwright.config.ts)
- Browser tests: [`e2e/login.spec.ts`](e2e/login.spec.ts)
- Full order lifecycle and cross-role coverage matrix: [`docs/ORDER-LIFECYCLE-E2E-MATRIX.md`](docs/ORDER-LIFECYCLE-E2E-MATRIX.md)
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

The suite has dedicated test cases for Buyer, Seller, Delivery Agent, Service Provider, and Admin. CI obtains all identities and testing/staging settings from the single GitHub Actions secret `E2E_STAGING_CONFIG_JSON` (JSON keys retain the environment-variable names below):

- `E2E_BUYER_IDENTITY`
- `E2E_SELLER_IDENTITY`
- `E2E_DELIVERY_IDENTITY`
- `E2E_PROVIDER_IDENTITY`
- `E2E_ADMIN_IDENTITY`

Authenticated runs also require `E2E_ENVIRONMENT=staging`, the exact designated staging frontend/API targets, `E2E_OTP_CAPTURE_TOKEN` of at least 32 characters, and `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED=true` in `E2E_STAGING_CONFIG_JSON`. That confirmation must only be enabled after the staging backend's allowlisted no-email OTP capture mode is deployed and verified. The backend suppresses external email only for allowlisted staging E2E identities; the generated OTP is retrieved through the protected staging-only capture endpoint. OTPs are never stored in source control. Until the confirmation variable is enabled, authenticated OTP tests skip instead of requesting codes. Even after confirmation, authenticated OTP tests run only on scheduled or manually dispatched trusted workflows, never on pull-request or push workflows.

Once the explicit no-email confirmation is enabled, each role test sends one OTP request. If the endpoint returns HTTP 200, Playwright polls the protected capture endpoint for up to 90 seconds. If it returns HTTP 429, the test checks once for an already captured OTP and fails promptly with guidance if none is available. The test no longer sleeps 61 seconds or retries OTP sending. Use dedicated, allowlisted test identities; the backend's normal cooldown remains in force for ordinary identities and production.

Tests skip when required configuration or identity is absent. A green workflow job alone does not prove all five role tests executed; check the HTML report for each role's actual passed/skipped/failed result.

## Consolidated staging JSON configuration

The workflow reads E2E test settings, role identities, synthetic fixture IDs, and E2E-only secrets from one GitHub Actions repository secret: `E2E_STAGING_CONFIG_JSON`. The example structure is in [`.github/e2e-staging-config.example.json`](.github/e2e-staging-config.example.json). That committed file is a template only; never put real tokens, passwords, or personal test-user details in it.

1. Copy the example JSON and replace the blank/placeholders with your dedicated test values.
2. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Set the name to `E2E_STAGING_CONFIG_JSON` and paste the complete JSON object as its secret value.
4. Keep the fixed staging frontend/API URLs in workflow code; the workflow rejects other hosts. The JSON cannot redirect tests to an arbitrary API.
5. Until the isolated staging database and synthetic fixtures are verified, leave `E2E_TRANSACTIONAL_FLOWS_ENABLED` and `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED` as `false`.

The workflow loads these JSON keys into its runtime environment without printing their values. OTP-login and mutating lifecycle tests are additionally gated to scheduled/manual trusted runs.

## Static-secret flow authentication (transactional API E2E)

Transactional lifecycle tests can obtain fresh server-side session tokens without sending OTPs. This is separate from the browser OTP-login tests above.

1. Generate a high-entropy secret locally, for example with `openssl rand -hex 32`. Never commit it or paste it into a chat.
2. Configure the backend environment with `E2E_FLOW_AUTH_ENV=staging`, `E2E_FLOW_AUTH_TOKEN=<the generated secret>`, and `E2E_FLOW_AUTH_IDENTITIES=<comma-separated allowlisted E2E emails/phone numbers>`. The allowlist should contain only dedicated synthetic test accounts. Do not configure these on a production environment.
3. Put the same generated secret in the `E2E_FLOW_AUTH_TOKEN` field of the private `E2E_STAGING_CONFIG_JSON` GitHub Actions secret described above.
4. The role identities used in the JSON must exist and have the corresponding backend roles.
5. Once the endpoint is deployed, a transactional test exchanges the shared secret and one role identity at `POST /api/v1/e2e/auth/token`, receiving a normal application session token that expires after two hours. The shared secret itself is never accepted as an API bearer token.
6. The endpoint returns 404 unless the backend environment is exactly `staging`, the secret is at least 32 characters, the secret matches, and the requested identity is in `E2E_FLOW_AUTH_IDENTITIES`. Role checks still apply; admin token issuance is limited to the configured root-admin account.

The exchange endpoint skips OTP only for the test-token issuance operation; it does not change `/auth/send-otp` or `/auth/verify-otp`. It does not by itself authenticate a browser UI session. Browser UI login tests continue to require the separately verified OTP-capture setup. Do not enable mutating lifecycle tests until the database is confirmed isolated from real customer/order data.

## Safety

- The repository's single deployed environment is designated staging by the owner. Keep authenticated E2E pinned to the approved staging host and API.
- API smoke checks are read-only. Do not create orders/bookings, change profiles/addresses, mutate seller inventory, approve accounts, claim delivery jobs, resend/verify delivery OTPs, or publish location as part of smoke tests.
- Do not delete real records or run destructive reset migrations for routine tests.
- Business-flow mutation coverage requires dedicated synthetic records and an explicitly verified isolated database/test-data strategy.
- Playwright screenshots and videos are configured for every test; traces are retained on failure. Reports, screenshots, videos, traces, and test-results can contain sensitive data.
- Cloudflare report publishing is restricted to trusted main-branch runs and gated by `CLOUDFLARE_REPORT_ACCESS_CONFIGURED=true`. That variable is only an operator confirmation; Cloudflare Access itself must be configured and verified. PR runs must not publish reports.
- Vercel preview deployments are disabled for the Bazaar and all five role-portal projects. Pull requests run checks only; deployments must not be triggered from PRs. Production/main deployment settings are separate.
