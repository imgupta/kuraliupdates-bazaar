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
