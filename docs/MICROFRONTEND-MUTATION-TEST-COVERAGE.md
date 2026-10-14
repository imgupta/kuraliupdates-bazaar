# Microfrontend Mutation and Test-Coverage Map

**Status:** Phase 0 evidence map; documentation only.  
**Verified base:** `953de3d85742fc690f44e031935707cc6fb17055` (post-merge route inventory baseline).  
**Purpose:** Connect each candidate frontend boundary to source-level side effects and existing regression tests before extracting a separately deployed app.  
**Safety:** This map does not authorize test transactions on shared staging, role-data mutations, OTP actions, location publishing, database cleanup, or routing/deployment changes.

## 1. Evidence and current test baseline

Primary source files:
- Route ownership: `src/app/routing/routeConfig.ts`, `src/app/routing/roleRouteAccess.ts`, `src/App.tsx`.
- Shared state and action facade: `src/context/AppContext.tsx`.
- REST client and HTTP side effects: `src/services/api.ts`.
- Role screens: `src/components/Buyer/BuyerHome.tsx`, `CartDrawer.tsx`, `CheckoutModal.tsx`, `OrderTrackingModal.tsx`, `NegotiationChatModal.tsx`; `src/components/Seller/SellerDashboard.tsx`; `src/components/Delivery/DeliveryDashboard.tsx`; `src/components/DailyHelpProfessional/DailyHelpProfessionalDashboard.tsx`; `src/components/Admin/AdminDashboard.tsx`.
- Current focused frontend tests: `tests/routeConfig.test.ts`, `tests/roleRouteAccess.test.ts`, `tests/savedAddress.test.ts`, `tests/userProfile.test.ts`, `tests/sellerProduct.test.ts`.
- Browser E2E entry: `e2e/login.spec.ts`; workflow: `.github/workflows/e2e-login.yml`.
- Backend service tests include `OrderServiceTest.java`, `DeliveryServiceTest.java`, `DeliveryTrackingServiceTest.java`, `DailyHelpServiceTest.java`, `SellerServiceTest.java`, `ProductServiceTest.java`, `BuyerAddressServiceTest.java`, and `AuthRegistrationCheckTest.java` under `backend-java-spring/src/test/java/com/kuraliupdates/bazaar/service/`.

Current frontend unit tests cover route resolution/normalization, client-side role-access decisions, address/profile mapping, and seller-product mapping. They do **not** by themselves establish full browser role coverage, server authorization, or end-to-end mutation correctness. The E2E workflow can skip authenticated scenarios when dedicated test identities/OTP configuration are absent; inspect the actual run output before describing role E2E as passed.

## 2. Route-to-boundary and mutation map

| Candidate boundary | Verified source and shared dependencies | Mutating/externally visible operations | Existing test evidence | Gap / extraction gate |
|---|---|---|---|---|
| Buyer storefront | `src/App.tsx`; `BuyerHome`; `AppContext`; `api.ts`; global `Header`, cart drawer, checkout, tracking and chat overlays in `MainLayout` | Cart changes are local state; checkout calls `bazaarApi.placeOrder` through `AppContext.createOrder`; product search can POST `/analytics/search` when the query is non-empty; address create/update/default changes persist through buyer-address APIs; chat/message/offer operations may persist; tracking polling is read-oriented | Mapping tests for address/profile only; route/access tests; backend `OrderServiceTest` and `BuyerAddressServiceTest` | Add buyer API contract tests and browser tests for deep links, session restore, cart isolation, checkout request contract, address ownership and logout. Keep checkout and any search analytics out of unauthorised smoke probes. |
| Seller portal | `src/components/Seller/SellerDashboard.tsx`; `AppContext`; `api.ts` | Product create/update/delete; discount create/delete; seller order-status update; seller registration is also available through shared context/auth flow | `tests/sellerProduct.test.ts` verifies mapping only; backend `SellerServiceTest` and `ProductServiceTest` | Mapping test is not CRUD coverage. Add isolated API/component tests for seller scoping, validation, optimistic/error paths, order status transitions and discount lifecycle before extraction. |
| Delivery portal | `src/components/Delivery/DeliveryDashboard.tsx`; `AppContext`; `api.ts`; imports `LiveOrderMap` from Buyer component tree | Job claim; resend delivery OTP; OTP verification/completion; delivery-location POSTs; periodic reads every 10 seconds; global backend sync | Workflow has a source-level four-digit OTP validator regression check; backend `DeliveryServiceTest` and `DeliveryTrackingServiceTest` | OTP syntax is not proof of OTP authorization. Add mocked API contract tests for claim/verify/resend and location payload; test duplicate job de-duplication and timers; eliminate the cross-role map import before defining independent package ownership. Never use shared staging for OTP resend/verify or job claims as a smoke test. |
| Daily-help provider | `src/components/DailyHelpProfessional/DailyHelpProfessionalDashboard.tsx`; `AppContext`; `api.ts` | Provider registration; availability toggle; accept job; booking status transitions; start booking with OTP; complete booking; create/cancel slots; repeated reads and one-second timer refresh | Backend `DailyHelpServiceTest`; no dedicated frontend daily-help test file was found in the current repository tree | Add service/API contract tests for each state transition and slot boundary; verify timer cleanup and idempotency; distinguish safe GET-only previews from booking/availability writes. Do not run against shared staging with real provider records. |
| Admin portal | `src/components/Admin/AdminDashboard.tsx`; `AppContext`; `api.ts`; diagnostics/trends modules | Seller and delivery-agent approval/rejection; daily-help service create/update; diagnostics and analytics reads; polling every 45 seconds | Backend `AdminDiagnosticsControllerTest`; service tests for seller/daily-help/product domains; frontend role policy test only checks client-side authorization decisions | Add explicit admin API authorization tests and component tests for approval/service changes. Keep diagnostics read-only and ensure no admin mutation is included in ordinary smoke tests. |
| Authentication/account/shared shell | `src/App.tsx`; `AppContext`; `AuthPageV2`; `BuyerRegistrationPage`; `BuyerAccountPage`; `api.ts` | Login/registration and logout; token/session persistence in browser storage; profile/address changes; role synchronization; global cart, toast and modal state; background sync | `tests/roleRouteAccess.test.ts`, `tests/userProfile.test.ts`, `tests/savedAddress.test.ts`; backend `AuthRegistrationCheckTest` | Client route guards are not backend security. Specify one session authority, token storage/expiry, cross-app logout, role-switch and deep-link contracts before any app is independently deployed. |
| Shared API/telemetry layer | `src/services/api.ts`; imported by every role screen | Requests can be writes even when triggered by seemingly read-oriented UI: non-empty product search also POSTs analytics; dashboard timers repeatedly call APIs; delivery tracking posts location | Backend service tests cover some business logic; current frontend tests do not mock the full API client | Separate query from telemetry side effects where feasible; classify every API method by HTTP verb and business effect; add API contract tests and ensure polling cleanup. Do not assume a UI “view” is read-only without following the complete call graph. |

## 3. Concrete cross-cutting findings

1. **The current shared context is a broad coupling point.** `src/context/AppContext.tsx` combines auth/session and roles, profile/addresses, sellers/products/coupons, cart/orders, delivery actions, chat/offers, global overlays/toasts and backend synchronization. Splitting screens without first defining smaller interfaces would carry the monolith into each app.
2. **Global shell behavior is not yet app-local.** `src/App.tsx` wraps every route in `AppProvider`; `MainLayout` owns the shared header, toast, cart, checkout, order tracking, chat modal and footer. Route ownership does not equal deployable ownership.
3. **Session storage needs a documented contract.** `AppContext` reads/writes `kurali_auth_session`; `api.ts` reads `kurali_auth_token` and `kurali_user_id`. Define which values are canonical, expiry/refresh behavior and logout propagation before moving any authenticated route. Do not place tokens in cross-app URLs.
4. **Search can have a write side effect.** In `src/services/api.ts`, `searchProducts(query)` POSTs `/analytics/search` for a non-empty query after fetching products. A non-empty search is therefore not a strictly read-only probe.
5. **Role UI has transitive cross-role imports.** Delivery imports `LiveOrderMap` from the Buyer component tree. Trace this dependency and its styles/assets before creating package boundaries.
6. **Polling and timers are part of behavior.** Seller/admin/delivery/daily-help dashboards refresh periodically; delivery and daily-help also have timers. Verify cleanup, duplicate requests, stale state and retry/error behavior before extraction.
7. **The fallback route currently maps unknown paths to home.** Preserve this intentionally or separately approve a not-found behavior change; do not alter it as incidental migration cleanup.

## 4. Required test matrix before the first runtime extraction

- [ ] Route ownership and direct navigation/refresh for all current routes.
- [ ] Signed-out, expired-session, registered-role and wrong-role access paths for all five roles.
- [ ] Backend authorization independently rejects disallowed role operations; client guards are not the security boundary.
- [ ] Session restoration, logout and cross-app navigation contract documented and tested.
- [ ] API contract tests for each operation in the mutation map, including error, retry and duplicate-submit cases.
- [ ] Buyer checkout/address, seller CRUD/order transitions, delivery claim/OTP/location, daily-help booking/availability/slots, and admin approval/service operations tested against isolated mocks or an isolated test environment.
- [ ] Polling/timer cleanup and no duplicate requests verified.
- [ ] E2E job output inspected for skipped tests; skipped role flows must be reported as skipped, not passed.
- [ ] Read-only staging smoke checks use only health and explicitly read-only endpoints; no non-empty product-search analytics POST, OTP operations, location publishing, order/booking creation, approvals or DB cleanup.
- [ ] Exact frontend/backend SHAs and rollback steps recorded for each later deployment.

## 5. First-slice recommendation and decision gate

**Do not extract a runtime microfrontend yet.** Seller portal is a candidate for the first vertical slice because its primary route is distinct, but it still relies on the shared auth/session context and API client, and its CRUD/order operations require meaningful contract tests. First define the minimal session and API interfaces, add mocked seller API tests, and remove or formalize cross-role imports. Then build a non-public preview with the current backend contract unchanged.

No new Vercel project, Microfrontends group, domain/path cutover, Render change, Oracle change or shared-staging transaction is approved by this document.
