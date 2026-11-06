# Phase 1 — End-to-End Functional and Security Validation

**Status:** In progress  
**Branch:** `phase1/security-e2e-validation`  
**Base:** `main` at the Phase 0 closeout merge commit `77c493f3e741f4ce305c9187477e71b9943ecbee` (reconfirm exact head before merge)  
**Environment:** Owner-designated shared staging only; no mutating tests against shared or real business records.

## Objective

Prove that the core marketplace actors can access only their own resources and that critical transactional workflows remain correct under retries, concurrent requests and partial failures. Phase 1 is a validation-and-remediation phase, not a broad architecture refactor and not production certification.

## Baseline evidence and known limitations

- Phase 0 closeout PR #231 is merged. The merge added default-deny route policy, explicit public method/path allowlist, admin role enforcement, persistent one-time portal handoff storage (Flyway V31), active-delivery-profile tracking checks, CORS regression coverage and source/write-path inventories.
- The Phase 0 staging deployment was reported live; Render startup logs confirmed V31 applied. Recheck exact deployment and CI evidence for any runtime-dependent test before relying on it.
- The latest reported post-merge read-only API smoke was 7 passed / 0 failed, with database readiness checked and `/health` HTTP 200.
- Browser E2E reported 3 passed / 9 skipped. Authenticated/transactional flows were skipped because dedicated role identities and trusted OTP capture were not configured for that run. Skips are not passes.
- The current endpoint authorization and transaction inventories explicitly leave complete IDOR and Oracle concurrency/rollback proofs open.
- Staging region and vendor data-flow evidence do not establish India-only production residency. Production residency, secret rotation and professional legal/compliance review remain separate release gates.

## Workstreams and acceptance criteria

### P1-A — Authorization and IDOR matrix (highest priority)

Cover buyer, seller, delivery agent, Daily Help buyer/provider and admin access for sensitive reads and writes.

Required negative/positive cases:
- Anonymous, invalid, expired/revoked session.
- Authenticated wrong role and spoofed active-role/header/body identity.
- Correct role but wrong owner/resource ID.
- Correct owner and allowed state transition.
- Suspended/inactive profile and reassigned/deleted resource.
- Cross-account references in nested IDs (order, product, booking, slot, delivery assignment, negotiation/chat/offer).

Target resource families:
- Buyer orders, addresses and tracking.
- Seller products, inventory, orders, documents and onboarding records.
- Delivery assignments, location updates and order lifecycle actions.
- Daily Help professional profile, slots, jobs, bookings and earnings.
- Negotiation chats, offers and bargain acceptance.
- Admin-only operations and PII-bearing list/download routes.

Acceptance: each sensitive route has a source-backed actor/role/owner rule and automated tests proving wrong-owner denial plus correct-owner success. Do not treat UI hiding or route guards as authorization evidence.

### P1-B — Authenticated role journeys

Build isolated, synthetic, cleanup-safe Playwright journeys for:
1. Buyer: login/session restore, browse, checkout, order status, tracking, cancellation/refund path where safely supported.
2. Seller: lead/registration, OTP verification, assisted/admin review where configured, product/inventory and seller order actions.
3. Delivery: registration/approval fixture, claim/assignment, OTP-protected lifecycle and tracking.
4. Daily Help: provider profile/availability/slot, buyer booking, provider accept/start/complete and duplicate/replay behavior.
5. Portal handoff: role switching, one-time redemption, expiry and replay rejection.

Acceptance: each journey executes end-to-end against isolated synthetic records and cleans up only records carrying its verified run ID. If trusted identities/OTP capture/isolated fixtures are unavailable, report the journey as BLOCKED/SKIPPED with the exact missing prerequisite; do not fabricate a pass or mutate shared data.

### P1-C — Transaction, concurrency and idempotency

Use Oracle-backed integration tests only where a dedicated isolated schema/database and deterministic fixture cleanup are verified. Otherwise add repository/service-level deterministic tests and record Oracle proof as blocked.

Priority cases:
- Concurrent stock reservation cannot oversell.
- Multi-seller checkout failure rolls back all suborders, stock and associated state.
- Two delivery agents racing for one order produce one winner.
- Daily Help slot booking/acceptance cannot double-book.
- Bargain acceptance creates the cart/order effect exactly once.
- OTP resend cooldown and verification attempts are race-safe.
- Portal handoff redemption succeeds once under concurrency and remains consumed after downstream role/session rejection.
- Address default changes preserve a single-default invariant.
- Start/complete/cancel and pickup OTP actions reject replay and invalid transitions.

Acceptance: tests assert persisted final state, affected-row/lock outcome and rollback/idempotency behavior, not merely HTTP status.

### P1-D — Abuse, privacy and operational controls

- Review public seller-lead lookup/OTP/callback and public search analytics for enumeration, flooding, payload limits and rate limiting.
- Verify response DTO minimization on admin and tracking endpoints; avoid unnecessary PII/location exposure.
- Verify E2E helpers are disabled by default and fail closed outside staging with dedicated synthetic identities and run-scoped cleanup.
- Review OTP/session revocation, log redaction and audit actor identity.
- Document backup/restore and migration recovery evidence; do not infer recoverability from Flyway success.

Acceptance: each High/Critical finding has containment, durable remediation, owner, due date and regression evidence, or remains explicitly release-blocking.

## Execution order

1. Reconcile latest `main`, workflows, deployment and source paths; refresh this plan with exact evidence.
2. Build endpoint-to-owner matrix and implement P1-A negative tests in the smallest domain slices.
3. Add/repair P1-C deterministic backend tests for the highest-impact money/stock/assignment/booking invariants.
4. Add P1-B authenticated Playwright journeys only after isolated synthetic identities, OTP capture and cleanup are verified.
5. Close P1-D abuse/privacy/operational findings or document release-blocking residuals.
6. Run targeted tests, full backend/frontend CI, read-only staging smoke and only the explicitly approved isolated E2E suite.
7. Publish a closeout report mapping every acceptance criterion to test evidence, skips, unresolved risks and next action.

## Guardrails and non-goals

- No production deployment, real customer data, destructive reset, manual SQL mutation, secret rotation, payment/refund redesign, hosting-region change or schema change without separate explicit approval.
- Do not enable mutating E2E on the shared staging dataset. A dedicated schema/fixture namespace and verified cleanup are prerequisites.
- Do not add tests that merely assert status codes while leaving ownership/data state unverified.
- Do not refactor into new services/modules during Phase 1.
- Keep API contracts and the confirmed seller-direct payment/refund decisions unchanged.
- India production data residency, secret rotation and qualified Indian legal/tax/labour/payment review remain launch gates independent of Phase 1 test results.

## Initial Phase 1 disposition

**Started, not complete.** This plan is the execution contract. No Phase 1 authorization, concurrency or authenticated lifecycle acceptance criterion is marked passed until its implementation and exact test evidence are attached here.


## First source finding and remediation — P1-A

**Finding:** `DailyHelpService.getBookingForUser` authorized the professional side only when `UserEntity.role == PROFESSIONAL`. The canonical `UserEntity` role model contains BUYER, SELLER, DELIVERY and ADMIN; Daily Help is a secondary profile attached to the existing account. The controller already resolves the caller's professional profile by the authenticated account phone. Consequently, a legitimate provider whose account primary role is BUYER could manage their own professional profile but could be denied access to their assigned booking.

**Change on this branch:** provider booking ownership now uses the phone on the assigned professional profile, normalized to digits, independent of the account's primary marketplace role. Buyer-side access remains restricted to BUYER plus matching buyer phone. This does not grant access to an unrelated buyer or provider.

**Regression tests added:** a BUYER-primary account with a matching professional profile can read its own provider booking; an unrelated BUYER with a different phone is denied.

**Status:** implementation committed on the Phase 1 branch; backend test execution and CI evidence are pending. No live staging data or transactional E2E was used. This is one targeted authorization fix, not completion of the IDOR matrix.


## PR #232 verification addendum — 2026-11-06

**Verified head:** `0001c44f48bdf9212ee843d5aa3d509b4b64a8ec`

- Spring Boot/Maven verification: passed (workflow run `42205811178`).
- Frontend lint and production build: passed (workflow run `42205811178`).
- Backend focused regressions: passed; `DailyHelpServiceTest` ran 11 tests with 0 failures/errors/skips.
- Full backend Maven verification: passed; 142 tests, 0 failures, 0 errors, 0 skips (workflow run `42205811214`).
- Frontend checks: passed (workflow run `42205811214`).
- Browser E2E: 3 passed, 9 skipped. Authenticated/transactional flows were skipped because trusted staging OTP capture was not explicitly enabled for the PR event. This is not authenticated lifecycle proof.
- Read-only smoke: 7 passed, 0 failed. The report explicitly recorded `databaseHealthChecked=false` and limited scope to API process liveness plus anonymous-access guards; it is not a database-readiness result.
- Private Playwright report publication was skipped by workflow policy; no report artifact is claimed.

**P1-A disposition:** the targeted Daily Help provider booking ownership regression is covered by unit tests and full backend verification. The broader endpoint IDOR matrix remains open. No mutating staging journey, production deployment or database change occurred.


## Latest PR head verification — 2026-11-06

**Head:** `d8e14ff8a1714962c358bd935fea25ff0a96fbe4`

All five substantive GitHub Actions checks completed successfully:
- Spring Boot verification: success.
- Frontend lint and production build: success.
- Backend focused regressions and full Maven verification: success; 142 tests, 0 failures, 0 errors, 0 skipped. `DailyHelpServiceTest`: 11 tests, 0 failures/errors/skips.
- Frontend checks: success.
- Browser E2E/read-only smoke job: success. Browser suite: 3 passed, 9 skipped. The nine authenticated/transactional scenarios remain skipped because OTP capture is not enabled for PR events.
- Read-only smoke: 7 passed, 0 failed, but `databaseHealthChecked=false`; it exercised process liveness and anonymous guards only. It does not prove DB readiness.
- Private Playwright report publication was skipped by workflow policy.

**Decision:** the narrow Daily Help ownership fix has passing unit/full backend CI. PR #232 may be reviewed for this bounded change. Do not infer that Phase 1 is complete, that authenticated transactional flows passed, or that a database-backed staging smoke was performed.
