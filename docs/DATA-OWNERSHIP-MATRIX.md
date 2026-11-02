# KuraliUpdates Data Ownership and Transaction Matrix

**Status:** Phase 0 proposed ownership only; exact table inventory pending.  
**Date:** 2026-11-03

## Purpose

This is the proposed ownership model, not proof that current Oracle tables/entities have been exhaustively mapped. Populate exact names, readers, writers and Flyway versions from source/schema before moving persistence code.

## Proposed ownership

| Data group | Proposed owner | Boundary | Exact entity/table mapping |
|---|---|---|---|
| Accounts, credentials, OTP, roles, sessions, account links | Identity | Identity lifecycle | Pending |
| Seller CRM lead/callback/assignment/call notes | Decide by lifecycle: prospect CRM vs merchant profile | Separate prospect from authenticated account | Pending |
| Seller business profile, onboarding, compliance and documents | Marketplace | Merchant profile/eligibility | Pending |
| Products, categories, inventory, prices, availability | Marketplace | Catalogue and stock truth | Pending |
| Bargain conversations and offers | Marketplace | Negotiation before acceptance | Pending |
| Accepted offer/item snapshots, carts, orders, suborders/status | Orders | Commercial agreement and order lifecycle | Pending |
| Payment references, refund cases/audit/reconciliation, commissions/fees | Orders | Grocery financial state; seller-direct refund retained | Pending |
| Agent operations, approvals, assignments, tracking and delivery OTP | Delivery | Fulfillment execution | Pending |
| Provider services, areas, slots, bookings, jobs, OTP and earnings | Daily Help | Service booking/job lifecycle | Pending |
| Notification attempts/provider receipts | Shared adapter or owning domain for durable business audit | Delivery telemetry is not business state | Pending |
| Admin audit events | Owning domain for business mutation; shared security audit for access events | Explicit retention/ownership | Pending |

## Transaction and consistency rules

- One domain owns each write model and authoritative state transition.
- A transaction may update multiple tables only within one domain, except a documented legacy exception with owner and removal date.
- No cross-domain repository writes; use the owning domain's application contract.
- Orders preserves accepted product, price, tax, discount and bargain snapshots.
- Delivery completion does not directly update Orders tables; Orders validates an idempotent outcome command/event.
- Seller-direct refunds remain seller-to-customer. Orders tracks the platform case/reconciliation; no platform-held seller reserve is introduced.
- Daily Help payment/settlement ownership remains unresolved until current code is traced.
- Use outbox/idempotency when an event must reliably follow a local commit. No Kafka/distributed transaction in the initial modular monolith.

## Required fields for the completed inventory

For every table/entity record schema.table, entity class, Flyway migration, owner, current read/write call sites, foreign keys/cascades/triggers/sequences, transaction methods/isolation/locking, PII/financial/document classification, retention, indexes/query hotspots, migration/rollback plan, tests and synthetic fixture dependencies.

## Audit method

1. Enumerate JPA entities and explicit table mappings.
2. Enumerate repositories, native SQL, JDBC and EntityManager usage.
3. Find every call site and distinguish reads from writes.
4. Enumerate Flyway scripts and map DDL/data changes to entities.
5. Inspect foreign keys and constraints; do not infer only from Java annotations.
6. Inspect transactional services and cross-domain orchestration.
7. Use approved read-only schema metadata access only; never expose credentials or customer data.
8. Mark dynamic SQL or unresolved access as unknown, not guessed.

## Exit gate

No persistence refactor or service extraction until every table has one proposed owner, all current writers are identified, cross-domain transactions are documented and migration/rollback is reviewed. This matrix remains incomplete until that evidence exists.


## Source-confirmed JPA entity/table names

The following explicit `@Table` mappings were inspected from the current Java entity source. Proposed ownership is provisional until every repository call, migration and database constraint is mapped.

| Entity | Table | Proposed owner |
|---|---|---|
| AuthOtpEntity | `AUTH_OTPS` | Identity |
| UserEntity | `USERS` | Identity |
| UserSessionEntity | `USER_SESSIONS` | Identity |
| UserAddressEntity | `USER_ADDRESSES` | Identity/profile ownership decision |
| SellerEntity | `SELLERS` | Marketplace |
| SellerDocumentEntity | `SELLER_DOCUMENTS` | Marketplace |
| SellerRegistrationDraftEntity | `SELLER_REGISTRATION_DRAFTS` | Marketplace onboarding; Identity auth |
| SellerServiceAreaConfigEntity | `SELLER_SERVICE_AREA_CONFIG` | Marketplace |
| SellerServiceAreaConfigHistoryEntity | `SELLER_SERVICE_AREA_CONFIG_HISTORY` | Marketplace |
| ProductEntity | `PRODUCTS` | Marketplace |
| BillDiscountEntity | `BILL_DISCOUNTS` | Marketplace (seller pricing) |
| OrderEntity | `ORDERS` | Orders |
| OrderItemEntity | `ORDER_ITEMS` | Orders |
| DeliveryAgentEntity | `DELIVERY_AGENTS` | Delivery |
| DailyHelpServiceEntity | `DAILY_HELP_SERVICES` | Daily Help |
| DailyHelpProfessionalEntity | `DAILY_HELP_PROFESSIONALS` | Daily Help profile; Identity link |
| DailyHelpProfessionalSlotEntity | `DAILY_HELP_PROFESSIONAL_SLOTS` | Daily Help |
| DailyHelpBookingEntity | `DAILY_HELP_BOOKINGS` | Daily Help |
| SearchTrendEntity | `SEARCH_TRENDS` | Analytics/platform capability; owner to decide |

### Observed relationship hints

- `ORDERS` references `SELLERS` and `DELIVERY_AGENTS`; it also owns child `ORDER_ITEMS`, which references `PRODUCTS`.
- `DAILY_HELP_BOOKINGS` references `DAILY_HELP_SERVICES` and `DAILY_HELP_PROFESSIONALS`; slots reference professionals.
- `BILL_DISCOUNTS` references `SELLERS`; `PRODUCTS` references `SELLERS`.
- These JPA joins are not a substitute for verifying Oracle foreign keys, cascade rules, triggers or migration DDL.

## Flyway source inventory observed

Migration files present in the tree:
- Java migrations V14–V22 (including negotiation, E2E tagging, role profile linking, admin permissions, seller/rider availability, multi-seller delivery, pickup/payout snapshots, OTP resend timeout, bargain/notifications).
- SQL migrations V22_1–V30 (seller compliance/documents, seller service-area config/history, registration drafts, malware quarantine, onboarding leads, OTP admin config/audit and seller OTP type constraint).

The actual V1–V13 baseline and any out-of-band schema changes must be checked against the deployed Oracle schema; do not infer runtime migration status from file presence.

## Confirmed cross-domain persistence coupling

- `OrderService` directly injects SellerRepository and ProductRepository while creating orders; this violates the desired Orders -> Marketplace contract boundary.
- `SellerService` directly injects OrderRepository.
- `DeliveryService` directly injects OrderRepository.
- `AuthService` directly injects SellerRepository, DeliveryAgentRepository and DailyHelpProfessionalRepository in addition to Identity repositories.
- These are priority BE-0 call sites. Determine exact read/write methods and transaction scopes before creating packages or ArchUnit rules.

This is not a complete reader/writer matrix. Repository method usage, native SQL/JdbcTemplate, Flyway DDL, Oracle FK/trigger metadata, transaction propagation and data classification remain open.


## Admin controller cross-domain access observed

The inspected AdminController directly uses Identity (UserRepository), Marketplace (SellerRepository, SellerDocumentRepository, ProductRepository), Orders (OrderRepository), Delivery (DeliveryAgentRepository), analytics (SearchTrendRepository), Daily Help (DailyHelpProfessionalRepository) and JdbcTemplate. This is an admin read/command surface in the current monolith, but must not become shared domain persistence in the target architecture. Preserve the admin API while delegating each operation to an owning domain application service/query contract. The domain performing a business mutation should emit its audit event.
