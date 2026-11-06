# Transactional order and Daily Help E2E fixtures

The browser suite in `e2e/order-daily-help-lifecycle.spec.ts` contains two opt-in API-backed lifecycle tests plus a trusted-event admin authorization test:

Before enabling the Daily Help lifecycle, confirm the fixture professional is explicitly approved by the admin workflow and is AVAILABLE. Self-registration no longer grants verification automatically. Do not use an unverified profile as a test fixture.

- Order: synthetic buyer checkout → seller accepts and readies → delivery agent claims → invalid OTP rejected → valid OTP completes → buyer/seller histories reconcile.
- Daily Help: synthetic buyer books a slot → professional marks arrival and ready-to-start → invalid OTP rejected → valid OTP starts the timer → professional completes → buyer reads back terminal status.

## Safety gate

These tests are **skipped by default**. They only run when `E2E_ENVIRONMENT=staging`, `E2E_TRANSACTIONAL_FLOWS_ENABLED=true`, the API URL is exactly `https://kuraliupdates-bazaar.onrender.com/api/v1`, and all required fixture variables are provided. This is the single owner-designated staging environment, so enable mutation tests only after verifying that the product, slot, users, seller, and delivery agent are dedicated synthetic records. Seller, delivery-agent and professional profile IDs must start with `E2E-`. The backend creates a run-owned product with stock 2 and a one-hour future Daily Help slot.

Required JSON keys inside the single GitHub Actions secret `E2E_STAGING_CONFIG_JSON` (the product, service and slot are provisioned per run):
- `E2E_ENVIRONMENT`, `E2E_OTP_CAPTURE_TOKEN`, `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED`, `E2E_TRANSACTIONAL_FLOWS_ENABLED`, `E2E_FLOW_AUTH_TOKEN`
- `E2E_BUYER_IDENTITY`, `E2E_SELLER_IDENTITY`, `E2E_DELIVERY_IDENTITY`, `E2E_PROVIDER_IDENTITY`, `E2E_ADMIN_IDENTITY`
- `E2E_FLOW_BUYER_PHONE`, `E2E_FLOW_BUYER_EMAIL`
- `E2E_FLOW_SELLER_ID`, `E2E_FLOW_DELIVERY_AGENT_ID`
- `E2E_FLOW_PROFESSIONAL_ID`

Tokens must be short-lived, staging-only bearer tokens for dedicated test accounts; never put them in source control. Keep the mutation flag disabled until these records and tokens have been reviewed and approved and the V15 run-tag migration has been applied to the designated staging database. The mutating lifecycle tests run in a separate trusted workflow after successful main-branch CI or by manual dispatch; PR runs cannot issue E2E sessions or create transactional records. Each test creates a unique `E2E_RUN_ID` and tags its short-lived E2E sessions; lifecycle tests also tag the order, Daily Help booking, negotiation chat, product, service and slot through the staging-secret-protected backend. The `POST /e2e/cleanup/{runId}` operation first validates that every tagged relationship is synthetic (`E2E-` product/seller/service/slot/professional IDs); if any relationship is unsafe or an order's inventory state is ambiguous, it aborts before writing. On success it restores the reserved quantity for tagged synthetic products, releases only the run's booked slot, and deletes only rows tagged to that exact run, including the temporary sessions. It never truncates tables or deletes by date, status, account, or broad prefix.
