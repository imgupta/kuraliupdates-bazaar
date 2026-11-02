# Phase 0 Source Audit Checkpoint

**Audit baseline:** `main` at `4f6d919779454d41d592d01051da5189a9b60b43`  
**Audit date:** 2026-11-03  
**Status:** In progress — this checkpoint records additional source evidence; it does not close Phase 0.

## Evidence status

- PR #227 is merged into main at the audit baseline above.
- Workflow run `41525512285` completed successfully for both reported jobs: frontend lint/TypeScript/production build and Spring Boot Maven verification. These are CI results for the governance PR, not proof of authorization correctness, database migration state or production runtime behavior.
- Current source remains a single Spring Boot Maven application and a React/Vite frontend with five portal build targets.
- The data ownership matrix and frontend route inventory remain explicitly partial.

## Backend transaction annotation scan

The following files were fetched from the audit baseline and their complete source text was scanned for transaction annotations. Counts are annotation occurrences, not counts of distinct business transactions or proof of transaction correctness.

| Source file | `@Transactional` occurrences | Observed special notes |
|---|---:|---|
| `service/OrderService.java` | 6 | Includes read-only methods; imports and injects `JdbcTemplate` |
| `service/SellerService.java` | 11 | Mix of read-only and write transaction annotations |
| `service/DeliveryService.java` | 9 | Imports/injects `JdbcTemplate`; in-memory `ConcurrentMap` stores OTP resend timestamps |
| `service/AuthService.java` | 10 | Mix of read-only and write transaction annotations |
| `service/DailyHelpService.java` | 23 | Includes `@Transactional(noRollbackFor = ApiException.class)` at source line 290 |

**Scope limitation:** This is a five-service targeted scan, not an exhaustive scan of every Java class, repository, controller, migration or transaction participant. Annotation count does not reveal propagation, isolation, lock mode, proxy/self-invocation behavior, nested transaction semantics, database constraints or actual rollback behavior.

### Priority transaction questions

1. `OrderService`: enumerate all repositories and direct SQL per method; verify the checkout transaction's writes, lock strategy, stock/pricing revalidation, idempotency and failure rollback.
2. `SellerService`: identify all calls to `OrderRepository`; classify reads versus writes and route all order mutations through an Orders-owned application contract.
3. `DeliveryService`: classify all order writes and ensure delivery completion is an idempotent command to Orders, not direct cross-domain persistence. Replace or durably coordinate process-local resend throttling before multi-instance/restart-safe production.
4. `AuthService`: classify profile repository access across Seller, Delivery and Daily Help; decide whether Identity owns only identity linkage or also profile lifecycle.
5. `DailyHelpService`: inspect the method at line 290 and its callers to establish why `ApiException` intentionally commits rather than rolls back; test partial-write failure cases.

## Frontend context and API structure

Source files fetched from the same main baseline:

- `src/context/AppContext.tsx` (229 lines): compatibility context facade; exports `AppProvider` and `useApp`.
- `src/context/useAuthBootstrap.ts` (162 lines): contains three `useEffect` blocks; exact startup/session side effects require call-site and dependency tracing.
- `src/context/useAuthOperations.ts` (239 lines): auth operations hook.
- `src/context/useBackendSync.ts` (154 lines): callback-based backend synchronization operations.
- `src/context/useMarketplaceOperations.ts` (60 lines): marketplace operations hook.
- `src/context/useOrderDeliveryOperations.ts` (267 lines): order/delivery operations hook.
- `src/services/api.ts` (19 lines): exports the `bazaarApi` facade.
- `src/app/routing/routeConfig.ts` (65 lines): route resolver and role path functions.

This confirms the AppContext has been decomposed into hooks, but does not yet establish a complete provider state/action/effect consumer map, storage-key inventory, API method-to-component call graph, polling/subscription cleanup, or cross-portal import boundary.

## Source-level endpoint confirmation added

The `DailyHelpController` source maps these method/path patterns under `/daily-help`:

- GET `/services`
- POST `/bookings`
- GET `/availability`
- POST `/professionals/register`
- GET `/professionals/by-phone/{phone}`
- POST `/professionals/{professionalId}/availability`
- GET/POST `/professionals/{professionalId}/slots`
- DELETE `/professionals/{professionalId}/slots/{slotId}`
- GET `/professionals/{professionalId}/jobs/available`
- POST `/professionals/{professionalId}/jobs/{bookingId}/accept`
- GET `/professionals/{professionalId}/jobs`
- GET `/professionals/{professionalId}/earnings`
- GET `/bookings/latest`
- GET `/bookings/{bookingId}`
- POST `/bookings/{bookingId}/status`
- POST `/bookings/{bookingId}/start`
- POST `/bookings/{bookingId}/complete`

The controller mapping is source-verified only. Authentication, role, phone lookup exposure, professional/booking ownership, status transition authorization, OTP replay, and privacy behavior still require method-body review and negative tests. `DeliveryTrackingController` exposes POST `/tracking/delivery/{agentId}/location` and GET `/tracking/orders/{orderId}`; agent and buyer/order access checks require explicit verification.

## Remaining blockers to Phase 0 closure

1. Exhaustive method-level inventory for all controllers, WebSocket and non-MVC endpoints, including effective authorization and record ownership.
2. Every service/repository call site, including all writers, native SQL, JdbcTemplate, EntityManager, scheduled/async/event work and process-local state.
3. Every transaction boundary with propagation, isolation, rollback rules, lock semantics and cross-domain participants.
4. Full Flyway V1–V30 DDL/data transformation inventory and baseline reconciliation.
5. Oracle schema metadata (constraints, indexes, triggers, sequences, applied migration history) through authorized read-only access. Source files alone cannot establish deployed schema state.
6. Full critical workflow sequence and failure/retry/idempotency tests.
7. Frontend route/component/API/context consumer and browser storage map, including refresh/deep-link/portal boundary tests.
8. External integration inventory including provider, region, subprocessor, timeout, retry, webhook/authentication, retention and deletion.
9. Production India-only resource-by-resource hosting plan; Oracle, backups, logs, documents, CDN, email/SMS and support-access locations remain unverified.
10. Qualified professional review of actual entity, seller/provider contracts, payment/fund flows, tax, food/business licences and Punjab labour/gig-worker applicability.

## Exit decision

**Phase 0 remains open.** Do not start broad backend package movement, frontend portal extraction, persistence refactoring or service extraction. Complete the inventories and negative tests, assign owners to Critical/High risks, and attach evidence before authorizing FE-1/BE-1.


## Expanded backend scan: remaining application services

The following source files were inspected at the same main baseline. Transaction counts below are annotation occurrences; they do not substitute for method-level call graphs or database evidence.

| Service | `@Transactional` occurrences | Additional direct mechanism observed |
|---|---:|---|
| `NegotiationChatService.java` | 7 | `JdbcTemplate` |
| `OtpService.java` | 2 | `JdbcTemplate` |
| `SellerOnboardingLeadService.java` | 7 | `JdbcTemplate` |
| `SellerRegistrationDraftService.java` | 3 | None observed in targeted scan |
| `SellerRegistrationOtpConfigService.java` | 3 | `JdbcTemplate` |
| `SellerServiceAreaService.java` | 3 | None observed in targeted scan |
| `OtpDeliveryService.java` | 0 | Java `HttpClient`; request timeout declarations of 10 seconds at three call sites |
| `GoogleRoutesService.java` | 0 | No transaction/HTTP client signal in targeted annotation scan; inspect full source and configuration to identify effective transport, timeout and fallback |

**Direct SQL inventory is still incomplete.** At least OrderService, DeliveryService, NegotiationChatService, OtpService, SellerOnboardingLeadService and SellerRegistrationOtpConfigService inject JdbcTemplate. Each SQL statement must be classified by table, operation, caller, transaction, ownership and bind parameter safety before domain boundaries can be considered complete.

## Migration and test inventory — source tree only

The current repository tree contains Java Flyway migrations V14–V22 and SQL migrations V22_1–V30. No V1–V13 migration source files were present in the inspected tree paths. This is a material baseline gap: establish whether V1–V13 were historical Java/SQL migrations removed from source, are embedded in an external baseline, or are part of an existing database baseline. Do not invent or recreate them without Oracle schema/history evidence.

The source tree contains backend tests for Auth registration checks/roles, address service, malware scanning, Daily Help, Delivery, tracking, E2E OTP capture/cleanup/tagging, negotiation chat, Orders, Products, seller registration drafts and SellerService, plus selected controller tests for diagnostics, health, seller documents and seller OTP configuration. This list does not prove endpoint coverage, authorization matrix coverage, integration/database transaction behavior or successful execution in the target environment.

## Integration and asynchronous inventory limitations

- `OtpDeliveryService` uses Java `HttpClient` and explicit 10-second request timeouts at the inspected call sites. Retry/backoff, provider response handling, idempotency, credential rotation and data processor/region assessment remain to be completed.
- `JdbcTemplate` use is spread across business services; SQL-level ownership and transaction participation remain open.
- The targeted service scan did not establish a complete scheduler, executor, event-listener, WebSocket, cache or polling inventory. A repository-wide annotation/configuration search and runtime registration review are still required.
- No endpoint-level negative authorization matrix was found in the inspected test path list. Existing service/controller tests are not a substitute for anonymous/wrong-role/wrong-owner/session-revocation tests.

## Updated Phase 0 gate

Phase 0 remains open. The next evidence tranche must enumerate every SQL statement and repository call site, inspect every migration source file, inspect full security/filter/controller method bodies, enumerate asynchronous and WebSocket wiring, and map each test to endpoint/workflow and authorization scenario. Oracle migration history and schema constraints require separately approved read-only access.


## Security and endpoint audit tranche — controller/config source review

**Baseline:** main `4f6d919779454d41d592d01051da5189a9b60b43`. The findings below are source observations, not proof of exploitability or a substitute for negative runtime tests.

### Security filter and public-route policy

- `SecurityConfig.securityFilterChain` disables CSRF, installs `SessionAuthenticationFilter`, explicitly requires `ROLE_ADMIN` for `/admin/**`, but also permits `/buyers/**`, `/sellers/**`, and `/delivery/**`, followed by a catch-all `/**.permitAll()` (source lines 26–53).
- `SessionAuthenticationFilter` calls `AuthService.requireUser(token)` and attaches a `ROLE_<role>` authority when a bearer token is supplied. The filter does not make the catch-all routes authenticated by default.
- Consequence: every non-admin endpoint must enforce authentication, role, and record ownership itself (or be intentionally public). A newly added controller method can silently inherit public access if it omits its own guard. This is a **High-priority architecture/security control gap**; it is not, by itself, proof that every existing endpoint is exploitable.
- Required durable control: replace broad catch-all permit-all with explicit public route allowlist and authenticated default; add endpoint security tests for anonymous, invalid, expired, revoked, wrong-role, wrong-owner, and correct-owner cases. Keep intentional public registration/catalogue endpoints explicit and rate-limited.

### Confirmed endpoint-level observations

| Area | Source observation | Risk / required verification |
|---|---|---|
| Delivery registration | `POST /delivery/register` in `DeliveryController` accepts registration DTO without an `Authentication` parameter or controller-level session check. The route is under `/delivery/**`, which is permit-all. | Intentional public lead/registration may be acceptable, but verify OTP/email/phone ownership, abuse/rate limits, duplicate identity handling, consent/privacy notice, retention and admin review. Treat as **High** until those controls are demonstrated. |
| Daily Help profile | `DailyHelpController` checks authenticated user and phone match for professional registration and `by-phone`; professional mutations call `requireOwnProfessional`, which resolves the profile by authenticated phone and compares professional ID. | Positive source-level ownership controls observed. Still test wrong phone, duplicate phone, multiple profiles, deleted/disabled profile, race conditions and role combinations. |
| Daily Help booking | Create booking requires authenticated user phone match; latest booking requires BUYER role and phone match; individual booking uses `getBookingForUser`. | Verify service query binds booking to buyer identity and that provider/admin access paths are deliberate; test IDOR and status transition abuse. |
| Delivery tracking | Location updates require an unexpired session whose linked user's email matches the delivery agent email. Order tracking authorizes buyer email or assigned delivery-agent email and returns buyer delivery address/coordinates and assigned-agent location; delivery OTP is returned only when authenticated email matches buyer email. | Source-level checks exist. Verify account suspension/revocation propagation, email uniqueness/normalization, role/profile linkage, location freshness/retention, access logging, OTP exposure policy and that unassigned riders/other buyers receive 403. |
| Seller documents | Seller upload/list resolves authenticated bearer session then seller by `userId`. Admin list/download/rescan/verification separately checks `ROLE_ADMIN`. Upload validates document type, size <=5 MB, MIME allowlist and basic file signature; data starts quarantined; download/verification requires CLEAN scan status. | Good controls observed. Further verify MIME sniffing/parser safety, polyglot/decompression attacks, ClamAV outage handling, DB BLOB encryption/backup/retention, admin audit, scan bypass/race, and seller access after profile transfer/deactivation. |
| Admin APIs | `/admin/**` is role-gated at filter chain. `AdminController` returns full `SellerEntity` and `DeliveryAgentEntity` objects on list endpoints and buyer directory includes contact/address fields. | Review response DTO minimization and field serialization to avoid leaking internal fields; apply pagination and least-privilege admin scopes. Audit access to bulk PII and analytics. |
| Account status administration | `AdminController.updateAccountStatus` hard-codes three root-admin email addresses in source, prevents self-change and protects those addresses; it updates account status and deletes sessions for non-ACTIVE states using JdbcTemplate. | **High maintainability/security risk:** root-admin identity policy is hard-coded and email-based. Move to managed immutable principal/permission policy, audit changes, validate actor privilege server-side and test transaction atomicity between user status, session deletion and audit insert. Never rely on email alone as a durable root-admin control. |

### Transaction and persistence observations from reviewed controller

- `AdminController` directly injects `JdbcTemplate` and owns account-status/session-revocation, account-audit and delivery-configuration SQL in addition to direct access to User, Seller, Product, Order, Delivery and Daily Help repositories.
- `updateAccountStatus`, `revokeAccountSessions`, delivery-configuration update and seller-location verification have controller-level `@Transactional` annotations. Their SQL statements, audit writes, row locking and failure rollback still need method-by-method mapping and tests.
- This makes `AdminController` a cross-domain orchestration/persistence hotspot. Move application commands to domain-owned services behind admin facade only after Phase 0 call graph and transaction mapping is complete.

### Repository governance evidence

- The GitHub API response for the audit baseline's `main` branch reports `protected=false` and branch protection `enabled=false`. This is a repository-control observation at the time checked, not a claim about organization rules outside the returned endpoint.
- Before production, configure required PR review, required CI/status checks, stale approval dismissal, restricted direct pushes, and a documented emergency bypass with audit. This change requires repository-owner approval; no settings were changed during this audit.

### Security tranche disposition

- No application code or security configuration was changed.
- Do not classify the whole API as public or vulnerable based only on the broad matcher: controller/service guards exist in reviewed paths. Equally, do not infer safety for unreviewed endpoints.
- Remaining: inspect every other controller method, `AuthService` session/account-state semantics, entity serialization, rate-limit configuration, file storage, all SQL statements, and add/run negative endpoint tests in approved synthetic staging.


## Flyway DDL tranche — seller onboarding, documents and OTP policy

**Scope:** source inspection of SQL migrations V22_1 and V23–V30 on the audit baseline. This does not prove any migration has been applied to Oracle.

| Migration | Source-confirmed schema/data change | Review points |
|---|---|---|
| V22_1 | Adds GST/FSSAI verification fields to SELLERS; creates SELLER_DOCUMENTS with BLOB document data, seller FK with ON DELETE CASCADE, status/type checks and seller/type index. | Document BLOB is sensitive identity/business data: verify TDE/backup encryption, access audit, retention/deletion, backup expiry and document download controls. Cascade deletion may conflict with legal/audit retention obligations; define soft-delete/retention policy before seller deletion. |
| V23 | Creates singleton-style SELLER_SERVICE_AREA_CONFIG with center coordinates, radius, enabled/version and bounds checks; inserts initial config. | Verify singleton enforcement (unique/PK key), admin-only mutation, concurrency/version update and audit. Coordinates are operationally sensitive. |
| V24 | Creates SELLER_SERVICE_AREA_CONFIG_HISTORY referencing config table and seeds history. | Confirm immutable history semantics, actor identity, append-only DB permissions and transaction coupling to config updates. |
| V25 | Creates SELLER_REGISTRATION_DRAFTS with DRAFT_JSON CLOB and step constraint. | CLOB may contain names, phone/email, addresses, business and identity data. Confirm encryption at rest, least-privilege access, JSON schema validation, log redaction, expiry/deletion, backup retention and whether raw identity documents are prohibited from draft JSON. |
| V26 | Adds scan status to SELLER_DOCUMENTS, defaults existing/new rows to QUARANTINED and constrains scan state to QUARANTINED/CLEAN/INFECTED/SCAN_FAILED. | Verify migration backfill semantics against existing documents and ensure no code path treats null/unknown scan state as clean. |
| V27 | Creates seller onboarding leads, notes and audit tables; captures contact details, email/phone verification, contact consent flag/version/time, callback request, assignment and follow-up; adds lookup indexes and FKs. | Contact consent defaults to 0, which is privacy-protective only if all contact workflows enforce it. Verify lawful basis/notice, purpose, consent capture/version, withdrawal, access audit, retention, call-note minimization and no unsolicited outreach. |
| V28 | Creates global seller registration OTP config; both email/mobile flags default to 0 and seed GLOBAL=(0,0). Adds per-lead required/skipped flags, with required flags defaulting to 1. | Potential policy mismatch between global disabled seed and lead-required defaults. Inspect service logic and admin defaults; enforce fail-closed, explicit verified/skipped state and audit of any bypass. |
| V29 | Creates OTP config audit table with current/previous email/mobile flags, actor and timestamp; adds descending time index. | Migration comment says append-only, but DDL alone does not prevent UPDATE/DELETE. Verify DB grants, application update paths and audit actor is immutable authenticated admin ID, not caller-supplied text. |
| V30 | Finds AUTH_OTPS check constraints whose search condition mentions OTP_TYPE, drops each dynamically, then adds a named check allowing EMAIL, PHONE, SELLER_EMAIL, SELLER_PHONE. | Verify exact constraints dropped in each supported Oracle version/schema and migration rerun/failure behavior. Test OTP type isolation, uniqueness, expiry, attempts, consumption, and transaction ordering when provider delivery succeeds but persistence fails. |

### Migration-specific privacy and operational gates

1. Treat `SELLER_REGISTRATION_DRAFTS.DRAFT_JSON`, `SELLER_DOCUMENTS.DOCUMENT_DATA`, lead contact details, callback notes and OTP audit data as restricted data. Define table-level access, encryption, retention, deletion and backup expiry before production.
2. Require contact-consent enforcement at the point of every CRM call/message, not merely a stored Boolean. A lead created without consent must not be treated as permission to market or repeatedly call.
3. Reconcile V28's GLOBAL OTP config seed (both disabled) with per-lead defaults (both required). Document exact effective policy, fail-closed behavior and safe admin emergency change.
4. Confirm V22_1/V23/V24/V25/V26/V27/V28/V29/V30 are ordered and compatible with all Java migrations and the actual Flyway schema history. The V22_1 naming sequence and missing V1–V13 source files require a documented baseline/repair strategy, never manual guessing.
5. Run migrations against disposable Oracle-compatible test schema and a sanitized production-like snapshot before rollout; capture before/after constraints, indexes, row counts and rollback/restore plan. Flyway migrations may be non-transactional in Oracle; prove recovery procedure rather than assuming rollback.

**Unverified:** Oracle version, applied migration history, actual constraints/indexes/triggers/grants, DB encryption, backup region/retention, and current row contents. These require authorized read-only DB/provider evidence.
