# Backend Service and Dependency Map

**Status:** Phase 0 partial source audit; endpoint families and selected method paths inspected.  
**Baseline:** main SHA `840842662c03ae026c9ddd996b62b074784359a0` (3 Nov 2026).  
**Companion:** [Engineering Operating Standard](ENGINEERING-OPERATING-STANDARD.md) and [Mandatory India PR Governance](INDIA-PR-GOVERNANCE.md).

## Verified runtime baseline

- One Maven project: backend-java-spring/pom.xml.
- Artifact kurali-bazaar-api; Spring Boot 3.3.4; Java 17.
- Spring Web, Data JPA, Validation, Security, WebSocket; Flyway core and Oracle support; Oracle JDBC/security libraries.
- One Dockerfile builds one executable JAR and starts one JVM.
- This is a modular-monolith target with five domain modules, not five deployed microservices.

## Target domain map

| Domain | Primary capabilities | Required cross-domain contract |
|---|---|---|
| Identity | Registration, OTP, credentials, roles, sessions, account linking | Authenticated principal/claims and identity lookup |
| Marketplace | Seller onboarding, compliance, catalogue, products, inventory, pricing, offer negotiation | Seller identity reference; accepted offer snapshot to Orders |
| Orders | Cart, checkout, orders/suborders, payments/refunds, financial records | Catalogue validation; delivery request/outcome |
| Delivery | Agent operations, dispatch, assignment, tracking, delivery OTP/status | Receive fulfillment request; report outcome to Orders |
| Daily Help | Provider services, slots, booking, job lifecycle, completion OTP, earnings | Identity reference; payment contract still to be verified |
| Shared communications adapter | Email/SMS/Zender/notification delivery | Domain notification intent; no ownership of business state |

## Controller and endpoint-family inventory

This is a source-level route inventory, not a completed authorization matrix. Method-level service calls, auth principal, role and record ownership must still be tested.

| Controller | Base path / endpoint patterns observed | Primary owner / follow-up |
|---|---|---|
| AuthController | `/auth`: send-otp, registration-check, verify-otp, portal-handoff/redeem, me/roles, onboarding-status, me, me/addresses CRUD/default, logout | Identity; address ownership and handoff token durability |
| BuyerController | `/buyers`: products/search, orders, orders/checkout, orders/{id}/confirm-pickup, me/orders, orders/{id}/track | Buyer facade; Marketplace/Orders contracts |
| SellerController | `/sellers`: register, me, me/availability, me/products CRUD, me/orders, me/orders/{id}/status, me/discounts CRUD | Marketplace; order-status command must move to Orders contract |
| DeliveryController | `/delivery`: register, me, me/availability, jobs/available, jobs/mine, claim order/group, confirm-pickup, resend-otp, verify-otp | Delivery; record ownership and OTP replay/rate limit tests |
| DailyHelpController | `/daily-help`: services, bookings, availability, professionals/register, by-phone, availability, slots CRUD, jobs/available/accept/list, earnings, bookings/latest, booking detail/status/start/complete | Daily Help; sensitive phone/booking read authorization |
| AdminController | `/admin`: buyers, sellers, delivery, demand/search analytics, pending approvals, seller/delivery approve/reject, Daily Help helpers/services, accounts/status/session revocation/audit, delivery config, seller location verification | Admin facade; delegate to each owner domain |
| DeliveryTrackingController | `/tracking`: delivery/{agentId}/location, orders/{orderId} | Delivery; verify agent/order ownership and location privacy |
| NegotiationChatController | `/negotiations`: list/open, notifications/read, chat messages, offer response | Marketplace; verify participant and active-role authorization |
| SellerDocumentController | `/sellers/me/documents`, `/admin/sellers/{sellerId}/documents` upload/list/download/scan/verification | Marketplace; private document IDOR, malware, retention and admin audit |
| SellerOnboardingLeadController | `/seller-registration/leads`: create, send-contact-otps, verify-contact, callback | CRM ownership decision; public abuse/rate limit and callback consent |
| AdminSellerOnboardingController | `/admin/seller-leads`: list/update/notes | Marketplace/CRM; ensure admin role on every operation |
| SellerRegistrationDraftController | `/sellers/me/draft`: GET/PUT/DELETE | Marketplace onboarding; token/session ownership |
| SellerRegistrationOtpConfigController | public seller-registration/otp-settings and registration/otp-settings; admin GET/history/PUT | Identity; verify admin gates and public response minimization |
| SellerServiceAreaController | `/seller-service-area`: GET/PUT | Marketplace; admin-only update and audit |
| AdminDiagnosticsController | `/admin/diagnostics` GET | Operations; admin role and sensitive output minimization |
| E2eAuthController | `/e2e/auth/token` | Test-only; fail closed outside approved isolated staging |
| E2eOtpController | `/e2e/otp/latest` | Test-only; fail closed outside approved isolated staging |
| E2eRunCleanupController | `/e2e/cleanup/{runId}` POST | Test-only destructive endpoint; verify isolation/run ownership |
| SearchAnalyticsController | `/analytics/search` POST | Analytics; caller identity should not be trusted from request body |
| HealthController | `/health` GET | Operational; disclose no secrets or sensitive internals |

Other controller class mappings and every individual method signature must be retained in the full inventory as the audit proceeds; this summary is not a substitute for source review.

## Security configuration — source observation and tests required

Inspected `SecurityConfig.java`:
- `/admin/**` has an explicit `hasRole("ADMIN")` matcher.
- A prior matcher group for `/health`, Swagger and selected buyer/seller/delivery prefixes is `permitAll()`; the final `/**` matcher is also `permitAll()`.
- `SessionAuthenticationFilter` is inserted into the security chain.
- No `@EnableMethodSecurity` was found in this configuration and no `@PreAuthorize` was observed in the inspected controllers.

This does **not** establish that every endpoint is vulnerable or protected. Effective authorization depends on the custom filter and service checks. Required test matrix for every sensitive read/mutation: anonymous, expired/revoked/malformed session, authenticated wrong role, correct role, wrong record owner, admin, and client-selected role spoofing. Explicitly test public-by-phone Daily Help lookup, latest booking, tracking, seller docs, seller lead callback, registration draft, OTP settings, service-area update and E2E cleanup.

## Source-confirmed service dependencies and transactional observations

| Component | Direct dependencies observed | Boundary / transaction concerns |
|---|---|---|
| AuthService | User, UserSession, Seller, DeliveryAgent, DailyHelpProfessional repositories | Identity directly accesses role-profile persistence; multiple `@Transactional` methods |
| OrderService | Order, Seller, Product repositories; JdbcTemplate | Orders directly accesses Marketplace persistence and SQL; multiple write/read-only transactions |
| SellerService | Seller, Product, Order, BillDiscount repositories | Marketplace directly reads/writes Orders; seller order status transaction must be moved behind Orders contract |
| DeliveryService | DeliveryAgent and Order repositories; JdbcTemplate; in-memory ConcurrentMap resend timestamps | Delivery directly accesses Orders; OTP resend throttle is process-local and resets on restart/multi-instance |
| DailyHelpService | DailyHelpService, DailyHelpProfessional, DailyHelpBooking, DailyHelpProfessionalSlot repositories | Cohesive data group; includes `noRollbackFor=ApiException.class` on one transaction; verify intended partial state |
| AdminController | Cross-domain repositories plus JdbcTemplate | Admin facade spans all domains; domain owners must own mutations/audit |

The annotation scan confirms many `@Transactional` declarations in OrderService, SellerService, DeliveryService, AuthService and DailyHelpService. It is **not** a complete transaction inventory: propagation, isolation, self-invocation, nested calls, rollback rules, repository flush behavior and all controllers still need exact review.

## Specific source-level risk candidates (not confirmed exploitable)

1. `SearchAnalyticsController` accepts `userId` in a request record; verify it ignores/reconciles client-supplied identity and applies minimization/rate limiting.
2. Daily Help public/sensitive routes include professional-by-phone and latest-booking-by-phone; verify authentication, ownership and data minimization.
3. `SellerServiceAreaController` exposes a PUT; verify admin-only authorization and append-only history/audit.
4. `SellerRegistrationOtpConfigController` exposes admin settings/history/update; verify explicit role enforcement and audit on all mutations.
5. `AdminSellerOnboardingController` methods show no controller-level `@PreAuthorize`; verify `/admin/**` URL matcher is effective for every route and custom filter does not bypass it.
6. E2E cleanup is destructive by nature; verify staging-only guard, run-scoped ownership and no access to shared/production data.
7. DeliveryService OTP resend throttling is process-local; a restart or multiple instances may bypass intended cooldown. Verify persisted/shared enforcement and atomic rate limiting.
8. AuthController portal handoff uses process-local one-time state (historically observed); verify expiry, replay, concurrency and restart behavior or move to a durable/shared store if needed.
9. No endpoint-level authorization test matrix is yet evidenced. Treat this as a release-blocking discovery gap for sensitive routes.

## Required source call graph

For every controller/API endpoint record HTTP method/path, auth/authorization, controller, application service, repositories/entities/tables, integrations, transaction boundary, domain owner and test references.

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

## Remaining Phase 0 inventory

- Full method/path/authorization/record-owner matrix for all 20 controllers and any other REST/WebSocket mappings.
- Service -> repository/entity/table read/write call graph, including admin and direct JDBC/native SQL.
- Every `@Transactional` annotation, propagation/isolation/rollback and transaction participant.
- Complete Flyway V1–V30 source inventory and DDL/domain mapping; live Oracle schema only via authorized read-only inspection.
- Scheduled jobs, async executors, event listeners, WebSocket handlers, caches and process-local state.
- All external integrations, secret/config names (never values), timeouts/retries/idempotency/webhook validation.
- Full workflow traces and negative tests.
- Hikari effective pool sizing, host/DB connection capacity and deployment resource model.

## Exit criteria

Every endpoint, table writer, scheduled task, integration and critical workflow must have a documented owner, dependency, authz/record ownership, transaction boundary, failure behavior and test reference before BE-1. Unknowns require an owner and remain visible. No broad package move until then.


## Delivery tracking identity and privacy — 7 November 2026

The `DeliveryTrackingService` authorization contract now uses `DELIVERY_AGENTS.USER_ID` as the authoritative link to `USER_SESSIONS.USER_ID` whenever populated. Email matching is a compatibility fallback only for legacy delivery profiles whose `USER_ID` is null/blank; a conflicting populated user link must never fall back to email. Rider tracking and location writes require the delivery profile to remain `ACTIVE`. Rider order reads are limited to `ASSIGNED_TO_DELIVERY` and `PICKED_UP`; completed/delivered jobs no longer expose buyer address or location to the rider. Session records without a non-null expiry or user ID are invalid. Buyer tracking remains tied to the authenticated buyer email because `ORDERS` currently stores `BUYER_EMAIL` and does not persist a buyer user ID.

Regression evidence: `DeliveryTrackingServiceTest` covers linked ID matching, ID/email conflict, inactive rider denial, email-independent location updates, null expiry and existing buyer/rider ownership cases. Service tests do not prove HTTP filter-chain behavior or Oracle runtime behavior.


## Daily Help booking lifecycle security — 7 November 2026

The service-start OTP is buyer-held and must not be returned by professional status mutations. Professional status updates return `startOtp=null`; buyer booking reads may expose it only in the existing ready-to-start states. State-changing operations on `DAILY_HELP_BOOKINGS` (professional status update, start OTP verification/attempt counting, completion) use `DailyHelpBookingRepository.findLockedByBookingId` with pessimistic write locking inside their transactions. Buyer read paths use ordinary non-locking lookups. The status graph is forward-only: `PROFESSIONAL_ASSIGNED -> ARRIVING -> READY_TO_START`; same-state retries are no-op/idempotent, and skipped/reversed transitions conflict. `acceptJob` already used the same row lock for assignment. Mocked unit tests do not replace Oracle-backed concurrent-request verification.


## Delivery OTP resend guard — 7 November 2026

`DeliveryService.resendDeliveryOtp` must not use process-local cooldown state. It acquires an Oracle-backed guard through the existing `API_RATE_LIMIT_BUCKETS` table before rotating an OTP. `BUCKET_KEY` is a SHA-256 hash of a domain-separated key for either one order or one combined delivery batch; no raw customer contact/address/OTP data is stored. `WINDOW_START` uses a fixed sentinel value within this namespaced key, and `EXPIRES_AT` stores the precise 60-second cooldown expiry using Oracle database time. An atomic `MERGE` updates a matched row only after `EXPIRES_AT <= SYSTIMESTAMP`; an update count of zero means HTTP 429. The general API rate-limit cleanup excludes sentinel rows, and delivery-specific cleanup removes only expired sentinel rows, so unrelated cleanup cannot shorten the cooldown. A duplicate-key insert race is retried once. Guard failure returns 503 and prevents OTP mutation. The guard update and order OTP changes are in one transaction. Expired rows are cleaned up best-effort from the existing shared rate-limit table. No schema migration is required. Unit tests cover independent service instances sharing a mocked DB guard; Oracle-backed multi-session concurrency remains unverified.


## Delivery partner least-privilege order projection — 7 November 2026

All delivery job endpoints use DeliveryJobResponse rather than the broad shared OrderResponse. The DTO includes buyer name/phone and dropoff address/locality/coordinates; seller pickup name/address/locality; item product/title/quantity; order/fulfilment state; checkout group and route metadata. It excludes buyer email, coupon/discount/payment data, place-provider IDs, delivery OTP, payout snapshots and item prices. Nested DeliveryJobItemResponse exposes only product ID, title and quantity. Controller routes remain unchanged. The frontend delivery portal's mapBackendOrder already defaults omitted non-delivery fields and continues to receive the fields used for pickup/dropoff. No persistence/schema change.
