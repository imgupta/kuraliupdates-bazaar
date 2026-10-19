# KuraliUpdates E2E configuration reference

This document inventories the environment variables, GitHub Actions repository variables/secrets, and Render backend environment variables used by the E2E workflow. Configure values only in the locations listed here; never commit credentials or tokens.

## Where configuration lives

1. **GitHub repository variables and secrets:** Repository → **Settings → Secrets and variables → Actions**. Use **Variables** for non-sensitive settings/fixture IDs and **Secrets** for tokens, bearer credentials, and private identity values.
2. **Render backend environment:** Render Dashboard → the KuraliUpdates Bazaar backend service → **Environment**. These settings control the protected staging-only OTP capture endpoint and email suppression.
3. **Workflow-defined values:** Some values are hard-coded or derived in `.github/workflows/e2e-login.yml`; do not create duplicate repository settings for them unless this document explicitly says so.

The workflow is pinned to the designated staging frontend `https://bazaar.kuraliupdates.com` and API `https://kuraliupdates-bazaar.onrender.com/api/v1`. Do not point E2E at real customer/production data.

## A. GitHub Actions repository variables

| Name | Example/value | Purpose and where used |
|---|---|---|
| `E2E_ENVIRONMENT` | `staging` | Explicit environment marker required by authenticated and transactional tests. Set in repository **Variables**. |
| `E2E_API_BASE_URL` | `https://kuraliupdates-bazaar.onrender.com/api/v1` | API target used by authenticated tests; workflow validates the designated staging host/path. Set in repository **Variables**. |
| `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED` | `true` only after verification | Operator confirmation that Render OTP capture is deployed, tokens match, and allowlisted test identities do not receive real OTP emails. Set in **Variables** only after end-to-end verification; otherwise leave unset/false. The workflow only honors it for manual/scheduled runs. |
| `E2E_TRANSACTIONAL_FLOWS_ENABLED` | `true` to opt in | Enables mutating order and Daily Help lifecycle tests only on trusted manual/scheduled runs. You have said this is set. This does not bypass other fixture/target guards. |
| `E2E_FLOW_PRODUCT_ID` | `E2E-...` | Dedicated synthetic product for the order checkout test. Must start with `E2E-`; stock must cover the configured quantity. |
| `E2E_FLOW_SELLER_ID` | `E2E-...` | Dedicated synthetic seller ID associated with that product. |
| `E2E_FLOW_DELIVERY_AGENT_ID` | `E2E-...` | Dedicated synthetic delivery-agent ID used to claim the test order. |
| `E2E_FLOW_ORDER_QUANTITY` | `1` or `2` | Number of synthetic product units to order. Must be an integer from 1 to 2. |
| `E2E_FLOW_DAILY_HELP_SERVICE_ID` | `E2E-...` | Dedicated synthetic Daily Help service ID. |
| `E2E_FLOW_DAILY_HELP_SLOT_ID` | `E2E-...` | Dedicated synthetic booking slot ID with available capacity. |
| `E2E_FLOW_PROFESSIONAL_ID` | `E2E-...` | Dedicated synthetic Daily Help professional ID assigned to the booking. |
| `E2E_FLOW_DAILY_HELP_START` | ISO-8601 date/time | Scheduled start time for the synthetic Daily Help booking; use a valid future/available slot time compatible with the application. |
| `E2E_FLOW_DAILY_HELP_HOURS` | `1` or `2` | Requested service duration, between 1 and 2 hours. |
| `KURALI_API_BASE_URL` | `https://kuraliupdates-bazaar.onrender.com/api/v1` | Optional read-only smoke-test API URL. Workflow falls back to `KURALI_STAGING_API_BASE_URL`, then the fixed staging API URL. If set, it must match the approved host/path. |
| `KURALI_STAGING_API_BASE_URL` | same approved API URL | Legacy/fallback variable for read-only smoke checks; prefer `KURALI_API_BASE_URL`. |
| `CLOUDFLARE_REPORT_ACCESS_CONFIGURED` | `true` only after Access verification | Operator gate for publishing the Playwright HTML report to Cloudflare Pages. This flag does not configure Cloudflare Access by itself. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Account used by the trusted-main report publishing job. |
| `CLOUDFLARE_PAGES_PROJECT` | Pages project name | Cloudflare Pages project used for the private HTML report. |

## B. GitHub Actions repository secrets

| Name | Purpose and where used |
|---|---|
| `E2E_OTP_CAPTURE_TOKEN` | Shared secret for the protected OTP-capture endpoint. Must match Render's `E2E_OTP_CAPTURE_TOKEN` and be at least 32 characters. Store in **Secrets**, never Variables or source control. |
| `E2E_BUYER_IDENTITY` | Dedicated buyer identity for authenticated browser/login tests. |
| `E2E_SELLER_IDENTITY` | Dedicated seller identity for authenticated browser/login tests. |
| `E2E_DELIVERY_IDENTITY` | Dedicated active/approved delivery-agent identity for authenticated browser tests. |
| `E2E_PROVIDER_IDENTITY` | Dedicated Daily Help provider identity for authenticated browser tests. |
| `E2E_ADMIN_IDENTITY` | Existing authorized admin identity for authenticated browser tests. Do not grant admin rights just for a test without explicit approval. |
| `E2E_FLOW_BUYER_TOKEN` | Staging-only bearer token for the synthetic buyer used by mutating lifecycle tests. |
| `E2E_FLOW_SELLER_TOKEN` | Staging-only bearer token for the synthetic seller. |
| `E2E_FLOW_DELIVERY_TOKEN` | Staging-only bearer token for the synthetic delivery agent. |
| `E2E_FLOW_PROVIDER_TOKEN` | Staging-only bearer token for the synthetic Daily Help professional. |
| `E2E_FLOW_BUYER_PHONE` | Synthetic buyer phone value used in order/booking payloads; use a test-only identity. |
| `E2E_FLOW_BUYER_EMAIL` | Synthetic buyer email value used in the order payload; use a test-only identity. |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token used only by the gated trusted-main report publishing job. Grant minimum required permissions. |

Tokens should be short-lived where feasible, scoped to staging, and rotated if exposed. Never paste secret values into documentation, issues, logs, or chat.

## C. Render backend environment variables for OTP capture

Set these on the **KuraliUpdates Bazaar backend service** in Render, only after verifying the service's database connection is the designated staging database.

| Name | Value/format | Purpose |
|---|---|---|
| `E2E_OTP_CAPTURE_ENABLED` | `true` | Enables the staging-only capture service. Keep disabled outside staging. |
| `E2E_OTP_CAPTURE_ENV` | `staging` | Environment marker required by the endpoint's fail-closed checks. |
| `E2E_OTP_CAPTURE_TOKEN` | Random secret, at least 32 characters | Authenticates requests to the protected endpoint. Must exactly match GitHub secret `E2E_OTP_CAPTURE_TOKEN`. |
| `E2E_OTP_ALLOWED_IDENTIFIERS` | Comma-separated normalized synthetic test email addresses | Only these email identities may use captured OTPs and have external email delivery suppressed. Do not add real customer identities. |

For allowlisted email identities, the backend captures the OTP in memory with a short expiry and suppresses external email only when the feature is safely configured. OTP capture is one-time and protected by a matching token. A backend restart may clear an OTP before retrieval, requiring a fresh request. SMS and non-allowlisted identities continue through normal delivery.

Do **not** set `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED=true` until you have verified that the Render settings are deployed, the token matches GitHub, the allowlist contains only synthetic test identities, and no email is sent for those identities.

## D. Workflow-defined values (not repository variables)

| Name | Value/behavior |
|---|---|
| `E2E_BASE_URL` | Set by the workflow to `https://bazaar.kuraliupdates.com`; staging frontend is pinned. |
| `E2E_API_BASE_URL` fallback | Fixed to `https://kuraliupdates-bazaar.onrender.com/api/v1` if repository variable is absent. |
| `CI` | Set to `true` in the browser job. |
| `SMOKE_READINESS_TIMEOUT_MS` | `360000`; read-only smoke readiness wait. |
| `SMOKE_RETRY_INTERVAL_MS` | `10000`; read-only smoke retry interval. |
| `SMOKE_TIMEOUT_MS` | `45000`; read-only smoke request timeout. |
| `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED` (effective value) | Computed by workflow: true only for `schedule` or `workflow_dispatch` when repository variable is the string `true`. It is false on PR/push. |
| `E2E_TRANSACTIONAL_FLOWS_ENABLED` (effective value) | Computed by workflow: true only for `schedule` or `workflow_dispatch` when repository variable is the string `true`. It is false on PR/push. |
| `E2E_BASE_URL` host guard | Rejects any host other than `bazaar.kuraliupdates.com`. |
| API host guard | Rejects any API other than `kuraliupdates-bazaar.onrender.com/api/v1`. |

## E. Test behavior and operational checklist

- The normal browser run can be green while transactional tests are skipped. Check the Playwright report for each test's passed/skipped/failed status.
- Order flow: synthetic checkout → seller acceptance/ready → delivery claim → invalid OTP rejected → valid OTP completes delivery → buyer/seller histories reconcile.
- Daily Help flow: synthetic slot booking → professional arrival/ready → invalid OTP rejected → valid OTP starts timer → completion → buyer history reconciles.
- Transactional tests create new order/booking records and **do not automatically delete them**. Use only dedicated synthetic fixtures. Do not reuse exhausted stock or a slot without checking capacity.
- The workflow uses a single concurrency lane to avoid simultaneous tests sharing OTP cooldowns and staging identities.
- PR and push runs do not enable mutating lifecycle flows. No PR deployment should be triggered. Docs-only changes are excluded from CI by workflow path filters.
- Production/read-only smoke checks must remain read-only. Do not use real customer accounts or real customer records as fixtures.

## F. Where to find the canonical implementation

- Workflow: `.github/workflows/e2e-login.yml`
- OTP setup: `docs/STAGING_E2E_SETUP.md`
- Transaction fixtures: `docs/TRANSACTIONAL-E2E-FIXTURES.md`
- E2E overview: `E2E_TESTING.md`
- Lifecycle test: `e2e/order-daily-help-lifecycle.spec.ts`
- OTP capture implementation: `backend-java-spring` (search for `E2eOtpCaptureService` and `E2eOtpController`)
