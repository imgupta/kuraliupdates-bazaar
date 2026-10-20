# Architecture

**Source of truth. Keep short.**

## Runtime
Browser → React/Vite → REST → Spring Boot → Oracle.

## Environments
- There is one deployed environment, designated **staging** by the owner; the public site/domain and Render API are that same staging environment. There is no separate production environment or second staging deployment.
- Synthetic end-to-end testing is performed on this single environment. Use scoped test fixtures and clean up only run-tagged synthetic records. Never rerun V13 as a routine cleanup loop.
- Verify Vercel alias, Render service/commit, and Oracle schema target independently. A deployment status alone does not establish end-to-end readiness.

## Frontend
Feature-oriented React:
- `components/` — UI
- `context/` — shared state
- `services/` — API clients
- `types/` — contracts
- `data/` — static/demo data

React is the only frontend. No Angular/RxJS/Angular CLI.

## Backend
`Controller → Service → DTO/Domain → Repository → Oracle`

- Controller: HTTP/auth/validation only.
- Service: use case + transaction boundary.
- Domain: business rules when needed.
- Repository: persistence only.
- DTO: public API contract; never expose JPA entities.
- Adapter/Strategy: only for genuinely interchangeable external behavior.

## Database
Flyway owns schema.
`V5__reset_application_schema.sql` is the clean application-schema rebuild.
`V13__reset_staging_test_data.sql` is a destructive staging-only data reset, not schema creation. Never run it on production, and never edit an applied migration.
Historical V1–V3 files are retained as Flyway history; do not reuse or modify them.
Use stable IDs, FK/unique/check constraints and query-driven indexes.

## Operational workflows

### Daily Help
- DAILY_HELP_SERVICES is the customer catalogue.
- Professionals own dated time slots in DAILY_HELP_PROFESSIONAL_SLOTS.
- A slot is bookable only when the slot is AVAILABLE and the professional is verified and AVAILABLE.
- Booking locks the selected slot and changes it to BOOKED in the same transaction.
- Professional availability is independent of the user's primary role; the authenticated phone must own the professional profile.

### Delivery
- Delivery approval is stored on DELIVERY_AGENTS.STATUS; only ACTIVE agents can access pickup jobs.
- `/delivery/me` resolves the approved agent from authenticated email/phone.
- Pickup jobs are server-authoritative READY_FOR_PICKUP orders.
- Claim and delivery OTP operations require the authenticated agent to own the delivery profile/order.
- The browser validates the four-digit format; the backend remains authoritative for the OTP, order association, assignment, status transition, and payout. Never log OTP contents.
- Successful end-to-end proof requires a staging order and agent, exact server order ID, persisted OTP association, server status read-back, and replay/invalid-code checks.

## Quality
```bash
npm run lint
npm run build
cd backend-java-spring && mvn clean verify
```


## Staging execution facts — 11 October 2026

- PR #36 (delivery OTP input regex and backend regression tests) is merged.
- Render is currently LIVE on `b970c391b040596128236fbb20be62a6e3cdff15`, which awaits the server-authoritative delivery claim and covers leading-zero, malformed and replayed OTP cases in tests.
- Vercel custom-domain metadata was observed READY on `a13681489990fe2d0910135845b420c49933b366`; this differs from the Render backend commit and must be treated as release skew until the deployment is aligned and verified.
- Startup logs reported Flyway schema version 13 and no pending migration. The owner identifies this environment as staging; before mutating end-to-end tests, verify the connected Oracle identity from an approved, sanitized source.
- The current health endpoint returns a static Oracle-connected label. It must not be used as database-identity proof or as definitive proof of a live database probe.


## Owner environment clarification — 11 October 2026
There is a single deployed environment, and the owner designates it as staging. Any older docs requiring a separate production/staging split or two isolated environments are superseded by this clarification. Do not infer there is another environment.


## Frontend domain refactoring — 20 October 2026

- Buyer profile and saved-address operations are isolated in `useBuyerProfileOperations` (PR #148).
- Authentication bootstrap side effects are isolated in `useAuthBootstrap`: backend sync scheduling, stored-session validation, one-time SSO handoff redemption, and registered-role refresh.
- `AppContext` remains the compatibility facade for existing UI consumers; this batch intentionally preserves its public contract.
- Authentication bootstrap is isolated in `useAuthBootstrap`; OTP login/registration, local buyer registration, and logout are isolated in `useAuthOperations`.
- Seller/admin/product/coupon operations are isolated in `useSellerAdminOperations`; order/delivery lifecycle operations are isolated in `useOrderDeliveryOperations`, composed by `useMarketplaceOperations` to preserve the public context contract.
- Daily Help provider state and workflows are isolated in `useDailyHelpProviderOperations`, with HTTP calls owned by `dailyHelpProviderApi`; the portal component remains a presentation layer and no new global context surface is introduced.
- The guarded transactional E2E now covers buyer→seller bargaining (counter, accept, reject), accepted-offer checkout validation, catalogue-price immutability, stock deduction, order fulfilment/delivery, and Daily Help booking/start/completion. These mutating scenarios run only with explicit staging opt-in and run-scoped synthetic fixtures; a PR CI pass alone does not mean they executed.
