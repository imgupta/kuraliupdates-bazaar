# KuraliUpdates Bazaar E2E tests

These Playwright tests cover homepage/login availability, empty-input validation, and optional authenticated login/session checks for Buyer, Seller, Delivery Agent, Service Provider, and Admin.

## Run locally

```bash
bun install --frozen-lockfile
bun add --dev @playwright/test
bunx playwright install chromium
E2E_BASE_URL=https://bazaar.kuraliupdates.com bunx playwright test
```

## Authenticated tests

Authenticated tests are skipped unless both an identity and OTP are provided for that role:

- `E2E_BUYER_IDENTITY`, `E2E_BUYER_OTP`
- `E2E_SELLER_IDENTITY`, `E2E_SELLER_OTP`
- `E2E_DELIVERY_IDENTITY`, `E2E_DELIVERY_OTP`
- `E2E_PROVIDER_IDENTITY`, `E2E_PROVIDER_OTP`
- `E2E_ADMIN_IDENTITY`, `E2E_ADMIN_OTP`

Add these as GitHub Actions secrets only for dedicated test accounts. OTPs are time-sensitive; a static secret is not a reliable OTP automation strategy. For unattended authenticated runs, connect the test harness to a dedicated test mailbox/SMS provider or use a staging-only test OTP mechanism that is disabled in production. Do not bypass production OTP security or put credentials/OTP values in source control.

## Run in GitHub Actions

Run **Actions → End-to-end login tests → Run workflow**. Use production only for non-mutating smoke checks. Run profile edits, address writes, orders, bookings, delivery completion, and logout/session mutation tests against an isolated staging environment with synthetic data.

The current suite intentionally does not create orders, bookings, or change profiles. Business-flow coverage should be added after test fixtures and safe staging reset/cleanup are established.
