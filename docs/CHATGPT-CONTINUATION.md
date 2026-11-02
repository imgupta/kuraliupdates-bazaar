# Engineering handoff — KuraliUpdates

Keep this file concise and current. Durable architecture, risks and detailed discovery live in linked documents.

## Mandatory engineering standard

Before every coding, refactoring, review, test or release task, read [ENGINEERING-OPERATING-STANDARD.md](ENGINEERING-OPERATING-STANDARD.md) and the relevant current-state/domain docs. Apply the multidisciplinary rigor expected of a 30+ year experienced frontend engineer, architect, designer, analyst, security consultant and management consultant. This is a quality/operating standard, not a literal employment-history claim.

## Repository and runtime

- Repository: https://github.com/imgupta/kuraliupdates-bazaar
- Main branch: main
- Website: https://kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1
- Backend: Render Docker service rooted at backend-java-spring/
- Frontend: historical deployment notes mention six Vercel projects; do not assume current provider topology without live verification.
- Environment: one owner-designated shared staging environment. Do not run transactional tests against real/shared business records.

## Locked architecture decision

- Frontend: five independently buildable portals — Buyer, Seller, Delivery, Daily Help Provider, Admin — in one monorepo. Low-cost target is one combined static deployment, subject to route/base/fallback verification.
- Backend: one Spring Boot JVM, one Docker runtime and five enforced domain modules: Identity, Marketplace, Orders, Delivery, Daily Help.
- This is a modular monolith, not five deployed microservices. No five-JVM or five-service deployment unless the owner explicitly changes the decision after cost/resource measurement.
- Communications (email/SMS/Zender/notifications) is a shared adapter capability, not a sixth core domain.
- Keep Oracle initially with strict logical data ownership. No cross-domain repository/table writes.

## Discovery documents

- [Current implementation status](CURRENT-STATE.md)
- [Low-cost implementation plan](LOW-COST-MICROFRONTEND-MICROSERVICES-IMPLEMENTATION-PLAN.md)
- [Domain boundaries](DOMAIN-BOUNDARIES.md)
- [Frontend portal/route inventory](FRONTEND-PORTAL-ROUTE-INVENTORY.md)
- [Backend service dependency map](SERVICE-DEPENDENCY-MAP.md)
- [Data ownership and transaction matrix](DATA-OWNERSHIP-MATRIX.md)
- [Engineering operating standard](ENGINEERING-OPERATING-STANDARD.md)

Phase 0 is not complete: the route registry, frontend import graph, endpoint/controller map, table/entity readers/writers, Flyway ownership, transaction boundaries, scheduled jobs, WebSocket handlers and complete workflow traces still require exact source inspection. Do not move code or persistence until those inventories are complete.

## Latest known application changes (historical notes; recheck exact main)

- PR #219 was documented as adding registration OTP policy audit history and Flyway V29; CI results do not prove the migration is applied to the target Oracle schema.
- PR #218 added independent buyer/seller email/mobile registration OTP controls, default OFF/OFF, and Flyway V28.
- PR #205 added seller compliance onboarding and private Oracle BLOB document handling, with Flyway V14 source migration; runtime application and BLOB round-trip require independent verification.
- Recheck current main SHA, open PRs, CI and Render deployment before making release claims.

## Confirmed business decisions

- Parent company plan: Kura Ventures Private Limited; incorporation/registrations require professional review and filing.
- Grocery: customer pays seller directly; platform earns commission/platform fee.
- Grocery refunds: seller directly refunds customer; platform records/co-ordinates case. No minimum seller refund reserve selected.
- Daily Help: independent provider marketplace; verify current payment implementation before describing settlement as active.
- Delivery agents use their own two-wheelers.
- Maps: OpenStreetMap fallback; Google Routes features require backend key/configuration.

## Next actions

1. Finish Phase 0 inventories in the linked documents from the exact current main tree.
2. Reconcile open PRs that may alter the source baseline, especially architecture/security documentation.
3. Complete five-role route/auth/session and frontend import dependency maps.
4. Complete backend endpoint/service/repository/entity/table/transaction and workflow maps.
5. Only then begin FE-1 and BE-1 as separate, small PRs with architecture tests and regression evidence.

## Safety and evidence

Never commit/log secrets, OTPs, tokens, Oracle wallet material or private seller documents. Do not enable mutating E2E until the database target, synthetic identities/data and cleanup are verified. Do not routinely run destructive reset migrations. Claim completion only when source, tests, CI and runtime evidence agree.


## Latest architecture discovery checkpoint

- PR #222 merged to main as `560a34a4a94241e007a396a2ad4cbc8e2e67e428`.
- The next source audit baseline contains 147 Java files and 96 frontend src files.
- Exact browser route registry is in `src/app/routing/routeConfig.ts`: /, /register/buyer, /register/seller, /register/delivery, /register/daily-help, /account, /buyer, /seller, /delivery, /daily-help and /admin.
- Key backend boundary leaks found: OrderService -> SellerRepository/ProductRepository; SellerService -> OrderRepository; DeliveryService -> OrderRepository; AuthService -> Seller/DeliveryAgent/DailyHelpProfessional repositories.
- The tree contains a tracked Oracle wallet ZIP and Dockerfile copies Wallet*.zip into the image. Review PR #84 before any wallet/Docker changes. Do not expose wallet material.
- See DOMAIN-BOUNDARIES.md, FRONTEND-PORTAL-ROUTE-INVENTORY.md, SERVICE-DEPENDENCY-MAP.md and DATA-OWNERSHIP-MATRIX.md for source findings and remaining gaps.
- Phase 0 remains in progress. Do not start broad code movement until method-level data access, transaction, migration and workflow inventories are complete.


## Mandatory India compliance and product governance context

All KuraliUpdates work must follow [India Compliance, Data Governance and Product Excellence](INDIA-COMPLIANCE-DATA-GOVERNANCE-AND-PRODUCT-EXCELLENCE.md), in addition to AGENTS.md and the Engineering Operating Standard. Every material ask must assess applicable Indian central/state/local rules, data collection/storage/processing/retention/deletion/access, security/privacy, consumer/seller/provider rights, tax/payment and operational duties, current vs future/proposed legal status, loopholes and fixes, plus meaningful seller-first product improvements. Use official primary sources and record effective dates for current legal claims. Escalate legal interpretation to qualified Indian counsel; never promise zero loopholes or claim sign-off without evidence. This is mandatory context for each response and engineering decision, scaled proportionately to the ask.
