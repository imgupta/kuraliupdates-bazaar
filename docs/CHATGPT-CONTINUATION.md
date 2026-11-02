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

## Locked architecture decision

- Frontend: five independently buildable portals — Buyer, Seller, Delivery, Daily Help Provider, Admin — in one monorepo. Low-cost target is one combined static deployment, subject to route/base/fallback verification.
- Backend: one Spring Boot JVM, one Docker runtime and five enforced domain modules: Identity, Marketplace, Orders, Delivery, Daily Help.
- This is a modular monolith, not five deployed microservices. No five-JVM or five-service deployment unless the owner explicitly changes the decision after cost/resource measurement.
- Communications (email/SMS/Zender/notifications) is a shared adapter capability, not a sixth core domain.
- Keep Oracle initially with strict logical data ownership. No cross-domain repository/table writes.

## Production hosting and data residency

Production target is India for application compute, primary database and production data storage. This is a target, not verified current state. Before production approval, inventory actual regions for app, DB/replicas, documents/object storage, backups, logs, CDN/cache, analytics, email/SMS, support access and disaster recovery; assess subprocessors and transfers. No real customer/seller/worker data in non-approved staging. See INDIA-PR-GOVERNANCE.md.

## Discovery documents

- [Current implementation status](CURRENT-STATE.md)
- [Low-cost implementation plan](LOW-COST-MICROFRONTEND-MICROSERVICES-IMPLEMENTATION-PLAN.md)
- [Domain boundaries](DOMAIN-BOUNDARIES.md)
- [Frontend portal/route inventory](FRONTEND-PORTAL-ROUTE-INVENTORY.md)
- [Backend service dependency map](SERVICE-DEPENDENCY-MAP.md)
- [Data ownership and transaction matrix](DATA-OWNERSHIP-MATRIX.md)
- [Engineering operating standard](ENGINEERING-OPERATING-STANDARD.md)
- [Mandatory India PR governance](INDIA-PR-GOVERNANCE.md)
- [India legal/regulatory/security register](INDIA-LEGAL-REGULATORY-AND-SECURITY-REGISTER.md)

## Phase 0 status

Phase 0 is **not complete**. Partial source findings are in the domain, frontend, dependency and data ownership documents. Remaining inventories include full controller-method/authz/record-owner mapping; service/repository/entity/table read/write call graph; all transaction boundaries and direct SQL; complete Flyway DDL and live schema verification; scheduled jobs, async, event and WebSocket handlers; integration timeouts/retries/secrets; complete critical workflow traces; frontend context consumer/import/auth-storage map; provider regions/subprocessors/data lifecycle; and qualified review of legal applicability.

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
