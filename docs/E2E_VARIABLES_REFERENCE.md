# KuraliUpdates E2E configuration reference

This document describes the single GitHub Actions JSON secret for testing/staging and the separate Render backend runtime settings. Never commit credentials or tokens.

## Where configuration lives

1. **GitHub Actions:** Repository → **Settings → Secrets and variables → Actions → Secrets**. Use only `E2E_STAGING_CONFIG_JSON` for this workflow's testing/staging settings.
2. **Render backend environment:** Render Dashboard → the KuraliUpdates Bazaar backend service → **Environment**. These settings control the protected staging-only OTP capture endpoint and email suppression.
3. **Workflow-defined values:** Some values are hard-coded or derived in `.github/workflows/e2e-login.yml`; do not create duplicate repository settings for them unless this document explicitly says so.

The workflow is pinned to the designated staging frontend `https://bazaar.kuraliupdates.com` and API `https://kuraliupdates-bazaar.onrender.com/api/v1`. Do not point E2E at real customer/production data.

## A. Single GitHub Actions staging/test setting

In repository **Settings → Secrets and variables → Actions → Secrets**, configure exactly one secret for the GitHub Actions testing/staging configuration:

- `E2E_STAGING_CONFIG_JSON`

It contains all GitHub Actions E2E/staging settings, identity values, OTP capture token, lifecycle role tokens, synthetic fixture IDs, booking parameters, and optional Cloudflare report-publishing settings. Do not create separate `E2E_*`, `KURALI_*`, or `CLOUDFLARE_*` repository variables/secrets for this workflow.

Use this JSON shape and replace placeholders with actual dedicated staging values. Boolean flags must be JSON booleans, not strings. Leave optional Cloudflare fields out or set them to empty values if report publishing is not used.

```json
{
  "E2E_ENVIRONMENT": "staging",
  "E2E_OTP_CAPTURE_TOKEN": "<same random secret configured in Render>",
  "E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED": true,
  "E2E_TRANSACTIONAL_FLOWS_ENABLED": true,
  "E2E_BUYER_IDENTITY": "<dedicated buyer identity>",
  "E2E_SELLER_IDENTITY": "<dedicated seller identity>",
  "E2E_DELIVERY_IDENTITY": "<dedicated approved delivery-agent identity>",
  "E2E_PROVIDER_IDENTITY": "<dedicated Daily Help provider identity>",
  "E2E_ADMIN_IDENTITY": "<existing authorized admin identity>",
  "E2E_FLOW_BUYER_TOKEN": "<staging buyer bearer token>",
  "E2E_FLOW_SELLER_TOKEN": "<staging seller bearer token>",
  "E2E_FLOW_DELIVERY_TOKEN": "<staging delivery-agent bearer token>",
  "E2E_FLOW_PROVIDER_TOKEN": "<staging provider bearer token>",
  "E2E_FLOW_BUYER_PHONE": "<synthetic buyer phone>",
  "E2E_FLOW_BUYER_EMAIL": "<synthetic buyer email>",
  "E2E_FLOW_PRODUCT_ID": "E2E-<synthetic-product-id>",
  "E2E_FLOW_SELLER_ID": "E2E-<synthetic-seller-id>",
  "E2E_FLOW_DELIVERY_AGENT_ID": "E2E-<synthetic-delivery-agent-id>",
  "E2E_FLOW_ORDER_QUANTITY": "1",
  "E2E_FLOW_DAILY_HELP_SERVICE_ID": "E2E-<synthetic-service-id>",
  "E2E_FLOW_DAILY_HELP_SLOT_ID": "E2E-<synthetic-slot-id>",
  "E2E_FLOW_PROFESSIONAL_ID": "E2E-<synthetic-professional-id>",
  "E2E_FLOW_DAILY_HELP_START": "<valid ISO-8601 available slot time>",
  "E2E_FLOW_DAILY_HELP_HOURS": "1",
  "CLOUDFLARE_REPORT_ACCESS_CONFIGURED": false,
  "CLOUDFLARE_ACCOUNT_ID": "",
  "CLOUDFLARE_PAGES_PROJECT": "",
  "CLOUDFLARE_API_TOKEN": ""
}
```

Safety behavior:
- The workflow pins the frontend to `https://bazaar.kuraliupdates.com` and the API to `https://kuraliupdates-bazaar.onrender.com/api/v1`; the JSON cannot override these hosts.
- OTP suppression confirmation and mutating lifecycle tests are effective only on trusted manual/scheduled runs. PR/push runs cannot enable them through JSON.
- Set `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED` to `true` only after verifying the Render OTP capture token matches, the allowlist contains only synthetic test identities, and those identities receive no real OTP emails.
- Keep all six fixture IDs prefixed with `E2E-`. Quantity and duration must be integers from 1 to 2. Slot time must match a valid available synthetic staging slot.
- Tokens and identities are secret values. Never commit this JSON, print it in logs, or paste it into issues or chat.

## C. Render backend environment variables for OTP capture

Set these on the **KuraliUpdates Bazaar backend service** in Render, only after verifying the service's database connection is the designated staging database.

| Name | Value/format | Purpose |
|---|---|---|
| `E2E_OTP_CAPTURE_ENABLED` | `true` | Enables the staging-only capture service. Keep disabled outside staging. |
| `E2E_OTP_CAPTURE_ENV` | `staging` | Environment marker required by the endpoint's fail-closed checks. |
| `E2E_OTP_CAPTURE_TOKEN` | Random secret, at least 32 characters | Authenticates requests to the protected endpoint. Must exactly match the `E2E_OTP_CAPTURE_TOKEN` field inside GitHub secret `E2E_STAGING_CONFIG_JSON`. |
| `E2E_OTP_ALLOWED_IDENTIFIERS` | Comma-separated normalized synthetic test email addresses | Only these email identities may use captured OTPs and have external email delivery suppressed. Do not add real customer identities. |

For allowlisted email identities, the backend captures the OTP in memory with a short expiry and suppresses external email only when the feature is safely configured. OTP capture is one-time and protected by a matching token. A backend restart may clear an OTP before retrieval, requiring a fresh request. SMS and non-allowlisted identities continue through normal delivery.

Do **not** set `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED=true` until you have verified that the Render settings are deployed, the token matches GitHub, the allowlist contains only synthetic test identities, and no email is sent for those identities.

## D. Workflow-defined values (not repository variables)

| Name | Value/behavior |
|---|---|
| `E2E_BASE_URL` | Set by the workflow to `https://bazaar.kuraliupdates.com`; staging frontend is pinned. |
| `E2E_API_BASE_URL` | Fixed to `https://kuraliupdates-bazaar.onrender.com/api/v1`; it is pinned in workflow code and cannot be overridden by JSON. |
| `CI` | Set to `true` in the browser job. |
| `SMOKE_READINESS_TIMEOUT_MS` | `360000`; read-only smoke readiness wait. |
| `SMOKE_RETRY_INTERVAL_MS` | `10000`; read-only smoke retry interval. |
| `SMOKE_TIMEOUT_MS` | `45000`; read-only smoke request timeout. |
| `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED` (effective value) | Read from JSON boolean and honored only for `schedule` or `workflow_dispatch`; false on PR/push. |
| `E2E_TRANSACTIONAL_FLOWS_ENABLED` (effective value) | Read from JSON boolean and honored only for `schedule` or `workflow_dispatch`; false on PR/push. |
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
