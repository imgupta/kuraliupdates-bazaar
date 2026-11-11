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


## PR #259 verification addendum — 6 November 2026

- PR #259 merged to main as `d8d838dbb9d250a0c1d0e409c3dca036e2fc3817` after exact-head checks passed.
- Full backend Maven verification: **215 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**. `BuyerControllerOrderAuthorizationTest`: 7 passed; `OrderServiceTest`: 17 passed.
- Frontend TypeScript/regression/build checks: passed.
- Read-only API smoke: **7 passed, 0 failed**, `databaseHealthChecked=false`; process liveness and anonymous guards only, not DB readiness.
- Browser E2E: **3 passed, 9 skipped**. Authenticated/transactional role journeys remain skipped; skips are not passes.
- Seller-registration quality gates: passed. Private Playwright report publication skipped by workflow policy.

## Next P1-A slice — seller controller boundary

PR #262 adds controller-level tests that every seller portal operation forwards only the extracted bearer-session token to the service, and that absent/malformed bearer headers are rejected by the session-backed service before mutations. Existing `SellerServiceTest` already covers seller-scoped product/discount/order reads, cross-store product/discount/order mutation denial, approved-seller requirements and allowed order transitions. Controller tests complement, but do not replace, service ownership assertions or HTTP filter-chain tests.


## PR #262 verification addendum — 6 November 2026

- PR #262 merged to main at `30814af35c1b84a19e9f993482bd7c1a74a23b32` after exact-head CI passed.
- Full backend Maven verification: **223 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**. `SellerControllerAuthorizationTest`: 8 passed. Existing `SellerServiceTest` retains product/order/discount ownership and seller order-state coverage.
- Frontend TypeScript, regression checks and production build: passed.
- Read-only API smoke: **7 passed, 0 failed**, `databaseHealthChecked=false`; process liveness and anonymous guards only, not DB readiness.
- Browser E2E: **3 passed, 9 skipped**; authenticated and transactional journeys remain skipped.
- Seller-registration quality gates: passed; private Playwright report publication skipped by workflow policy.


## PR #263 verification addendum — 6 November 2026

- PR #263 merged to main as `656ddd5bedc9d8b48a027ba574bb5263a284f633` after exact-head CI passed.
- Full backend Maven verification: **230 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**. `NegotiationChatControllerAuthorizationTest`: 7 passed.
- Frontend checks, regression suite and production build: passed; seller-registration quality gates passed.
- Read-only API smoke: **7 passed, 0 failed**, `databaseHealthChecked=false`; this is process liveness and anonymous guards, not database readiness.
- Browser E2E: **3 passed, 9 skipped**. Authenticated/transactional journeys remain skipped; skips are not passes.
- Private Playwright report publication skipped by workflow policy. No staging mutation or Oracle transaction test ran.

### Next P1-A slice — seller-document access and PII handling

PR #264 adds missing/invalid seller bearer-session and missing seller-profile negative tests, verifies anonymous admin document operations fail before repository access, verifies clean admin downloads carry private/no-store and nosniff headers, and verifies seller metadata does not expose raw document bytes. Existing tests already cover non-admin denial, seller-profile scoping, cross-seller document-path denial, malware quarantine and admin verification audit identity. This is a bounded controller test slice; full HTTP filter-chain multipart integration, encryption-at-rest, retention/deletion and storage-provider controls remain separate evidence requirements.



## PR #264 verification addendum — 6 November 2026

- PR #264 merged to main as `4dc3a9219c6f55a869d468c0d33b79ec19f7bced` after exact-head CI passed.
- Full backend Maven verification: **235 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**. `SellerDocumentControllerTest`: 14 passed (5 new cases).
- Frontend checks and production build: passed; seller-registration quality gates passed.
- Read-only API smoke: **7 passed, 0 failed**, `databaseHealthChecked=false`; not database readiness.
- Browser E2E: **3 passed, 9 skipped**. Authenticated/transactional flows remain skipped.
- First CI attempt exposed a missing test import (`HttpHeaders`); fixed on the PR branch, and all checks passed on the final exact head. No runtime behavior changed.

## Next P1-A slice — admin seller-lead route enforcement

PR #265 adds a MockMvc security-filter-chain test for actual `/admin/seller-leads` list, notes, update and add-note routes. It verifies anonymous and authenticated BUYER requests are denied, ADMIN can read, and write audit actor is sourced from the authenticated session rather than request-body `actor`. Existing controller unit tests cover the principal guard and spoofed actor rejection. No public lead intake behavior or business data is changed.

## Consolidated P1-A / P1-B / P1-D regression batch — PR #266 (in progress)

PR #266 consolidates the next related authorization, authenticated-route and privacy-boundary test work on one branch, including the superseded PR #265 admin seller-lead filter-chain tests.

Added in this batch:
- Daily Help controller negative coverage for missing and malformed principals across booking, professional profile, slots, jobs, earnings, status, start and completion operations. Tests assert protected service methods are not reached when the principal is invalid.
- Delivery controller malformed-principal coverage across all protected delivery operations, complementing the existing missing-authentication and service ownership tests.
- Delivery tracking HTTP filter-chain coverage for anonymous denial and bearer-session forwarding on order tracking and rider location updates. Existing DeliveryTrackingServiceTest already covers expired sessions, unrelated buyers/riders, assigned-rider ownership, and buyer-only delivery OTP disclosure.
- Seller-registration OTP settings HTTP security and privacy coverage: public settings expose only the two required boolean flags; anonymous and BUYER sessions cannot access admin settings/history or mutate configuration; ADMIN updates are attributed to the authenticated principal.

Verification boundary:
- These are test additions; they do not claim that rate limiting, encryption-at-rest, retention/deletion, consent or vendor-region controls are implemented.
- No real user, seller, buyer, rider, OTP or order data is used. MockMvc tests use synthetic identities and mocked service boundaries.
- No database mutation, Oracle concurrency run, deployment or production secret change is part of this batch.
- Exact-head CI is required before merge. Browser E2E skips are not passes. Oracle transaction/rollback proof remains blocked until an isolated Oracle test target and cleanup harness are verified.

**Status: IN PROGRESS.** Do not close P1-A, P1-B, P1-D or Phase 1 from these controller tests alone.

### PR #266 first verification cycle — 6 November 2026

At code head 14dd0167c61aefa5e307b65d7dcfdfe259292264, the Seller registration quality gates workflow run 42218558945 completed successfully:
- Full backend Maven suite: **248 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**.
- Focused additions: DailyHelpControllerTest 10 passed; DeliveryControllerTest 5 passed; DeliveryTrackingControllerSecurityTest 3 passed; SellerRegistrationOtpConfigControllerSecurityTest 3 passed; AdminSellerOnboardingControllerSecurityTest 4 passed.
- Frontend TypeScript checks and production build: passed.
- The standard KuraliUpdates CI and E2E workflow run 42218558947 remains pending and has returned no jobs. It is not a pass; merge remains blocked until exact-head standard workflow evidence is available.
- An initial compile failure in SellerRegistrationOtpConfigControllerSecurityTest was corrected by matching the history mock to its declared List return type. The successful 248-test result is from the corrected code head.

This evidence is a first successful quality-gate run, not yet the final PR head after this documentation addendum. Re-run exact-head workflows after the documentation update.


## PR #267 — consolidated run-scoped staging lifecycle harness

- Added a token-protected staging-only fixture endpoint that requires existing E2E-prefixed approved seller, active delivery agent and verified/available Daily Help professional profiles.
- V32 adds nullable E2E_RUN_ID markers for products, Daily Help services and professional slots. It does not tag or alter pre-existing rows.
- Each Playwright lifecycle test provisions its own synthetic product, service and future slot. COD order and Daily Help lifecycle use the real application endpoints and generated OTPs.
- Cleanup preflights all run-owned rows before writes and deletes only the run's synthetic product/service/slot/order/booking/chat/sessions. It refuses cross-run or non-synthetic relationships.
- A separate trusted workflow_run workflow waits for database-backed staging readiness and executes transactional lifecycle E2E after successful main-branch CI. PR checks remain non-mutating. Manual dispatch is also available.
- Backend fixture-service tests are included in the focused Maven regression command and full suite.

**Status:** PR #267 is open. Exact-head CI is pending. The transactional staging workflow has not yet executed against the deployed V32 schema. Phase 1 remains IN PROGRESS; no closure claim is made until that workflow passes and the remaining IDOR, abuse/privacy and Oracle concurrency/rollback criteria are either proven or explicitly dispositioned.


### PR #267 additional staging transaction cases

The consolidated synthetic fixture now includes a second run-owned seller profile solely for multi-seller checkout rollback. The fixture creates:
- a normal stock-2 product for the end-to-end delivery flow;
- a stock-2 product assigned to whichever synthetic seller sorts first by seller ID;
- a zero-stock product assigned to the second seller in deterministic checkout grouping order;
- one run-owned rollback seller, one Daily Help service and one future slot.

The transactional suite now includes:
- two simultaneous single-seller checkouts against stock 2; exactly one may succeed and stock must end at zero;
- a third checkout after depletion must be rejected;
- a multi-seller checkout where the first seller suborder can reserve stock and the second seller fails for zero stock; buyer history and the first seller's stock must be unchanged after rollback;
- two concurrent claims by the same active synthetic rider; exactly one claim may win;
- two concurrent Daily Help bookings for the same slot; exactly one booking may reserve it;
- replay of an already accepted bargaining offer must be rejected without applying it twice.

All these scenarios use one run ID and are covered by the cleanup preflight. If a race exposes duplicate run-owned rows, cleanup is allowed to remove only those rows after verifying their seller/product/service/slot links remain within the same run. Cross-run links still abort before writes.


### PR #267 — public endpoint abuse controls

- Added an Oracle-backed fixed-window rate-limit bucket table. Bucket keys are SHA-256 hashes; raw email, phone, lead ID, user ID and remote address are not persisted in the limiter table.
- Seller lead creation is limited to 3 attempts per normalized contact pair, email, and phone independently per hour.
- Lead OTP-send requests are limited to 3 per lead per hour; contact verification to 10 per lead per 15 minutes; callback requests to 2 per lead per day. Existing OTP cooldown and attempt caps remain in force.
- Search analytics is limited to 300 events/minute per authenticated user or 600/minute per anonymous remote address.
- Oracle first-insert duplicate-key races retry once against the winning bucket; a repeated database race fails closed with 503, and exhausted buckets return 429.
- Seller lead owner-name, email, phone and callback-preference lengths are rejected when oversized rather than silently truncated.

**Status:** code and regression tests are included in PR #267. Exact-head CI and the deployed V33 migration are still required before claiming these controls are verified on staging.


## Staging environment decision — 2026-11-06

The owner confirmed that the current KuraliUpdates environment is staging-only and explicitly authorized synthetic test orders and backend-created mock data for end-to-end verification. There is no production environment to target at this stage. Accordingly, Phase 1 transaction/concurrency tests may run against the designated staging Oracle database only when every created business row is tagged to a unique E2E_RUN_ID, uses E2E-prefixed fixture identities/IDs, and is removed by the guarded run-scoped cleanup. No production target, real customer/seller records, global reset, table truncation, or broad cleanup is authorized. This approval does not close Phase 0 backup/restore, residency, secret-rotation or legal sign-off requirements, and it does not authorize a production relaunch.


## Cleanup defect found by PR #268 preflight — 6 November 2026

- PR #268 exact-head workflow run `42232583085` verified all five staging role sessions (Buyer, Seller, Delivery, Provider and Admin), then failed because the run-scoped cleanup endpoint returned HTTP 500. No business transactions or fixture provisioning ran; the workflow explicitly skipped them for the PR event.
- Render application logs at 2026-11-06T14:17:44Z identify the cause: Oracle `ORA-00904: "B"."SLOT_ID": invalid identifier` in `E2eRunCleanupService` during the cleanup preflight count query.
- Source inspection confirms `DAILY_HELP_BOOKINGS` / `DailyHelpBookingEntity` has no `SLOT_ID` field. The authoritative relationship is `DAILY_HELP_PROFESSIONAL_SLOTS.BOOKING_ID` to `DAILY_HELP_BOOKINGS.BOOKING_ID`.
- Fix in branch `phase1/fix-e2e-cleanup-booking-slot-link`: both cleanup preflight relationship checks now use `BOOKING_ID`; the new `E2eRunCleanupServiceTest` asserts the SQL never references `b.SLOT_ID` and verifies the booking/slot relationship in both directions.
- The failed cleanup ran before the service's first write because all ownership checks precede mutations. The five sessions were created with the run tag and have the normal two-hour expiry. The run ID was not printed by the workflow, so no broad/manual cleanup is attempted.
- Exact-head Maven/CI and a fresh staging preflight after the backend fix is deployed are required. PR #268 remains blocked until it passes. Do not infer Phase 1 completion from this fix alone.


## 7 November 2026 — cleanup fix deployed; preflight retest required

- PR #269 merged as `6d9b85b85869d00563b736040fdca6b053e327f7`. Render deployment `dep-dbmu5k6c6qcc73biqedg` is confirmed `live` on the backend service. The fix changes invalid Daily Help cleanup relationship checks to use `BOOKING_ID` and includes a regression test.
- Exact-head PR #269 CI completed successfully: backend suite 263 tests, 0 failures/errors/skips; frontend checks/build passed; read-only staging smoke passed 7/0; browser E2E 3 passed, 11 skipped. The skipped browser tests are not counted as authenticated transaction coverage.
- The earlier PR #268 preflight run `42232583085` remains a failed historical run: five role sessions authenticated, but cleanup returned HTTP 500 from the now-fixed invalid `B.SLOT_ID` reference. It is not a pass.
- The old PR #268 branch is one commit behind main after PR #269. A fresh branch `phase1/staging-preflight-after-cleanup-fix` was created from current main and the safe, non-transactional preflight workflow was reapplied as commit `49a43fe74676c21ac4c20380b9e1d3b3f41dfa7e` to trigger a clean PR event against the deployed fix.
- Next: open/review the fresh PR and verify its exact-head workflow run confirms all five role sessions and exact run-scoped cleanup count. Do not merge until green. Then run the separately trusted transactional staging workflow with owner-approved synthetic fixtures, verify V32/V33 migrations and Oracle-backed cleanup/rollback, and continue remaining authorization/privacy checks. Phase 1 remains IN PROGRESS.


## 7 November 2026 — preflight timeout investigation

- Fresh PR #270 preflight run `42278065698` failed again, but the failure differs from the earlier Oracle SQL defect: the workflow log ends with Node fetch `AbortSignal.timeout` after 20 seconds. No Oracle `B.SLOT_ID` error was observed in this run. No business transactions or fixture mutations were attempted.
- The same exact-head standard CI run `42278065492` is still in progress at this checkpoint; frontend checks passed, backend suite completed successfully, and read-only smoke/browser E2E remained running. Seller registration quality gates `42278065917` passed.
- Render confirms PR #269 backend deployment `dep-dbmu5k6c6qcc73biqedg` is live. Render app logs show the service process restarted around `2026-11-06T19:16:14Z`, but the available log window contains only early Spring Boot startup lines and no request-level evidence. Request logs returned no entries, so the precise endpoint/startup cause is not yet proven.
- Updated the preflight workflow to emit a progress line before each role request and cleanup, increased request timeout from 20 to 60 seconds, and increased job timeout from 8 to 12 minutes to tolerate Render cold start and make the next failure diagnosable. This does not change transactional gating or cleanup scope.
- New workflow commit: `231f43ddd1f49d99f441129a2ef77f462cd0e67c`. A fresh PR head run is required. Do not treat the previous timeout as proof that cleanup is fixed or broken; it is an inconclusive network/availability failure.


## 7 November 2026 — dedicated branch preflight trigger

- PR #270 did not produce a new staging preflight run after the timeout/diagnostic commit. To make verification deterministic without depending on pull-request workflow-definition loading, the preflight workflow now also triggers on pushes to the exact dedicated branch `phase1/staging-preflight-after-cleanup-fix`.
- This push-triggered run remains non-transactional: `trustedRun` is true only for explicit `workflow_dispatch`; all push/PR events skip transactional fixture provisioning and business mutations. Only five temporary tagged role sessions can be issued and exact run-scoped cleanup is attempted.
- Workflow trigger commit: `9d6ce8dd68044893f1a5a7642cbb56304570685d`. Check its push-triggered workflow run before merging PR #270. No pass is claimed yet.


## 7 November 2026 — Render cold-start diagnosis and non-transactional role gate passed

- Render logs for the failed preflight show Spring Boot cold-start duration of 113.099 seconds. Oracle connection-pool startup succeeded, Flyway validated all 35 migrations, and the database schema was at version 34. The Buyer authentication call began before startup completed and exceeded the 60-second runner timeout. The subsequent run-scoped cleanup removed one session whose successful server-side creation response had been lost by the runner.
- Workflow fix commit `2c5a922cf88ff28a14a07dad9be59e156202e809` adds a database-independent `/health/live` readiness poll (six-minute ceiling) before role authentication and validates cleanup counts against the bounded range of successful token responses through attempted requests. This preserves exact run-ID isolation and handles ambiguous HTTP outcomes without broad cleanup.
- Push preflight run `42340528387` passed: all five role sessions (Buyer, Seller, Delivery, Provider, Admin) verified and exactly five run-tagged sessions were removed. No business transactions or fixture mutations ran. Transactional fixture/profile checks were skipped by design on push/PR events.
- Remaining gates: PR-triggered exact-head preflight and standard CI must pass; then run the separately trusted synthetic transactional workflow, verify V32/V33 and Oracle-backed cleanup/concurrency/rollback, enable safe OTP capture/suppression, and finish authorization/privacy evidence. Phase 1 remains IN PROGRESS.

## 7 November 2026 — transactional staging suite passed 5/5

**Main:** `bdf53de60e2ca59b92e35cde472f9b4864ad2bbc`.  
**PR #289:** merged as `972f187443cb8bf00ea31428e5f317b62f8ee552`.  
**Staging backend:** Render deployment remains live on `b491795f9b7a7b0d91d21a3835cc6287e190573f`; the workflow resolves and checks the actual deployed backend SHA rather than assuming a workflow-only main commit is also deployed to Render.

Run [42365076271](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/42365076271) completed successfully:
- Exact backend commit readiness matched and stayed healthy for 12 consecutive 10-second checks.
- Buyer order lifecycle, bargaining acceptance/replay, seller fulfilment, concurrent rider claim, pickup and delivery OTP/replay: passed.
- Daily Help concurrent booking for one slot, invalid/start OTP, start replay, completion and completion replay: passed.
- Multi-seller checkout failure rolled back the earlier seller order and stock: passed.
- Concurrent checkout against the last synthetic stock did not oversell: passed.
- Admin approval queues: ADMIN access passed; BUYER and SELLER denial passed.
- Result: **5 passed, 0 failed, 0 skipped**. Artifact ID `13571925468`.

The four business/transactional test groups and the admin authorization group ran against unique run-scoped synthetic fixtures. Cleanup completed as part of the test hooks. This is staging runtime evidence for these specific scenarios, not proof of a separate Oracle schema or exhaustive P1-A/P1-C closure.

**Remaining P1-C gaps:** two distinct delivery agents racing to claim one checkout group; Oracle-specific independent-transaction/locking proof in a dedicated isolated target; portal handoff concurrency/expiry/downstream-failure; OTP resend multi-instance race; address-default concurrent invariant; cancellation/stock restoration and any remaining lifecycle replay cases. Existing staging tests do not automatically close these items.

**Remaining P1-A/P1-D gaps:** exhaustive method/route/role/owner matrix; remaining nested-resource and admin PII authorization; public seller-lead/search-analytics enumeration and abuse controls; privacy/data-retention/log-redaction and provider-region evidence. Phase 1 and Phase 0 remain open.

## 7 November 2026 — combined delivery checkout-group claim boundary tests

A new bounded P1-A/P1-C test slice adds service-level regression coverage for `DeliveryService.claimCheckoutGroup`:
- A successful group claim assigns every seller order to the authenticated active delivery profile, sets the common checkout batch ID and shared four-digit delivery OTP, and snapshots the combined payout only once (on the first seller order).
- A caller-supplied delivery profile ID that differs from the authenticated profile is rejected before JDBC configuration reads, order locks or route calculation.
- A group containing a seller order that is not yet `READY_FOR_PICKUP` is rejected without changing either seller order or saving the group.

These are deterministic service tests using mocked repositories and JDBC. They verify ownership and all-or-nothing service state transitions, but they do **not** simulate two independent database transactions or prove Oracle pessimistic-lock behavior.

**Remaining:** add an Oracle-backed two-distinct-agent race for a combined checkout group only when a dedicated isolated Oracle target and two approved synthetic active delivery identities are available. Do not create or promote a second rider profile in shared staging merely to satisfy this test.

## 7 November 2026 — Daily Help completion timestamp precision correction

A staging rerun exposed an intermittent one-microsecond mismatch between the immediate Daily Help completion response and the subsequent Oracle read-back. The completion use case generated nanosecond-precision `LocalDateTime`, while Oracle `TIMESTAMP(6)` persisted microseconds. The start path was already normalized; the completion path was not.

The fix truncates completion time to `ChronoUnit.MICROS` before persisting and returning the response. A new `DailyHelpServiceTest.completionTimestampIsNormalizedToOracleMicrosecondPrecision` asserts the response timestamp is microsecond-aligned and matches the persisted entity. Exact-head CI and a fresh staging run are required before calling the fix verified.

**Evidence boundary:** the failed run had four test groups pass; the Daily Help group failed on first attempt by 1µs and passed on retry. Playwright correctly marked the overall run failed/flaky. Do not count that run as a clean pass.


## Seller lead contact-verification fail-closed rule — 7 November 2026

Seller onboarding must retain at least one enabled contact-verification channel. The admin OTP configuration cannot disable both email and mobile verification, and public lead creation fails closed if both are disabled. For callback requests and application submission, a skipped channel is acceptable only when the other contact channel was actually verified; two skipped OTP channels do not establish applicant identity. Regression tests cover both-disabled configuration, lead creation rejection, both-skipped rejection, and the supported one-verified/one-skipped case. Existing rate limits, OTP verification, and admin audit behavior remain unchanged.


## 7 November 2026 — delivery tracking profile ownership slice

A source audit identified that delivery tracking matched rider sessions to assigned delivery profiles by email only, despite a persisted `DELIVERY_AGENTS.USER_ID` relationship. It also allowed an assigned rider profile that had become inactive to continue reading buyer delivery address and location data while the session remained valid. The current implementation slice makes the linked user ID authoritative, permits email fallback only for legacy profiles without `USER_ID`, requires an ACTIVE profile for rider reads and location writes, limits rider tracking to `ASSIGNED_TO_DELIVERY` / `PICKED_UP`, and fails closed for sessions with a missing expiry or user ID. Buyer order tracking and buyer-only delivery OTP visibility are unchanged.

New service regression cases cover linked identity, conflicting ID/email, inactive rider denial, email-independent location update and malformed expiry. These are deterministic mocked-service tests; they do not replace authenticated HTTP filter-chain tests or Oracle-backed staging verification. Exact-head CI must pass before merge. No shared staging data is mutated.


## 7 November 2026 — staging E2E runtime measurement and overlap optimization

The first fresh main run after the reduced readiness gate passed 5/5 transactional scenarios. Measured job timing was approximately 24s setup, 92s until the first healthy API/database response, 11s for the remaining three-consecutive-probe stability gate, and 3m04s for the five Playwright tests. The total job took approximately 5m17s; workflow creation-to-completion took approximately 6m34s including runner scheduling delay. The observed readiness interval was 1m43s compared with the prior measured 1m55s; do not repeat the earlier projected 1m40s end-to-end saving.

The follow-up CI slice overlaps a best-effort read-only staging warm-up with test dependency/browser installation and runs independent read-only E2E assertions concurrently. Mutating operations and dependent order/booking transitions remain serial to preserve shared staging identity, inventory, OTP and run-scoped cleanup invariants. The exact-commit/API/database readiness gate remains authoritative. Any additional wall-clock reduction must be measured on a fresh main run before it is reported as achieved.


## 7 November 2026 — Daily Help OTP confidentiality and booking lifecycle concurrency

The Daily Help professional status mutation previously returned `DailyHelpBookingResponse.from(..., true)`, exposing the buyer-held start OTP in a professional response. The update now always omits OTP from professional mutation responses. State-changing status/start/completion paths use `findLockedByBookingId` within their existing transactions. Buyer read paths remain ordinary reads and are not locked. Status updates are forward-only (`PROFESSIONAL_ASSIGNED -> ARRIVING -> READY_TO_START`); same-state retries are idempotent, while skipped/reversed/reopened transitions conflict. Regression tests cover OTP non-disclosure, locked mutation lookup, invalid transitions and same-state replay. Exact-head CI and Oracle runtime verification are required before merge.


## 7 November 2026 — persistent delivery OTP resend cooldown (P1-C)

The delivery OTP resend cooldown previously lived in a process-local map. Multiple Render instances and application restarts could bypass the 60-second cooldown. The implementation reuses the existing Oracle `API_RATE_LIMIT_BUCKETS` table introduced by Flyway V33. A domain-separated SHA-256 key identifies the order or combined checkout-group cooldown; `WINDOW_START` uses a fixed sentinel and `EXPIRES_AT` stores the precise database-clock cooldown expiry. The general rate-limit cleanup excludes sentinel rows, while a delivery-specific cleanup removes only expired sentinel rows. No schema migration is added. An Oracle `MERGE` uses `SYSTIMESTAMP` to atomically claim the cooldown across instances; the guard update and OTP rotation are in the same transaction. A unique-key race retries once, database guard failure returns 503 (fail closed), and expired rows are cleaned up best-effort. Unit tests model two independent service instances sharing the same guard store. Exact-head CI and Oracle multi-session contention proof are required before calling the cross-instance behavior runtime-verified.


## 7 November 2026 — delivery partner response minimization (P1-D)

The delivery controller no longer returns the broad shared OrderResponse. Unclaimed jobs use AvailableDeliveryJobResponse, which reveals only buyer locality, seller pickup locations, checkout grouping and route metadata; buyer name, phone, exact address and coordinates are withheld until claim succeeds. Assigned jobs and claim/pickup responses use DeliveryJobResponse with buyer name/phone/address/locality/coordinates, seller pickup name/address/locality, item product/title/quantity, status, checkout group and route metadata. It omits buyer email, coupon/discount/payment details, internal place IDs, OTP and rider payout snapshots. Nested DeliveryJobItemResponse omits unit/negotiated/total pricing. No schema/API route change. No schema/API route change. DTO serialization tests assert excluded fields stay absent. Exact-head CI is required before merge.


## 7 November 2026 — delivery onboarding identity and approval (P1-A)

The legacy public delivery registration endpoint is removed. It created unlinked profiles and bypassed the verified account-to-profile relationship. The supported path is AuthService's existing email-OTP verified role-registration flow, which provisions the delivery profile with the authenticated USER_ID and PENDING status. Frontend local-only registration/instant ACTIVE status is removed; the legacy modal routes to /register/delivery and the portal clearly shows pending admin approval. AuthService role discovery and DeliveryService profile lookup use USER_ID as authoritative. For backward compatibility only, a null-USER_ID legacy row may be found by the authenticated account's verified email; a profile with a conflicting populated USER_ID never falls back, and phone matching cannot grant delivery access. New registration always writes USER_ID. No schema change.


## 7 November 2026 — seller cancellation and inventory restoration (P1-C)

Seller order updates now use the pessimistic order-row lock. Seller cancellation is idempotent, locks product rows in sorted product-ID order, aggregates repeated order-item quantities, restores reserved stock exactly once, and sets order/fulfilment/payment states to CANCELLED. Missing product rows and stock overflow fail the transaction. Paid orders are rejected because refunds are not implemented. Cancellation remains available only before READY_FOR_PICKUP (from PLACED or ACCEPTED_BY_SELLER). Service tests cover replay, lock usage, aggregation, deterministic product lock order, missing product rollback and paid-order rejection. This does not implement buyer-initiated cancellation and does not substitute for Oracle two-session runtime contention proof.


## 7 November 2026 — buyer cancellation lifecycle (P1-C, merged PR #304)

The buyer API now exposes a session-role-gated cancellation endpoint. A buyer may cancel a single-seller order or an entire multi-seller checkout group only while every suborder remains before READY_FOR_PICKUP, has no delivery assignment/batch, and is not PAID. Ownership is checked against the authenticated buyer email; non-owned orders return not-found to avoid disclosing existence. The service locks the order/group, aggregates all product quantities, locks product rows in stable product-ID order, restores stock and marks the full group CANCELLED in one transaction. A replay of an already-cancelled group does not restore stock again. If a seller has already cancelled one suborder, its previously restored stock is not restored again; the buyer command may cancel the remaining eligible suborders. Paid cancellation is deliberately blocked pending refund implementation.

Tests added: buyer ownership denial, successful stock restoration and idempotent replay, paid/fulfilled cancellation rejection, and multi-seller group-wide restoration with deterministic product lock order. These mocked service tests are not Oracle concurrency proof. Required next evidence: exact-head CI, staging workflow run with synthetic fixtures, and isolated Oracle multi-session cancellation/claim contention before claiming database-level concurrency closure.


## 7 November 2026 — buyer cancellation frontend integration (P1-C, PR in progress)

The buyer Account page now exposes a cancellation action from Current Order and Order History for PLACED / ACCEPTED_BY_SELLER orders. It prompts for confirmation, targets the underlying seller order for a grouped checkout, surfaces backend conflict/refund messages, and refreshes backend state after success. The action is not shown after seller fulfilment has advanced. The grouping helper now keeps a multi-seller checkout visible/active if one seller suborder is cancelled but another remains active; it marks the group cancelled only when all children are cancelled.

Added node:test coverage for mixed cancelled/active checkout groups and fully cancelled groups, and wired it into the frontend CI workflow. Exact-head TypeScript, frontend tests/build and browser checks remain required. Vercel portal deployment is currently subject to the account's build-rate limit and is tracked separately from code CI.


**PR #304 verification:** exact PR head `fe486b41b8e5832783f6702f5c072e717386c020`, merged as `cf21ae0b5d711c8e472a7a50afb2d4f4155e1ca8`. Full backend: 317 tests, zero failures/errors/skips. Frontend lint/build and staging role/fixture preflight passed. Browser E2E was 3 passed / 6 skipped. Read-only API smoke was 7/7, but `databaseHealthChecked=false`; it is not a database readiness test. Post-merge staging transactional E2E and Oracle two-session contention remain separate evidence gates.


## 7 November 2026 — isolate periodic rate-limit cleanup from request decisions (PR in progress)

Staging run `42381776750` had exact-commit/database readiness success, four scenarios passed, and one Daily Help scenario that failed once on HTTP 500 from the E2E Oracle rate-limit probe before passing on retry. The overall workflow is failed/flaky, not a pass. `ApiRateLimitService` currently performs expired-bucket cleanup inline every 100 successful calls; a cleanup database exception can therefore escape an otherwise successful limiter decision. The precise Oracle exception was not present in the Actions output, so this is a plausible source-level trigger, not a confirmed runtime root cause.

The PR wraps only the periodic cleanup in best-effort exception handling and logs the exception class. MERGE-based enforcement, 429 behavior, duplicate-key retry and fail-closed 503 behavior are unchanged. A regression test injects cleanup failure on call 100 and verifies the request remains allowed. Exact-head Maven CI and a rerun of the synthetic staging suite are required before closing this reliability gap.


## 7 November 2026 — atomic OTP resend cooldown (P1-C, implementation in progress)

`OtpService.send` previously used `existsRecentOtp` as a read-before-write cooldown check. Two requests on separate application instances could both pass before either saved its OTP. The implementation now atomically reserves a domain-separated SHA-256 bucket in the existing Oracle `API_RATE_LIMIT_BUCKETS` table using a sentinel window and `SYSTIMESTAMP` expiry. It retries an Oracle duplicate-key first-insert race once, returns 429 when another request owns the cooldown, and fails closed with 503 when the guard cannot be persisted. The existing OTP-row check remains as a compatibility guard. Reservation and OTP persistence participate in the existing transaction; the explicit allowlisted staging E2E bypass remains unchanged. No schema migration or API contract change.

Regression tests cover active cooldown denial, duplicate-key retry, database outage, successful hashed reservation and legacy OTP-row compatibility. These are mocked service tests, not Oracle multi-session proof. Exact-head CI, an isolated Oracle two-session race/rollback test and a clean staging transactional rerun remain acceptance gates. See [OTP resend cooldown design](OTP-RESEND-COOLDOWN.md). Phase 1 remains IN PROGRESS.


## Consolidated implementation batch — 7 November 2026

PR #310 is merged and its persistent OTP resend cooldown is now part of main. Its exact-head Maven CI passed 324 tests with zero failures/errors/skips, and frontend lint/build passed. This remains unit/CI evidence; isolated Oracle multi-session race, expiry and rollback proof is still outstanding.

The next consolidated PR carries the affected-portal build classifier on top of the post-#310 main commit rather than leaving a diverged PR branch. The classifier must preserve these safety properties:
- backend, docs, tests, workflow and build-support-only changes do not fan out into role portal builds;
- known role-owned component/API paths build only their owning portal;
- shared and unknown frontend runtime paths build all five portals;
- unavailable/zero Vercel commit metadata or an unresolvable diff fails open and builds;
- the combined site still builds for any frontend runtime change.

Additional regression coverage pins Windows-style path normalization, backend/build-script exclusion and fail-safe fan-out for mixed known/unknown runtime changes.

Operational activation remains separate: inspect all six Vercel project root directories and configure the appropriate Ignore Build Step command only where the script is present in the root. Verify with controlled no-op and affected-path builds. Do not claim the build-rate limit is resolved merely because the classifier is merged.

**Acceptance boundary:** this batch improves OTP resend protection and deployment efficiency. It does not close the full P1-A IDOR matrix, P1-B authenticated journey matrix, P1-C Oracle concurrency/rollback matrix, P1-D abuse/privacy controls, or Phase 0 production-residency/backup/secret-rotation/professional-review gates. Phase 1 remains IN PROGRESS.


## P1-D public endpoint abuse-control regression slice — 7 November 2026

Source review confirms that public seller-lead routes already apply persistent Oracle-backed identifier budgets before service writes: lead creation 3/hour for normalized contact pair, email and phone; OTP send 3/hour per lead; verification 10/15 minutes per lead; callback 2/day per lead. Public search analytics applies 600/minute per anonymous remote IP and 300/minute per authenticated user; query text is bounded to 255 characters and client-supplied userId is ignored. The shared limiter stores only a SHA-256 bucket key.

The follow-up PR adds negative-path controller tests proving that seller-lead creation, seller OTP send and search analytics do not invoke persistence/service work after the rate limiter rejects a request. It also reconciles the endpoint authorization matrix so the existing controls are not incorrectly reported as absent.

**Evidence boundary:** these tests use mocked rate-limit and persistence dependencies. They do not prove Oracle cross-instance rate-limit contention, reverse-proxy client-IP correctness, CAPTCHA/bot protection, public lead anti-enumeration, or a search-analytics retention/deletion policy. P1-D remains open pending those controls and the broader privacy/logging review.


## P1-A bargaining chat read-path ownership regression slice — 7 November 2026

This PR extends the bargaining authorization evidence beyond send/respond mutations to read/list paths. Buyer chat list queries must bind the normalized authenticated buyer email; seller chat list queries must bind the approved seller ID derived from the authenticated account; notification list queries must bind both recipient email and active role. Notification read updates already bind notification ID, recipient email and role.

New tests assert the SQL ownership predicates and exact bound identity/role arguments for buyer list, seller list and notification list. Existing tests continue to cover cross-participant send/respond denial and notification-read scoping.

**Evidence boundary:** SQL-shape/bind-argument tests use mocked JdbcTemplate. They are not Oracle runtime authorization proof and do not close every buyer/seller/delivery/professional/chat identifier route. Exact-head backend CI is required; authenticated browser journeys remain constrained by staging OTP capture configuration.


## 11 November 2026 — current main baseline and completion disposition

The audited baseline is `352286ae66438d1bd6063673945e724cbaed28f7`, the current known main merge commit for PR #320. On this SHA, local Maven passed 342 tests with no failures/errors/skips; frontend TS tests passed 40/40 across nine files; frontend `.mjs` tests passed 25/25 when run with required loopback access; TypeScript, root and all five portal builds passed. The focused security set passed 80/80, backend packaging succeeded, and a strictly local Playwright mock suite passed 2/2 login-entry/input-validation cases. This local suite is not authenticated role or business-lifecycle evidence.

The complete requirement matrix and disposition are in `docs/PHASE-1-REQUIREMENT-MATRIX.md` and `docs/PHASE-1-COMPLETION-REPORT.md`. Current open GitHub scope includes seller-document malware retention/access audit (issue #209), seller onboarding/document-correction E2E (issue #210), and Critical Oracle wallet/credential remediation (draft PR #317, related issue #16). These were inspected but not modified or closed.

PR #321 local/staging Playwright isolation was corrected in commit `1073969e93dd648cc2a482eb653a88cbab10fe2c`. Exact-head CI run `43072296209` passed frontend/backend and the browser job. Its read-only staging smoke was 7/7 with `databaseHealthChecked=false`; public E2E was 3 passed / 7 skipped, with authenticated/transactional flows safely gated off. This does not replace a fresh transactional run against an approved isolated target.

**Decision: Phase 1 remains IN PROGRESS.** The exact current-head staging lifecycle, full endpoint-owner matrix, isolated Oracle migration/concurrency/rollback evidence, public abuse/privacy closure, Critical credential rotation/runtime readiness, and Phase 0 operational/legal gates remain unverified or open. Do not infer Oracle behavior from mocks or use shared staging for mutating tests without the dedicated isolation boundary and explicit approval.
