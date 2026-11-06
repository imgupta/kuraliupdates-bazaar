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
