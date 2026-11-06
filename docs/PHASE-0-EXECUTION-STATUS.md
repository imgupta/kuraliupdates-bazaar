# Phase 0 — Current Execution Status

**As of:** 2026-11-06  
**Repository:** `imgupta/kuraliupdates-bazaar`  
**Current main commit:** `fa5047342889e7940991cb1cb65d9482df3cd941`  
**Status:** OPEN — substantial progress, not certified complete.

## Executive summary

The critical Oracle V30 startup blocker has been resolved through application code and deployment. The corrected V30 migration ran successfully against the configured Oracle 23 database. Flyway repaired the single failed V30 history entry, validated 31 migrations, reapplied V30, and Render marked the deployment live.

Phase 0 is still open because security authorization coverage, transaction/write ownership mapping, async/process-local state, frontend integration/storage inventory, and full staging workflow evidence are incomplete. Production India-only residency and secret rotation remain release gates.

## Verified completed items

| Area | Evidence | Status |
|---|---|---|
| Oracle connectivity | Render startup log shows successful Hikari Oracle connection to Oracle 23 | Passed |
| Failed V30 history recovery | Flyway logged successful schema-history repair, restricted to the known failed V30 | Passed |
| Migration validation | Flyway validated 31 migrations | Passed |
| V30 application | Flyway logged successful application; schema at v30 | Passed |
| Render deployment | Deployment `dep-dbmpnrfavr4c73917b6g`, commit `fa5047342889e7940991cb1cb65d9482df3cd941`, status live | Passed |
| Backend verification | PR #230 Spring Boot verification | Passed |
| Frontend verification | PR #230 frontend lint and production build | Passed |
| Phase 0 smoke-runner unit tests | `tests/productionSmoke.test.mjs` is included in frontend CI and passed in the latest observed frontend job | Passed |

## Current application and deployment design

- Render service `kuraliupdates-bazaar` deploys from `main`; Singapore is accepted for development/staging only.
- `GET /api/v1/health` remains the database-backed readiness check.
- `GET /api/v1/health/live` is process liveness only and must not claim Oracle health.
- The source audit hardens unknown routes to authenticated-by-default. Existing broad `/buyers/**`, `/sellers/**`, and `/delivery/**` permit rules remain for compatibility and require endpoint-by-endpoint review; they are not considered closed.
- The PR #228 branch is stale relative to the current main commit (49 commits ahead, 1 behind and diverged). Its old V30 diff must not overwrite the corrected V30 migration. This follow-up branch is based on current main and carries forward only the relevant liveness, smoke, security-default and diagnostics-query changes.

## Open Phase 0 work

### 1. Security and authorization — OPEN / HIGH PRIORITY
- Complete the endpoint matrix for every MVC, WebSocket and non-MVC route: public intent, authentication, role, record ownership, state transition and PII returned.
- Review broad public route prefixes and narrow them only after explicit public onboarding/catalogue paths are enumerated.
- Add/run negative tests for anonymous, malformed/invalid, expired/revoked session, wrong role, wrong owner, IDOR, OTP replay/attempt limits, duplicate/race and suspended accounts.
- Review seller onboarding public endpoints for enumeration, lead-ID entropy, throttling, OTP expiry/replay and callback-consent handling.
- Review admin DTOs for overexposure of seller, buyer and delivery-agent PII; replace entity serialization with minimized response DTOs where needed.

### 2. Transactions and persistence ownership — OPEN
- Inventory all repository writes, JdbcTemplate, EntityManager, native SQL and direct entity mutation with callers and table ownership.
- Map transaction propagation, isolation, rollback rules, locking, idempotency and cross-domain writes.
- Review Order, Seller, Delivery, Auth, Daily Help, Negotiation, OTP and Seller Onboarding service boundaries.
- Replace or durably coordinate process-local OTP resend throttles and any in-memory workflow state before multi-instance operation.
- Test rollback/partial failure, duplicate requests, concurrent checkout/claim/complete, and retry behavior.

### 3. Async, integration and operational behavior — OPEN
- Enumerate scheduled jobs, async executors, application events, WebSocket handlers, polling, cache and process-local state.
- For each external provider, record data processed, region/subprocessor, credentials, timeout, retry/backoff, idempotency, webhook verification, retention and deletion.
- Review log redaction, audit trail, secret injection/rotation and file/document scanning failure modes.

### 4. Frontend and browser behavior — OPEN
- Complete portal route → component → API call mapping, auth bootstrap/session refresh, browser storage key inventory and PII/token persistence review.
- Verify deep-link, refresh, SSO handoff, cross-portal redirects, polling and subscription cleanup.
- Re-run browser smoke against the now-live staging API. A successful API liveness/anonymous guard smoke is not equivalent to full authenticated buyer/seller/delivery/provider/admin lifecycle E2E.

### 5. Database, recovery and data safety — PARTIALLY COMPLETE
- V30 failed-history recovery and reapplication are complete; Flyway validated 31 migrations at startup.
- Still reconcile migration source provenance for V1–V13 and review the full DDL/data transformation history.
- Capture and retain a sanitized post-recovery diagnostic report including V30 history metadata and AUTH_OTPS check constraint definition, if available through the approved diagnostics path.
- Validate backup/restore and recovery ownership; do not infer backup recoverability from a successful migration.
- Verify critical constraints/indexes and profile-link backfill assumptions before production migration.

### 6. Residency, secrets and compliance — OPEN RELEASE GATES
- Produce resource-by-resource India-only production data-flow/residency evidence for database, backups, logs, documents, CDN, email/SMS, telemetry and support access.
- Rotate/revoke exposed or legacy secrets, invalidate affected sessions/tokens and verify production environment injection. This remains deferred, not remediated.
- Obtain qualified review of seller/provider contracts, payment/fund flows, GST/tax, food/business licences and Punjab labour/gig-worker applicability.

## CI and PR disposition

- PR #230 is merged; its Oracle recovery deployment is live.
- PR #228 remains an old draft/open branch and is not suitable for merging as-is because it diverged from main and contains a stale V30 migration diff.
- The old PR #228 CI has successful backend/frontend checks. Its previous smoke failure was caused by the then-unavailable staging API. The failed smoke job has been rerun after the Oracle recovery deployment; result is pending at the time of this status snapshot.
- This branch carries forward the source-only liveness/smoke improvements and the default-deny fallback. The next CI run must pass before merge.
- No authenticated transactional E2E is claimed: the current PR/push workflow deliberately disables transactional flows unless a trusted scheduled/manual run explicitly enables them with synthetic fixtures and cleanup.

## Phase 0 exit decision

**Phase 0 is NOT COMPLETE.** The Oracle V30 deployment blocker is resolved, but the source/security/transaction inventories and negative tests are not complete, and production residency/secret/compliance gates remain open.

Do not authorize FE-1/BE-1 package extraction or broad service decomposition until the open engineering inventories and high-risk authorization tests have evidence, owners and disposition.

## Security allowlist refinement — 2026-11-06

A second source review found that the earlier authenticated-by-default change still retained broad `/buyers/**`, `/sellers/**` and `/delivery/**` permit rules. It also would have blocked public OTP login/registration and assisted seller lead onboarding because those routes sit outside the broad prefixes. The allowlist has now been narrowed to explicit method/path pairs.

Public routes explicitly retained:
- GET health and OpenAPI/Swagger documentation.
- POST `/auth/send-otp`, `/auth/registration-check`, `/auth/verify-otp`, and `/auth/portal-handoff/redeem`.
- GET buyer product search, Daily Help service/availability discovery, and registration OTP settings.
- POST seller lead creation/contact OTP/callback, delivery registration, legacy seller registration (410 response), and search analytics.
- `/e2e/**` only because each staging E2E controller separately validates strong custom shared-token headers, staging environment, and allowlisted synthetic identities where applicable.
- Admin routes require `ROLE_ADMIN`; all other routes require an authenticated session.

Added `SecurityConfigTest` to exercise public login/onboarding/discovery routes, authenticated-by-default buyer/seller/delivery/unknown paths, admin rejection for a BUYER role, valid bearer-session access and invalid-session rejection. Added `SessionAuthenticationFilterTest` for role authority construction and missing/invalid bearer behavior.

Residual risks remain: public seller lead and search analytics endpoints need abuse/rate-limit review; E2E route custom-token behavior needs staging-only verification; method-level ownership/IDOR tests remain incomplete. The explicit allowlist reduces accidental anonymous exposure but does not close the complete security audit.
