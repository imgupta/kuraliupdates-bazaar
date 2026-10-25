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
- Self-registration creates an unverified, OFFLINE professional profile. Only the root-admin verification workflow can approve/revoke verification; revocation forces OFFLINE, and the API rejects AVAILABLE status until verification is granted.
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


## Verified checkpoint — 21 October 2026

### Current state and safety boundary
- The owner-designated environment is the single shared staging deployment; there is no separate production environment. Do not run transactional tests against real customer data.
- PRs [#154](https://github.com/imgupta/kuraliupdates-bazaar/pull/154), [#155](https://github.com/imgupta/kuraliupdates-bazaar/pull/155), [#156](https://github.com/imgupta/kuraliupdates-bazaar/pull/156), and [#157](https://github.com/imgupta/kuraliupdates-bazaar/pull/157) are merged. They add/refine `.github/workflows/staging-role-fixture-preflight.yml`.
- Latest main CI run: [39484008873](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/39484008873) completed successfully for browser E2E/read-only API smoke, backend tests, frontend checks, and private Playwright report publication. This verifies the configured CI suite; it does **not** prove transactional order/Daily Help lifecycles ran.
- Latest staging role/fixture preflight: [39484008866](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/39484008866) failed on fixture/profile configuration checks. Buyer and Admin session/profile checks passed. Seller, Delivery, and Provider sessions were issued but their configured profile IDs did not match. The configured product was missing/not Buyer-visible; the Daily Help service was missing/inactive; and the scheduled start value was not in the required local ISO format.
- The preflight performs role token exchanges and read-only profile/catalogue/service/slot checks. It did not create orders/bookings, change inventory, send OTPs, or mutate business records.
- Keep `E2E_TRANSACTIONAL_FLOWS_ENABLED=false` until the existing `E2E_STAGING_CONFIG_JSON` fixture values pass preflight and synthetic-data isolation/cleanup are confirmed. Do not add separate per-field secrets or log secret values.

### Refactoring achieved
- Frontend runtime remains a React/Vite application with `AppContext` retained as a compatibility facade; no independent micro-frontend deployments have been introduced.
- Domain operation hooks have been extracted for Buyer profile/saved addresses, authentication bootstrap and login/registration/logout, Seller/Admin operations, order/delivery lifecycle, marketplace composition, and Daily Help provider operations. Daily Help provider HTTP calls are owned by `dailyHelpProviderApi`.
- `AppContextType` is extracted to `src/context/AppContextContract.ts`; guarded local-storage access is extracted to `src/shared/storage/safeStorage.ts`.
- Typed role/domain API facades exist for Buyer booking/tracking, Seller, Delivery, Daily Help Provider, Admin, and shared tracking. Where documented as a compatibility seam, they still delegate to `bazaarApi`; this does not mean all endpoint implementations have been moved out of `src/services/api.ts`.
- Authentication E2E configuration has been consolidated in the `E2E_STAGING_CONFIG_JSON` repository secret. The E2E auth endpoint and staging role checks have been guarded; PR #152 addressed Buyer role eligibility for staging E2E sessions.
- The guarded transactional suite is intended to cover buyer-to-seller bargaining (counter/accept/reject), accepted-offer checkout validation, catalogue-price immutability, stock deduction, order fulfilment/delivery, and Daily Help booking/start/completion. These scenarios remain **blocked from safe execution** until fixture preflight passes.

### Test coverage confirmed in the latest main CI
- Backend focused regressions and full backend verification suite: passed.
- Frontend TypeScript checks, route registry/access policy/cross-portal redirect tests, saved-address and user-profile mapping, Seller product mapping, module-boundary/public portal entry-point regressions, and Delivery OTP input validator regression: passed.
- Shared frontend production build and independently targeted role-portal builds: passed.
- Browser E2E and read-only API smoke: passed. Report artifact publication to the private report site: passed.
- Authenticated five-role fixture preflight: failed as described above; no transactional lifecycle result should be reported as passed.

### Pending work, in order
1. Correct existing `E2E_STAGING_CONFIG_JSON`: align Seller/Delivery/Provider identity-to-profile IDs; configure a Buyer-visible synthetic product owned by that Seller with sufficient stock; configure an active Daily Help service and available slot belonging to the configured professional; set `E2E_FLOW_DAILY_HELP_START` to the exact slot start in `YYYY-MM-DDTHH:mm:ss` local format and match duration.
2. Re-run the preflight workflow and require all five role/profile checks plus product/service/slot checks to pass.
3. Confirm database target and synthetic fixture ownership/isolation and define run-scoped cleanup before enabling any mutating order or booking test.
4. Only then execute and record bargaining/checkout/stock/order-delivery and Daily Help booking/start/completion lifecycles, including failure/replay/ownership cases where supported. Keep the run report explicit about skipped tests versus executed tests.
5. Continue frontend modularisation by moving endpoint implementations from `src/services/api.ts` into domain API modules, then split remaining AppContext state/actions/effects into tested domain hooks. Preserve API contracts, session/storage keys, timers/polling/geolocation cleanup, error semantics, routes, and UI behavior.
6. Refresh the deployment commit/status independently when a runtime change is merged; docs-only workflow PRs #154–#157 did not create a new Render backend build.



## Quota-aware micro-frontend build boundary — 21 October 2026

- Five role-specific HTML entry points and Vite build outputs exist: Buyer, Seller, Delivery, Daily Help Provider, and Admin.
- The build pipeline now uses changed-path classification: portal-only feature/entry changes select only the affected portal builds; shared runtime, dependency, Vite config, CSS, or unknown runtime changes fan out to all role portals.
- The combined Bazaar site remains a separate build target because it composes the role features. It is not being silently replaced by five new projects.
- Vercel per-project Ignore Build Step commands are documented in `docs/MICROFRONTEND-BUILD-STRATEGY.md`. These commands must be configured and verified in each existing Vercel project; repository changes do not modify Vercel dashboard settings.
- CI change detection fails safe: if commit comparison is unavailable, all five role portals are built. Documentation/test/workflow-only changes do not build role portals.
- This is a quota-aware deployment seam, not yet five independent source repositories or Module Federation. Shared React context, API client and auth/session contracts remain in the monorepo.
- No backend, database, secret, domain alias, Vercel project or staging business-data changes are included.


## Vercel ignore-build settings applied — 21 October 2026

- Configured `commandForIgnoringBuildStep` on the existing Vercel projects `kuraliupdates-buyer`, `kuraliupdates-seller`, `kuraliupdates-delivery`, `kuraliupdates-daily-help`, `kuraliupdates-admin`, and `kuraliupdates-bazaar`.
- No projects or domain aliases were created, removed, or reassigned. Build commands/output directories were not changed.
- Main commit `c8e4932e13c4189cdfbb5206b9bc57c213a55495` changed only build-support/tests/docs/workflow. Vercel inspection found no new READY deployments for this SHA; one Admin deployment was CANCELED, consistent with the ignore-build command.
- The full portal-only/shared-runtime Vercel decision matrix remains to be observed during a naturally occurring code change; do not spend build quota on synthetic deploys just to test it.
