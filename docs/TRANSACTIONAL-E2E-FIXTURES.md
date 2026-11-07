# Transactional order and Daily Help E2E fixtures

The guarded Playwright suite is `e2e/order-daily-help-lifecycle.spec.ts`. It contains two mutating lifecycle tests: one COD order journey and one Daily Help booking journey. Both are skipped unless the trusted staging workflow explicitly enables them.

## Journeys and assertions

- **Order:** buyer negotiates a synthetic product price; seller counters; buyer accepts; replayed acceptance is rejected; a later rejected offer does not overwrite the agreed price; buyer places a COD order with reconciled totals; seller accepts and marks ready; two concurrent delivery claims produce exactly one winner; invalid delivery OTP is rejected; valid OTP completes delivery; replayed OTP is rejected; buyer and seller histories reconcile.
- **Daily Help:** buyer submits two concurrent bookings for one synthetic slot; exactly one succeeds; the assigned professional marks ARRIVING and READY_TO_START; invalid start OTP is rejected; valid OTP starts the timer; replayed start and completion transitions are rejected; the buyer reads back the completed booking.
- **Cleanup:** each test uses a unique run ID. The afterEach cleanup endpoint must confirm the run ID and non-negative deletion counts. When fixture provisioning succeeded, only the run-owned synthetic product, service, slot and rollback seller are removed, along with run-tagged order, booking, chat, messages and sessions. Cleanup must fail closed if tagged relationships are unsafe or inventory restoration is ambiguous.

## Shared identity and pre-existing profiles

The five role identity settings `E2E_BUYER_IDENTITY`, `E2E_SELLER_IDENTITY`, `E2E_DELIVERY_IDENTITY`, `E2E_PROVIDER_IDENTITY` and `E2E_ADMIN_IDENTITY` must all resolve to the same email. `E2E_FLOW_BUYER_EMAIL` must match it. Each role-scoped token exchange asserts that the authenticated user is that email and that the returned role set contains BUYER, SELLER, DELIVERY, PROFESSIONAL and ADMIN.

The seller and delivery-agent profile IDs are pre-existing dedicated staging profiles configured as `E2E_FLOW_SELLER_ID` and `E2E_FLOW_DELIVERY_AGENT_ID`. The professional profile is resolved by the backend from the shared account identity; there is no separate `E2E_FLOW_PROFESSIONAL_ID` setting. All three profiles must belong to the same `USERS.USER_ID` as the shared account and must already be in the required approved/active/verified and available states. These pre-existing role profiles are not deleted by cleanup and do not need artificial `E2E-` prefixes.

## Safety gate and required secret

The workflow is `.github/workflows/phase1-staging-transactional-e2e.yml`. It is manual-dispatch only and requires `confirm_staging_mutations=true`; the default is false. It pins the target to the designated HTTPS staging API and requires a successful database-backed `/health` check before any lifecycle test starts. It checks out the exact GitHub revision selected for the workflow dispatch (`github.sha`), rather than silently checking out `main`.

The single GitHub Actions secret `E2E_STAGING_CONFIG_JSON` must contain these keys:

- `E2E_ENVIRONMENT` = `staging`
- `E2E_TRANSACTIONAL_FLOWS_ENABLED` = `true`
- `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED` = `true`, only after OTP suppression has been verified in Render
- `E2E_OTP_CAPTURE_TOKEN` (at least 32 characters; must exactly match the Render capture token)
- `E2E_FLOW_AUTH_TOKEN` (at least 32 characters)
- All five role identity keys listed above, using the same email
- `E2E_FLOW_BUYER_PHONE` and `E2E_FLOW_BUYER_EMAIL`
- `E2E_FLOW_SELLER_ID` and `E2E_FLOW_DELIVERY_AGENT_ID`

The workflow masks secret values and never prints them. Never commit tokens or share them in chat. Render OTP capture must be staging-only and allowlisted only for the dedicated synthetic E2E email. Do not set the suppression-confirmed flag until the Render configuration and exact token match have been checked.

## Staging data boundaries

- COD only; no real payment gateway is invoked.
- Test addresses explicitly say do not deliver / do not visit. No physical delivery or service visit is initiated.
- Run-created catalogue/service/slot fixtures carry the run ID and are validated as synthetic by the backend. Existing seller, delivery-agent, professional and user profiles are not created, promoted or deleted by these tests.
- Cleanup is scoped to the exact run ID. It must not truncate tables or delete by date, status, account, or broad prefix.
- PR/push checks remain read-only. The mutating suite is a separately gated staging operation.
- Concurrency assertions cover duplicate delivery claims and competing Daily Help slot bookings in this suite. They are not a substitute for broader production-scale load or Oracle race testing.
