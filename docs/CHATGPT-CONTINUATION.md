# Engineering handoff — KuraliUpdates

Keep this file concise and current. Durable architecture, risks and detailed discovery live in linked documents.

## Mandatory operating standard

Before every coding, refactoring, review, test or release task, read [ENGINEERING-OPERATING-STANDARD.md](ENGINEERING-OPERATING-STANDARD.md), [INDIA-PR-GOVERNANCE.md](INDIA-PR-GOVERNANCE.md), [CURRENT-STATE.md](CURRENT-STATE.md), [AGENTS.md](../AGENTS.md) and relevant domain docs. Every PR must use the mandatory India/data/security/product-quality template. Production hosting target is India; current region claims require resource-by-resource evidence.

## Repository and runtime

- Repository: https://github.com/imgupta/kuraliupdates-bazaar
- Main branch: main
- Website: https://kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1
- Backend: Render Docker service rooted at backend-java-spring/
- Frontend: Render/Vercel topology must be verified from provider configuration before relying on historical notes.
- Environment: owner-designated shared staging; no transactional tests against real/shared business records.

## Latest execution checkpoint

- Main after PR #264: `4dc3a9219c6f55a869d468c0d33b79ec19f7bced`.
- PR #264 merged after exact-head CI: 235 backend tests, zero failures/errors/skips; `SellerDocumentControllerTest` 14 passed; frontend checks/build and seller-registration quality gates passed; read-only smoke 7/0 with `databaseHealthChecked=false`; browser E2E 3 passed / 9 skipped.
- Phase 0 formal register: `PHASE-0-FORMAL-EVIDENCE-REGISTER.md`; milestone merged, formal closure remains open pending Oracle/backup/restore, hosting residency, secret rotation and qualified professional sign-offs.
- Phase 1 remains in progress. Next PR #265 adds real MockMvc/filter-chain coverage for admin seller-lead list, notes and write routes.

## Locked architecture decision

- Frontend: five independently buildable portals — Buyer, Seller, Delivery, Daily Help Provider, Admin — in one monorepo. Low-cost target is one combined static deployment, subject to route/base/fallback verification.
- Backend: one Spring Boot JVM, one Docker runtime and five enforced domain modules: Identity, Marketplace, Orders, Delivery, Daily Help.
- This is a modular monolith, not five deployed microservices. No five-JVM or five-service deployment unless the owner explicitly changes the decision after cost/resource measurement.
- Communications (email/SMS/Zender/notifications) is a shared adapter capability, not a sixth core domain.
- Keep Oracle initially with strict logical data ownership. No cross-domain repository/table writes.

## Production hosting and data residency

Production target is India for application compute, primary database and production data storage. Read-only Render inspection verified the development backend in Singapore; the static frontend is CDN-served with no single region exposed. Oracle DB, backups and other vendor regions remain unknown. This is acceptable for development/staging; do not migrate the dev environment solely for India residency. Production must use verified India locations and separately assessed vendor/CDN flows. Before production approval, inventory actual regions for app, DB/replicas, documents/object storage, backups, logs, CDN/cache, analytics, email/SMS, support access and disaster recovery; assess subprocessors and transfers. No real customer/seller/worker data in non-approved staging. See INDIA-PR-GOVERNANCE.md.

## Documentation deliverables\n\nEvery code-changing PR updates source-backed canonical Markdown for affected UI, routes, APIs, services, data, integrations, security, architecture and operations. UI specs include exact labels/fields/layout/interactions/responsive states; API specs include contracts/authz/data/transaction/error flows. Word/PDF/PPT packs are generated on demand from the current commit and canonical docs, with source/evidence references. See [Codebase Documentation Standard](CODEBASE-DOCUMENTATION-STANDARD.md).\n\n## Discovery documents

- [Current implementation status](CURRENT-STATE.md)
- [Low-cost implementation plan](LOW-COST-MICROFRONTEND-MICROSERVICES-IMPLEMENTATION-PLAN.md)
- [Domain boundaries](DOMAIN-BOUNDARIES.md)
- [Frontend portal/route inventory](FRONTEND-PORTAL-ROUTE-INVENTORY.md)
- [Backend service dependency map](SERVICE-DEPENDENCY-MAP.md)
- [Data ownership and transaction matrix](DATA-OWNERSHIP-MATRIX.md)
- [Engineering operating standard](ENGINEERING-OPERATING-STANDARD.md)
- [Mandatory India PR governance](INDIA-PR-GOVERNANCE.md)\n- [Codebase documentation standard](CODEBASE-DOCUMENTATION-STANDARD.md)
- [India legal/regulatory/security register](INDIA-LEGAL-REGULATORY-AND-SECURITY-REGISTER.md)

## Phase 0 status

Phase 0 is **not complete**. PR #231 is a merged security-hardening milestone, not a Phase 0 closure: its own scope explicitly left complete method-level IDOR coverage, authenticated transactional E2E, backup/restore, India-only production residency, secret rotation and legal/compliance review open. Its merge must not be interpreted as satisfying the Phase 0 exit criteria. Partial source findings are in the domain, frontend, dependency and data ownership documents. Remaining inventories include full controller-method/authz/record-owner mapping; service/repository/entity/table read/write call graph; all transaction boundaries and direct SQL; complete Flyway DDL and live schema verification; scheduled jobs, async, event and WebSocket handlers; integration timeouts/retries/secrets; complete critical workflow traces; frontend context consumer/import/auth-storage map; provider regions/subprocessors/data lifecycle; and qualified review of legal applicability.

Do not begin broad code movement until every endpoint, table writer, task, integration and critical workflow has an owner, dependencies, transaction boundary and appropriate test evidence. Unknowns must remain explicit. Critical/High risks require containment and accountable owners.

## Known critical safety gate

Open PR #84 concerns Oracle wallet/secret handling and explicitly prohibits merge/deploy until replacement secret files and required environment variables are securely configured and validated. Treat tracked wallet/credentials as potentially exposed and rotate via an approved secure process. Do not inspect, print or commit secret material. Do not change Render workspace settings or production secrets without explicit owner approval.

## Next actions

1. Reconcile actual open PR/base status and exact main SHA; do not infer merge from populated merge_commit_sha fields.
2. Continue Phase 0 source inventories and update the evidence documents.
3. Verify provider regions using approved provider configuration access; current regions remain unknown until inspected.
4. Complete endpoint authorization and record-owner tests, data flow and workflow traces.
5. Only after Phase 0 exit, create separate small FE-1 and BE-1 PRs with architecture tests and regression evidence.

## Safety and evidence

Never commit/log secrets, OTPs, tokens, Oracle wallet material or private seller documents. Do not enable mutating E2E until the database target, synthetic identities/data and cleanup are verified. Do not routinely run destructive reset migrations. Claim completion only when source, tests, CI and runtime evidence agree.

## Current consolidated PR continuation

- PR #265's standard CI workflow is still pending with no jobs reported by GitHub; its seller-registration quality gate passed (239 backend tests, zero failures/errors/skips; frontend checks/build passed). It is not merged.
- The consolidated branch phase1/consolidated-security-regression-batch is based on PR #265's exact head so its admin seller-lead filter-chain tests are included with the next grouped regression batch.
- The consolidated changes add Daily Help and Delivery malformed-principal rejection, Delivery Tracking HTTP session/filter-chain tests, and public/admin seller-registration OTP settings privacy/role tests.
- Do not merge until the consolidated PR's exact-head standard CI and required quality gates complete successfully. The earlier PR #265 pending run must not be represented as a pass.
- Continue only after inspecting test logs and failures. Keep authenticated browser E2E skips explicit; do not run destructive E2E or Oracle concurrency against shared staging.
- Oracle concurrency/rollback, backup/restore, production India-region verification, secret rotation and professional legal/compliance sign-off remain separate Phase 0/P1 evidence gates.

### PR #266 verification update

- At code head 14dd0167c61aefa5e307b65d7dcfdfe259292264, seller-registration quality gates run 42218558945 passed: backend Maven 248 tests, zero failures/errors/skips; frontend TypeScript and production build passed.
- Focused tests passed: Daily Help 10, Delivery 5, Delivery Tracking HTTP security 3, OTP settings HTTP security 3, Admin seller-lead HTTP security 4.
- The first attempt exposed a compile error in the OTP settings history mock. It was corrected to return the declared List type; the 248-test pass is from the corrected head.
- Standard CI/E2E run 42218558947 remains pending with no jobs returned. Do not merge or report the PR fully verified until a new exact-head standard workflow completes after this documentation update.


## Immediate continuation — cleanup SQL correction

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


## Latest checkpoint — 7 November 2026: cold-start blocker fixed

- Render workspace access is confirmed and backend service logs were inspected. The prior Buyer timeout was caused by Render cold-start timing: Spring Boot took 113.099 seconds to start; Oracle connected successfully and Flyway validated 35 migrations (schema version 34). The preflight sent its Buyer request before the API was live; a delayed cleanup later removed one run-tagged session created despite the client timeout.
- Workflow commit `2c5a922cf88ff28a14a07dad9be59e156202e809` now waits for `/health/live` (up to six minutes) before any role-token requests and validates cleanup count within the safe bounds of successful responses and attempted requests. Cleanup still deletes only records tagged with that unique run ID.
- Push preflight run `42340528387` passed: all five roles authenticated; 5 of 5 sessions were removed; no orders, bookings, inventory, OTPs, customer records, or fixture mutations occurred. Transactional fixture/profile checks were intentionally skipped for push/PR events.
- Do not close Phase 1. Await PR-triggered preflight and standard CI on this exact head. After merge, proceed to trusted synthetic transactional tests, V32/V33 runtime verification, checkout concurrency/rollback, OTP lifecycle and authorization/privacy gates. OTP-driven browser tests remain skipped until staging email suppression/capture is confirmed.

## Latest execution checkpoint — 7 November 2026

- Current `main`: `bdf53de60e2ca59b92e35cde472f9b4864ad2bbc`.
- PR #289 merged at `972f187443cb8bf00ea31428e5f317b62f8ee552`; its main-push guard now enables admin approval-queue authorization coverage.
- Transactional staging run [42365076271](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/42365076271) passed **5/5, zero skipped** after the workflow resolved the actual deployed backend SHA. The backend remained live on `b491795f9b7a7b0d91d21a3835cc6287e190573f`; the readiness check matched that exact commit and required two continuous minutes of API/database health.
- Coverage includes buyer bargaining/checkout, seller fulfilment, concurrent delivery claim and delivery OTP, Daily Help competing slot booking/start OTP/completion, multi-seller rollback, concurrent last-stock checkout, and admin approval-queue authorization.
- PRs #285–#289 corrected the defects discovered by the earlier staging runs. The earlier failures remain historical failures and are not counted as passes.
- Phase 1 remains open: complete endpoint-method-owner/IDOR review, PII/privacy and public abuse-control review, two-distinct-agent combined-checkout claim race, isolated Oracle-specific concurrency/rollback proof where required, and remaining recovery/operational evidence.
- Phase 0 and production gates remain open for live schema/migration verification, backup/restore, secret rotation, India production hosting/data-flow verification and qualified Indian legal/tax/labour/payment review.

**Next:** continue the source-backed P1-A/P1-D gap audit and take the next bounded authorization slice. Do not start broad architecture refactoring.


## 11 November 2026 — master Phase 1 execution checkpoint

- Baseline: local `main` and `origin/main` were both `352286ae66438d1bd6063673945e724cbaed28f7`; working tree was clean before work. Implementation/evidence changes are on `phase1/local-readiness-and-evidence`.
- Local runner and evidence update was committed as `3f1bc83601a00f30ae83307bbc4d87279b72fa66` and pushed in open PR #321; report traceability followed in `4abbda14c95a32bb7d45fd220b6a0a8ecba213bc`, and the local/staging Playwright boundary fix is `1073969e93dd648cc2a482eb653a88cbab10fe2c`. Initial CI run `43071248030` failed because default staging Playwright discovery included local mock specs. Exact-head CI run `43072296209` passed after isolation: backend/frontend jobs passed, read-only staging smoke 7/7 (`databaseHealthChecked=false`), public browser E2E 3 passed / 7 skipped; transactional flows were guarded off. The full local runner also passed again. Independent review remains required.
- Full requirement/evidence inventory: `docs/PHASE-1-REQUIREMENT-MATRIX.md`; detailed disposition and test evidence: `docs/PHASE-1-COMPLETION-REPORT.md`. Phase 1 remains IN PROGRESS.
- Local tests passed on current main: backend Maven 342/342; frontend TS tests 40/40 across nine files; `.mjs` tests 25/25 with loopback access; TypeScript, shared Vite build, all five portal builds; focused security tests 80/80; Spring Boot package build; local mock-browser suite 2/2. The complete `--all` runner passed all 13 command groups.
- New `scripts/test-local.sh` has the requested backend/frontend/e2e/security/all/report options. The local browser config uses synthetic 401 API responses and blocks non-local requests; staging transactional E2E is not part of `--all`.
- Open evidence gates: exhaustive route × role × owner matrix; complete authenticated five-role journeys; current-head staging verification; isolated Oracle migration, concurrency, constraint and rollback evidence; seller document retention/audit and onboarding E2E (issues #209/#210); Critical wallet/credential work in draft PR #317; Phase 0 residency, recovery and professional review.
- No issue/PR was closed, no shared database or secret was accessed, no staging/production traffic was used, no deployment occurred. Do not declare Phase 1 closed or start Phase 2 until owner sign-off and the evidence gates are resolved.
- Prepared Phase 2 handoff: `docs/PHASE-2-READINESS.md`; it explicitly recommends no implementation until formal Phase 1 closure.

### Seller draft ownership regression follow-up — 11 November 2026

- Added `SellerRegistrationDraftControllerSecurityTest` for anonymous denial and account scoping on draft GET/PUT/DELETE. Session-resolved user IDs are passed to the service; a caller-supplied query ID does not select another draft.
- Verification: draft controller and service tests 6/6; focused security suite 83 passed, 0 failed/errors/skipped; full backend suite 345 passed, 0 failed/errors/skipped; package verification passed. Java 25 requires the repository's `-Dnet.bytebuddy.experimental=true` test argLine. One sandboxed Maven invocation failed to open the shared `~/.m2` artifact lock; rerunning the repository script with approved access passed.
- These tests provide one narrow seller-draft ownership proof. Other seller routes and the rest of Phase 1 remain open. No database, staging, production, secrets, or deployment were touched.
- Exact PR-head CI on `8a1e21df5211ff027c8e8fd19eeb8aec8db41a2f` passed: run `43074724582` (backend 345/345, frontend passed, read-only smoke 7/7 with `databaseHealthChecked=false`, browser 3 passed / 7 safety-gated skips) and seller-registration quality gates `43074724713` passed. No transactional fixtures ran. The follow-up documentation commit must receive its own exact-head CI before the PR is review-ready.
- Local mocked Playwright now has five passing tests, including a rejected-OTP signed-out check, synthetic OTP sign-in, refresh restoration, authenticated SELLER handoff request, code-in-fragment redemption on localhost and a synthetic empty seller dashboard. Latest full `./scripts/test-local.sh --all` report: `test-reports/local/run-20261111T182432Z-96335/summary.tsv`; all 13 command groups passed, including 345 backend tests, 83 focused security tests and 5 browser tests, with zero failures/skips. No external navigation request reaches the network; the seller destination is route-fulfilled with synthetic HTML. Buyer order, delivery, Daily Help, admin and mutation flows remain untested in the local browser suite.
- Exact CI for the prior code head `9e49fd3df70a8bea3ce7f90a531d1e241446dc51` passed in runs `43076636454` and `43076636686`; browser CI reported 3 passes and 7 safety-gated skips. Exact-head CI for `35a9a59d931e9e7d5ab9dd51c5646f9e48d01a87` passed in run `43078100246`: Spring Boot verification, frontend checks, browser/read-only smoke and frontend lint/build succeeded; private report publication was skipped by workflow policy. The browser CI job remains read-only; no transactional fixture ran.
