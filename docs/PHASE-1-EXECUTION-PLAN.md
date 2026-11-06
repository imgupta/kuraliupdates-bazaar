# Phase 1 — End-to-End Functional and Security Validation

**Status:** In progress  
**Execution branches:** short-lived `phase1/*` branches; changes are merged through reviewed PRs  
**Base:** current `main`; last reconciled commit before this evidence update: `326bc7834eae891dffc99ff8e6d2bcfd1d831cf7`  
**Environment:** Owner-designated shared staging only; no mutating tests against shared or real business records.

## Objective

Prove that the core marketplace actors can access only their own resources and that critical transactional workflows remain correct under retries, concurrent requests and partial failures. Phase 1 is a validation-and-remediation phase, not a broad architecture refactor and not production certification.

## Baseline evidence and known limitations

- Phase 0 security-hardening milestone PR #231 is merged. It added default-deny route policy, an explicit public method/path allowlist, admin role enforcement, persistent one-time portal handoff storage (Flyway V31), active-delivery-profile tracking checks, CORS regression coverage and source/write-path inventories. **PR #231 did not close Phase 0**: its own release notes explicitly left complete method-level IDOR coverage, authenticated transactional E2E, backup/restore, India-only production residency, secret rotation and legal/compliance review open. Phase 0 exit criteria in CHATGPT-CONTINUATION.md and CURRENT-STATE.md therefore remain authoritative and open.
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

**Merged in PR #232:** provider booking ownership now uses the phone on the assigned professional profile, normalized to digits, independent of the account's primary marketplace role. Buyer-side access remains restricted to BUYER plus matching buyer phone. This does not grant access to an unrelated buyer or provider.

**Regression tests added:** a BUYER-primary account with a matching professional profile can read its own provider booking; an unrelated BUYER with a different phone is denied.

**Status:** merged in PR #232 after backend/frontend CI passed. No live staging data or transactional E2E was used. This is one targeted authorization fix, not completion of the IDOR matrix.


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
---

## Phase 1 progress addendum — 2026-11-06 (PRs #232–#240)

This addendum supersedes the earlier pending status text above where newer merge/CI evidence is available. The original PR #232 historical evidence remains preserved.

### Merged changes and exact backend CI evidence

| PR | Merged change | Full backend test count | Result |
|---|---|---:|---|
| #232 | Fix Daily Help provider booking ownership for BUYER-primary accounts | 142 | Passed |
| #233 | Bargaining chat participant ownership regression coverage | CI passed; see PR run | Passed |
| #234 | Wrong provider cannot update/start/complete another provider's booking | 147 | Passed |
| #235 | Daily Help controller profile ownership and buyer phone binding | 150 | Passed |
| #236 | Sequential duplicate Daily Help slot reservation rejection | 151 | Passed |
| #237 | Seller product update/delete and discount deletion ownership | 155 | Passed |
| #238 | Delivery agent ID spoofing on claim and wrong-agent pickup confirmation | 157 | Passed |
| #239 | Duplicate cart-line quantity aggregation before stock check/reservation | 159 | Passed |
| #240 | Seller product and discount list scoping to authenticated seller | 161 | Passed |

All listed PRs are merged to `main`. For PRs #234–#240, the full Maven verification and frontend lint/production-build checks completed successfully. The test counts above are the full backend suite totals from each PR head, not counts of only the new test cases.

### What is now covered by automated tests

- Daily Help: provider ownership for booking read/mutations; a correct OTP does not bypass provider ownership; controller profile-to-account phone binding; sequential rebooking of a reserved slot is rejected.
- Bargaining: buyer/seller chat participant ownership coverage was merged in #233.
- Seller: cross-store product update/delete and discount-rule deletion are denied; owning seller product update succeeds; product and discount list queries are scoped to the authenticated seller ID; seller order list and cross-store order mutation tests already exist.
- Delivery: wrong-agent OTP completion and OTP resend protections already existed; new tests pin caller-supplied agent ID spoofing on claim and wrong-agent pickup confirmation.
- Checkout: duplicate product IDs in a cart are aggregated before stock validation; aggregate quantity above stock is rejected without saving an order; valid duplicate lines decrement stock once and persist one consolidated line item.
- Buyer orders: service tests already cover own-order tracking, another buyer's order hidden as not found, non-buyer role rejected for tracking, and wrong-buyer store-pickup confirmation.

### Evidence boundaries — do not overstate

- These are predominantly service/unit tests with mocked repositories. They do not prove real Oracle locking, isolation, commit/rollback, or simultaneous request behavior.
- The Daily Help duplicate-slot test is sequential: it verifies that a second call after the first reservation is rejected. It is not a two-transaction race test.
- The checkout duplicate-line tests aggregate repeated cart rows within one request. They are not a concurrent two-buyer oversell test.
- The CI workflows' authenticated browser journeys have previously reported 3 passed and 9 skipped because trusted staging OTP capture and dedicated role identities were not enabled for the PR workflow. Skipped authenticated flows are not passes.
- The prior smoke job reported 7 read-only API checks passing. Depending on the run, `databaseHealthChecked` was false; a process liveness response is not database readiness evidence.
- No mutating E2E was run against shared staging. No real customer, seller, rider, provider, order or inventory data was used in these new unit tests.
- PR #237–#240 contain test-only changes; they do not add schema migrations or change runtime business logic.

### Oracle integration-test readiness and transaction proof

The backend build includes Oracle JDBC/Flyway and Spring Boot test dependencies. An isolated in-memory H2 JDBC slice (`OtpAttemptServiceJdbcTest`) now exercises independent OTP-attempt commit behavior, one-time consumption and expiry without touching Oracle or shared staging. H2 is test-scoped and Flyway is disabled for this slice so Oracle migrations are not run against H2. This provides local JDBC transaction evidence only; it does **not** prove Oracle SQL dialect compatibility, Oracle row locks, concurrent Oracle transactions or staging behavior. Oracle-backed transaction tests remain **blocked**, not passed, until a dedicated isolated Oracle schema/database and cleanup harness are approved. Do not run destructive or mutating tests against the shared staging Oracle schema.

Before Oracle integration tests can be accepted, establish an owner-approved isolated schema/database with:
1. isolated credentials and explicit schema identity verification before every test run;
2. deterministic synthetic fixture creation and cleanup keyed by run ID;
3. transaction/lock tests that run two independent transactions/threads and assert final persisted state;
4. forced failure injection proving multi-seller checkout rolls back every suborder, stock decrement and associated bargain state;
5. cleanup verification and a safe abort if the schema target is not the isolated test target.

### Remaining P1-A authorization matrix

Still open and must be checked against source before marking complete:
- Buyer address list/create/update/delete/default-address ownership and single-default invariant.
- Buyer order history and tracking controller authentication, cross-buyer order IDs, pickup/cancel/refund paths and response DTO data minimization.
- Seller inventory/product reads and writes beyond the covered product/discount methods; seller order/document/download PII routes and onboarding lead ownership.
- Delivery assigned-job listing, tracking/location update ownership, combined checkout claims, pickup/OTP paths at controller and service boundaries.
- Daily Help slot/availability/job/earnings read scoping and accept/start/complete ownership at controller and service boundaries.
- Negotiation chat, message, offer and bargain-accept nested IDs; ensure one participant cannot mutate/read another chat or replay acceptance.
- Admin-only list/download/update routes and non-admin denial for every PII-bearing operation.
- Anonymous, invalid, expired/revoked session, wrong role, suspended profile, spoofed header/body identity and deleted/reassigned resource cases.

### Remaining P1-C transaction/concurrency matrix

- Two buyers concurrently reserving the last stock unit; prove one winner and persisted stock never negative.
- Multi-seller checkout failure after at least one seller order has been created; prove all order rows, stock and bargain state roll back.
- Two delivery agents racing for one ready order and two agents racing to claim the same checkout group; prove one winner and no partial batch assignment.
- Two buyers racing to reserve one Daily Help slot; prove one booking and one slot owner.
- Provider acceptance race for one unassigned Daily Help booking.
- Bargain acceptance replay/idempotency and checkout consuming the accepted offer once.
- Portal handoff concurrent redemption, expiry and downstream failure consumption.
- OTP resend cooldown and verification attempts across multiple application instances; current process-local cooldown behavior must not be represented as distributed/race-safe.
- Address default changes under concurrent requests.
- Cancellation/stock restoration and delivery/pickup OTP replay with persisted final-state assertions.

### P1-B and P1-D release gates

- Authenticated Playwright journeys remain blocked until trusted OTP capture, dedicated role identities, isolated run-scoped fixture creation and verified cleanup are configured. Do not turn on mutating E2E against shared staging.
- Public seller lead/OTP lookup and search analytics require enumeration, rate-limit, flood and payload-boundary review.
- Review admin/tracking DTO PII and delivery-location exposure, session revocation, audit/log redaction and E2E helper fail-closed behavior.
- Backup/restore rehearsal, migration recovery, production India data residency, secret rotation and qualified Indian legal/tax/labour/payment review remain independent launch gates.

### Latest deployment observation

At the time of this addendum, Render had accepted the latest `main` commit `1bba148f504cad9c6e1f1dc1acc6904ed78ef543` for the backend and reported its build in progress; the frontend deployment for the same commit was live. These commits contain tests/documentation only. Recheck Render status before relying on a live-backend claim. No database migration was introduced by PRs #234–#240.

**Phase 1 disposition remains: IN PROGRESS.** Passing unit/full Maven and frontend CI is valuable evidence, but the authorization matrix is incomplete, authenticated E2E is still skipped, and Oracle concurrency/rollback proof is blocked pending an isolated test database.
---

## Phase 1 progress addendum — 2026-11-06 (PRs #242–#248)

This addendum supersedes earlier test-count and deployment observations above where newer evidence is available.

### Newly merged PRs and backend CI evidence

| PR | Merged change | Full backend test count | Result |
|---|---|---:|---|
| #242 | Cross-user saved-address default change denied | 162 | Passed |
| #243 | Delivery location write/read session ownership and rider OTP minimization | 166 | Passed |
| #244 | Bargaining offer response ownership and notification-read recipient scoping | 169 | Passed |
| #245 | Seller document admin authorization, seller metadata scoping and cross-seller document path guard | 172 | Passed |
| #246 | Seller-lead audit actor bound to authenticated admin principal | 175 | Passed |
| #247 | OTP attempt persistence and one-time consumption made independent of outer transaction rollback | 184 | Passed |
| #248 | Public search analytics input validation and normalization | 186 | Passed |

All PRs #242–#248 are merged to `main`. Each PR's Spring Boot/Maven verification and frontend lint/production-build checks passed. Counts are full backend suite totals at each PR head, not only new tests.

### Additional coverage now present

- Buyer addresses: cross-user `setDefault` is rejected before any address/default/profile write. There is no address-delete endpoint in the current controller/service tree; do not claim delete authorization has been tested or add an undocumented delete flow.
- Delivery tracking: expired sessions cannot update location; one rider cannot update another rider's location or track another rider's assigned order; assigned riders can track their order but do not receive the buyer's delivery OTP.
- Bargaining: wrong buyer/store cannot respond to an offer; notification-read updates include notification ID, recipient email and role in the predicate.
- Seller documents: non-admin cannot list/download/rescan/verify; admin download is constrained by seller ID plus document ID; seller metadata is loaded from the seller profile linked to the authenticated user ID.
- Admin seller-lead operations: update/note audit actor is taken from authenticated `UserEntity.userId`, not a request-body actor; missing principal fails closed. `/admin/**` role enforcement remains in `SecurityConfig`.
- OTP: `OtpAttemptService` uses `REQUIRES_NEW` transactions and conditional database updates. Failed attempts increment atomically and the fifth marks the OTP used; successful consumption is accepted only when exactly one active, unexpired, non-exhausted row is updated.
- Search analytics: missing, blank and overlong queries are rejected before persistence; whitespace normalization and principal-only user attribution are tested.

### OTP transaction finding and residual risk

Source review found `OtpService.verify` saved an invalid-attempt counter and then threw `ApiException` inside a transaction. That exception could roll back the attempt increment, including when called inside transactional `AuthService.verifyOtp` or `SellerOnboardingLeadService.verifyContact`. PR #247 moved failed-attempt increments and one-time consumption into independent `REQUIRES_NEW` operations using conditional Oracle UPDATE statements. Unit tests verify SQL predicates and transaction propagation.

**Not yet Oracle-integration proven:** the SQL has not been executed under concurrent Oracle transactions in an isolated test schema. Unit tests and CI do not prove actual Oracle SQL execution, row-lock contention or transaction propagation. Do not run mutating concurrency tests against shared staging.

**OTP cooldown residual:** resend cooldown still performs a recent-record check followed by a separate insert. PR #247 does not make that check-and-insert atomic; concurrent resend requests may still race. Multi-instance resend throttling and IP/device abuse limits remain open.

### P1-D abuse/privacy residuals

- Public search analytics still has no IP/device/database-backed rate limit or flood protection. PR #248 adds validation only; validation is not rate limiting.
- Public seller-lead intake, OTP-send, verify and callback endpoints still need enumeration, flooding, payload-size and per-identity/IP abuse review. High-entropy lead UUIDs are not a substitute for rate limiting.
- Review delivery-location retention/access logging, admin/tracking DTO minimization, seller-document encryption/retention, session revocation and audit-log redaction.

### Updated deployment observation

- PR #247 runtime commit `79c8d80cd117964339cff022ff23a2244b353549` passed backend build; its frontend deployment was live. At the latest check, the backend Render deployment was still `update_in_progress` after a new instance began starting. Do not call the OTP runtime fix live until Render reports `live` and startup/health evidence is checked.
- PR #248 merge commit `326bc7834eae891dffc99ff8e6d2bcfd1d831cf7` triggered a newer backend deployment (`queued`) and frontend build (`build_in_progress`) at the time of the check. Recheck current deployment status; the newest main commit supersedes prior deployment IDs.
- PRs #242–#248 introduced no schema migration. PR #247 adds runtime SQL against the existing `AUTH_OTPS` table only.

### Current Phase 1 disposition

**IN PROGRESS — not production-ready.** Unit/full Maven and frontend CI reached 186 backend tests with zero failures/errors/skips at PR #248. The broader endpoint IDOR matrix remains incomplete; authenticated browser journeys remain 3 passed / 9 skipped on the previously observed workflow; public abuse controls remain open; Oracle concurrency, transaction rollback, restore and migration-recovery proof remain blocked until a dedicated isolated Oracle test database/schema and cleanup harness are available. Shared staging must not be used for mutating concurrency tests.

## Phase 1 progress addendum — 6 November 2026 (PR #253)

**Merged:** PR #253 at `7c3b154e85261fe4b01a53d9934b47fd35d13420`, based on main `b3814b90377efeead0b76c245f87e0e920b1c3da`.

- Daily Help controller profile-ownership matrix now has eight passing controller tests. The new cases cover wrong-profile availability update, slot creation, booking-status mutation and service start, including spoofed professional IDs in request bodies; the service is not invoked after ownership rejection.
- The previously merged OTP JDBC test now has an isolated H2 test-scoped dependency, an explicit H2 datasource, Flyway disabled for the H2 slice, and table reset between test methods.
- Exact-head full Maven verification: **194 tests, 0 failures, 0 errors, 0 skipped**. `OtpAttemptServiceJdbcTest`: 3 passed; `DailyHelpControllerTest`: 8 passed.
- Frontend checks and seller-registration quality gates: passed.
- Browser E2E: **3 passed, 9 skipped**. Authenticated role login and transactional order/Daily Help lifecycle cases remain skipped. The workflow explicitly disabled transactional lifecycle tests on push/PR, so configuration presence must not be mistaken for execution.
- Read-only API smoke: **7 passed, 0 failed**; `databaseHealthChecked=false`. This proves process liveness and anonymous-access guards only, not database readiness.
- Private Playwright report publication was skipped by workflow policy. No mutating staging transaction or Oracle integration test ran.
- H2 validates local JDBC transaction semantics only. It does not establish Oracle SQL compatibility, Oracle locking, simultaneous Oracle transactions or production/staging behavior.

### Phase 0 status reconciliation

PR #231 remains a merged security-hardening milestone, not Phase 0 completion. `CHATGPT-CONTINUATION.md`, `CURRENT-STATE.md` and this plan now state this consistently. Phase 0 exit criteria remain open.

### Next P1-A slice

Buyer address controller tests are being added for authenticated-session user resolution, list/create/update/default flows, foreign-address not-found behavior and missing/invalid-session fail-closed behavior. Existing service tests already cover wrong-owner update/default rejection and no-write behavior. This controller slice is not accepted until its exact-head CI passes.

**Phase 1 remains IN PROGRESS.** The broader IDOR matrix, authenticated lifecycle E2E, Oracle concurrency/rollback, public abuse controls and P1-D operational/legal gates remain open.


## Phase 1 progress addendum — 6 November 2026 (PR #255)

**Merged:** PR #255 at `c3e50040d9d40ec6452b9903c2fa1cff004fc934`, based on main `7c3b154e85261fe4b01a53d9934b47fd35d13420`.

- Added six `AuthControllerAddressTest` cases covering authenticated address list, create, update, default selection, foreign-address not-found and missing/blank bearer-session rejection.
- Controller tests prove that create/update/default service calls receive the user ID resolved from the bearer session, and that the request DTO cannot select another user ID.
- Existing `BuyerAddressServiceTest` wrong-owner update/default tests remain in place and assert no persistence writes for a foreign address.
- Exact-head full Maven verification: **200 tests, 0 failures, 0 errors, 0 skipped**. `AuthControllerAddressTest`: 6 passed; `DailyHelpControllerTest`: 8 passed; `OtpAttemptServiceJdbcTest`: 3 passed.
- Frontend checks and seller-registration quality gates: passed.
- Browser E2E: **3 passed, 9 skipped**; transactional order/Daily Help lifecycle tests remain disabled on push/PR. Read-only API smoke: **7 passed, 0 failed**, `databaseHealthChecked=false`; no DB-readiness claim.
- Private Playwright report publication was skipped by workflow policy. No staging mutation or Oracle integration test ran.
- No address-delete endpoint exists in the inspected API; no delete behavior was invented.

### Next P1-A slice

Buyer order controller authorization tests are being added for authenticated order history, tracking and store-pickup confirmation. Existing `OrderServiceTest` already verifies cross-buyer tracking/pickup rejection and non-buyer tracking denial. The new controller tests must prove the authenticated `UserEntity` is passed unchanged to the owner-scoped service and anonymous/malformed principals fail before service calls. This slice remains pending exact-head CI.

**Phase 1 remains IN PROGRESS.** Full endpoint IDOR coverage, authenticated transactional E2E, Oracle concurrency/rollback, abuse controls and P1-D operational/legal gates remain open.
