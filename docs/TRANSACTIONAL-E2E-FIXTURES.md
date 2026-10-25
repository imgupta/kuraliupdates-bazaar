# Transactional order and Daily Help E2E fixtures

The browser suite in `e2e/order-daily-help-lifecycle.spec.ts` contains two opt-in API-backed lifecycle tests:

Before enabling the Daily Help lifecycle, confirm the fixture professional is explicitly approved by the admin workflow and is AVAILABLE. Self-registration no longer grants verification automatically. Do not use an unverified profile as a test fixture.

- Order: synthetic buyer checkout → seller accepts and readies → delivery agent claims → invalid OTP rejected → valid OTP completes → buyer/seller histories reconcile.
- Daily Help: synthetic buyer books a slot → professional marks arrival and ready-to-start → invalid OTP rejected → valid OTP starts the timer → professional completes → buyer reads back terminal status.

## Safety gate

These tests are **skipped by default**. They only run when `E2E_ENVIRONMENT=staging`, `E2E_TRANSACTIONAL_FLOWS_ENABLED=true`, the API URL is exactly `https://kuraliupdates-bazaar.onrender.com/api/v1`, and all required fixture variables are provided. This is the single owner-designated staging environment, so enable mutation tests only after verifying that the product, slot, users, seller, and delivery agent are dedicated synthetic records. Product, seller, slot, service, professional and agent fixture IDs must start with `E2E-`; the order quantity is capped at 2.

Required JSON keys inside the single GitHub Actions secret `E2E_STAGING_CONFIG_JSON`:
- `E2E_FLOW_BUYER_TOKEN`, `E2E_FLOW_SELLER_TOKEN`, `E2E_FLOW_DELIVERY_TOKEN`, `E2E_FLOW_PROVIDER_TOKEN`
- `E2E_FLOW_BUYER_PHONE`, `E2E_FLOW_BUYER_EMAIL`
- `E2E_FLOW_PRODUCT_ID`, `E2E_FLOW_SELLER_ID`, `E2E_FLOW_DELIVERY_AGENT_ID`, `E2E_FLOW_ORDER_QUANTITY`
- `E2E_FLOW_DAILY_HELP_SERVICE_ID`, `E2E_FLOW_DAILY_HELP_SLOT_ID`, `E2E_FLOW_PROFESSIONAL_ID`, `E2E_FLOW_DAILY_HELP_START`, `E2E_FLOW_DAILY_HELP_HOURS`

Tokens must be short-lived, staging-only bearer tokens for dedicated test accounts; never put them in source control. Keep the mutation flag disabled until these records and tokens have been reviewed and approved and the V15 run-tag migration has been applied to the designated staging database. The mutating lifecycle tests and role-token authorization checks run only on trusted scheduled or manually dispatched staging workflows; PR/push runs cannot issue E2E sessions or create transactional records. Every mutating test creates a unique `E2E_RUN_ID` and tags the order, Daily Help booking, and negotiation chat through a staging-secret-protected header. The `POST /e2e/cleanup/{runId}` operation first validates that every tagged relationship is synthetic (`E2E-` product/seller/service/slot/professional IDs); if any relationship is unsafe or an order's inventory state is ambiguous, it aborts before writing. On success it restores the reserved quantity for tagged synthetic products, releases only the run's booked slot, and deletes only rows tagged to that exact run. It never truncates tables or deletes by date, status, account, or broad prefix.
