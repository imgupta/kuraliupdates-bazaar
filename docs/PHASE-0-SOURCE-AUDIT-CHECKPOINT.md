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


## Flyway runtime configuration and migration baseline — source-confirmed

The checked-in `application.yml` confirms:
- `spring.flyway.enabled: true`.
- `baseline-on-migrate: true`.
- `baseline-version: 13`.
- `ignore-migration-patterns: "*:missing"`.
- Hibernate `ddl-auto: none`; Spring SQL init is disabled.
- Oracle JDBC datasource and HikariCP are configured through environment placeholders plus a checked-in wallet path.
- Flyway Oracle support is present in `pom.xml`.

### What this means operationally

1. The application is configured to run Flyway automatically during Spring startup when datasource connectivity and application initialization permit it. It is not correct to assume a migration has run simply because the code is deployed.
2. `baseline-on-migrate` with version 13 is designed to baseline a non-empty schema that has no Flyway history table, treating it as version 13, after which V14+ migrations can run. It does not prove that the existing schema actually matches the historical V13 structure.
3. The repository does not contain V1–V13 scripts in the inspected migration tree. The comment in application config says the existing staging schema is at version 13; this is a source comment/config assumption, not a live Oracle fact.
4. A brand-new empty database is materially different: Flyway generally does not baseline an empty schema through `baseline-on-migrate`; it will attempt the available migrations. Since V1–V13 are absent, the V14+ scripts may reference tables/columns that do not exist. **New-database provisioning is therefore a High-priority unresolved gate** until a reproducible bootstrap schema or explicit baseline procedure is tested.
5. `*:missing` tells Flyway to ignore missing migrations recorded in history. This can allow a database with legacy V1–V13 history to validate despite those source files being absent; it also reduces drift visibility. Keep this exception narrowly documented and verify checksums/success for every available migration.
6. Migration execution and application startup must be observed in deployment logs; CI compilation does not prove Flyway ran or completed against Oracle.

### Existing diagnostic capability discovered

`AdminDiagnosticsController` exposes read-only `GET /api/v1/admin/diagnostics` and queries:
- current Oracle schema,
- counts for a hard-coded list of core tables,
- latest ten rows in `flyway_schema_history`,
- success state for migration version 13.

It is protected by the `/admin/**` matcher in the security chain. The diagnostic code catches errors and reports UNKNOWN/ERROR, so an absent history table or wrong case/schema must not be misread as an empty database. The table-count list is incomplete for later seller onboarding/document/OTP configuration tables and is not a full schema audit. It returns aggregate counts rather than row contents.

**Safe next evidence path:** an authorized administrator can run the existing read-only diagnostics endpoint in the intended environment and share the JSON response after redacting email/identity details. No DB password, wallet, connection string or direct database access is needed for that first check. A complete Oracle metadata export still requires DBA-approved read-only queries.

## Additional controller security and data-flow findings

| Controller / route | Source finding | Priority and action |
|---|---|---|
| `SellerOnboardingLeadController` `POST /seller-registration/leads` | Public lead creation stores name/email/phone via service. | Public lead capture may be intended. Validate input, deduplicate/anti-enumerate, rate-limit, explain purpose and retention, and do not treat lead submission as consent to marketing. |
| `POST /{leadId}/send-contact-otps` and `POST /{leadId}/verify-contact` | Both are public and accept lead ID; verification takes email and phone OTP values. | **High:** verify unguessable IDs, OTP expiry/attempt caps, rate limits, one-time consumption, binding to the exact contact and replay prevention. Prevent lead-ID enumeration and OTP bombing. |
| `POST /{leadId}/callback` | Public callback endpoint passes a Boolean consent flag and preferred time to service. | **High:** server must validate actual affirmative consent, record notice/version/time/source and contact purpose, prevent caller from altering other lead fields, support withdrawal and audit access. A client-supplied `consent=true` alone is not sufficient evidence of informed consent. |
| `AdminSellerOnboardingController` `/admin/seller-leads/**` | Admin list/update/notes routes are under explicit admin prefix. Actor is recorded as `Authentication.getName()`. | Verify pagination bounds, field-level access, authenticated immutable actor ID, audit integrity and note minimization. |
| `SellerRegistrationOtpConfigController` | Public GET returns only OTP-required flags; admin GET/history/PUT use `/admin/**`. | Public response is limited; test admin authorization. Audit actor currently uses authentication name; prefer immutable principal ID. Validate limit bounds and history pagination. |
| `DeliveryController` `POST /delivery/register` | Public registration accepts name, phone, email, vehicle type/number, licence number and locality, then returns a `DeliveryAgentEntity`. | **High privacy/data-minimization issue:** return a narrow response DTO, never a JPA entity; verify validation, duplicate handling, OTP/ownership, notice/consent, admin review and rate limiting. Do not expose internal status, location, IDs or other fields through entity serialization. |
| `DeliveryController` authenticated routes | Current profile, availability, jobs, claim, checkout-group claim, pickup, resend OTP and verify OTP require an authenticated principal. Claim routes accept agentId as request parameter but service must bind it to authenticated user's profile. | Verify caller cannot claim as another agent, concurrency/atomicity, OTP attempt/rate limits, replay, idempotency and status transitions. |
| `BuyerController` | Search is public; order placement, multi-seller checkout, pickup confirmation, history and tracking require authenticated principal. | Verify order ownership, checkout idempotency, product/seller status/price/stock revalidation, COD/payment state and cross-seller atomicity in service. |
| `AuthController` | Portal handoff codes are held in a process-local `ConcurrentHashMap`; one-time removal and 60-second expiry were observed in source. | **Medium/High operational risk:** restart loses outstanding codes; multiple backend instances do not share handoffs. Ensure code entropy, target role/origin binding, rate limiting and constant-time compare. Prefer short-lived persisted/shared one-time token if multi-instance production is planned. |
| `SellerRegistrationDraftController` | Authenticated user ID is passed to get/save/delete draft service methods. | Verify strict per-user ownership, JSON schema/field allowlist, size bounds, sensitive data minimization and deletion/retention. |
| `SellerServiceAreaController` | Update checks `ROLE_ADMIN`; reads are public. | Confirm read exposes only operationally necessary location/radius; admin changes need actor, version concurrency and append-only audit. |
| `SearchAnalyticsController` | Public search analytics endpoint writes search trend records. | Rate-limit and bound payload; avoid raw query PII/secrets; define retention, aggregation and deletion. |

## Configuration security finding — Critical release blocker

The checked-in `application.yml` at the audit baseline contains hard-coded fallback credential material in application configuration, including a JWT signing secret and wallet-password fallback. It also contains permissive CORS origin text in application properties, while `SecurityConfig` separately defines a fixed allowlist. **Secret values are intentionally not reproduced in this audit.**

Required actions before production:
1. Treat committed secret material as potentially exposed; rotate/revoke it and invalidate sessions/tokens signed with the old JWT key.
2. Remove all secret defaults from source. Require strong externally injected secrets and fail startup if absent/weak in production. Never fall back to a committed value.
3. Verify Render environment variable names and wallet mount/configuration using secure secret manager UI; do not paste secret values into PRs, logs, chat or diagnostics.
4. Reconcile the CORS property with the actual SecurityConfig bean. Remove wildcard and preview-domain origins from production; use exact approved origins and test preflight/credential behavior.
5. Audit Git history and all branches/tags for exposed secrets, not only current HEAD; rotate first, then clean history if required by repository-owner security procedure.
6. Ensure staging and production have separate credentials and JWT keys; staging secrets cannot sign production sessions.
7. Record owner, rotation date, verification evidence and incident assessment. Do not close the security gate merely because current source no longer contains the value.

This is a source-confirmed finding at the inspected commit. No secret material was copied into this document or exposed in this report.

## Phase 0 status refinement

- Source configuration establishes Flyway is enabled and attempts migration on startup, but applied Oracle history remains runtime-unverified.
- The diagnostic endpoint is a safe first step for read-only Flyway evidence; it is not a substitute for full DBA metadata review.
- A clean-database bootstrap path is not yet demonstrated.
- Critical credential hygiene is a production blocker and must be fixed through a separate explicitly authorized security change, not hidden inside a documentation-only audit.


## Frontend architecture, browser storage and runtime effects — source review

### Portal build and route model

- Five entry points exist: `src/entries/{buyer,seller,delivery,daily-help,admin}.tsx`. Each calls `mountPortal(role, PortalComponent)` for one role.
- Five portal-specific Vite build scripts use `VITE_PORTAL` to select the matching HTML entry and emit separate output folders. The root `vite.config.ts` sets `base: '/'`.
- The general `src/App.tsx` imports all five dashboards and conditionally renders one through `PortalAppShell` based on active role. Therefore the monolithic app bundle and standalone portal builds are distinct deployment modes; five build outputs do not by themselves prove five isolated dependency graphs or separate backend services.
- `vercel.json` rewrites all paths to `/index.html` for Vercel SPA fallback. The currently described Render static-site deployment needs its own explicit deep-link/refresh rewrite verification; a Vercel rewrite file does not configure Render. Test direct navigation and refresh for every role path on the actual hosting provider.
- Existing E2E login suite includes a standalone role-portal root and refresh/history test, but no successful current runtime result was verified in this audit.

### Context/state ownership map

| File/hook | Source-observed responsibility | State/effect concern |
|---|---|---|
| `AuthSessionContext` | User, active role, auth-initializing state; synchronizes non-admin role into local storage. | Role is a UI selection; backend session must remain authoritative. |
| `useMarketplaceCollections` | Sellers, products, coupons, delivery agents, orders. | Initializes from local storage and seeded defaults; stale browser cache must never override server authorization, pricing, stock or order state. |
| `usePortalUiState` | Registered roles, locality, compare/tracking/cart/register modal state, toast. | Toast uses timeout; verify no state update after unmount if component lifetime changes. |
| `useBuyerCommerceState` | Cart and applied coupon. | Cart is locally persisted; server must reprice/revalidate coupon, seller, availability and quantity at checkout. |
| `usePersistedValue` | Writes context state to browser storage via effects. | Storage failures are swallowed by safe wrapper; persistence is not durable backup or trusted source. |
| `useBackendConnection` | Backend URL/status, bootstrap and sync orchestration. | Backend URL can be overridden and persisted in browser storage; validate scheme/host in production and avoid sending bearer tokens to arbitrary configured hosts. |
| `useAuthBootstrap` | Restores session via `getMe`, refreshes backend sync every 45 seconds, redeems SSO handoff query/hash code, fetches registered roles. | Handoff codes in URL must be removed from history/log/referrer immediately after capture; verify one-time redemption, origin, expiry and cleanup. |
| `useNegotiationChatState` | Negotiation chats, unread notifications, bargain cart reconciliation. | Polls every 4 seconds and uses localStorage token presence; cleanup exists. Verify hidden-tab/backoff, overlapping requests, multiple tabs, token changes, notification mark-read idempotency and rate limits. |
| `useBackendSync` | Health, buyer orders, catalogue, sellers and delivery jobs synchronization. | Review stale-cache merge semantics and prevent local seeded/old records being treated as server-authoritative. |
| `useAuthOperations` | Login/registration/profile/logout API operations. | Map every action to backend endpoint and verify token clear on logout, role switch and expired/revoked session. |
| `useOrderDeliveryOperations` | Order placement, delivery operations and local state reconciliation. | Confirm server-authoritative transitions; avoid local optimistic state persisting after rejected backend action. |
| `useMarketplaceOperations` / `useSellerAdminOperations` | Marketplace/seller/admin actions. | Full component-to-method and API call graph still open. |

### Browser storage and session security

- `safeStorage.ts` uses browser `localStorage` for all keys.
- Confirmed keys include `kurali_auth_token`, `kurali_role`, `kurali_user`, `kurali_backend_url`, `kurali_sellers`, `kurali_products`, `kurali_coupons`, `kurali_delivery_agents`, `kurali_orders`, `kurali_cart` and `kurali_applied_coupon`.
- The bearer token is therefore accessible to JavaScript running on the origin. Any successful XSS or compromised third-party script can potentially exfiltrate it. **High security priority:** evaluate migration to Secure, HttpOnly, SameSite cookies with CSRF protection, or a documented short-lived access-token/rotating-refresh-token design with strict CSP, dependency controls and session revocation. Do not make a token-storage change without testing cross-portal SSO and CORS.
- User/profile, seller, delivery, order and address details in localStorage create shared-device exposure and persist after tab/browser closure. Minimize persisted PII; clear sensitive caches on logout/account switch; apply TTL/versioning and explicit logout cleanup; do not store identity documents or OTPs there.
- `kurali_backend_url` is user-overridable and persisted. Production should pin an allowlisted HTTPS API origin, reject localhost/non-production hosts in production builds, and ensure credentials cannot be forwarded to arbitrary URLs.
- LocalStorage is not a secure session store. Server must validate every request and never trust client role, cached registeredRoles, price, order status or ownership.

### Health/status correctness issue

- `useBackendConnection` initializes the database label as `Oracle Cloud Autonomous Database (ap-mumbai-1)`.
- `useBackendSync` falls back to `Oracle Autonomous Database Connected` when the health response has no database field.
- These are presentation defaults, not evidence of a live Oracle connection or a verified region. Replace with neutral UNKNOWN/NOT_CHECKED until backend health explicitly reports a verified connection; avoid asserting Mumbai/India residency until resource-level evidence is obtained.

### E2E suite coverage and limitations

- `e2e/login.spec.ts` covers site load, portal roots/refresh/history, login validation, multi-role switching and conditional authenticated role login. It has staging-only OTP capture guards for authenticated tests.
- `e2e/order-daily-help-lifecycle.spec.ts` includes guarded transactional flows for bargain/checkout/seller/delivery claim and OTP, Daily Help booking/provider start OTP/completion/history, and admin queue role restrictions. It uses synthetic run IDs and E2E token exchange; admin test is conditional on staging configuration.
- The order lifecycle suite's default API base URL is the Render backend URL. Auth token helper is configured to fail closed unless the backend is explicitly configured as staging with a strong shared secret and allowlisted identities, but the suite should still require an explicit non-production API host before any state-changing test is permitted.
- Playwright config defaults browser base URL to the bazaar hostname and captures screenshots/video plus traces on failure. Ensure artifacts never include live PII, OTPs, bearer tokens, seller documents or full addresses; restrict artifact access and retention.
- Existing suite source is useful coverage, but no test execution against an approved staging target was performed in this audit.

### Frontend release gates

1. Complete route-to-entry-to-component-to-API map for every portal; verify no unintended imports of another portal's dashboard in standalone builds.
2. Test direct deep link, refresh, back/forward, role switch and SSO handoff on the actual Render/Vercel host configuration.
3. Add storage tests for logout, expiry, account switching, corrupted cache, shared-device privacy and malicious backend URL.
4. Add request authorization/ownership tests server-side; client route guards are UX only.
5. Verify polling teardown, hidden-tab behavior, retry/backoff and multi-tab coordination.
6. Replace false-positive Oracle region/connected labels with source-of-truth health metadata.
7. Ensure synthetic-only E2E, strict staging target allowlist, restricted artifact retention and no secrets/PII in traces.

**Status:** Source structure and key state/effect risks are documented. Full consumer map, complete API endpoint/component call graph, standalone bundle dependency isolation, and actual hosting rewrite behavior remain unverified.


## Java Flyway migrations V14–V22 — DDL and upgrade-risk review

| Version | Source-observed purpose and schema impact | Key upgrade verification |
|---|---|---|
| V14 | Creates `NEGOTIATION_CHATS` and `CHAT_MESSAGES`, with product/seller/chat foreign keys and buyer/seller/time indexes. | Existing PRODUCTS/SELLERS schema must match expected key names/types; verify chat buyer identity normalization, cascade retention and duplicate-safe migration. |
| V15 | Adds `E2E_RUN_ID` to ORDERS, DAILY_HELP_BOOKINGS, NEGOTIATION_CHATS and USER_SESSIONS, with indexes. | E2E tagging must be staging-only; production rows must never be tagged/cleaned by broad run IDs. |
| V16 | Adds USER_ID to SELLERS, DELIVERY_AGENTS and DAILY_HELP_PROFESSIONALS; backfills by matching existing email/phone identity and adds indexes/FKs to USERS. | **High data-integrity risk:** verify deterministic matching, duplicate email/phone cases, collisions, unmatched profile rows, case/phone normalization and FK validation before applying to production. Capture pre/post unmatched and duplicate counts. |
| V17 | Adds account status/reason/timestamps to USERS; creates ADMIN_ACCOUNT_AUDIT and actor/target indexes. | Verify status constraints/transitions, immutable audit and session invalidation. |
| V18 | Adds STORE_OPEN to SELLERS and AVAILABLE_FOR_JOBS to DELIVERY_AGENTS with enabled defaults. | Confirm default availability does not unintentionally publish inactive/unapproved actors. |
| V19 | Adds seller coordinates/location verification, checkout group and fulfilment status to ORDERS; creates DELIVERY_CONFIGURATION and seeds config. | Verify singleton config key, default radius/route constraints, config audit/versioning, coordinates privacy and migration seed compatibility. |
| V20 | Adds fulfilment mode, rider payout snapshot/timestamp and combined delivery batch fields; backfills fulfilment mode. | Payout snapshot must be immutable after completion, explain calculation/version and reconcile with seller-direct payment/COD cash handling. |
| V21 | Adds OTP resend timeout to DELIVERY_CONFIGURATION, defaulting and repairing out-of-range values. | Ensure database constraints and service-level config validation agree; distributed rate limiting is still needed. |
| V22 | Adds bargain lifecycle/expiry fields and BARGAIN_NOTIFICATIONS; backfills accepted/pending status and one-day expiry for unaccepted chats. | Verify expiry semantics/time zone, scheduled expiry mechanism, notification idempotency, cascade retention and no stale bargain price at checkout. |

Java migration helpers use Oracle metadata checks for some columns/tables/indexes/FKs, but idempotent helper code does not guarantee atomicity or compatibility with every partially migrated schema. Oracle DDL implicit commits and partial-failure recovery need to be tested with disposable schemas and a documented restore/retry procedure.

### Specific data integrity risks

- V16 role-profile backfill is a critical migration: matching by email/phone can associate the wrong person if contact values are duplicated, recycled or inconsistently normalized. Before live apply, run read-only duplicate/unmatched reports and require explicit remediation; do not allow an automated ambiguous match to link accounts.
- V18 defaults seller store and delivery availability to enabled. Ensure approval/account status is independently enforced by all catalogue/dispatch queries.
- V20 rider payout snapshots must preserve the exact basis (distance/route/commission/config version) and never recalculate historical completed jobs using new settings.
- V22 bargain expiry must be enforced at every read/accept/checkout transition, not only by a background job. No scheduler was established in the targeted source review.
- V15 E2E run identifiers are powerful cleanup selectors. Cleanup service must validate a staging-only environment and exact run ownership; production route exposure must be impossible even if a secret is accidentally configured.

## Flyway diagnostics endpoint caveat

The current diagnostic SQL queries the Flyway history table using the quoted lowercase identifier `"flyway_schema_history"`. Oracle stores unquoted identifiers in uppercase; unless the table was created as a quoted lowercase name, this query can fail with table-not-found even when the standard Flyway table exists. Verify actual identifier/case and fix the query to use the database's actual name. The controller catches the exception and returns `historyStatus=ERROR`, so a failure must not be interpreted as absence of migrations. The same diagnostic currently checks V13 but does not verify all V14–V30 success rows or checksums.

## Background processing and timers — evidence boundary

Source review has positively identified:
- frontend backend synchronization every 45 seconds;
- frontend negotiation/notification polling every 4 seconds with interval cleanup;
- process-local portal handoff map with 60-second expiry/removal;
- process-local delivery resend throttle map (from earlier service scan).

No complete Spring `@Scheduled`, `@Async`, event-listener, WebSocket handler, executor, cache or message-broker inventory has yet been established. Do not infer bargain expiry, notification delivery, OTP throttling or cleanup is durable/distributed from frontend polling or process-local maps. The remaining source scan must verify actual scheduler registration, all expiry enforcement paths and restart/multi-instance behavior.


## Complete controller route inventory — source mapping snapshot

All route mappings below were extracted from controller source at the audit baseline. A route being listed does not imply its full method-level authorization/ownership test has passed.

| Controller | Base path / method paths |
|---|---|
| AuthController | `/auth/send-otp`, `/registration-check`, `/verify-otp`, `/portal-handoff`, `/portal-handoff/redeem`, `/me/roles`, `/onboarding-status`, `/me` GET/PUT, `/me/addresses` GET/POST, `/me/addresses/{addressId}` PUT, `/me/addresses/{addressId}/default` PUT, `/logout` |
| BuyerController | `/buyers/products/search`, `/orders` POST, `/orders/checkout` POST, `/orders/{orderId}/confirm-pickup` POST, `/me/orders` GET, `/orders/{orderId}/track` GET |
| SellerController | `/sellers/register` POST, `/me` GET, `/me/availability` PUT, `/me/products` GET/POST, `/me/products/{productId}` PUT/DELETE, `/me/orders` GET, `/me/orders/{orderId}/status` POST, `/me/discounts` GET/POST, `/me/discounts/{ruleId}` DELETE |
| DeliveryController | `/delivery/register` POST, `/me` GET, `/me/availability` PUT, `/jobs/available` GET, `/jobs/mine` GET, `/jobs/{orderId}/claim` POST, `/jobs/checkout/{checkoutGroupId}/claim` POST, `/jobs/{orderId}/confirm-pickup` POST, `/jobs/{orderId}/resend-otp` POST, `/jobs/{orderId}/verify-otp` POST |
| DailyHelpController | `/daily-help/services` GET, `/bookings` POST, `/availability` GET, `/professionals/register` POST, `/professionals/by-phone/{phone}` GET, `/professionals/{professionalId}/availability` POST, `/professionals/{professionalId}/slots` GET/POST, `/professionals/{professionalId}/slots/{slotId}` DELETE, `/professionals/{professionalId}/jobs/available` GET, `/professionals/{professionalId}/jobs/{bookingId}/accept` POST, `/professionals/{professionalId}/jobs` GET, `/professionals/{professionalId}/earnings` GET, `/bookings/latest` GET, `/bookings/{bookingId}` GET, `/bookings/{bookingId}/status` POST, `/bookings/{bookingId}/start` POST, `/bookings/{bookingId}/complete` POST |
| AdminController | `/admin/buyers` GET, `/sellers` GET, `/delivery` GET, `/analytics/demand-trends` GET, `/analytics/search-trends` GET, `/sellers/pending` GET, `/sellers/{sellerId}/approve` POST, `/sellers/{sellerId}/reject` POST, `/delivery/pending` GET, `/delivery/{agentId}/approve` POST, `/delivery/{agentId}/reject` POST, `/daily-help/helpers` GET, `/daily-help/helpers/{professionalId}/verification` POST, `/daily-help/helpers/{professionalId}/availability` POST, `/daily-help/services` GET/POST, `/daily-help/services/{serviceId}` PUT, `/accounts` GET, `/accounts/{userId}/status` POST, `/accounts/{userId}/revoke-sessions` POST, `/accounts/{userId}/audit` GET, `/delivery/configuration` GET/PUT, `/sellers/{sellerId}/location` POST |
| AdminDiagnosticsController | `/admin/diagnostics` GET |
| AdminSellerOnboardingController | `/admin/seller-leads` GET, `/admin/seller-leads/{leadId}` PATCH, `/admin/seller-leads/{leadId}/notes` GET/POST |
| SellerDocumentController | `/sellers/me/documents` POST/GET, `/admin/sellers/{sellerId}/documents` GET, `/admin/sellers/{sellerId}/documents/{documentId}` GET, `/admin/sellers/{sellerId}/documents/{documentId}/scan` POST, `/admin/sellers/{sellerId}/documents/{documentId}/verification` POST |
| SellerOnboardingLeadController | `/seller-registration/leads` POST, `/{leadId}/send-contact-otps` POST, `/{leadId}/verify-contact` POST, `/{leadId}/callback` POST |
| SellerRegistrationDraftController | `/sellers/me/draft` GET/PUT/DELETE |
| SellerRegistrationOtpConfigController | `/seller-registration/otp-settings` and `/registration/otp-settings` GET, `/admin/seller-registration/otp-settings` GET/PUT, `/admin/seller-registration/otp-settings/history` GET |
| SellerServiceAreaController | `/seller-service-area` GET/PUT |
| DeliveryTrackingController | `/tracking/delivery/{agentId}/location` POST, `/tracking/orders/{orderId}` GET |
| NegotiationChatController | `/negotiations` GET/POST, `/negotiations/notifications` GET, `/negotiations/notifications/{notificationId}/read` POST, `/negotiations/{chatId}/messages` POST, `/negotiations/{chatId}/offers/{offerId}/respond` POST |
| SearchAnalyticsController | `/analytics/search` POST |
| E2eAuthController | `/e2e/auth/token` POST |
| E2eOtpController | `/e2e/otp/latest` GET |
| E2eRunCleanupController | `/e2e/cleanup/{runId}` POST |
| HealthController | `/health` GET |

### Route inventory caveats

- Spring's servlet context path is `/api/v1`; table paths above are controller mappings and must be prefixed accordingly.
- E2E controllers are fail-closed by environment/shared-secret checks in source, but remain mapped routes. Verify production config cannot accidentally enable their secrets and that cleanup rejects non-staging environments at service layer.
- The complete method-level authorization review remains open for SellerController, AdminController, AuthController, registration flows, E2E cleanup, negotiation and all service methods. Explicit checks seen in a controller are not proof of database ownership constraints.
- The SecurityConfig public fallback makes omission of a controller/service guard a default-deny gap. Add route-level integration tests for every mapping, including HTTP method, role and owner.

## Additional transaction and asynchronous source scan

- `BuyerAddressService` has one `@Transactional` occurrence.
- `ProductService` has two read-only transaction annotations.
- `E2eRunCleanupService` has one transaction and direct `JdbcTemplate` cleanup writes.
- `E2eOtpCaptureService` stores captured OTP values in a process-local `ConcurrentHashMap`; it is not durable or shared across replicas and must remain staging-only.
- `ClamAvMalwareScanner` uses bounded socket connect/read timeouts, clamped between 1 and 15 seconds; application default is 5 seconds. Verify scanner network isolation and malware fail-closed behavior.
- `OtpDeliveryService` calls Resend email and MSG91 OTP APIs using Java HttpClient with 10-second connect/request timeouts. No durable retry/outbox or provider webhook reconciliation was established from this inspection. Avoid blind retries that can send duplicate OTPs; add provider request IDs, idempotency where supported and delivery status observability.
- GitHub code-search API returned incomplete results for scheduler/async/WebSocket searches; zero results from an incomplete search is not evidence that no such code exists. Full local repository grep or complete blob scan is still required.


## Critical transaction and concurrency review — Orders, Delivery and Daily Help

### Orders: positive controls observed

- `OrderService.placeOrder` is transactional. It consolidates duplicate product IDs, sorts them using a `TreeMap`, locks each product with `ProductRepository.findLockedByProductId` (PESSIMISTIC_WRITE), validates seller approval/open status, seller consistency, available stock and effective price, decrements stock and persists order/items in the same transaction.
- Accepted bargain price is re-read from accepted message/chat rows with matching product, seller and buyer, current agreed price, accepted state and no expiry. Client-supplied negotiated price is compared against server value.
- Pending chats are selected `FOR UPDATE` and closed as purchased in the standard-price checkout transaction; accepted bargain chats are closed after successful order persistence.
- Multi-seller checkout has its own transactional method and was previously source-observed to enforce seller limits and create grouped orders. Inspect complete method and failure-injection tests before claiming cross-seller atomicity verified.
- `OrderRepository` exposes pessimistic write locks for checkout groups and order IDs. Delivery claim/verification methods use them.

**Remaining tests:** concurrent checkout for last stock unit; two simultaneous multi-seller checkouts; seller closing store during checkout; bargain accept racing checkout; rollback when a later seller order/item insert fails; repeated checkout request/idempotency; coupon/discount revalidation; Oracle lock timeout/deadlock recovery.

### Delivery: positive controls and known gap

- Single-order claim uses `findLockedByOrderId`; combined checkout claim uses `findLockedByCheckoutGroupId`. Both validate agent profile ownership and current order/group readiness before assignment.
- Pickup confirmation, delivery OTP resend and delivery OTP verification use pessimistically locked order reads. OTP verification uses `findLockedForDeliveryVerification` and validates assigned agent, active state, pickup-before-completion and replay/status conditions.
- Combined group claim checks feature flag, seller count, fulfilment mode, all-orders-ready/unassigned and configured route limit before assigning the group.
- OTP resend throttling uses a synchronized process-local map. It is not cluster-wide, is lost on restart and can diverge between instances. Database lock on an order does not make the throttle map durable/distributed.
- `DeliveryController` claim accepts `agentId` in request parameters, but service checks the requested agent belongs to the authenticated user. Preserve this server-side binding and test a forged agentId.

**Remaining tests:** two riders claim same order/group simultaneously; resend from two replicas; restart during resend cooldown; OTP replay and five/sixth invalid attempts; grouped delivery partial failure; agent deactivation/session revocation during an active route; payout snapshot immutability and COD cash reconciliation.

### Daily Help: slot lock is present, but booking lifecycle lock use is inconsistent

- `createBooking` locks the selected slot using `findLockedBySlotId`, validates availability/professional verification/locality/exact start/duration/future time, marks slot BOOKED and saves booking in one transaction. This is a positive anti-double-booking control.
- `DailyHelpBookingRepository` provides `findLockedByBookingId` (PESSIMISTIC_WRITE).
- However, source reviewed methods `updateStatus`, `startBooking`, and `completeBooking` currently use `bookingRepository.findById` rather than `findLockedByBookingId`. Concurrent starts/completions/status updates may race; in particular concurrent invalid OTP attempts may read the same attempt count and fail to increment monotonically, while concurrent valid starts/completion can race state transitions.
- `startBooking` intentionally uses `@Transactional(noRollbackFor = ApiException.class)` so invalid OTP attempt increments commit even though API returns an error. That is a reasonable explicit requirement, but without pessimistic row lock it is vulnerable to concurrent-attempt lost updates. The method also accepts `professionalId` in request and checks it matches assigned professional; verify controller independently binds it to authenticated professional profile.
- Booking response exposes OTP conditionally; verify exact buyer-only visibility and that professional/admin endpoints never receive the OTP.

**High-priority recommended fix after Phase 0 sign-off:** use `findLockedByBookingId` for every state-mutating booking lifecycle command, validate allowed transition from current locked state, enforce one-time OTP consumption, and add concurrent integration tests. Add DB constraints where appropriate for unique slot/booking linkage and legal state values. Do not implement before checking migration/schema compatibility.

### Other transaction findings

- `AuthService.requireUser` loads session, checks expiry and account status; account suspension is enforced at service layer. Verify session revocation and account status updates are transactionally atomic with audit insert.
- `AuthService` links/creates Seller, Delivery and Daily Help profiles across repositories. This is cross-domain orchestration inside Identity and should become explicit application-layer contracts, not direct repository coupling.
- `DailyHelpService.startBooking` is the only observed `noRollbackFor = ApiException.class` case in the reviewed service set; it is documented in source as intentional for failed OTP attempt persistence.
- No explicit `@Version` field was observed in OrderEntity, DailyHelpBookingEntity or ProductEntity; critical paths instead rely on repository pessimistic locks. Verify every writer uses the locking method and Oracle supports the expected row locks.

**Test evidence limitation:** Existing unit/service tests and successful Maven CI do not establish true Oracle locking/concurrency behavior. Required tests must use an Oracle-compatible integration environment or a controlled Oracle staging schema with concurrent transactions.


## Consolidated Phase 0 exit matrix — 2026-11-03

This matrix separates source evidence from tests and runtime evidence. "Source reviewed" does not mean the risk is fixed or production-safe.

| Gate | Current evidence/status | Severity / owner | Closure evidence required |
|---|---|---|---|
| Architecture decision | Modular monolith with five domain modules and five portal build targets recorded; current runtime remains one Spring Boot app/JVM/Docker image. | Closed as a decision | Keep architecture docs and tests aligned; future extraction needs approval. |
| PR governance/docs | PR #227 merged; PR #228 source audit docs only, draft/unmerged. | In progress | Review/merge PR #228 after final CI/review; required branch protections and reviewers. |
| Security configuration secrets | Checked-in JWT/wallet fallback credential material in baseline config. | **Critical — release blocker**; Security/Platform | Rotate all exposed credentials; remove source defaults; fail-closed production config; scan current/history; prove separate staging/prod keys; invalidate old tokens. |
| Security default route policy | Catch-all `/**.permitAll()`; multiple public controller routes rely on method/service guards. | **High**; Backend/Security | Explicit public allowlist + authenticated default; exhaustive route negative tests. |
| Seller lead OTP/callback endpoints | Public leadId-based send/verify/callback methods; service controls not fully tested. | **High**; Identity/Marketplace | Entropy, contact binding, expiry, attempts, replay/rate-limit tests, consent/version evidence and enumeration resistance. |
| Public delivery registration response | Returns JPA DeliveryAgentEntity. | **High**; Delivery/Privacy | Narrow DTO; response serialization test; OTP/consent/anti-abuse/retention tests. |
| Daily Help state transitions | Booking creation locks slot; start/status/complete read booking without locked repository method. | **High**; Daily Help | Locked state transition methods, concurrent OTP/complete tests, Oracle integration evidence. |
| Orders/Delivery concurrency | Order stock and delivery claims use pessimistic locks in reviewed paths. | In progress; Orders/Delivery | Concurrency/failure-injection tests and Oracle lock/deadlock verification. |
| Process-local ephemeral state | Portal handoff, resend throttle and E2E OTP capture use in-memory maps. | **High/Medium**; Identity/Delivery/Test | Prove single-instance constraints or move to shared durable store; restart/replica tests; keep E2E capture staging-only. |
| Cross-domain persistence | AuthService and AdminController access repositories across domains; JdbcTemplate SQL in several domains. | **High architecture debt**; Backend Architecture | Complete writer map; domain-owned application contracts; FE/BE boundary tests after Phase 0. |
| Flyway migration source | V14–V30 source reviewed; Flyway enabled, baseline version 13, missing migrations ignored. | Partial; DBA/Backend | Oracle history/checksum and applied success evidence; blank-DB bootstrap tested; pre/post V16 identity matching reports. |
| Flyway diagnostic | Admin read-only endpoint exists; quoted lowercase history table identifier may not match Oracle's default uppercase identifier. | **Medium**; Backend/DBA | Verify actual table identifier; fix/read-only query; validate all migration rows and checksums. |
| Data model/constraints | JPA entity/table mapping and selected DDL reviewed. | Partial; DBA | Full schema metadata for PK/FK/check/index/unique/trigger/sequence/grants; row-level orphan/duplicate reports. |
| Frontend portal isolation | Five entry files/build targets exist; shared AppContext and general App.tsx import all dashboards. | Partial; Frontend | Bundle dependency audit and independent build/deep-link/refresh tests on actual hosts. |
| Browser storage/session | Bearer token and PII/cache keys stored in localStorage. | **High**; Security/Frontend | Threat model, XSS/CSP/dependency controls or secure cookie/token design; logout/account-switch/expiry tests. |
| E2E safety | Guarded staging token exchange and run tagging; E2E API base defaults to Render URL. | **High**; QA/Platform | Require explicit non-production API origin for state-changing tests; staging-only secrets; synthetic allowlisted accounts; restricted artifact retention. |
| Background work/WebSocket | Targeted scan found polling/process maps; complete server async/WebSocket inventory not proven. | Open; Backend | Full local grep/blob scan and runtime bean/route registration evidence; expiry/outbox/retry design. |
| External providers | Resend, MSG91, ClamAV, Google Routes configured/used in code; provider terms/regions and webhook/retry evidence incomplete. | Open; Platform/Privacy | Processor/subprocessor, region, retention, DPA, timeouts, retries, idempotency, webhook/auth, deletion evidence. |
| Production India-only hosting | Current dev backend Singapore verified previously; database/backup/logs/CDN/vendor/support access unknown. | **Critical launch gate**; Platform/Privacy | Resource-by-resource India region evidence, including DB, replicas, backups, logs, object storage, cache, support access and vendor flows. |
| Indian legal/regulatory register | Research and issue spotting recorded; applicability to actual company/fund flows/work model not professionally signed off. | Open; Founder + CA/legal/labour counsel | Incorporation proof; counsel/CA opinions; contracts; licences; tax/fund-flow and gig-worker applicability evidence. |
| Production runtime verification | No production security smoke, live migration proof, backup restore or disaster-recovery test in this audit. | Open; QA/Platform | Approved synthetic staging tests, production-safe smoke, restore/DR rehearsal and incident runbook evidence. |

### Phase 0 closure rule

Phase 0 is not a calendar milestone and cannot be marked complete by the volume of documentation or number of successful CI runs. It closes only when:
- every route, writer, table, task and integration has an accountable domain owner and security/data classification;
- critical workflows have state transition, transaction, idempotency, concurrency and negative authorization evidence;
- all Critical/High findings are fixed or have explicit approved containment and owner;
- database baseline and migration behavior are reproducible;
- India-only production data residency is demonstrated resource by resource;
- external vendor and legal applicability gaps are either evidenced or formally accepted by the accountable professional/owner.

**Current decision: Phase 0 remains OPEN.** The source audit has advanced substantially, but several release-blocking issues are now explicit. Do not start broad FE-1/BE-1 refactors or production launch until the critical gates are resolved.


## Revalidation and time-boxed completion plan — 2026-11-03

### Revalidation against current repository state

- Rechecked `main`: it still resolves to `4f6d919779454d41d592d01051da5189a9b60b43`; PR #228 is not merged and its latest head remains `d5ea5b6c47fb079122f865d1a065f5ca4ca226f2`.
- PR #228 workflow run `41528933203` completed successfully. Both reported jobs passed: frontend TypeScript checks and production build; Spring Boot Maven verification. This validates the documentation branch's build gates only, not the runtime/security/database claims.
- PR #228 remains draft/open, with no submitted reviews or inline review threads at recheck. It changes only this audit checkpoint document.
- PR #84 remains draft/open and unmerged. The current `main` Git tree still contains a tracked Oracle wallet archive. The archive was not downloaded, opened, parsed or reproduced. This is a **Critical exposed-secret-material finding**: treat wallet/database credentials as compromised until rotation/revocation is evidenced. The existence of PR #84 is not remediation; its merge/deployment prerequisites remain unresolved.
- The PR #84 branch must be reconciled against current main before any merge decision. Its documented secret-file and environment-variable setup must be validated against the actual application configuration and an isolated staging database. Do not deploy a configuration that makes the existing service unable to connect.
- The repository-wide tree enumeration returned 339 blobs and was not truncated. It confirms the inventory of controllers, services, repositories, entities, Java/SQL migrations, frontend portals/hooks/API modules and E2E workflows listed in this document. A tree listing alone does not establish complete method-level behavior.

### EDA / asynchronous / event-driven coverage

The phrase EDA is treated here as event-driven/asynchronous architecture coverage. It is a required Phase 0 audit dimension, not an assumed architectural pattern. The application is still a single Spring Boot modular monolith; no Kafka/event broker or independently deployed event-driven services are established by the current source evidence.

The following must be inventoried explicitly before closure:
- Spring application events: `@EventListener`, `@TransactionalEventListener`, publishers and listeners, including transaction phase and exception behavior.
- Scheduling/background execution: `@Scheduled`, `@Async`, executor beans, scheduler pools, process-local timers/maps and startup runners.
- WebSocket/STOMP endpoints, handshake authentication, origin policy, destination authorization, subscription ownership and message payload minimization.
- Polling and client-side timers, including negotiation polling, session refresh and backend synchronization; cleanup on unmount, tab visibility, role/token change and logout.
- Provider callbacks/webhooks, retries, outbox/inbox patterns, idempotency keys, dead-letter/reconciliation handling and duplicate delivery.
- In-memory state that disappears on restart or is inconsistent across instances, including OTP resend timestamps, portal handoff codes and E2E OTP capture.
- For every asynchronous flow: producer, trigger, payload/PII classification, transaction boundary, durable state, retry/backoff, deduplication, ordering, expiry, observability, owner and tests.

**Status:** not yet exhaustive. The prior targeted scans did not prove absence of these mechanisms. A full repository content scan plus runtime bean/endpoint registration evidence remains required.

### This-week execution sequence (3–9 November 2026)

| Work tranche | Required outputs | Exit evidence |
|---|---|---|
| 1. Critical secret and release controls | Confirm secret rotation/revocation owner and evidence; reconcile PR #84; remove tracked wallet material from reachable branches/history after rotation; fail startup when required production secrets are missing; tighten production CORS. | No secret material in current tracked tree/history after approved cleanup; new credentials validated without disclosure; CI and secret scanning pass. |
| 2. Complete backend source inventory | Every controller route and method; security matcher plus method/service guard; role and record ownership; all repository/JdbcTemplate/EntityManager/native SQL writes; table owner; transaction/lock/idempotency; all schedulers/events/WebSockets/executors. | Traceability matrix has no unclassified route/writer/task; anonymous, invalid-session, wrong-role and wrong-owner test cases mapped. |
| 3. Critical workflow integrity | Buyer checkout/order, seller fulfilment, delivery claim/pickup/OTP/completion, Daily Help booking/accept/start/complete, seller onboarding/document verification, OTP/auth/handoff, negotiation/bargain. | State machines, lock and transaction boundaries, failure rollback, retries and concurrency tests; fix Daily Help state-changing commands to lock rows before mutation. |
| 4. Flyway and Oracle | Reconcile V13 baseline and V14–V30 with actual `flyway_schema_history`; fix diagnostic query casing; compare migration checksums/status; validate clean database bootstrap and upgrade path. | Sanitized admin diagnostics output plus approved read-only Oracle metadata; isolated staging migration run and restart evidence. |
| 5. Frontend and E2E | Map portal route → component → hook/context → API → backend route; storage keys and PII; portal build boundaries; deep links/refresh; polling cleanup; E2E explicit staging origin and artifact retention. | Portal smoke/build tests and negative authorization E2E on isolated synthetic staging only. |
| 6. Data, hosting, legal and operations | Map every personal/business data category, storage/retention/deletion/backup/transfer; providers/subprocessors and regions; production India-only resources; incident/restore/DR; legal applicability decisions. | Resource-by-resource evidence, provider contracts/DPAs, retention/deletion tests, professional review and signed owner acceptance. |
| 7. Closure review | Consolidated risk register, owners, residual risks, evidence links and explicit go/no-go. | All Critical/High fixed or explicitly contained/accepted; no unknown critical path hidden behind a passing CI run. |

### Work boundaries and access dependencies

- Repository source review, documentation updates, local/CI checks and proposed code fixes can proceed through the authorized GitHub repository workflow.
- No Render environment variables, wallet files, Oracle credentials, production deployment settings or live data will be changed as part of this audit without explicit approval and a safe credential-rotation path.
- The lowest-friction database evidence request is a sanitized response from the authenticated admin diagnostics endpoint in the intended staging environment. Redact identifiers and all secrets; never send passwords, wallet files, bearer tokens or OTPs.
- Production India-only hosting remains a future production gate. Development/staging may remain in the current Singapore region with access controls and synthetic/minimized data; do not migrate staging merely to satisfy the production requirement.
- Oracle Free Trial expiry does not establish whether the database is still accessible or whether its schema/migrations are healthy. Confirm resource status and migration history through approved read-only access.

**Time-box decision:** aim to complete repository/source and CI-verifiable work by 9 November. Oracle runtime evidence, secret rotation, provider contracts/regions, India production residency and professional legal/tax/labour opinions depend on external access/owners; if those are not supplied, Phase 0 must remain OPEN with named blockers rather than be falsely marked complete.


## Phase boundary correction — 2026-11-03

### Phase 0 is analysis and readiness assessment only

The authorized Phase 0 scope is:
1. Discover and inventory the complete current system from repository and available read-only runtime evidence.
2. Map frontend portals/routes/components/hooks/API calls and backend controllers/services/repositories/entities/tables.
3. Map every data writer and SQL statement to domain owner, table, transaction, authorization/ownership check, idempotency and concurrency behavior.
4. Inventory every asynchronous/event-driven mechanism: Spring events, schedulers, async executors, WebSockets/STOMP, polling/timers, provider callbacks, retry/outbox/inbox behavior and process-local state.
5. Inspect every migration and compare intended changes with actual schema/history where read-only evidence is available.
6. Assess security, privacy, India data residency, legal/regulatory applicability, vendor/subprocessor flows, operational resilience and E2E safety.
7. Produce a prioritized risk register, evidence matrix, unresolved-access list, recommended implementation sequence and explicit Phase 0 exit decision.

### Explicitly out of scope until Phase 0 exit approval

- No application source-code fixes or refactoring.
- No database migration/schema/data changes.
- No dependency upgrades, frontend redesign or API contract changes.
- No deployment, environment variable, secret, wallet or hosting changes.
- No production or staging data mutation.
- No implementation PRs for audit findings.

Documentation-only changes to the Phase 0 audit record are permitted. Any implementation recommendation must be labelled **proposed — not implemented**.

### Correction to premature implementation attempt

PR #229 was opened prematurely with proposed Daily Help pessimistic locking and Flyway diagnostic identifier changes. It was closed unmerged immediately after the Phase 0 boundary was clarified. Its branch is not merged to `main`; neither proposed code change is approved, deployed or part of the current system baseline. Reassess both findings during the Phase 0 exit review, then implement only after a separate explicit approval.

### Required Phase 0 deliverables and acceptance tests

| Deliverable | Minimum acceptance criterion |
|---|---|
| System inventory | Every tracked runtime entry point, controller route, frontend route, service, repository, entity/table, migration, external integration and operational workflow has an owner or explicit UNKNOWN. |
| API authorization matrix | Every method has public/authenticated status, role, immutable actor identity, record ownership rule, validation, rate limit and negative test/evidence. |
| Data and SQL lineage | Every repository/JdbcTemplate/native SQL writer is mapped to table/columns, domain owner, caller, transaction, lock, side effect and PII/security classification. |
| EDA/asynchronous inventory | Each event/task/socket/poll/callback/retry/timer has producer, consumer, trigger, payload, transaction, durability, ordering, idempotency, retry/dead-letter, retention and observability documented; absence claims supported by exhaustive source scan and runtime registration evidence. |
| State/transaction catalogue | Checkout, order, bargain, seller onboarding, document scan, OTP, delivery, Daily Help and refund lifecycles have state diagrams, allowed transitions, invariants, transaction/locking and failure behavior mapped. |
| Database/migration assessment | V13 baseline assumptions, every available migration, checksums, Oracle object names/constraints/indexes, clean install and upgrade/rollback/recovery paths classified as source-verified, test-verified, runtime-verified or unknown. |
| Frontend/UI/API traceability | Each portal screen/route maps to components, fields/actions, state/effects/storage, API method and backend owner; responsive/accessibility and error/loading/empty states captured. |
| Data lifecycle/vendor map | Each data class maps collection/purpose, legal basis/notice, storage region, access, processor/subprocessor, transfer, retention, deletion, backup expiry and incident controls. |
| Legal/compliance register | Current law vs future commencement vs draft/proposal distinguished; applicability questions and evidence owners identified for counsel/CA/CS/labour/FSSAI/tax/payment review. |
| Risk register and exit decision | Critical/High/Medium/Low, evidence, impact, exploitability, mitigation options, owner, dependency and verification acceptance criteria; explicit go/no-go and residual UNKNOWNs. |

### Current Phase 0 decision

**OPEN — analysis incomplete.** The source audit has substantial findings, but the exhaustive EDA scan, all SQL/writer call sites, full route authorization matrix, frontend screen/API mapping, Oracle schema/history evidence, provider/data-residency map and legal applicability evidence are not yet complete. No implementation should begin until the Phase 0 deliverables above are reviewed and the user explicitly authorizes the next phase.


## Final repository-source verification tranche — 2026-11-03

### Baseline and scope verified

- Re-enumerated the current `main` Git tree: 339 tracked blobs; tree SHA equals main commit `4f6d919779454d41d592d01051da5189a9b60b43`.
- Tree includes 147 Java source files under backend main, 12 SQL/resource schema files, 107 TypeScript/JavaScript frontend files and four GitHub Actions workflow YAML files. These are file counts, not proof that every behavior has been semantically reviewed.
- Backend source paths include one Spring Boot application entry point, security configuration/filter, controllers, services, repositories, entities, DTOs, Java Flyway migrations V14–V22 and SQL migrations V22_1–V30.
- The tree contains no independently deployed backend service definitions in the application source inventory. Architecture remains one Spring Boot modular monolith; frontend has five portal entry points/build targets.
- The previous GitHub code-search attempts returned zero indexed results for annotation searches. Zero search hits are **not** evidence of absence; tree/blob inspection and local build/runtime inspection are needed for exhaustive negative claims.

### E2E cleanup guard — source-confirmed controls and residual risk

- `E2eRunCleanupController` calls `E2eRunTagging.requireAuthorized(runId, token)` before invoking cleanup.
- `E2eRunTagging` fails closed unless environment equals `staging`, configured shared token is at least 32 characters and matches using `MessageDigest.isEqual`; run ID must match `E2E-[A-Za-z0-9_-]{3,80}`.
- `E2eRunCleanupService` runs transactionally, pre-validates tagged orders/bookings/chats as synthetic before first write, restores synthetic product stock and deletes run-scoped rows.
- This is positive source evidence, not a proof of production configuration. Required runtime evidence: production env value is not staging; E2E secrets absent in production; negative tests against production-like configuration; staging test proves unsafe/mixed records abort without writes; rollback/foreign-key behavior verified on Oracle.
- E2E OTP capture is in-memory, allowlisted and enabled only when explicit flag + `staging` environment + nonempty allowlist are configured; captured OTP TTL is 180 seconds and consume removes it. Multi-instance/restart behavior is not durable by design; verify disabled in production and synthetic-only identities.

### Security and CORS source recheck

- `SecurityConfig` explicitly protects `/admin/**` with ROLE_ADMIN, but permits `/buyers/**`, `/sellers/**`, `/delivery/**` and then the catch-all `/**`. Session filter only establishes authentication when a bearer token is supplied; it does not reject missing/invalid credentials itself. Existing controller/service guards therefore remain a critical part of the effective policy. The authenticated-default route matrix and anonymous/wrong-role/wrong-owner tests remain an implementation gate.
- CORS is configured in two places: Spring Security's `CorsConfigurationSource` and an additional MVC `WebMvcConfigurer` bean in the application class. The allowed-origin sets differ (security includes multiple portal origins and localhost ports; MVC allows only the main site and localhost:4200). Effective preflight/credential behavior can depend on filter and MVC configuration order. Treat as **High configuration ambiguity** until one canonical policy is identified and tested for every portal origin, disallowed origin, credentialed request and OPTIONS preflight.
- `SecurityConfig` disables CSRF while CORS allows credentials. Current frontend bearer-token behavior may mitigate classic cookie CSRF, but if cookie authentication is adopted this combination must be revisited with explicit CSRF protection. Do not infer safe cookie auth from current configuration.
- `HealthController` returns only service/database UP/DEGRADED and avoids leaking exception/connection details; it proves connection validity only, not schema/migration correctness.

### Flyway diagnostics recheck — finding remains open

- Current `main` source still queries the quoted lowercase identifier `"flyway_schema_history"` in both latest-history and V13 checks. The proposed identifier correction was only in closed, unmerged PR #229; it is not in main.
- On standard Oracle Flyway installations using an unquoted object name, this quoted lowercase identifier will not resolve to the uppercase object. Diagnostic result may therefore show `historyStatus=ERROR`, `v13Status=UNKNOWN` even when history exists.
- Diagnostics covers a fixed table-count list and V13 only; it does not validate all V14–V30 versions/checksums, schema drift, indexes, constraints or migration repair state. It must not be represented as complete migration validation.

### Portal handoff and ephemeral state

- Authenticated portal handoff verifies that requested role is among the account's registered roles, creates a random UUID-derived code, expires after 60 seconds and removes the code on redemption; redemption rechecks role registration.
- Handoff map is process-local. A restart loses outstanding codes; multiple backend instances may create on one instance and redeem on another. Redeem response returns the bearer token to the target portal, so frontend URL/history/referrer cleanup, no-store headers, origin binding, rate limits, CSP and XSS protections remain important verification items.
- Delivery OTP resend throttle is also process-local `ConcurrentHashMap`; this is not a distributed rate limit and may reset on restart/replica. It must be included in future deployment topology and abuse-control design.

### Repository-only Phase 0 disposition

**Repository source discovery: substantially complete at inventory level; method-level evidence is not yet exhaustive.** The 339-blob tree is enumerated and the major backend/frontend/migration/test/workflow surfaces are identified. Focused source review confirms the high-risk areas in this report, including permissive catch-all authorization, duplicate CORS configuration, checked-in secret material, process-local coordination, and Oracle diagnostics identifier mismatch.

**Phase 0 overall: NOT CLOSED.** The following cannot honestly be marked complete from GitHub source alone:
1. Full method-by-method review of all 147 Java files and 107 frontend files, including every repository/SQL writer, DTO field, authorization branch and UI-to-API call.
2. Exhaustive negative proof for absence of scheduled tasks, event listeners, async executors, WebSocket/STOMP endpoints, hidden polling and callback wiring. GitHub code search returned no usable indexed results; no local checkout scan or runtime bean inventory was executed.
3. Oracle current schema, migration history/checksums, constraints/indexes, clean-database bootstrap and transaction/locking behavior.
4. Secret/wallet rotation and history cleanup evidence. Current main still tracks the wallet archive and configuration fallback material; treat exposed values as compromised. Do not reproduce secrets or alter them without an approved rotation path.
5. Provider/subprocessor contract, region, backups, log/telemetry, support access and data-transfer map needed to prove India-only production residency.
6. Executed end-to-end negative security, concurrency, restore/DR, incident response and real staging workflow evidence.
7. Formal Indian legal, tax, labour and food/payment regulatory applicability review by qualified professionals.

### Phase 0 exit decision

**NO-GO for implementation-phase start and production launch.** This is a completed decision based on current evidence, not a claim that every source method has been exhaustively audited. The audit has identified the architecture and principal Critical/High gates, but the remaining evidence items above are not waived.

Repository analysis may be called *source-inventory substantially complete*; Phase 0 as a whole remains **OPEN / evidence-gated** until the external and exhaustive verification items are either supplied or explicitly accepted as residual risks by the user with named owners. No application-code changes, schema changes or deployments are authorized by this audit update.


## Scale, performance and cost-optimization redesign baseline — 2026-11-03

The user has added an explicit programme objective: redesign parts of the platform during the completion journey when evidence shows that doing so improves performance, reliability or total cost at anticipated high user/order volume. This is an architectural constraint for the next phase, not permission for premature infrastructure expansion or speculative rewrites.

### Source observations

- Backend is one Spring Boot 3.3.4 / Java 17 application, one Oracle datasource, Hikari maximum pool size 10 and minimum idle 1. It is not five deployed backend microservices.
- JPA is configured with `open-in-view=false`, Hibernate JDBC batch size 25, and Flyway on application startup. Pool sizing and batch settings are configuration values, not proof of optimal throughput.
- Frontend builds five portal targets into separate output directories; `vite.config.ts` uses root base `/`. This is not proof that the static deploy is five isolated runtime apps or that deep links work on the current Render static host.
- Buyer/backend sync calls health and fetches backend data; auth bootstrap refreshes every 45 seconds.
- Negotiation chat polls every 4 seconds for buyer/seller roles and prevents overlapping refresh in the hook. At 1,000 concurrently open eligible clients this can imply up to 250 polling requests/second before other API traffic; at 10,000 clients, up to 2,500 requests/second. These are upper-bound arithmetic scenarios, not measured traffic or observed load. Polling must become visibility-aware, jittered, backed off and/or replaced by a durable event/notification mechanism only after measurement and cross-instance design.
- Maven includes `spring-boot-starter-websocket`, but source/runtime registration was not proven in this audit. Dependency presence alone does not mean WebSocket is enabled.
- OTP delivery makes synchronous provider HTTP requests with 10-second request timeouts. Under provider latency/failure, request threads can remain occupied; there is no source evidence yet of durable outbox/retry/idempotency or provider callback reconciliation.
- Delivery resend cooldown and portal handoff state are process-local maps. Horizontal scaling would make behavior inconsistent across replicas and restarts.
- Current schema/query patterns include order lists by buyer/seller/agent/status and Daily Help lists by locality/professional/status/time. Index adequacy must be checked against Oracle execution plans and actual cardinality; entity/repository method names alone do not prove index use.
- Local browser storage caches catalogue, orders, user/profile and cart data. Client caches must never become authoritative for prices, stock, permissions or payment state; minimize PII, TTL/version caches, isolate identities and clear account-bound state on logout/account switch.

### Optimization principles and target redesign (not yet implemented)

1. **Keep the modular monolith by default.** Preserve one JVM/deployment until measured CPU, memory, lock contention, deployment coupling or independent scaling requirements justify extraction. Enforce domain boundaries and prevent cross-domain repository access; do not create five services, Kafka or Kubernetes merely to anticipate growth.
2. **Measure before sizing.** Add privacy-safe request metrics (route template, status, latency percentiles), DB pool active/idle/pending, query latency, lock waits, provider latency/error, queue depth, cache hit/miss, frontend bundle size and Web Vitals. Never put OTPs, tokens, full phone/email, addresses, document names or message bodies in metric labels/logs.
3. **Establish workload scenarios.** Model at least 100, 1,000 and 10,000 concurrent active users; 1, 10 and 100 orders/minute; peak browse/search and chat sessions; seller/rider/admin concurrency; OTP bursts; and provider/DB degradation. These are load-test scenarios, not business forecasts. Include ramp, steady state, spike and soak.
4. **Database-first efficiency.** Capture Oracle AWR/ASH or approved equivalent, execution plans, rows examined, query counts, N+1 patterns, lock waits, connection acquisition and transaction duration. Add only evidence-backed indexes; use keyset pagination for growing feeds; bound admin result sets; select DTO projections; batch safe writes; keep transactions short; avoid external network calls inside DB transactions. Test indexes/migrations against production-like cardinality.
5. **Cache selectively and safely.** Cache public catalogue/service-area/config read models with bounded TTL and explicit invalidation/versioning. Do not cache authorization decisions, inventory availability, prices, order/payment/refund status or personal records without a strong consistency design. Start with in-process bounded caches only for immutable/low-churn data; distributed cache is a later evidence-driven option.
6. **Replace high-frequency polling economically.** First add tab visibility, jitter, adaptive backoff, conditional requests/ETags and incremental cursors to existing polling. Compare cost and operational burden of managed pub/sub, SSE or WebSocket against expected active sessions. Any cross-instance real-time transport requires shared broker/state, authorization per subscription, reconnect/backpressure, delivery semantics and India-region verification.
7. **Make external integrations resilient.** Move slow OTP/email/SMS and noncritical notifications to a durable outbox/worker when measured request pressure warrants; implement idempotency keys, provider message IDs, bounded retries with jitter, dead-letter/manual recovery, status reconciliation and per-provider rate limits. Never blindly retry a message that may already have been delivered.
8. **Control file/document costs and risk.** Avoid serving BLOBs through app memory for large downloads; evaluate India-resident object storage, encrypted quarantine, short-lived authorized downloads and lifecycle retention only after verifying provider residency, backups and access controls. Virus scan must fail closed; scanner outage should not mark documents clean.
9. **Frontend cost/performance.** Verify actual bundle graph per portal, route-level lazy loading, shared dependency duplication, image formats/sizes, CDN caching and static asset immutable hashes. Keep five portal builds only if they improve release isolation or bundle size; a single static deploy is acceptable if deep links, cache headers and rollback are reliable.
10. **Scale statelessly.** Before adding replicas, move session/handoff/rate-limit/OTP coordination to appropriate shared durable or atomic stores; verify idempotent jobs, DB pool multiplication (replicas × pool size), graceful shutdown, health/readiness, rolling deploy and regional failover.
11. **Optimize unit economics.** Track monthly cost per 1,000 active users, per 1,000 orders and per successful OTP; separate fixed baseline, variable traffic, storage/egress, database, observability, provider, support and backup/DR. Set budgets and alerts before increasing service tiers.
12. **India-only production remains mandatory.** Any cache, broker, queue, object store, analytics, CDN, backup or monitoring vendor introduced by optimization must satisfy the production India residency gate, including support/subprocessor access and disaster-recovery copies.

### Performance/cost gates required before implementation sign-off

- Baseline current p50/p95/p99 latency, error rate, throughput, CPU/memory, pool saturation, DB query/lock profile and frontend Web Vitals.
- Produce a workload-to-cost model for the 100/1k/10k concurrency scenarios with transparent assumptions and sensitivity ranges.
- Identify the top 10 expensive/high-volume endpoints and top 10 slow/expensive queries from real staging load, not guesswork.
- Establish SLOs and budgets per journey: registration/OTP, browse/search, checkout, seller fulfilment, delivery tracking, Daily Help booking, chat, admin.
- Load-test at 1x and 2x expected launch peak; demonstrate graceful degradation for DB/provider outages and avoid uncontrolled retry/polling amplification.
- Prove cost per successful OTP and cost per completed order, including failed/duplicate/retried requests.
- Add automated bundle-size and dependency checks; keep generated source maps private if they can expose source.
- Every proposed redesign must include current bottleneck evidence, target metric, expected monthly cost delta, migration/rollback plan, data/privacy impact, India residency evidence and test proof.

### Prioritized redesign candidates (discovery only)

| Priority | Candidate | Why it matters | Evidence needed before choosing a solution |
|---|---|---|---|
| P0 | Remove committed secrets; rotate credentials | Security incident containment; avoid expensive compromise | Rotation proof, revoked sessions, secret scan/history evidence |
| P0 | Fix default-deny authorization and CORS | Prevent unauthorized data access | Route matrix, negative tests, origin/preflight matrix |
| P1 | Polling/chat traffic reduction | 4-second polling scales linearly with active chat clients | Active-session distribution, request rates, DB query profile |
| P1 | Durable cross-instance rate limits/handoff | Current in-memory maps break under replicas/restarts | Replica/restart tests, abuse tests, latency/cost comparison |
| P1 | DB query/index/pagination optimization | Oracle is likely a primary cost and throughput constraint | AWR/plans, realistic cardinality, N+1 and lock profiling |
| P1 | OTP outbox and provider reconciliation | Slow synchronous calls tie up request threads and create uncertain delivery outcomes | Provider SLA/error/latency, duplicate rate, queue cost |
| P1 | Cache public read models | Reduce repeated catalogue/config reads | Hit-rate opportunity, freshness and invalidation requirements |
| P2 | Portal bundle isolation and CDN tuning | Reduce first-load time and static egress | Per-entry bundle analyzer, Web Vitals, cache-header tests |
| P2 | Managed real-time transport | Reduce polling only if chat traffic warrants it | Concurrent sessions, fanout, regional availability/cost |
| P2 | Object storage for seller documents | Lower app memory/storage coupling and improve lifecycle controls | BLOB size/volume, backup/retention, scanner flow, India region proof |

### Cost optimization decision

Do not purchase or deploy new infrastructure now solely for projected scale. First instrument and baseline. The likely high-return sequence is: remove avoidable polling, fix query/pagination/index behavior, bound caches, make OTP/provider handling resilient, and only then decide whether replicas, a shared cache/broker or service extraction are economically justified. A modular monolith with measured, efficient DB access is expected to be the lowest-complexity starting point for this marketplace.

