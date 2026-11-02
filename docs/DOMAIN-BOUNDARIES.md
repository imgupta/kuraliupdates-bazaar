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
