# Staging E2E setup

This configuration enables Playwright to sign in with dedicated test identities by retrieving freshly generated OTPs from a protected, staging-only endpoint. The endpoint is disabled by default.

## Render environment variables

Set these on the backend service only after verifying that its Oracle connection points to the owner-designated staging environment:

- `E2E_OTP_CAPTURE_ENABLED=true`
- `E2E_OTP_CAPTURE_ENV=staging`
- `E2E_OTP_CAPTURE_TOKEN=<random secret of at least 32 characters>`
- `E2E_OTP_ALLOWED_IDENTIFIERS=<comma-separated normalized test email addresses>`

Use a generated secret, not a password reused elsewhere. Include only dedicated test identities in the allowlist. Do not add real customer identities. The OTP handoff is held in backend memory, expires after three minutes, is retrieved once, and is not written to logs or a database. It requires a matching header token and explicit staging environment marker. For allowlisted identities only, the backend suppresses external **email** delivery when this capture feature is safely enabled; the generated OTP is stored in the normal verification store and handed off through the protected capture endpoint. Non-allowlisted identities, SMS OTPs, and all identities outside this explicit staging configuration continue through normal delivery. OTP hashing, expiry, attempt limits, and one-time verification remain in place.

If the service restarts between OTP generation and retrieval, request a new OTP. This mechanism is not a production authentication feature; keep it disabled outside the designated staging environment.

## GitHub Actions variables

In repository **Settings → Secrets and variables → Actions**, configure:

### Variables

- `E2E_ENVIRONMENT=staging`
- `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED=true` **only after** the Render staging backend has the three capture settings above, the OTP token matches, the allowlist contains only dedicated synthetic test identities, and the no-email behavior has been verified. Leave unset/false until then; authenticated OTP browser tests remain skipped.
- `E2E_API_BASE_URL=https://kuraliupdates-bazaar.onrender.com/api/v1` (the current workflow's exact allowed API target)

The workflow pins the browser target to `https://bazaar.kuraliupdates.com` and validates the API target against `https://kuraliupdates-bazaar.onrender.com/api/v1`; it intentionally does not accept a free-form URL override. Do not set `E2E_ENVIRONMENT=staging` or the API variable until the frontend, Render service and Oracle schema have been independently verified as the intended isolated staging target.

### Secrets

- `E2E_OTP_CAPTURE_TOKEN`: same generated value as Render's `E2E_OTP_CAPTURE_TOKEN`
- `E2E_BUYER_IDENTITY`
- `E2E_SELLER_IDENTITY`
- `E2E_DELIVERY_IDENTITY`
- `E2E_PROVIDER_IDENTITY`
- `E2E_ADMIN_IDENTITY`

Use existing dedicated test accounts. The delivery-agent account must be approved/active and assigned appropriate test data; seller/provider accounts must be in the state required by the workflow tests. Admin identity must already be authorized by the application's admin policy. This change does not create or promote accounts.

## Safety guarantees and current scope

- The endpoint exists only when `E2E_OTP_CAPTURE_ENABLED=true`; it still returns 404 unless environment is `staging`, the allowlist is non-empty, and the shared token matches.
- Only allowlisted identities can have OTPs captured or retrieved.
- OTP retrieval is one-time, short-lived, and sent with `Cache-Control: no-store`.
- No business records are created by the OTP interface itself.
- Production API smoke checks remain read-only.
- Authenticated Playwright cases skip unless the staging marker, API URL, token and relevant test identity are configured.
- Current browser cases prove login/session behavior for each role identity; business-flow coverage (orders, delivery transitions and Daily Help bookings) should be added only with explicit run-tagged synthetic fixtures and safe cleanup. No destructive reset migration is part of this workflow.
