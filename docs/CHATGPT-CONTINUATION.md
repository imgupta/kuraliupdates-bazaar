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

- Main after PR #267: `ac3fcc3fd34c25cecdfb8b9ef40694a4f9341af9` (6 November 2026).
- PRs #264, #266 and #267 are merged. PR #267 adds run-scoped synthetic staging fixtures, V32/V33 migrations, Oracle-backed API rate limits, abuse-input bounds and transactional lifecycle/concurrency E2E coverage.
- The GitHub Actions workflow-run lookup for merge commit `ac3fcc3fd34c25cecdfb8b9ef40694a4f9341af9` returned no PR workflow runs; combined commit statuses showed five successful Vercel app deployments and one Delivery Vercel build-rate-limit failure. Do not treat these deployment statuses as backend CI or transactional staging proof.
- Phase 0 formal closure remains open pending Oracle/backup/restore, production India residency, secret rotation and qualified professional sign-offs.
- Phase 1 remains IN PROGRESS. PR #268 is the open follow-up for run-tagged staging preflight session cleanup and PR-triggered verification.

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


## 6 November 2026 — latest Phase 1 continuation

- PR #267 is merged at main SHA `ac3fcc3fd34c25cecdfb8b9ef40694a4f9341af9`. Its source scope includes guarded synthetic fixtures/cleanup, concurrency and rollback E2E cases, V32/V33 migrations and public endpoint rate limits.
- No GitHub Actions workflow runs were returned for the merge SHA. The combined status only exposed Vercel deployments: Buyer, Seller, Admin, Daily Help and Bazaar succeeded; Delivery failed because of the Vercel build-rate limit. These are not backend CI or transactional E2E results.
- PR #268 remains open on `phase1/tag-and-clean-preflight-sessions`. Follow-up commit `83dda85d5d791df87b5b85f5abdd3e0fb293b87a` adds a scoped `pull_request` trigger to the staging role preflight workflow. PR-triggered runs issue only temporary role sessions, keep transactional fixture mode disabled, and remove sessions using the run ID in a `finally` cleanup. The commit currently has no reported workflow run/status; verification is pending.
- Next: obtain exact-head PR #268 preflight evidence; then verify the trusted transactional workflow, V32/V33 deployment and guarded cleanup on the designated staging environment. Continue the remaining IDOR/privacy/address/portal-handoff review and Oracle-specific rollback evidence. Phase 1 is not complete.
