# Backend Service and Dependency Map

**Status:** Phase 0 target map established; source call graph pending.  
**Date:** 2026-11-03

## Verified runtime baseline

- One Maven project: backend-java-spring/pom.xml.
- Artifact kurali-bazaar-api; Spring Boot 3.3.4; Java 17.
- Spring Web, Data JPA, Validation, Security, WebSocket; Flyway core and Oracle support; Oracle JDBC/security libraries.
- One Dockerfile builds one executable JAR and starts one JVM.
- The full controller/service/repository call graph was not available through code search in this session. Do not infer it from class names.

## Target domain map

| Domain | Primary capabilities | Required cross-domain contract |
|---|---|---|
| Identity | Registration, OTP, credentials, roles, sessions, account linking | Authenticated principal/claims and identity lookup |
| Marketplace | Seller onboarding, compliance, catalogue, products, inventory, pricing, offer negotiation | Seller identity reference; accepted offer snapshot to Orders |
| Orders | Cart, checkout, orders/suborders, payments/refunds, financial records | Catalogue validation; delivery request/outcome; Daily Help excluded |
| Delivery | Agent operations, dispatch, assignment, tracking, delivery OTP/status | Receive fulfillment request; report outcome to Orders |
| Daily Help | Provider services, slots, booking, job lifecycle, completion OTP, earnings | Identity reference; payment contract still to be verified |
| Shared communications adapter | Email/SMS/Zender/notification delivery | Domain notification intent; no ownership of business state |

## Required source call graph

For every controller/API endpoint record HTTP method/path, auth/authorization, controller, application service, repositories/entities/tables, integrations, transaction boundary, domain owner, cross-domain calls and test references.

For each service/repository record callers/callees, tables read/written, direct JDBC/EntityManager use, scheduled/async invocation, side effects, idempotency and retry/exception behavior.

## Workflow traces required

1. Buyer/seller registration, OTP, role assignment and login.
2. Seller lead/callback, onboarding, documents, admin review and activation.
3. Product/category/inventory/availability.
4. Bargain, offer acceptance, cart insertion and checkout revalidation.
5. Multi-seller checkout, suborders, seller payment and seller-direct refund coordination.
6. Dispatch, agent claim, tracking, delivery OTP and order status.
7. Daily Help discovery, slots, booking, acceptance, start OTP, timer and completion.
8. Admin authorization, approvals, configuration and audit.
9. Notification intent, provider call, retry, result and audit/redaction.

## Dependency direction and forbidden shortcuts

- Controllers call application interfaces in their owning domain.
- Domain logic uses its own model and persistence ports.
- Cross-domain operations use explicit application contracts or versioned events.
- A domain cannot import another domain's repositories/entities or write its tables.
- Shared technical utilities must not become a shared business repository.
- External SDKs remain behind adapters.
- Initial runtime remains one Spring Boot process and one pool; do not multiply JVMs/pools during package modularization.

## Exact source inventory still required

Inspect all Java source/tests and populate controller -> endpoint -> service -> repository -> entity/table map; package/import graph; @Transactional propagation; JdbcTemplate/EntityManager/native SQL; scheduled/async jobs, listeners and WebSockets; external clients/timeouts/retries/secrets; Flyway-to-domain ownership; Hikari settings and effective connection limits.

Do not assign a controller/service to a domain solely from its class name. Confirm behavior and writes.

## Exit criteria

Every endpoint, table writer, scheduled task, integration and critical workflow must have a documented owner, dependency and test reference before BE-1. Unknowns require a decision owner and must remain visible.
