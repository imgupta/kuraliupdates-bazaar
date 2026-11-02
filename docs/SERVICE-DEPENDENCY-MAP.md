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


## Source-confirmed dependency findings

Inspected controller/service fields and mapping annotations at main SHA `560a34a4a94241e007a396a2ad4cbc8e2e67e428`.

| Current component | Direct persistence dependencies observed | Proposed owner | Boundary issue |
|---|---|---|---|
| AuthService | User, UserSession, Seller, DeliveryAgent, DailyHelpProfessional repositories | Identity plus role-profile contracts | Identity directly reads/writes profile repositories across domains |
| OrderService | Order, Seller, Product repositories; JdbcTemplate | Orders | Direct Marketplace persistence and delivery-configuration SQL during checkout |
| SellerService | Seller, Product, Order, BillDiscount repositories | Marketplace | Direct Orders persistence dependency; inspect writes/read-only usage |
| DeliveryService | DeliveryAgent and Order repositories | Delivery | Direct Orders persistence dependency for fulfillment lifecycle |
| DailyHelpService | DailyHelpService, DailyHelpProfessional, DailyHelpBooking, DailyHelpProfessionalSlot repositories | Daily Help | Cohesive data group; still verify admin/auth/payment call paths |
| AuthController | AuthService and BuyerAddressService | Identity / address ownership decision | Controller coordinates two services; define profile/address owner |

The table reports constructor/field dependencies observed, not every method-level read/write. Each repository call still needs classification as read, write, transaction participant or query-only projection.

### Controller/API family map

| Controller | Base path | Primary domain |
|---|---|---|
| AuthController | `/auth` | Identity |
| BuyerController | `/buyers` | Buyer experience; delegates to Marketplace/Orders |
| SellerController | `/sellers` | Marketplace; seller order operations contract with Orders |
| DeliveryController | `/delivery` | Delivery |
| DeliveryTrackingController | `/tracking` | Delivery read model / tracking |
| DailyHelpController | `/daily-help` | Daily Help |
| NegotiationChatController | `/negotiations` | Marketplace offer negotiation; Orders owns accepted order snapshot |
| AdminController | `/admin` | Admin facade; split by underlying owning domain |
| SellerOnboardingLeadController | `/seller-registration/leads` | Prospect CRM boundary decision |
| AdminSellerOnboardingController | `/admin/seller-leads` | Marketplace CRM/admin workflow |
| SellerRegistrationDraftController | `/sellers/me/draft` | Marketplace onboarding plus Identity authorization |
| SellerRegistrationOtpConfigController | `/seller-registration/otp-settings`, `/registration/otp-settings`, `/admin/seller-registration/otp-settings` | Identity |
| SellerDocumentController | `/sellers/me/documents`, `/admin/sellers/{sellerId}/documents` | Marketplace compliance/document lifecycle |
| E2E/health/diagnostics controllers | dedicated paths | test/operations only; do not include in public domain API by default |

### Critical modularization sequence

1. Build explicit identity profile contracts for seller, delivery and Daily Help profile linkage; preserve existing multi-role account semantics.
2. Create Marketplace query contracts for product/seller validation used by checkout; avoid Orders importing Marketplace repositories/entities.
3. Create Orders application commands for seller order status and delivery fulfillment outcomes; migrate SellerService and DeliveryService away from OrderRepository access.
4. Move delivery configuration access behind an owning configuration contract (decision needed: Delivery or platform configuration).
5. Keep accepted bargain validation at checkout server-side and preserve offer/order price snapshots.
6. Separate E2E and operational endpoints from customer-facing API contracts.

No package move should start until method-level writes and transaction boundaries are enumerated.


## Additional security/admin dependencies

- SecurityConfig has an explicit ADMIN role matcher for /admin/**; the final catch-all matcher is permitAll. SessionAuthenticationFilter is inserted into the chain. Test the effective principal and role mapping for every endpoint.
- No @EnableMethodSecurity was found in the inspected SecurityConfig, and inspected AdminController has no method-level @PreAuthorize. URL-level ADMIN gating is the primary visible admin gate.
- AdminController directly injects repositories for Identity (User), Marketplace (Seller, SellerDocument, Product), Orders (Order), Delivery (DeliveryAgent), analytics (SearchTrend), and Daily Help (DailyHelpProfessional), plus JdbcTemplate. Keep the controller as a thin compatibility facade; route operations to owning domain application interfaces.
- E2E OTP capture is fail-closed based on staging environment, strong token length, safe capture configuration and constant-time token validation. Keep E2E support out of normal production workflows.

## Security verification tasks before FE-1/BE-1

1. Enumerate all controller methods and match them to SecurityConfig patterns.
2. Test anonymous, authenticated wrong-role, correct-role and wrong-record-owner access for every mutation and sensitive read.
3. Verify the custom session filter rejects expired/revoked/malformed sessions and never trusts client-selected role.
4. Check whether public /buyers/**, /sellers/** and /delivery/** endpoints have explicit service-level identity/ownership checks.
5. Ensure admin actions are auditable and every admin operation uses the owning domain contract.
6. Verify E2E OTP capture remains disabled/not-found outside a correctly configured staging environment.
