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

## GitHub Actions configuration

In repository **Settings → Secrets and variables → Actions → Secrets**, configure exactly one secret named `E2E_STAGING_CONFIG_JSON`. Put the E2E environment marker, OTP capture token, suppression confirmation, five role identities, lifecycle opt-in, four lifecycle role tokens, synthetic fixture data, and optional Cloudflare report settings in this JSON. See [`E2E_VARIABLES_REFERENCE.md`](E2E_VARIABLES_REFERENCE.md) for the complete schema. Do not create separate GitHub Actions variables/secrets for these settings.

### JSON configuration and Render alignment

The JSON secret includes `E2E_ENVIRONMENT`, `E2E_OTP_CAPTURE_TOKEN`, the five role identities, `E2E_OTP_EMAIL_SUPPRESSION_CONFIRMED`, and all transactional lifecycle settings. The complete key list and sample JSON are in [E2E_VARIABLES_REFERENCE.md](E2E_VARIABLES_REFERENCE.md).

Keep these four backend runtime settings on Render because the deployed Spring Boot service needs them independently of GitHub Actions:

- `E2E_OTP_CAPTURE_ENABLED=true`
- `E2E_OTP_CAPTURE_ENV=staging`
- `E2E_OTP_CAPTURE_TOKEN` — exactly the same random secret stored in the GitHub JSON
- `E2E_OTP_ALLOWED_IDENTIFIERS` — only normalized synthetic test email addresses

These Render settings cannot be replaced by a GitHub Actions JSON secret alone: GitHub Actions secrets are not automatically available to the running Render service. Keep the browser/API targets pinned in workflow code; the JSON cannot redirect tests to another host. The OTP-suppression and mutating-lifecycle flags are honored only for trusted scheduled/manual runs, never PR or push runs.

## Safety guarantees and current scope

- The endpoint exists only when `E2E_OTP_CAPTURE_ENABLED=true`; it still returns 404 unless environment is `staging`, the allowlist is non-empty, and the shared token matches.
- Only allowlisted identities can have OTPs captured or retrieved.
- OTP retrieval is one-time, short-lived, and sent with `Cache-Control: no-store`.
- No business records are created by the OTP interface itself.
- Production API smoke checks remain read-only.
- Authenticated Playwright cases skip unless the staging marker, API URL, token and relevant test identity are configured.
- Current browser cases prove login/session behavior for each role identity; business-flow coverage (orders, delivery transitions and Daily Help bookings) should be added only with explicit run-tagged synthetic fixtures and safe cleanup. No destructive reset migration is part of this workflow.
