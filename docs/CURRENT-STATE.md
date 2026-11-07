# Current implementation status and remaining work

**Last reconciled:** 7 November 2026  
**Current main evidence checkpoint:** `bdf53de60e2ca59b92e35cde472f9b4864ad2bbc` (PRs #285–#289 and the staging-readiness follow-up are merged; exact deployed backend SHA is separately verified as `b491795f9b7a7b0d91d21a3835cc6287e190573f`). The detailed source audit below retains its historical baseline `840842662c03ae026c9ddd996b62b074784359a0`; it is not a complete re-audit of every current-main file.

**Phase 0 formal evidence disposition (6 Nov 2026):** The security-hardening milestone and subsequent authorization slices are merged, but the repository still lacks evidence to sign off all formal exit gates. See [Phase 0 Formal Evidence and Exit Register](PHASE-0-FORMAL-EVIDENCE-REGISTER.md) for completed evidence, partial/blocked items, required closure pack and sign-off form. Do not infer backup/restore, Oracle live-schema, India residency, secret rotation or qualified legal review from CI.

This page distinguishes source facts from CI, deployment, database and runtime evidence. See [Engineering Operating Standard](ENGINEERING-OPERATING-STANDARD.md), [Mandatory India PR Governance](INDIA-PR-GOVERNANCE.md) and [Continuation](CHATGPT-CONTINUATION.md).

## Mandatory PR governance

Every PR, including documentation-only, dependencies, configuration and infrastructure, must use the [mandatory PR template and review gates](INDIA-PR-GOVERNANCE.md). It covers Indian central/state/local laws, regulator directions, current vs future-effective vs draft rules, personal/business data lifecycle, hosting and transfers, security, consumer/seller/provider rights, payment and tax impacts, risk ownership, tests and release evidence.

**Production hosting target: India.** This is an approved target, not proof of current region. Read-only Render inspection on 3 Nov 2026 verified the current backend web service region as Singapore. The frontend is a Render static site delivered via CDN and has no single region shown in its service details. Oracle database, replicas, backups, logs, vendor/support access and DR locations remain unverified. This is acceptable for the development/staging environment; no staging migration to India is required. Production remains India-only and requires a provider/architecture decision and resource-level verification before launch. Do not claim India residency from a high-level account setting or provider marketing page.

## Architecture decision

The approved target remains five frontend portals and one Spring Boot JVM containing five enforced backend domain modules: Identity, Marketplace, Orders, Delivery and Daily Help. This is a modular monolith, not five independently deployed microservices. Communications is a shared integration capability.

## Documentation deliverable standard\n\nEvery material code/UI/API/schema/architecture change must update canonical Markdown in the same PR. UI docs must map screen -> route -> component -> exact labels/fields/interactions/states; backend docs must map endpoint -> DTO -> auth/ownership -> service -> repository/table -> transaction -> integration. Keep frontend, backend modular-monolith, API, data/ERD, integration, deployment, security and operations diagrams source-backed. Clearly distinguish implemented, test-verified, runtime-verified, planned and unknown facts. Word/PDF/PPT are generated on demand from current source and canonical docs with commit/date/evidence; see [Codebase Documentation Standard](CODEBASE-DOCUMENTATION-STANDARD.md).\n\n## Phase 0 source audit — partial, not complete

Baseline main SHA: `840842662c03ae026c9ddd996b62b074784359a0`.

### New method-level backend discovery

The source audit inspected all 20 controller files present in the tree. Endpoint families and representative methods are documented in [Backend Service and Dependency Map](SERVICE-DEPENDENCY-MAP.md). The inventory includes auth, buyer, seller, delivery, Daily Help, admin, tracking, negotiation, seller documents, seller onboarding leads/drafts, OTP settings, seller service areas, diagnostics, E2E, search analytics and health.

SecurityConfig source observations:
- `/admin/**` is matched to ADMIN role.
- Selected public paths and final catch-all are `permitAll()`; SessionAuthenticationFilter is inserted in the chain.
- No `@EnableMethodSecurity` was found in the inspected config and no controller `@PreAuthorize` was observed in the inspected files.
- This is not proof of an exploitable authorization defect; endpoint-level filter/service/record-owner behavior must be tested.

High-priority authorization and abuse test candidates:
- Daily Help professional-by-phone and latest-booking-by-phone reads.
- Seller service-area PUT, seller registration OTP admin settings/history.
- Admin onboarding-lead notes/updates, seller document download/scan/verification.
- Delivery location updates and tracking reads.
- Search analytics caller-supplied userId.
- E2E cleanup destructive endpoint and staging-only guard.
- All sensitive APIs against anonymous, expired/revoked session, wrong role, wrong record owner and spoofed active role.

Service coupling/transaction observations:
- OrderService uses Order, Seller and Product repositories plus JdbcTemplate; several transactional methods.
- SellerService uses Seller, Product, Order and BillDiscount repositories; cross-domain Orders coupling.
- DeliveryService uses DeliveryAgent and Order repositories plus JdbcTemplate; in-memory OTP resend cooldown map is resettable/process-local.
- AuthService uses User, UserSession, Seller, DeliveryAgent and DailyHelpProfessional repositories; cross-domain role-profile persistence.
- DailyHelpService uses service/professional/booking/slot repositories; one transaction uses `noRollbackFor=ApiException.class`, requiring failure-semantics review.
- AdminController spans multiple domain repositories and JdbcTemplate.

These are source observations and risk candidates, not proof of runtime exploitability. Full call graph, transaction propagation, all repository reads/writes and negative tests remain incomplete.

### Remaining closure work

1. Enumerate every controller method, HTTP route, authentication requirement, role, record-owner check and negative authorization case; include WebSocket and other non-MVC handlers.
2. Trace each service method to repository/entity/table reads and writes; identify cross-domain persistence access.
3. Inventory all `@Transactional` boundaries, propagation, isolation, nested calls, rollback rules and multi-domain transaction participants.
4. Inventory every JdbcTemplate, EntityManager, native SQL and direct DB access path.
5. Enumerate all Flyway migrations and DDL; map each object to its owning domain. Verify applied versions/FKs/triggers only with authorized read-only database access.
6. Inventory scheduled jobs, async executors, event listeners, WebSocket handlers, caches and process-local state.
7. Inventory all external integrations, secrets/config keys, timeouts, retries, idempotency, webhook validation and failure behavior without exposing credentials.
8. Trace complete workflows (happy path, authorization, invalid input, retry, timeout, duplicate and partial failure): registration/OTP/login; seller lead/onboarding/docs/approval; catalogue/inventory; bargain/cart/checkout; multi-seller order/payment/refund; dispatch/delivery OTP/tracking; Daily Help discovery/booking/start OTP/completion; admin approvals/audit.
9. Complete frontend route/portal import graph, AppContext state/action/effect consumer map, API facade, auth bootstrap/storage, route refresh/deep-link and hosting fallback tests.
10. Build data inventory and flow map: purposes, notices, lawful basis/consent, processors/subprocessors, actual regions, cross-border/support access, retention/deletion, backups, access audit and incident response.
11. Validate legal applicability with qualified Indian professionals for the actual entity, contracts, payment/fund flow, worker model, geography and operational activity.
12. Update source evidence and tests continuously; unknowns remain explicit.

### Phase 0 exit criteria

Phase 0 closes only when every endpoint, table/entity writer, scheduled/async task, integration and critical workflow has an identified owner, dependencies, authz/record ownership, transaction boundary, failure behavior and appropriate test evidence; every migration has an owner and safe rollout plan; data/vendor regions and lifecycle are documented; legal applicability is professionally reviewed; and every Critical/High risk has verified containment, accountable owner and remediation evidence.

Until then, no broad code movement or persistence refactor. Next implementation should be separate, small FE-1 and BE-1 PRs after exit.

## Known release/security blockers and unknowns

- PR #84 wallet/secret handling must not be merged/deployed until secure replacement credentials/configuration are in place and verified. Treat tracked wallet/credentials as potentially exposed; rotate securely. No secrets or wallet contents in source/logs.
- Current Render backend region was verified as Singapore on 3 Nov 2026; frontend is a CDN-served static site without a single region in service details. Oracle DB/replicas/backups and other vendor/data flows remain unknown. India is the production target, not current backend state; provider migration/India-region selection is a pre-production decision.
- Oracle live schema, applied migration versions, FKs/triggers and restore test are not verified here.
- Full endpoint authz/record-owner coverage is incomplete.
- Actual entity incorporation, seller/customer/provider contracts, grievance appointment, GST/FSSAI/payment-provider classification, Punjab/local licences and worker scheme applicability require evidence and professional review.
- Do not run transactional E2E against real/shared data. Use verified isolated synthetic data and safe cleanup.
- No production hosting, credentials, database, payment or deployment changes are included in this governance work.

## Historical implementation notes

Earlier notes and linked domain maps describe observed source state and past CI/deployment runs. Revalidate exact main SHA and current provider status before treating any dated statement as current. CI passing does not prove migration application, live deployment or end-to-end transaction correctness.

## Current consolidated Phase 1 batch — 6 November 2026

A single consolidated branch, phase1/consolidated-security-regression-batch, is being used for the next related P1-A/P1-B/P1-D regression work. It carries the admin seller-lead security-filter test work from PR #265 and adds:
- Daily Help missing/malformed principal coverage across protected controller operations.
- Delivery malformed-principal coverage across every protected delivery operation.
- Delivery tracking HTTP security-filter coverage for anonymous denial and verified bearer-session forwarding.
- Seller-registration OTP settings privacy and ADMIN-only HTTP route coverage, including authenticated audit actor verification.

Existing Daily Help profile ownership, DeliveryService ownership/OTP and SearchAnalytics user-attribution tests were inspected and are retained rather than duplicated. Exact-head CI has not yet verified the new batch. Do not infer runtime database readiness, browser authenticated-flow completion or Oracle transaction correctness from these tests.

### PR #266 first verification cycle

At code head 14dd0167c61aefa5e307b65d7dcfdfe259292264, Seller registration quality gates run 42218558945 passed: full backend Maven **248 tests, zero failures/errors/skips; BUILD SUCCESS**, and frontend TypeScript/production build passed. Focused counts: Daily Help 10, Delivery 5, Delivery Tracking security 3, OTP settings security 3, Admin seller leads security 4. An initial OTP history mock compile error was corrected before this successful run.

Standard KuraliUpdates CI and E2E run 42218558947 is still pending with no jobs reported. This is not a pass. The documentation update requires a new exact-head workflow run before merge.


## Staging cleanup verification finding — 6 November 2026

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


## 7 November 2026 — Render cold-start diagnosis and role preflight passed

- Confirmed Render workspace `My Workspace` and inspected backend service `kuraliupdates-bazaar` logs. The 6 November 04:43 UTC preflight coincided with a cold start: Spring Boot took 113.099 seconds to start; the Oracle pool connected successfully and Flyway validated all 35 migrations (schema version 34). This explains why the first Buyer token request exceeded its 60-second client timeout. The cleanup request arrived after startup and removed one run-tagged session even though the client had received no token response.
- Corrected the workflow in commit `2c5a922cf88ff28a14a07dad9be59e156202e809`: it now polls `/health/live` for up to six minutes before requesting role sessions. Cleanup count validation now accepts only the safe interval from successfully returned tokens through attempted requests, accounting for a server-side session whose HTTP response was lost. Cleanup remains scoped to the unique run ID only.
- Push-triggered preflight run `42340528387` passed. Logs confirm liveness was UP on the first probe; Buyer, Seller, Delivery, Provider and Admin sessions all passed; cleanup removed exactly 5 sessions from 5 attempted requests and 5 returned tokens. No orders, bookings, inventory changes, OTPs, customer records, or synthetic fixture mutations were performed. Transactional fixture/profile checks were intentionally skipped because this was a push/PR event, not trusted `workflow_dispatch`.
- The PR-triggered preflight and standard CI for this exact head must also complete successfully before merge. Phase 1 remains IN PROGRESS; transactional lifecycle and OTP-driven tests remain outstanding.

## 7 November 2026 — Phase 1 transactional staging evidence

- PR #285 and PR #286 corrected the Oracle cleanup session initialization, Oracle timestamp precision, checkout fixture phone normalization and deployment-readiness stabilization.
- PR #287 added indexed exact product-ID lookup and corrected the delivery E2E to include the seller-pickup confirmation transition before customer delivery OTP.
- PR #288 pinned staging readiness to the actual deployed backend commit; the workflow requires 12 consecutive healthy API/database checks for the expected backend SHA.
- PR #289 enabled the read-only admin approval-queue authorization test on main-branch push events. It is merged as `972f187443cb8bf00ea31428e5f317b62f8ee552`.
- Follow-up workflow commit `bdf53de60e2ca59b92e35cde472f9b4864ad2bbc` resolves the expected backend SHA from Render, so frontend/workflow-only commits do not falsely require the backend to deploy an identical commit.
- Transactional staging run [42365076271](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/42365076271) passed against the verified live backend commit `b491795f9b7a7b0d91d21a3835cc6287e190573f`: readiness passed for two continuous minutes; all **5 tests passed, 0 failed, 0 skipped**.
- Verified scenarios: buyer bargaining/order checkout through seller fulfilment, concurrent rider claim and delivery OTP/replay; Daily Help competing booking for one slot, start OTP/replay and completion; multi-seller rollback; concurrent last-stock checkout/no oversell; admin approval queue access for ADMIN and denial for BUYER/SELLER.
- Artifact: [phase1-staging-transactional-e2e](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/42365076271/artifacts/13571925468). Cleanup is part of the Playwright lifecycle hooks; the workflow and report completed successfully.
- This verifies the exercised staging scenarios only. It does not close the exhaustive endpoint/IDOR matrix, two-distinct-agent checkout-group race, separate Oracle schema isolation, backup/restore, India production residency, secret rotation or qualified professional sign-off.

**Phase 1 disposition remains IN PROGRESS.** Continue with the remaining P1-A authorization/PII matrix and P1-C gaps; do not infer Phase 0 or production release closure from this run.


## 7 November 2026 — staging E2E readiness latency optimization

- Inspected exact job logs for main staging run `42365076271`: readiness consumed about 1m55s from 12 consecutive healthy database/API probes at 10-second intervals; the five transactional Playwright tests consumed 2m48s, including a 1m36s buyer/seller/delivery lifecycle.
- The staging workflow is being updated to retain exact deployed-backend SHA matching, HTTP success, API `UP`, and database `UP`, while reducing the stability gate to three consecutive probes at five-second intervals. The outer eight-minute deadline remains for Render cold starts. The intended steady-state gate is approximately 10–15 seconds after the first successful probe.
- The five mutating E2E tests remain serial; parallel execution is intentionally avoided because the tests share staging identities and buyer/seller account history and have run-scoped cleanup.
- No backend, schema, secrets, or staging data are changed by this workflow optimization. The reduced gate must pass exact-head CI and a fresh main staging execution before its timing improvement is considered verified.


## 7 November 2026 — seller onboarding contact verification hardening in progress

Source audit found that `contactRequirementSatisfied` treated both OTP-skipped flags as equivalent to verified identity. The follow-up security slice requires at least one real verified contact channel before callback requests or application submission, prevents the admin OTP configuration from disabling both channels, and fails new lead creation closed if neither channel is enabled. Regression coverage is being added; no staging or production data is changed by these source/test changes.
