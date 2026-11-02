# KuraliUpdates Domain Boundary Discovery

**Status:** Phase 0 baseline; partial source inspection, not a completed exhaustive audit.  
**Date:** 2026-11-03

## Evidence rules

This document separates verified current state, approved target and items still requiring source/runtime evidence. GitHub code-search returned no indexed matches in this discovery session and directory fetch is unsupported. Do not treat this partial inventory as proof every route, endpoint, entity or workflow was inspected.

## Verified current architecture

### Frontend
- React 19, TypeScript, Vite 8 and Bun are used by the root application.
- package.json defines individual build scripts for Buyer, Seller, Delivery, Daily Help Provider and Admin, plus build:portals.
- vite.config.ts selects a portal HTML entry with VITE_PORTAL and sets base to /. Its comments explain that this is for standalone host-root deployments; consolidated nested path hosting is not implemented by this setting.
- src/App.tsx imports all five role dashboards and composes them through one PortalAppShell. Five build targets therefore do not yet prove five isolated runtime applications.
- CURRENT-STATE.md records domain-oriented hooks and typed API facades, while AppContext remains a compatibility facade and shared API extraction is incomplete.

### Backend
- backend-java-spring/pom.xml is one Maven project, artifact kurali-bazaar-api, Spring Boot 3.3.4 and Java 17.
- Dependencies include Spring Web, Data JPA, Validation, Security, WebSocket, Flyway core/Oracle and Oracle JDBC/security libraries.
- backend-java-spring/Dockerfile builds one executable JAR and starts one JVM using java -jar app.jar.
- The inspected Dockerfile copies Wallet*.zip into the build context and extracts it into the runtime image. Treat this as a security review item; do not expose wallet contents. Reconcile against current main and open security PRs before implementation.
- The current topology is one Spring Boot application. Five domains are the approved modularization target, not five deployed microservices.

## Approved five-domain target

| Domain | Owns | Must not own |
|---|---|---|
| Identity | Account identity, credentials, registration, OTP policy/verification, roles, sessions/tokens and account linking | Catalogue, orders, delivery execution, Daily Help bookings |
| Marketplace | Seller profile/onboarding/compliance, products, categories, catalogue, inventory, pricing, seller availability and offer negotiation before acceptance | Credentials/session, order financial ledger, delivery lifecycle |
| Orders | Cart/checkout, order/suborder lifecycle, accepted-offer and item/price snapshots, payment/refund state and reconciliation | Product/inventory master, dispatch/tracking, Daily Help job lifecycle |
| Delivery | Agent operational profile after identity, approval/availability, dispatch, assignment, route/tracking, delivery OTP and delivery lifecycle | Order master/financial state; report outcomes through Orders contracts |
| Daily Help | Provider service catalogue/availability, areas/slots, booking, acceptance, start/completion OTP, job lifecycle and provider earnings | Identity credentials, grocery order lifecycle |

Communications (email, SMS, Zender, notification delivery) is a shared technical integration capability, not a sixth business domain. Admin is a frontend and authorization role; its operations belong to the domain that owns the business action.

## Boundary decisions requiring explicit contracts

1. Buyer-facing Daily Help discovery/booking belongs to Buyer experience; provider operations belongs to Daily Help portal.
2. Bargaining conversation/offer negotiation can be Marketplace-owned; accepted offer snapshot and checkout/order price are Orders-owned. Checkout revalidates offer identity, expiry, seller, item and price server-side.
3. Seller onboarding CRM must distinguish pre-registration lead/callback/assignment, Identity account creation and Marketplace seller profile/compliance.
4. Delivery owns fulfillment execution; Orders owns order state. Completion must be sent as an idempotent command/event to Orders.
5. Orders owns grocery refund case/state and reconciliation. Confirmed business rule remains seller directly refunds customer; do not introduce platform-held seller funds or payment aggregation.
6. Daily Help payment/settlement implementation must be inspected before assigning ledger ownership.
7. Shared code is limited to technical primitives; shared repositories/entities must not bypass domain ownership.

## Target dependency direction

- Portals -> shared frontend UI/contracts/auth transport -> backend public API.
- Controllers -> owning domain application interfaces.
- Domain application logic -> its own model and persistence ports.
- Cross-domain collaboration -> explicit application contracts/events, never another domain's repository/entity.
- Infrastructure adapters -> Oracle, communications, maps and payment providers.

## Open discovery inventory

Before FE-1/BE-1, inspect and record:
- All frontend routes, aliases, redirects, guards, route ownership and auth/session redirects.
- Cross-portal imports, AppContext state/action/effect consumers and API facade method consumers.
- Every controller endpoint and authorization rule.
- Services, repositories, entities/tables, JdbcTemplate/EntityManager/native SQL and cross-domain writers.
- Flyway versions, table DDL, indexes, constraints, triggers and migration ownership.
- Transaction boundaries, propagation, locking, concurrency and idempotency.
- Scheduled jobs, async executors, WebSocket handlers and event/listener paths.
- External integrations and secret/config sources (Zender, email/SMS, maps, payments, Oracle wallet).
- End-to-end traces for registration/OTP, seller onboarding, catalogue/inventory, bargain, checkout, seller refund, delivery and Daily Help.
- Render resource limits, Hikari settings, Oracle connection count, readiness, logs and migration evidence.

## Phase 0 exit criteria

Discovery is complete only when every route, endpoint, table writer, scheduled task, integration and critical workflow has an owner; cross-domain transactions are listed; unknowns have decision owners; docs are checked against exact main SHA/open PRs; and no production behavior/schema/deployment was changed during discovery.


## Source-level findings — exact main baseline after PR #222

**Inspected baseline:** `560a34a4a94241e007a396a2ad4cbc8e2e67e428`. Repository tree contains 147 Java files and 96 frontend `src/` files. These are source inventory counts, not a statement that every file has been behaviorally audited.

### Confirmed frontend routes

`src/app/routing/routeConfig.ts` defines:
- Public/home: `/`
- Registration aliases: `/register/buyer`, `/register/seller`, `/register/delivery`, `/register/daily-help`
- Account: `/account`
- Role dashboards: `/buyer`, `/seller`, `/delivery`, `/daily-help`, `/admin`

Unknown paths currently resolve to `home` in `resolveAppRoute`; confirm whether this is intentional before changing fallback behavior. `resolvePortalRoute` maps root to a configured portal role. `portalRedirect.ts` requires HTTPS configured portal URLs and routes cross-origin role portals to hostname root, same-origin roles to role paths. These details constrain any consolidated path-hosting migration.

`roleRouteAccess.ts` is explicitly a pure client-side policy; its comments state backend authorization remains authoritative. It checks signed-in state, admin flag and registered roles.

### Confirmed backend endpoint families (controller annotations inspected)

- `AuthController` base `/auth`: send OTP, registration check, verify OTP, portal handoff/redeem, registered roles, onboarding status, current user/profile, addresses and logout.
- `BuyerController` base `/buyers`: product search, order placement/checkout, pickup confirmation, buyer orders and order tracking.
- `SellerController` base `/sellers`: seller registration/profile/availability, products, seller orders/status and discounts.
- `DeliveryController` base `/delivery`: agent registration/profile/availability, available/mine jobs, claim, pickup confirmation, OTP resend and verification.
- `DailyHelpController` base `/daily-help`: service discovery, booking, availability, professional registration/profile, slots, jobs, earnings, status, start and completion.
- `NegotiationChatController` base `/negotiations`: notifications, messages and offer responses.
- `DeliveryTrackingController` base `/tracking`: delivery location updates and order tracking.
- Admin controller base `/admin`: buyer/seller/agent administration, analytics, seller/agent/provider review, Daily Help service administration, accounts/session revocation/audit and delivery configuration.
- Additional controllers handle seller lead/CRM, registration drafts, registration OTP settings/audit, seller documents, health and E2E support.

This is a controller-family summary, not a complete endpoint/authz table. E2E-only controllers must be treated separately from public production contracts.

### Boundary implications observed in code

- `OrderService` injects `OrderRepository`, but also `SellerRepository`, `ProductRepository`, `JdbcTemplate` and `GoogleRoutesService`. Checkout therefore currently reaches Marketplace-owned seller/product persistence and delivery configuration directly. Proposed BE-1 work must replace this with explicit read/validation contracts or a narrowly documented legacy adapter; do not move code blindly.
- `SellerService` injects `SellerRepository`, `ProductRepository`, `OrderRepository` and `BillDiscountRepository`. Seller-owned operations currently reach Orders persistence. Inspect each call site to distinguish legitimate seller order views from direct state writes.
- `DeliveryService` injects `DeliveryAgentRepository` and `OrderRepository`, plus `GoogleRoutesService`. Delivery currently reaches Orders persistence; define idempotent Orders-owned transition contracts before modularizing.
- `AuthService` injects `UserRepository` and `UserSessionRepository`, but also seller, delivery-agent and Daily Help professional repositories and onboarding/config services. Identity is currently coupled to role-profile persistence; retain account/profile linking semantics while replacing direct repository access with contracts.
- `DailyHelpService` uses Daily Help service, professional, booking and slot repositories and has explicit transactional methods. It is the clearest initial domain candidate by persistence grouping, but it is not proven independent until controller/admin/auth and payment dependencies are fully mapped.
- `AuthController` also calls `BuyerAddressService`; address ownership needs a decision (Identity profile subdomain vs separate shared profile capability) before package extraction.

### Security and operational review flags

- `AuthController` portal handoff codes are held in an in-memory `ConcurrentHashMap` with a 60-second TTL and one-time removal. This is process-local: it will not work reliably across multiple backend instances/restarts. It is compatible with the current one-JVM deployment assumption but needs bounded cleanup/abuse controls and a future distributed-storage contract before horizontal scaling.
- The tracked tree includes a wallet ZIP under `backend-java-spring/`, and the inspected Dockerfile copies `Wallet*.zip` into the image. This is a high-priority secret-material review. Do not open, print or copy wallet contents. PR #84 is an open historical security PR and must be reviewed before changing wallet handling.
- `OrderService` checkout currently rejects online payment and accepts COD only in the inspected method. Do not describe online payment as live based on frontend UI or planning documents.

These are discovery findings, not code changes or a security sign-off.


## Security and admin boundary source inspection

Inspected SecurityConfig.java, SessionAuthenticationFilter.java, AdminController.java and E2eOtpController.java at the PR #223 merge baseline.

- Spring Security explicitly applies hasRole(ADMIN) to /admin/**. Health, Swagger, /buyers/**, /sellers/**, /delivery/** and the final /** matcher are configured permitAll(). The custom session filter is inserted before username/password authentication.
- @EnableMethodSecurity is not present in the inspected SecurityConfig, and inspected controllers did not show @PreAuthorize. Admin authorization therefore depends heavily on URL matcher coverage and filter principal construction; method-level authorization is not an independent visible defense.
- AdminController directly injects repositories for Users, Sellers, SellerDocuments, Products, Orders, DeliveryAgents, SearchTrends and DailyHelpProfessionals, plus JdbcTemplate and DailyHelpService. This is a cross-domain admin facade, not a domain-owned application service. Split operations into owner-domain contracts while preserving the /admin API facade and ADMIN role gate.
- E2eOtpController fails closed unless environment is staging, token length is at least 32, capture service is safely configured and constant-time token comparison succeeds. Keep this staging-only.
- Do not infer all non-admin routes are safe merely because the session filter exists. Complete endpoint-by-endpoint authn/authz and ownership tests, especially for buyer/seller/delivery endpoints under permitAll matchers.

These are source observations, not a penetration test or security approval.
