# KuraliUpdates Bazaar E2E tests

Playwright covers login availability, required-input validation, protected direct routes, and authenticated post-login session restoration for Buyer, Seller, Delivery Agent, Service Provider, and Admin.

## What authenticated verification proves

For each configured dedicated staging identity, the browser test:
1. Requests a fresh OTP through the normal UI flow.
2. Retrieves the OTP from the staging-only, allowlisted OTP capture endpoint.
3. Verifies the OTP through the normal UI.
4. Confirms the UI leaves the sign-in state and stores the authenticated session/token.
5. Calls `GET /auth/me` with the stored bearer token and verifies the backend recognizes the same identity.
6. Reloads the page and repeats the backend check, proving the persisted token remains valid after refresh.

These tests do not create orders/bookings, edit profiles/addresses, complete deliveries, or delete records.

## Run locally

```bash
bun install --frozen-lockfile
bun add --dev @playwright/test
bunx playwright install chromium
E2E_BASE_URL=https://bazaar.kuraliupdates.com bunx playwright test
```

## Authenticated staging configuration

Authenticated tests are skipped unless the designated staging targets and a dedicated role identity are configured. The GitHub Actions workflow expects these repository/environment values:

- Variable `E2E_ENVIRONMENT=staging`
- Variable `E2E_API_BASE_URL=https://kuraliupdates-bazaar.onrender.com/api/v1`
- Secret `E2E_OTP_CAPTURE_TOKEN` (at least 32 characters; same value as the Render secret `APP_E2E_OTP_TOKEN` / `app.e2e-otp.token`)
- One dedicated test identity per role: `E2E_BUYER_IDENTITY`, `E2E_SELLER_IDENTITY`, `E2E_DELIVERY_IDENTITY`, `E2E_PROVIDER_IDENTITY`, `E2E_ADMIN_IDENTITY`

On the staging backend, enable OTP capture only with all of the following: `APP_E2E_OTP_ENABLED=true`, `APP_E2E_OTP_ENVIRONMENT=staging`, the same strong token, and `APP_E2E_OTP_ALLOWED_IDENTIFIERS` containing only the dedicated test identities. The controller is disabled by default and returns 404 unless the staging flag, token, and allowlist are valid. OTPs are one-time consumed, short-lived, held in memory, and never persisted/logged by the capture service. Do not configure these variables on any production environment or add credentials/OTP values to source control.

## Run in GitHub Actions

Run **Actions → KuraliUpdates CI and E2E → Run workflow**. The workflow hard-codes the approved Bazaar host and API host to prevent redirecting authenticated tests to arbitrary hosts. The read-only API smoke checks can run without test identities; authenticated tests require the secure staging OTP handoff and all five dedicated identities.

Keep order, booking, profile/address writes, delivery completion, and cleanup tests out of this suite until isolated synthetic fixtures and a safe staging reset/cleanup contract are implemented. Never delete real records or create transactional test data in production.
