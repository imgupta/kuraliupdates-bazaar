# KuraliUpdates Bazaar development smoke tests

These Playwright tests deliberately skip authentication and OTP flows during development. They use the existing deployed environment and require no new GitHub variables, secrets, test identities, database fixtures, or backend configuration.

## What is tested

- Bazaar and all five role portal URLs respond without HTTP errors.
- The browser can directly navigate to role portal paths through the Bazaar domain.
- Refresh and browser history navigation work.
- Uncaught JavaScript runtime errors are captured as failures.
- The existing CI workflow runs read-only API smoke checks against the canonical API URL.

## Run locally

```bash
bun install
bun add --dev @playwright/test
bunx playwright install chromium
bunx playwright test
```

## Boundaries for this development phase

This suite does **not** test login, OTP, session restoration, role authorization after login, or authenticated mutations. It does not create orders/bookings, edit profiles or addresses, complete deliveries, or delete records. These can be added when the login flow is ready for explicit testing.

The workflow uses the existing Bazaar and Render API URLs as defaults. No additional environment variables or secrets are required for these unauthenticated smoke tests. Keep any future write-flow tests limited to synthetic records and ensure they cannot run against real customer data.
