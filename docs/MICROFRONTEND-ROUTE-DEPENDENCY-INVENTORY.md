# Microfrontend Route and Dependency Inventory

**Status:** Source-backed Phase 0 inventory; documentation only.  
**Baseline:** `main` at `8fa5f28367603c0fdbaf835b9677c2503cbd7358` when this inventory branch was created.  
**Purpose:** Identify existing route ownership and coupling before choosing any runtime extraction. This document does not authorize routing, domain, authentication, backend, or database changes.

## 1. Current deployment shape

- One React 19 + TypeScript + Vite application, built from the repository root.
- `vercel.json` rewrites all paths to `/index.html`; the SPA route resolver selects the view in the browser.
- Vercel project `kuraliupdates-bazaar` is not currently in a Vercel Microfrontends group.
- One deployed environment is designated **staging** by the owner. The public domains and Render API belong to this same environment; do not infer a second production environment.
- Spring Boot on Render remains the system of record. Frontends must not connect to Oracle directly.

## 2. Verified route registry and ownership

Source: `src/app/routing/routeConfig.ts`, `src/app/routing/roleRouteAccess.ts`, and `src/App.tsx`.

| Existing path | Current route kind | Current owner / behavior | Migration constraint |
|---|---|---|---|
| `/` | Home | Signed-in user sees the role dashboard; signed-out user sees `AuthPageV2` | Preserve current entry behavior |
| `/register/seller` | Register | `AuthPageV2`, seller registration | Keep as compatibility alias |
| `/register/delivery` | Register | `AuthPageV2`, delivery registration | Keep as compatibility alias |
| `/register/daily-help` | Register | `AuthPageV2`, professional registration | Keep as compatibility alias |
| `/register/buyer` | Register buyer | `BuyerRegistrationPage` | Separate route/component; do not accidentally redirect to generic auth |
| `/account` | Account | Signed-in user sees `BuyerAccountPage`; signed-out user sees `AuthPageV2` | Despite its name, this is shared account behavior; test all registered roles |
| `/buyer` | Role dashboard | BuyerHome plus global layout/overlays | Preserve deep-link and refresh behavior |
| `/seller` | Role dashboard | SellerDashboard plus global layout/overlays | Candidate future vertical slice only after auth/session contract is designed |
| `/delivery` | Role dashboard | DeliveryDashboard plus global layout/overlays | OTP, claim, completion, and location writes are high-risk; not first slice |
| `/daily-help` | Role dashboard | DailyHelpProfessionalDashboard plus global layout/overlays | Keep distinct from customer-facing Daily Help catalogue/booking |
| `/admin` | Role dashboard | AdminDashboard plus global layout/overlays | Keep server authorization authoritative |

Unknown paths currently fall back to the home route; a new routing layer must deliberately preserve or improve this behavior and add tests before a cutover. Client route guards are navigation UX, not backend authorization.

## 3. Composition and shared runtime dependencies

### Root composition

- `src/main.tsx` mounts the app error boundary.
- `src/App.tsx` mounts one `AppProvider` around `RootNavigation`.
- `RootNavigation` resolves the pathname, checks the requested role using session-derived state, and synchronizes the selected role.
- `MainLayout` renders the shared `Header`, role dashboard, global toast, cart drawer, checkout modal, order tracking modal, negotiation chat modal, and footer.
- The global overlays are mounted at layout level rather than inside the Buyer module. Their visibility and lifetime can cross role boundaries; move them only with explicit ownership and behavior tests.
- `Header` receives search/category state and setters through props and also consumes `useApp()`; it is not a presentation-only component.

### Shared state and transport

- `src/context/AppContext.tsx` remains a broad cross-role facade: authentication/session and registered roles, profile/addresses, product and seller state, cart/coupons, orders/delivery, chat/offers, shell/modal/toast state, backend health and synchronization.
- `src/services/api.ts` exports the large `bazaarApi` object. It reads the existing `kurali_auth_token` and `kurali_user_id` local-storage keys, chooses the API base from `VITE_API_BASE_URL` or the documented Render API fallback, and contains request/error/timeout behavior.
- Do not rename session storage keys, duplicate token state between frontends, pass bearer tokens in URLs, or change auth/session/OTP semantics as part of modularization.
- The existing app mixes direct `bazaarApi` calls in role dashboards with indirect calls through `AppContext`. A simple folder move does not create a module boundary.

## 4. Role boundary map and side-effect classification

| Target module | Main current consumers | Cross-boundary coupling | Backend side-effect risk |
|---|---|---|---|
| Buyer storefront | `BuyerHome`, `BuyerAccountPage`, cart/checkout, compare, chat, tracking, customer Daily Help | Root-owned cart and overlays; shared profile/address/session; Seller-owned product data; direct tracking API calls | High: order creation, profile/address changes, chat/offers, Daily Help booking |
| Seller portal | `SellerDashboard`, `SellerRegistrationModal` | Reads shared user/toast/modal state; direct seller product/order/discount APIs | High: product/discount CRUD and seller order status |
| Delivery portal | `DeliveryDashboard`, `DeliveryRegistrationModal`, `LiveOrderMap` | Shared orders/agents/context actions; imports `LiveOrderMap` from Buyer folder; direct delivery APIs | Critical: job claim, OTP resend/verification, completion, location publishing |
| Daily Help provider | `DailyHelpProfessionalDashboard` | Shared user/toast; direct professional, slot, job, earnings and booking APIs; timers/polling | Critical: availability/slot changes, job acceptance, booking start/completion and OTP |
| Admin portal | `AdminDashboard` | Shared users, sellers, products, orders, delivery agents and global role/session state; direct admin APIs | Critical: approvals and service/catalogue administration |
| Shared shell/auth | `App.tsx`, `Header`, `AppContext`, `AuthPageV2`, `BuyerRegistrationPage`, global overlays | Central route/session source, navigation, toast, cart/chat/tracking state | Critical: login/register/logout and cross-role session behavior |

Customer-facing Daily Help discovery and booking stays within Buyer; provider availability, jobs, service timer, history and earnings belong to the provider module. Do not combine these domains merely because they share the phrase “Daily Help.”

## 5. Important API/contract hazards

1. **Authentication/session:** one authoritative session contract is required before separately deployed apps. Current localStorage-backed transport and AppContext cannot be copied independently into each app without risking divergent login/logout state.
2. **Delivery job reads:** `getDeliveryAvailableJobs()` is authenticated and maps backend orders; the similarly named legacy raw method has different auth/response semantics. Do not alias or delete based on endpoint similarity.
3. **Tracking:** both `LiveOrderMap` and `OrderTrackingModal` call live tracking. Delivery currently imports the map from the Buyer directory. First decide whether this is generic shared UI or a delivery/tracking-owned feature, then test polling and cleanup.
4. **Polling/timers:** Delivery, Daily Help provider, Admin, and tracking surfaces use asynchronous refresh or timers. Preserve cadence, cleanup, stale-response behavior and error states during moves.
5. **Global overlays:** cart, checkout, tracking and chat are composed at root layout level. Moving a role dashboard without explicitly mapping these overlay contracts can silently break operations.
6. **Role security:** client role routing is not authorization evidence. Existing server checks and API contracts must remain authoritative.
7. **Legacy auth component:** `src/components/Auth/AuthPage.tsx` is not imported by `src/App.tsx`, but this does not prove repository-wide unreachability. Do not delete it until tracked imports, dynamic references, tests and its OTP/modal contracts are reviewed.
8. **Authenticated E2E:** a green CI run may include skipped role-specific authenticated tests when identities/OTP secrets are absent. Report skips honestly; read-only smoke is not proof of transactional role coverage.

## 6. Recommended migration sequence

### Phase 0 — complete before runtime changes
- [x] Record route registry and current view owners.
- [x] Record shared composition, context and API transport coupling.
- [x] Identify high-risk operations and existing cross-domain imports.
- [ ] Finish a source/test-linked transitive call graph for each route and child callback.
- [ ] Link each mutation family to exact protecting tests and record gaps.
- [ ] Confirm auth/session handoff design and route ownership for any independently deployed app.

### Phase 1 — modular monolith first
1. Add/extend deterministic tests for route ownership, session restore/logout and API contract hazards.
2. Establish explicit module public entry points and import boundaries inside the current Vite app, preserving `AppContext` as a compatibility facade.
3. Move no behavior while extracting the first pure, well-tested helper or shared UI component.
4. Select one bounded vertical slice only after dependencies and protecting tests are documented. Seller may be evaluated, but do not deploy it independently until session handoff and user/toast/modal dependencies are resolved.

### Phase 2 — independent frontend proof of concept
- Only after modular boundaries are tested, create a non-public preview proof of concept for one module.
- Compare Vercel Microfrontends with separate projects and explicit routing; choose one orchestration strategy before creating projects or changing aliases.
- Verify deep links, refresh, session expiry, logout propagation, API authorization, mobile layout and rollback on preview.
- Keep the existing public aliases and routes unchanged until the proof of concept passes all release gates.

## 7. Safety and release gates

- Shared staging checks remain read-only for transactional workflows.
- Do not create orders/bookings, change availability/inventory/approvals, claim delivery jobs, trigger OTP writes/resends, or publish location without a separately approved isolated test-data strategy.
- Do not change backend contracts, Oracle schema/data, auth/session semantics or public aliases as part of a documentation/structure-only change.
- Every runtime PR must pass typecheck, production build, relevant unit/contract tests, backend suite, guarded read-only staging API smoke and browser tests.
- Report authenticated test skips; never claim all five roles were exercised unless reports prove it.
- Record exact PR head SHA, post-merge SHA, deployment SHA and rollback procedure.

## Change log

- 2026-10-15: Added source-backed route and coupling inventory. Documentation only; no application code, Vercel routing, Render configuration or database records changed.


## Runtime boundary checkpoint — 17 October 2026

- Branch: `refactor/shared-live-order-map-boundary` (implementation PR pending review).
- Moved the `LiveOrderMap` implementation into `src/components/shared/LiveOrderMap.tsx`. The Delivery portal now imports the shared component instead of importing a component from the Buyer folder.
- Kept `src/components/Buyer/LiveOrderMap.tsx` as a backwards-compatible re-export so Buyer order tracking keeps its existing import path while consumers can migrate incrementally.
- Added `tests/moduleBoundaries.test.ts` to guard the Delivery-to-shared import and the Buyer compatibility re-export; added this test to the existing frontend CI workflow.
- Updated `E2E_TESTING.md` and `docs/POST_LOGIN_PLAYWRIGHT_E2E.md` to match the merged OTP cooldown behavior: one OTP send attempt, immediate check for an already captured OTP on HTTP 429, no 61-second sleep or retry. The docs also record the latest verified workflow #167 and clarify that a skipped report-publish job is not proof of a hosted report.
- This is a bounded shared-component ownership change, not yet five independently deployed micro-frontends. It does not change API payloads, polling intervals, map behavior, auth/session, backend, database, or deployment aliases.
- Validation status at PR creation: automated CI has not yet run for this branch. The required module-boundary test is now part of CI; do not mark the runtime change verified until the branch workflow passes.
