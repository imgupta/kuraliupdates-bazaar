# OTP resend cooldown — P1-C

## Finding

`OtpService.send` previously used a read-before-write check (`existsRecentOtp`) to enforce resend cooldown. Two concurrent requests, including requests routed to different Render instances, could both observe no recent row and both deliver an OTP. The process-local request order is not a correctness boundary.

## Change in this PR

- Reserve a persistent cooldown row in the existing Oracle `API_RATE_LIMIT_BUCKETS` table before sending an OTP.
- Use a domain-separated SHA-256 key derived from normalized OTP type and identifier. Raw email/phone identifiers are not written to the rate-limit table.
- Use the existing sentinel `WINDOW_START` convention and `SYSTIMESTAMP`/`NUMTODSINTERVAL` so the expiry is based on the database clock and supports the configured 5–300 second cooldown.
- The Oracle `MERGE` update is conditional on the previous expiry having elapsed. Only one concurrent caller can reserve the cooldown.
- Retry an Oracle duplicate-key race once against the winning row. A denied reservation returns HTTP 429; an unresolved database failure returns HTTP 503 (fail closed).
- Retain the existing `AUTH_OTPS` recent-row check as a compatibility guard for OTPs created before this persistent reservation was deployed.
- The reservation, OTP persistence and delivery attempt remain in the existing Spring transaction. A failed delivery raises the existing gateway error and rolls back the reservation/OTP row.
- Allowlisted staging E2E identities continue to use the existing explicit cooldown bypass. No production identity can enter that bypass without the existing E2E allowlist/configuration checks.

## Data, security and operations

- No schema migration or new table; the implementation reuses the existing V33 `API_RATE_LIMIT_BUCKETS` table and its sentinel row convention.
- The key is one-way hashed and domain-separated from other rate-limit uses.
- No endpoint or client contract changes.
- Expired sentinel rows are already eligible for the delivery cooldown cleanup path; general rate-limit cleanup excludes sentinel rows.

## Verification and limits

Unit tests cover: an active cooldown denial before delivery, concurrent first-insert duplicate-key retry, denial against the winning reservation, fail-closed Oracle outage, successful reservation using a hashed key, and compatibility with the historical OTP-row check. Existing OTP verification/attempt tests remain in place.

These tests do not prove Oracle multi-session locking or transaction rollback behavior on the live target. Exact-head CI and an isolated Oracle two-session test remain required. A fresh staging transactional run is required after merge; the most recent main staging workflow was flaky and is not a pass.

## Acceptance status

**Implemented in source; awaiting exact-head CI and isolated Oracle/staging verification.** This PR does not close Phase 1 or Phase 0.
