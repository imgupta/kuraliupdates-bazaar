# Frontend Domain Boundaries and Extraction Inventory

**Last updated:** 2026-10-13  
**Latest main commit:** `895864adcd0df99b06f93e41b33b0daa0fba1a1b` (docs-only PR #68; CI passed). **Latest verified READY deployment:** `7edd96455a57da73d76e03fdea817d30e629b577`, deployment `dpl_13kh7LcMfTADMQNUfdKte1V9JEHm`. No AppContext state/API-domain refactor has been merged.

## Purpose

Map the current monolithic frontend state and API layer into domains before moving code. This is a migration aid, not permission to perform a big-bang rewrite. Preserve user-visible behavior, API contracts, auth/session semantics, and the existing staging data.

## Current architectural facts

- `src/context/AppContext.tsx` is approximately 60,595 characters (~60.6 KB) and currently defines `AppProvider` and `useApp`.
- `src/services/api.ts` is approximately 50,147 characters (~50.1 KB) and exports a large `bazaarApi` object.
- `src/App.tsx` composes all five dashboards, shared header, cart/checkout/tracking/chat overlays, and route resolution.
- The route registry and access-policy helpers are pure modules under `src/app/routing/`.
- Existing `useApp` consumers should remain compatible during early extraction; do not update every dashboard in the first PR.
- Current auth/session storage keys include `kurali_auth_session` and `kurali_auth_token`. Do not rename, duplicate, or broaden access to them without a separately tested migration.

## Domain inventory observed in AppContext

| Domain | Current state/actions | Likely future boundary | Risk / guardrail |
|---|---|---|---|
| Authentication/session | `user`, `role`, `registeredRoles`; login/OTP, Google login, registration, logout; session/token persistence | `shared/auth` session contract and auth feature services | Highest risk. Keep one session source and existing OTP/auth semantics. |
| Buyer profile and addresses | `updateUserProfile`, `createBuyerAddress`, `updateBuyerAddress`, `setDefaultBuyerAddress`, `refreshBuyerAddresses`; profile mapper and saved-address mapper | `modules/buyer/profile` or `entities/address` + API adapter | Saved-address visibility previously regressed. Start with pure mapping tests and verify account screen before extracting behavior. |
| Catalogue and sellers | `products`, `sellers`, catalogue fetch/sync, seller profile/product operations | `modules/buyer/catalogue`, `modules/seller`, shared entity contracts | Catalogue and seller dashboard share data; define ownership and read contracts before moving. |
| Cart and coupons | `cart`, `appliedCoupon`, add/remove/update quantity, apply/remove coupon | `modules/buyer/cart` | Checkout totals and negotiated prices are sensitive to regressions. Add deterministic tests first. |
| Orders and checkout | `orders`, create/update order, checkout modal integration, tracking order ID | `entities/order`, buyer order UI, domain-specific API adapters | Never create live transactional test data for refactor verification. |
| Delivery operations | `deliveryAgents`, delivery job sync, claim job, complete delivery OTP, agent registration/approval | `modules/delivery` plus backend contracts | OTP validation/replay/agent ownership must not change during frontend modularisation. |
| Daily Help Provider | provider dashboard state/actions currently partly shared with backend sync and user role | `modules/daily-help-provider` | Buyer-facing Daily Help catalogue and booking remain buyer-facing; provider job timer/earnings remain provider-facing. |
| Admin workflows | seller/agent approvals, product/coupon management, role-specific operations | `modules/admin` | Backend permissions remain authoritative. Do not expose admin actions by URL or local role alone. |
| Negotiation/chat | `chats`, `activeChatId`, comparison product, offer/message methods | buyer/seller feature boundaries + shared contract if needed | Keep cross-role ownership explicit; avoid importing a dashboard directly into another role. |
| Shared UI state | toast, cart drawer, registration modal flags, selected locality, backend status/URL, comparing product, tracking ID | split between shell UI, buyer UI, and backend health/config | Do not move transient shell state into a new global domain store by default. |


## Initial consumer/API call-site survey (read-only inventory)

The following observations come from the current `main` snapshot (`1a8c1189`). They are a starting point for the full dependency map, not a complete transitive call graph. Exact `useApp()` destructuring was checked for Buyer Account, Seller, Delivery, Daily Help Provider, Admin, Header, and AuthPageV2.

| Consumer | Observed AppContext usage | Direct API usage observed | Extraction implication |
|---|---|---|---|
| `src/components/Buyer/BuyerAccountPage.tsx` | `user`, `orders`, `updateUserProfile`, `createBuyerAddress`, `updateBuyerAddress`, `setDefaultBuyerAddress`, `showToast` | None observed in this file | Strong candidate only after saved-address/default/refresh/display behavior is covered. |
| `src/components/Buyer/BuyerHome.tsx` | No direct `useApp()` in this file | None observed | Receives data/handlers through props; trace parent `App.tsx` and child components before assigning domain ownership. |
| `src/components/Seller/SellerDashboard.tsx` | `user`, `setIsSellerRegisterOpen`, `showToast` | `getCurrentSeller`, `getSellerProducts`, `getSellerOrders`, `getSellerDiscounts`, seller product CRUD, seller discount CRUD, seller order status update | Seller dashboard already calls the shared API object directly. Avoid simultaneously moving its UI/state and API layer. |
| `src/components/Delivery/DeliveryDashboard.tsx` | `currentAgent`, `deliveryAgents`, `orders`, `claimDeliveryJob`, `completeDelivery`, `setIsDeliveryRegisterOpen`, `showToast`, `syncWithBackend` | `getCurrentDeliveryAgent`, `getDeliveryAvailableJobs`, `updateDeliveryLocation`, `resendDeliveryOtp` | Delivery is side-effect sensitive; no OTP or assignment semantics changes. Trace all remaining methods and its map dependency. |
| `src/components/DailyHelpProfessional/DailyHelpProfessionalDashboard.tsx` | `user`, `showToast` | provider lookup, available/jobs/earnings/slots, provider registration, availability, accept/status, start OTP, complete booking, slot CRUD | Keep provider workflow distinct from buyer-facing Daily Help catalogue/booking. Treat start/complete as transactional. |
| `src/components/Admin/AdminDashboard.tsx` | `user`, `sellers`, `approveSeller`, `rejectSeller`, `approveDeliveryAgent`, `rejectDeliveryAgent`, `deliveryAgents`, `orders`, `products`, `setRole`, `setIsGmailAuthOpen`, `showToast` | admin sellers/pending sellers/delivery agents/analytics/buyers/search trends/daily-help data/diagnostics, seller/agent approvals, daily-help service CRUD | Admin operations require server authorization and should not be used in smoke tests that mutate data. |
| `src/components/Header.tsx` | `role`, `setRole`, `registeredRoles`, `user`, `logout`, `cart`, `setIsCartOpen`, `sellers`, `currentSeller`, `orders`, `setIsGmailAuthOpen`, `products` | None observed | Shared shell/navigation boundary. Role selection and route navigation must stay synchronized. |
| `src/components/Auth/AuthPageV2.tsx` | `loginWithOtp`, `registerUserWithOtp`, `showToast` | registration check, OTP send/verify, onboarding status | Keep out of role module extraction until routing and domain boundaries are stable. No OTP semantics changes. |

### Immediate next analysis task

Before choosing the first runtime extraction, inspect the full destructuring and callback use in each consumer above, then map each action through `AppContext` to the exact `bazaarApi` method and any local-storage/backend-sync effect. Mark actions as read-only, user-data mutation, or transactional. This is especially important because Seller, Delivery, Daily Help Provider, and Admin dashboards already call `bazaarApi` directly instead of relying exclusively on AppContext.

Do not claim these components are fully decoupled merely because direct calls are visible. The current architecture mixes direct API access with shared context; migration must preserve this mixed contract until each module is deliberately moved.


## AppContext compatibility contract (verified after PR #61)

The `AppContext.Provider` still exposes this public surface. Treat it as a compatibility contract until each consumer has been migrated deliberately:

- **Session/roles:** `role`, `registeredRoles`, `setRole`, `user`, `loginWithOtp`, `registerUserWithOtp`, `loginWithGoogle`, `logout`.
- **Profile/address:** `updateUserProfile`, `createBuyerAddress`, `updateBuyerAddress`, `setDefaultBuyerAddress`, `registerBuyer`.
- **Seller/catalogue/product administration:** `sellers`, `currentSeller`, `registerSeller`, `approveSeller`, `rejectSeller`, `updateSeller`, `products`, `addProduct`, `updateProduct`, `deleteProduct`.
- **Coupons/cart:** `coupons`, `addCoupon`, `deleteCoupon`, `cart`, `addToCart`, `removeFromCart`, `updateCartQuantity`, `clearCart`, `appliedCoupon`, `applyCoupon`, `removeCoupon`, `cartCalculations`.
- **Orders/delivery:** `orders`, `createOrder`, `updateOrderStatus`, `claimDeliveryJob`, `completeDelivery`, `deliveryAgents`, `currentAgent`, `registerDeliveryAgent`, `approveDeliveryAgent`.
- **Chat/offers:** `chats`, `openChatForProduct`, `sendMessage`, `respondToOffer`.
- **Shell/transient state:** `selectedCityLocality`, `setSelectedCityLocality`, `activeChatId`, `setActiveChatId`, `comparingProduct`, `setComparingProduct`, `trackingOrderId`, `setTrackingOrderId`, `isCartOpen`, `setIsCartOpen`, registration modal flags/setters, `isGmailAuthOpen`, `setIsGmailAuthOpen`, `toast`, `showToast`, `backendUrl`, `setBackendUrl`, `backendStatus`, `syncWithBackend`.

The saved-address mapper/type extraction preserves this contract; the type remains re-exported by `src/context/AppContext.tsx`.

### AppContext's current direct `bazaarApi` method inventory

`updateCurrentUser`, `createBuyerAddress`, `updateBuyerAddress`, `setDefaultBuyerAddress`, `getBuyerAddresses`, `getDeliveryAvailableJobs`, `checkHealth`, `searchProducts`, `getPendingSellers`, `getPendingDeliveryAgents`, `getMe`, `getRegisteredRoles`, `logout`, `registerSeller`, `approveSeller`, `rejectSeller`, `approveDeliveryAgent`, `rejectDeliveryAgent`, `addProduct`, `placeOrder`, `claimDeliveryJob`, `verifyDeliveryOtp`, `registerDeliveryAgent`.

This list is the directly observed inventory, not every API call made by the application. Role dashboards also call `bazaarApi` directly, as recorded in the consumer survey above. Preserve a compatibility export from `src/services/api.ts` if the API layer is later split.


## Suggested extraction sequence

1. **First, map consumers and dependencies.** Search all `useApp()` consumers and record which fields/actions each role uses. Do not infer ownership solely from names.
2. **Pure helper extraction first.** Select a pure mapper or adapter with no React state, localStorage, timers, or network side effects. Add tests before moving it.
3. **Saved-address/profile boundary candidate.** Because account addresses had a prior regression, only proceed after mapping all call sites and adding tests for identity mapping, default address, refresh ordering, and account display. Keep `useApp` methods as a facade initially.
4. **API domain grouping.** Split `bazaarApi` into domain modules only after inventorying method names and consumers. Preserve URLs, request bodies, auth headers, error behavior, timeout/abort behavior, and response mapping. Keep a compatibility export from `src/services/api.ts` while migrating.
5. **Catalogue/cart or seller feature boundary.** Pick the smaller measured dependency surface after step 1. Avoid combining state extraction with visual redesign.
6. **Role module boundaries.** Extract one role at a time with focused tests. Daily Help Provider is separate from buyer Daily Help booking/catalogue.
7. **Import boundary enforcement.** Add explicit allowed dependencies and tests after modules exist; do not enforce a proposed architecture before it reflects actual code.
8. **Micro-frontend evaluation.** Separate build/runtime deployment is a later decision after the monolith has testable domain boundaries.

## Required dependency map before first runtime extraction

Create a table with one row per consumer:
- file and role/module;
- `useApp` fields read;
- `useApp` actions called;
- API methods reached (directly or indirectly);
- localStorage/session dependencies;
- network effects/timers;
- whether the operation can mutate backend data;
- tests that protect behavior.

At minimum inspect `src/components/Buyer/BuyerAccountPage.tsx`, `src/components/Buyer/BuyerHome.tsx`, `src/components/Seller/SellerDashboard.tsx`, `src/components/Delivery/DeliveryDashboard.tsx`, `src/components/DailyHelpProfessional/DailyHelpProfessionalDashboard.tsx`, `src/components/Admin/AdminDashboard.tsx`, `src/components/Header.tsx`, and auth components.

## Verification checklist per extraction PR

- [ ] Baseline and changed dependency map documented.
- [ ] No backend/schema/OTP/auth semantics changed.
- [ ] `useApp` compatibility preserved unless explicitly approved.
- [ ] Pure helper tests cover normal, empty, malformed, and failure cases where applicable.
- [ ] TypeScript check passes.
- [ ] Frontend route and access-policy tests pass.
- [ ] Production build passes.
- [ ] Backend regression suite passes.
- [ ] Browser E2E passes; report any role-specific skips.
- [ ] Preview tied to the exact PR head is READY.
- [ ] After merge, post-merge CI passes and deployment is tied to the merged SHA.
- [ ] Read-only smoke checks ran (not merely skipped).
- [ ] This file, `docs/UI-MODULARIZATION-PLAN.md`, and `docs/CHATGPT-CONTINUATION.md` are updated.

## Open risks / unresolved items

- The latest post-merge CI passed, but the API smoke step was skipped due to missing API base URL workflow configuration. PR #60 adds a fallback to the documented staging API and a guard restricting smoke checks to that exact HTTPS host and `/api/v1` path. Its CI run #38210084448 passed all 10 read-only API checks; 5 authenticated role tests were skipped due to missing identity/OTP secrets.
- The current main deployment (`bcdc2f300cc8c8f5c3f0430d1ef81bb9d809c574`) is now `READY` and contains the route code from `1a8c1189`. Continue to record deployment ID and exact SHA for future runtime changes.
- Existing authenticated E2E coverage may skip roles when secrets/OTP are missing. Read test reports and environment setup; do not equate a green job with all five roles authenticated.
- Client-side route policy uses session-derived state for UX only; it is not a backend security control.
- No dedicated frontend test script exists in `package.json`; the workflow invokes Node's test runner with `tsx` directly.

## Change log

- 2026-10-12: Created inventory after PR #58 merged. No runtime extraction implemented.
- 2026-10-12: PR #60 made read-only API smoke checks execute by default with a strict staging API host/path guard; run #38210187887 passed 10/10 API checks. Post-merge run #38210267860 passed.
- 2026-10-12: PR #61 merged the saved-address mapper/type into `src/entities/address.ts`; `AppContext` re-exports the type. Exact-head CI and post-merge CI passed, and the merged deployment is `READY`.
- 2026-10-12: Added the current AppContext public compatibility contract and direct `bazaarApi` method inventory for new-chat continuation.
- 2026-10-12: PR #63 merged `UserProfile`/`mapServerUser` into `src/entities/userProfile.ts`, with compatibility re-export and regression tests. CI #38211026737 and post-merge CI #38211155596 passed; exact PR preview is `READY`. Main alias still points to `5a89345d`, so deployment verification remains a gate.


## Dependency-map checkpoint — 13 October 2026

This is a **partial, source-informed map**, not yet a complete transitive call graph. The direct consumer survey above remains the current evidence; before runtime extraction, trace child props and indirect `AppContext` actions to API methods, storage, timers, and mutation effects.

| Consumer / area | Confirmed dependency surface | Side-effect risk | Next read-only trace |
|---|---|---|---|
| Buyer account | `user`, `orders`, `updateUserProfile`, `createBuyerAddress`, `updateBuyerAddress`, `setDefaultBuyerAddress`, `showToast`; pure `toSavedAddress` and `mapServerUser` helpers | Medium: profile/address writes and refresh ordering | Trace mapper callers, address refresh and default selection; preserve zero coordinates and server-ID fallback. |
| Buyer home/catalogue | Mostly props from `App.tsx`; shared catalogue/seller data crosses buyer and seller ownership | Medium: cart, coupon, checkout and order creation are reachable in composed app | Trace `App.tsx` props and child handlers before deciding Buyer state ownership. |
| Seller dashboard | Context: `user`, `setIsSellerRegisterOpen`, `showToast`. Direct APIs: `getCurrentSeller`, `getSellerProducts`, `getSellerOrders`, `getSellerDiscounts`, `updateSellerProduct`, `createSellerProduct`, `deleteSellerProduct`, `createSellerDiscount`, `deleteSellerDiscount`, `updateSellerOrderStatus` | High: product/discount CRUD and order status updates | Record request/response contracts and error handling; do not combine API split with UI relocation. |
| Delivery dashboard | Context: `currentAgent`, `deliveryAgents`, `orders`, `claimDeliveryJob`, `completeDelivery`, `setIsDeliveryRegisterOpen`, `showToast`, `syncWithBackend`. Direct APIs: `getCurrentDeliveryAgent`, `getDeliveryAvailableJobs`, `updateDeliveryLocation`, `resendDeliveryOtp`; imports `LiveOrderMap` from Buyer | High: claim, OTP, status and location updates | Trace each handler, timer cleanup and map props; move truly shared map UI only after checking all consumers. |
| Daily Help Provider | Context: `user`, `showToast`. Direct APIs: `getDailyHelpProfessionalByPhone`, `getDailyHelpProfessionalAvailableJobs`, `getDailyHelpProfessionalJobs`, `getDailyHelpProfessionalEarnings`, `getDailyHelpProfessionalSlots`, `registerDailyHelpProfessional`, `updateDailyHelpProfessionalAvailability`, `acceptDailyHelpJob`, `updateDailyHelpBookingStatus`, `startDailyHelpBooking`, `completeDailyHelpBooking`, `createDailyHelpProfessionalSlot`, `cancelDailyHelpProfessionalSlot` | High: accept/start/complete and slot mutations | Separate provider-owned state from buyer catalogue/booking; document timer/polling cleanup and mutation failures. |
| Admin | Context: `user`, `sellers`, `approveSeller`, `rejectSeller`, `approveDeliveryAgent`, `rejectDeliveryAgent`, `deliveryAgents`, `orders`, `products`, `setRole`, `setIsGmailAuthOpen`, `showToast`. Direct APIs: `getAdminSellers`, `getPendingSellers`, `getAdminDeliveryAgents`, `getAdminAnalytics`, `getAdminBuyers`, `getAdminSearchTrends`, `getAdminDailyHelpServices`, `getAdminDailyHelpHelpers`, `getAdminDiagnostics`, `approveSeller`, `rejectSeller`, `approveDeliveryAgent`, `rejectDeliveryAgent`, `updateAdminDailyHelpService`, `createAdminDailyHelpService` | High: approvals and CRUD; server authorization must remain authoritative | Separate read-only dashboard queries from mutations; trace all remaining handlers and never run live mutation tests. |
| Header / shell | Context: `role`, `setRole`, `registeredRoles`, `user`, `logout`, `cart`, `setIsCartOpen`, `sellers`, `currentSeller`, `orders`, `setIsGmailAuthOpen`, `products`; imports `SearchSuggestions` from Buyer | High for auth/session regressions; shared UI state | Keep one auth/session source and existing storage keys; test direct route, refresh, Back/Forward and My Account. |
| Auth page | Context: `loginWithOtp`, `registerUserWithOtp`, `showToast`. Direct APIs: `checkRegistration`, `sendOtp`, `verifyOtp`, `getOnboardingStatus`; uses timeout cleanup | Critical: auth/session/OTP semantics | Exclude from early extraction; do not change OTP behavior, token keys, or session persistence. |

### Required completion before choosing a state/API extraction

- [ ] Search every `useApp()` call site and capture the exact fields/actions consumed, including child components.
- [ ] Inventory every `bazaarApi` method call by consumer, including indirect calls through `AppContext`.
- [ ] Record local/session storage, polling/timers, event listeners, and network effects per consumer.
- [ ] Classify each operation as read-only or backend-mutating and identify protecting tests.
- [ ] Resolve the Delivery → Buyer-folder `LiveOrderMap` dependency and document whether it is generic shared UI or a domain-owned feature.
- [ ] Verify the merged user-profile mapper SHA is live and read-only smoke checks run before runtime changes resume.


## Continuation checkpoint — 13 October 2026

- Latest `main` documentation checkpoint: `f2c354037ab2b25ba0f54397c2f535dd7325017d`.
- Latest merged runtime change remains the pure user-profile mapper in PR #63 (`a1ea642f4cf201053088d820dce3dced469b5bf2`); its CI passed, but that merged SHA is not yet confirmed on the live custom-domain aliases.
- Current verified alias is still deployment `dpl_HDZsaUHWJ9wJfKVrvCAkxbzRzhfm`, commit `5a89345dfe26b078e57fe9f30dc83656ebb834ee`.
- A newer Vercel preview exists for `feat/staging-e2e-otp-capture` at `996ba97d`, but it is not the main deployment and does not satisfy the mapper deployment gate.
- Vercel's check for `a1ea642f` reports a build-rate-limit failure (`upgradeToPro=build-rate-limit`). Do not retry repeatedly, bypass quota, or change billing/security settings automatically.
- Continue with read-only inventory and documentation only until a main deployment for `a1ea642f` is visible and read-only route/API smoke checks are confirmed. No backend, database, OTP/auth, localStorage, or runtime behavior changes in this checkpoint.


### Additional source evidence — direct API and shared-context bridge

The following method lists were extracted from the current `main` source snapshot and represent **direct call sites only**; they do not yet constitute full payload/error-contract tracing.

| Bridge / file | Observed API methods or effects | Implication |
|---|---|---|
| `src/context/AppContext.tsx` → `bazaarApi` | `updateCurrentUser`, `createBuyerAddress`, `updateBuyerAddress`, `setDefaultBuyerAddress`, `getBuyerAddresses`, `getDeliveryAvailableJobs`, `checkHealth`, `searchProducts`, `getPendingSellers`, `getPendingDeliveryAgents`, `getMe`, `getRegisteredRoles`, `logout`, `registerSeller`, `approveSeller`, `rejectSeller`, `approveDeliveryAgent`, `rejectDeliveryAgent`, `addProduct`, `placeOrder`, `claimDeliveryJob`, `verifyDeliveryOtp`, `registerDeliveryAgent` | These calls make `useApp` a compatibility facade over multiple domains. Trace each exposed action to exact endpoint, request shape, error/fallback semantics, and mutation classification before splitting state. This list is not exhaustive of the full `bazaarApi` object. |
| `src/services/api.ts` | Reads `kurali_auth_token` and `kurali_user_id` from `localStorage`; API base URL can come from `VITE_API_BASE_URL`, otherwise falls back to the documented Render `/api/v1` endpoint; request timeout helpers are present | Keep one transport/auth-header/error contract. Do not rename storage keys or change API base selection during domain extraction. |
| `src/App.tsx` | Composes all role dashboards, shared Header, buyer cart/checkout/tracking/chat overlays; listens for browser `popstate`; root context reads role/session state | Shell extraction should be composition-only first; route and overlay ownership must be explicit before splitting into app builds. |
| Delivery + Daily Help Provider + Admin dashboards | Each has `useEffect`-driven async work; Delivery and Daily Help Provider have intervals with cleanup; Admin also has interval-related code | Before moving components, trace interval cadence, cancellation, stale responses, and whether refresh triggers writes. Do not change polling semantics in a pure move. |
| `src/components/Buyer/BuyerHome.tsx` | No direct `useApp` or `bazaarApi` calls in the file snapshot; main dependencies are passed as props | Buyer state ownership is likely in `App.tsx`/descendants; trace prop graph rather than moving this component in isolation. |


- 2026-10-13: Source-read-only pass added exact direct `bazaarApi` call-site inventories for Seller, Delivery, Daily Help Provider, Admin, Auth and the AppContext bridge. The dependency map remains partial pending payload/error/side-effect tracing.


- CI caveat (13 October 2026): workflow run #42 (`38296500979`) was created for earlier PR head `1be287fee41e8429941de20c346a455ac6769449`. The docs have since been expanded and the current PR head is newer (`a912fff08094d293912b4dde6e7c1fc3aa333eb5` at the time of this note). Therefore run #42 does **not** validate the latest PR head. At last check its backend and frontend jobs passed, but the browser/read-only API smoke job was still in progress. Do not merge until a successful run is associated with the current head and its required checks are complete.


## Current continuation checkpoint — 13 October 2026

### Verified deployment and CI
- PR #65 merged: https://github.com/imgupta/kuraliupdates-bazaar/pull/65
- Merge/live SHA: `44374253b5fe3a5d65d946ffbece37d0b3cd1704`.
- CI run `38296784536` passed all three jobs, including read-only API smoke and browser E2E.
- Vercel deployment `dpl_GChRk727VyTCu2d6zBwThFVPE2NZ` is `READY` with root, www, and bazaar aliases. Read-only fetch of `https://www.kuraliupdates.com` returned HTTP 200.
- The earlier deployment quota blocker is cleared.

### Next bounded extraction — Seller product mapper
- Proposed branch: `refactor/extract-seller-product-mapper`.
- Source: `src/components/Seller/SellerDashboard.tsx` previously contained a pure `mapProduct(p, seller?)` function used after seller product list reads and product create/update responses.
- Target: `src/entities/sellerProduct.ts`, exported as `mapSellerProduct`; consumer imports the function and keeps both call sites.
- Preserve existing response coercions/defaults, nested seller-over-fallback precedence, image fallback, tags normalization, stock availability, and featured flag behavior.
- Regression suite: `tests/sellerProduct.test.ts`, invoked by the existing `.github/workflows/e2e-login.yml` frontend job.
- No endpoint, request/response contract, mutation, shared context, auth/session, localStorage, backend, or database changes.
- Verify exact-head CI and Vercel preview before merge. If checks fail, fix and re-run before moving to another domain.

### Dependency map status
- The cross-role inventory remains partial for payload/error semantics, timer cancellation/stale responses, and indirect API paths.
- This pure mapper extraction does not claim the state/API dependency map is complete. Complete that trace before extracting domain state or API clients.


## Dependency-map checkpoint — 13 October 2026 (after PR #66)

- Current main/deployed SHA: `9ee871abfb60d86cce3a396b816bf778e99f8e5d`; deployment `dpl_F1uvjC9QwBPdqPYJ6LH7eCkmQw6K` is `READY`.
- PR #66 extracted the pure Seller product mapper to `src/entities/sellerProduct.ts`; tests in `tests/sellerProduct.test.ts` protect mapping/default/coercion behavior. Both Seller dashboard call sites remain in place.
- CI run #38298764709 passed frontend, browser E2E/read-only smoke, and backend jobs.
- This extraction did not alter API calls, CRUD behavior, context state/actions, auth/session, localStorage, backend contracts, OTP, or database behavior.
- The map remains **partial**. Still trace each consumer's indirect `AppContext` actions to exact `bazaarApi` method/endpoint and request shape, response mapping, error/fallback behavior, storage/session effects, polling/timer/listener cleanup, and read-only vs mutating classification.
- Keep Delivery's import of `LiveOrderMap` from the Buyer folder explicitly unresolved until all consumers, props, and behavior are inspected.
- Do not start AppContext state/API-domain extraction until the required completion checklist below is fully checked. Preserve the modular-monolith approach and the one environment designated staging.


## Read-only side-effect and cadence trace — 13 October 2026

This section records source-observed behavior, not runtime test results. Line references are relative to the verified `main` source snapshot at `7edd96455a57da73d76e03fdea817d30e629b577`; source files were fetched read-only.

| Area | Observed dependency / cadence | Current risk and extraction constraint |
|---|---|---|
| `src/context/AppContext.tsx` | Reads/writes browser local storage through helpers; bridges profile/address writes and multiple `bazaarApi` methods. Calls backend sync every 45 seconds. A separate 45-second refresh path also loads delivery jobs. | Context is a compatibility facade, not a single domain store. Keep storage keys and refresh ordering stable. Review async completion ordering before splitting. |
| `src/services/api.ts` | Base URL is `VITE_API_BASE_URL` or the Render `/api/v1` fallback. Auth headers read `kurali_auth_token`; user-related calls also read `kurali_user_id`. Health has an 8-second abort timer; send OTP uses a 30-second timeout; verify OTP uses a 60-second timeout; `getMe` uses 4 seconds. | Transport/auth/error behavior is spread across method implementations. Do not change timeouts, headers, URL selection, or storage semantics during domain grouping. |
| Seller dashboard / API | Seller reads often return `null` or `[]` after caught errors; create/update/status/discount methods may throw with server message or HTTP status; deletes can return `false` for missing token and throw on HTTP error. | Preserve the current method-specific result/error contract. Do not normalize errors during mapper extraction. Product mapper extraction in PR #66 did not alter these calls. |
| Delivery dashboard | Refreshes current agent and available jobs every 10 seconds and clears the interval on unmount. Geolocation uses `watchPosition` and `clearWatch`; location posts are throttled to at least 10 seconds, normally require 15 m movement, and use a 30-second heartbeat. OTP resend is a mutating POST. | Location is a backend write, not a read-only smoke operation. Preserve watch cleanup and throttling; never exercise OTP resend in generic smoke tests. |
| `LiveOrderMap` | Imported by Delivery from `src/components/Buyer/LiveOrderMap.tsx`. Polls `getLiveTracking(orderId)` every 5 seconds and clears interval/blocks state updates after cleanup. Loads Google Maps only when configured with `VITE_GOOGLE_MAPS_API_KEY`. | It is a cross-domain UI dependency with direct API access and map SDK behavior. Move only after checking all consumers and defining a neutral shared location. The current component's fallback center and marker logic are part of existing behavior. |
| Daily Help Provider dashboard | Loads profile by `user.phone`, then jobs/history/earnings/slots; refreshes every 10 seconds; active service timer display ticks every second and cleans up the interval. Job accept, status, start OTP, complete, availability, and slot methods mutate backend state. | `load` has multiple sequential/parallel requests and updates component state; inspect stale-response/unmount handling before moving it. These mutations must never run against shared real records in routine checks. |
| Admin dashboard | Root-admin gate guards the dashboard data loader. Eight read calls are grouped with `Promise.all`; refresh repeats every 45 seconds. Seller/delivery approvals and Daily Help service create/update are mutating calls. | Keep the server-side authorization authoritative. Preserve all-or-nothing `Promise.all` behavior and distinguish read-only analytics from approvals/catalogue writes. |
| Auth page | Calls registration check, OTP send/verify, and onboarding status directly through `bazaarApi`; countdown/focus timers exist with cleanup for the countdown. | Critical auth/session boundary. Preserve OTP timeout and token/session behavior; exclude from early extraction. Verify each timer's cleanup before refactoring. |

### Error/fallback behavior is not uniform

Examples observed in `src/services/api.ts`:
- `getSellerProducts`, `getSellerOrders`, and `getSellerDiscounts` return `[]` on missing token or caught failure.
- `getCurrentSeller` returns `null` on missing token or caught failure.
- `createSellerProduct`, `updateSellerProduct`, `updateSellerOrderStatus`, and discount creation throw when the token is missing or the response is not OK.
- `deleteSellerProduct` / `deleteSellerDiscount` can return `false` for a missing token; HTTP failures throw.
- `placeOrder` catches failure and returns `null`; `verifyDeliveryOtp` returns a structured `{success, message}` object; `getLiveTracking` returns `null` on failure.
- Other API methods have additional per-method variants; this is a representative, not exhaustive, list.

Do not assume a returned empty array means the server had no records; it can also mean the request failed. Any future refactor must preserve or deliberately test the caller's current handling of these fallback values.

### Remaining map tasks

- [ ] Continue through all `bazaarApi` methods, recording endpoint, HTTP method, request payload/query, response mapping, auth header source, timeout, and error/fallback semantics.
- [ ] Trace all `useApp()` call sites, including nested child components and global shell overlays.
- [ ] Record each storage read/write and every polling timer/listener/geolocation watch, including cleanup and stale-response protection.
- [ ] Classify each operation as read-only, profile/catalogue mutation, approval/admin mutation, or transactional order/booking/OTP/location write.
- [ ] Resolve `LiveOrderMap` ownership only after searching all import sites.
- [ ] Check the latest workflow report for authenticated five-role tests being skipped; do not infer their execution from a green browser job.
- [ ] Keep this map marked partial until every row has evidence and review.


## Buyer and auth nested-consumer trace — 13 October 2026

| Consumer | Context/API dependencies observed | Polling / effects | Risk / constraint |
|---|---|---|---|
| `Buyer/CartDrawer.tsx` | `useApp()`; exact destructured members should be recorded from full declaration before extraction | No timer/storage effects observed in current file scan | Shared cart shell; preserve cart and overlay state compatibility. |
| `Buyer/CheckoutModal.tsx` | `cart`, `cartCalculations`, `createOrder`, `user` from `useApp` | One timeout in checkout UI | `createOrder` can place a transactional order. Do not exercise against shared real data in E2E smoke. |
| `Buyer/CompareSellersModal.tsx` | `products`, `sellers`, `addToCart`, `openChatForProduct`, `setIsCartOpen` | No timer/storage effects observed | Mixes catalogue, seller display, cart and chat entry points; avoid assigning ownership based on component folder alone. |
| `Buyer/DailyHelpHome.tsx` | `user`, `showToast`; direct API: `getDailyHelpServices`, `getLatestDailyHelpBooking`, `getDailyHelpBooking`, `getDailyHelpAvailableSlots`, `createDailyHelpBooking` | Booking refresh every 5s for `IN_PROGRESS`, otherwise 15s; elapsed-time display ticks every second while active | Booking creation is transactional; timer and refresh intervals must be cleaned up and stale requests guarded before moving code. |
| `Buyer/OrderTrackingModal.tsx` | `orders` from `useApp`; direct API: `getLiveTracking` | Tracking/OTP-related refresh every 5s | Overlaps with Delivery's `LiveOrderMap` polling. Determine whether both request identical data before extraction. |
| `Auth/AuthPage.tsx` (legacy-looking) | `loginWithOtp`, `registerUserWithOtp`, `showToast`; direct `sendOtp` and `verifyOtp` calls | Countdown via recursive timeout; delayed OTP input focus | Do not delete or merge until import/route reachability is verified. Preserve OTP flow semantics. |
| `Auth/BuyerRegistrationPage.tsx` | `registerUserWithOtp`, `showToast`; direct `checkRegistration`, `sendOtp`, `verifyOtp` | Countdown timeout | Auth/OTP-critical; route and error handling need explicit tests. |
| `Auth/GmailAuthModal.tsx` | `loginWithGoogle`, `user`, and registration modal setters | No timer/storage effects observed in current scan | Shared authentication modal toggles role-specific registration UI; preserve shell/context facade. |
| `Buyer/BuyerHome.tsx`, `SearchSuggestions.tsx`, `ProductCard.tsx`, `ProductDetailsModal.tsx` | No direct `useApp`/API call observed in their individual source snapshots (some are prop-driven) | No timer/storage effects observed in current scan | Trace parent-prop handlers before moving components. |

### Important distinction: tracking and booking

- `DailyHelpHome` is buyer-facing discovery and booking; `DailyHelpProfessionalDashboard` is provider-facing job execution. Do not combine them into one role module.
- `OrderTrackingModal` and `LiveOrderMap` both consume live tracking. Delivery imports `LiveOrderMap` from the Buyer folder. Before relocating tracking UI, search all imports and compare payload fields used by both components.
- Checkout `createOrder` and Daily Help `createDailyHelpBooking` are transactional paths. Keep the existing read-only smoke workflow from calling either.

### Inventory status

The scan covered all 38 `src/**/*.ts` and `src/**/*.tsx` paths for direct `useApp()`, `bazaarApi`, storage, timer and listener markers, with focused source inspection of the major role dashboards and Buyer/Auth consumers. This is a broad direct-call survey, **not yet a complete transitive contract map**: remaining work includes exact destructured fields in several shell/modal components, all endpoint payloads and response shapes, full error/fallback coverage, all storage writes and cleanup behavior, and mutation classification. Keep the required checklist above unchecked until those are traced and reviewed.


## API endpoint first-pass index — 13 October 2026

Source: `src/services/api.ts` at main baseline `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. This table is a **source-derived index**, not a complete request/response contract. Paths are normalized for readability; query/body fields, authorization details, per-method timeout, response mapping, and exact failure semantics still require manual tracing. Methods default to GET only where the implementation omits `method`; `searchProducts` additionally emits a best-effort analytics POST for non-empty searches.

| API method | HTTP method observed | Endpoint pattern | Initial effect classification |
|---|---|---|---|
| `checkHealth` | `GET` | `/health` | Read (verify exceptions) |
| `searchProducts` | `GET` + best-effort `POST` | `/buyers/products/search?query={query}` and `/analytics/search` | Read plus analytics side effect for non-empty query |
| `registerSeller` | `POST` | `/sellers/register` | Mutating/side-effect |
| `addProduct` | `POST` | `/sellers/{sellerId}/products` | Mutating/side-effect |
| `getCurrentSeller` | `GET` | `/sellers/me` | Read (verify exceptions) |
| `getSellerProducts` | `GET` | `/sellers/me/products` | Read (verify exceptions) |
| `createSellerProduct` | `POST` | `/sellers/me/products` | Mutating/side-effect |
| `updateSellerProduct` | `PUT` | `/sellers/me/products/{productId}` | Mutating/side-effect |
| `deleteSellerProduct` | `DELETE` | `/sellers/me/products/{productId}` | Mutating/side-effect |
| `getSellerOrders` | `GET` | `/sellers/me/orders` | Read (verify exceptions) |
| `updateSellerOrderStatus` | `POST` | `/sellers/me/orders/{orderId}/status?status={status}` | Mutating/side-effect |
| `getSellerDiscounts` | `GET` | `/sellers/me/discounts` | Read (verify exceptions) |
| `createSellerDiscount` | `POST` | `/sellers/me/discounts` | Mutating/side-effect |
| `deleteSellerDiscount` | `DELETE` | `/sellers/me/discounts/{ruleId}` | Mutating/side-effect |
| `getAdminDiagnostics` | `GET` | `/admin/diagnostics` | Read (verify exceptions) |
| `getAdminDailyHelpHelpers` | `GET` | `/admin/daily-help/helpers` | Read (verify exceptions) |
| `getAdminDailyHelpServices` | `GET` | `/admin/daily-help/services` | Read (verify exceptions) |
| `createAdminDailyHelpService` | `POST` | `/admin/daily-help/services` | Mutating/side-effect |
| `updateAdminDailyHelpService` | `PUT` | `/admin/daily-help/services/{serviceId}` | Mutating/side-effect |
| `getAdminSellers` | `GET` | `/admin/sellers` | Read (verify exceptions) |
| `getAdminDeliveryAgents` | `GET` | `/admin/delivery` | Read (verify exceptions) |
| `getAdminSearchTrends` | `GET` | `/admin/analytics/search-trends` | Read (verify exceptions) |
| `getAdminAnalytics` | `GET` | `/admin/analytics/demand-trends` | Read (verify exceptions) |
| `getPendingSellers` | `GET` | `/admin/sellers/pending` | Read (verify exceptions) |
| `getAdminBuyers` | `GET` | `/admin/buyers` | Read (verify exceptions) |
| `getPendingDeliveryAgents` | `GET` | `/admin/delivery/pending` | Read (verify exceptions) |
| `approveDeliveryAgent` | `POST` | `/admin/delivery/{agentId}/approve` | Mutating/side-effect |
| `rejectDeliveryAgent` | `POST` | `/admin/delivery/{agentId}/reject` | Mutating/side-effect |
| `getOnboardingStatus` | `GET` | `/auth/onboarding-status{query}` | Read (verify exceptions) |
| `approveSeller` | `POST` | `/admin/sellers/{sellerId}/approve` | Mutating/side-effect |
| `rejectSeller` | `POST` | `/admin/sellers/{sellerId}/reject` | Mutating/side-effect |
| `getDemandAnalytics` | `GET` | `/admin/analytics/demand-trends` | Read (verify exceptions) |
| `placeOrder` | `POST` | `/buyers/orders` | Mutating/side-effect |
| `trackOrder` | `GET` | `/buyers/orders/{orderId}/track` | Read (verify exceptions) |
| `getLiveTracking` | `GET` | `/tracking/orders/{orderId}` | Read (verify exceptions) |
| `resendDeliveryOtp` | `POST` | `/delivery/jobs/{orderId}/resend-otp` | Mutating/side-effect |
| `updateDeliveryLocation` | `POST` | `/tracking/delivery/{agentId}/location` | Mutating/side-effect |
| `registerDeliveryAgent` | `POST` | `/delivery/register` | Mutating/side-effect |
| `getAvailableDeliveryJobs` | `GET` | `/delivery/jobs/available` | Read (verify exceptions) |
| `claimDeliveryJob` | `POST` | `/delivery/jobs/{orderId}/claim?agentId={agentId}` | Mutating/side-effect |
| `verifyDeliveryOtp` | `POST` | `/delivery/jobs/{orderId}/verify-otp` | Mutating/side-effect |
| `checkRegistration` | `POST` | `/auth/registration-check` | Read-like validation/check despite POST verb; verify backend semantics |
| `sendOtp` | `POST` | `/auth/send-otp` | Mutating/side-effect |
| `verifyOtp` | `POST` | `/auth/verify-otp` | Mutating/side-effect |
| `updateCurrentUser` | `PUT` | `/auth/me` | Mutating/side-effect |
| `getBuyerAddresses` | `GET` | `/auth/me/addresses` | Read (verify exceptions) |
| `createBuyerAddress` | `POST` | `/auth/me/addresses` | Mutating/side-effect |
| `updateBuyerAddress` | `PUT` | `/auth/me/addresses/{addressId}` | Mutating/side-effect |
| `setDefaultBuyerAddress` | `PUT` | `/auth/me/addresses/{addressId}/default` | Mutating/side-effect |
| `getMe` | `GET` | `/auth/me?token={token}` | Read (verify exceptions) |
| `logout` | `POST` | `/auth/logout` | Mutating/side-effect |
| `getCurrentDeliveryAgent` | `GET` | `/delivery/me` | Read (verify exceptions) |
| `getDeliveryAvailableJobs` | `GET` | `/delivery/jobs/available` | Read (verify exceptions) |
| `getDailyHelpServices` | `GET` | `/daily-help/services` | Read (verify exceptions) |
| `createDailyHelpBooking` | `POST` | `/daily-help/bookings` | Mutating/side-effect |
| `getDailyHelpAvailableSlots` | `GET` | `/daily-help/availability?${params.toString(}` | Read (verify exceptions) |
| `getDailyHelpProfessionalSlots` | `GET` | `/daily-help/professionals/{professionalId}/slots?date={date}` | Read (verify exceptions) |
| `createDailyHelpProfessionalSlot` | `POST` | `/daily-help/professionals/{professionalId}/slots` | Mutating/side-effect |
| `cancelDailyHelpProfessionalSlot` | `DELETE` | `/daily-help/professionals/{professionalId}/slots/{slotId}` | Mutating/side-effect |
| `getLatestDailyHelpBooking` | `GET` | `/daily-help/bookings/latest?buyerPhone={buyerPhone}` | Read (verify exceptions) |
| `getDailyHelpBooking` | `GET` | `/daily-help/bookings/{bookingId}` | Read (verify exceptions) |
| `registerDailyHelpProfessional` | `POST` | `/daily-help/professionals/register` | Mutating/side-effect |
| `getDailyHelpProfessionalByPhone` | `GET` | `/daily-help/professionals/by-phone/{phone}` | Read (verify exceptions) |
| `updateDailyHelpProfessionalAvailability` | `POST` | `/daily-help/professionals/{professionalId}/availability` | Mutating/side-effect |
| `getRegisteredRoles` | `GET` | `/auth/me/roles` | Read (verify exceptions) |
| `getDailyHelpProfessionalAvailableJobs` | `GET` | `/daily-help/professionals/{professionalId}/jobs/available` | Read (verify exceptions) |
| `acceptDailyHelpJob` | `POST` | `/daily-help/professionals/{professionalId}/jobs/{bookingId}/accept` | Mutating/side-effect |
| `getDailyHelpProfessionalJobs` | `GET` | `/daily-help/professionals/{professionalId}/jobs` | Read (verify exceptions) |
| `getDailyHelpProfessionalEarnings` | `GET` | `/daily-help/professionals/{professionalId}/earnings` | Read (verify exceptions) |
| `updateDailyHelpBookingStatus` | `POST` | `/daily-help/bookings/{bookingId}/status` | Mutating/side-effect |
| `startDailyHelpBooking` | `POST` | `/daily-help/bookings/{bookingId}/start` | Mutating/side-effect |
| `completeDailyHelpBooking` | `POST` | `/daily-help/bookings/{bookingId}/complete?professionalId={professionalId}` | Mutating/side-effect |

### API contract trace still required

- [ ] For each method above, record exact body/query schema, headers and token source, timeout/abort behavior, response mapper, HTTP non-OK handling, catch fallback, and caller behavior.
- [ ] Check methods with multiple fetches or analytics side effects individually; this index is generated from source patterns and must not be treated as authoritative for those cases.
- [ ] Link each method to its direct component caller and any AppContext bridge; mark transactional writes separately from profile/catalogue/admin mutations.
- [ ] Confirm API method inventory is complete against every property exported on `bazaarApi` and identify unreferenced methods.


## Latest verification checkpoint — 13 October 2026, PR #69

- PR #69 merged: https://github.com/imgupta/kuraliupdates-bazaar/pull/69, merge SHA `0659a5e82d9eab755d017a6e8abdd8a0588f60db`.
- Post-merge workflow #38301147128 passed all three jobs (frontend checks, backend tests, browser E2E/read-only smoke): https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38301147128.
- Vercel deployment `dpl_CRKcGhvm2HMzFWzNhQEgRYWQXeQe` is READY for the exact merged SHA; aliases include `kuraliupdates.com`, `www.kuraliupdates.com`, and `bazaar.kuraliupdates.com`.
- PR #69 only extended dependency documentation; no runtime behavior changed. The complete transitive dependency map is still **not complete**, and authenticated E2E for all five roles remains unproven until non-skipped role test results are inspected.
- Next bounded task: manually verify the endpoint index against all `bazaarApi` exports and add payload/error/timeout details for one domain at a time. Do not begin state/API extraction yet.


## Auth/profile API contract trace — source inspection, 13 October 2026

Source reviewed: `src/services/api.ts`, blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. These are client-side contracts as implemented, not a substitute for backend controller/security verification. Keep the behavior exactly as-is during modularisation.

| Method | Request contract | Auth / timeout | Response and failure contract | Effect |
|---|---|---|---|---|
| `checkRegistration(email, phone, role)` | `POST /auth/registration-check`; JSON `{ email, phone, role }` | No bearer header; no explicit timeout | Parses JSON, defaulting to `{}`; non-2xx returns `{success:false,message: server message or fallback}`; network failure returns fixed unavailable message | Read-like registration eligibility check despite POST verb; backend semantics still need confirmation |
| `sendOtp(identifier, type, mode)` | `POST /auth/send-otp`; JSON `{identifier,type,mode}`; type EMAIL/PHONE, mode LOGIN/REGISTER | No bearer header; AbortController at 30s | Parses JSON with fallback; LOGIN+404 has a specific “register first” message; other non-2xx returns server/fallback message; abort/network error returns structured failure | External/auth side effect; must not be triggered in routine live smoke |
| `verifyOtp(payload)` | `POST /auth/verify-otp`; sends the supplied typed payload as JSON (includes optional role/profile/onboarding fields and OTP fields) | No bearer header in this request; 60s AbortController, always cleared in `finally` | Non-2xx returns structured failure using server message; malformed JSON returns invalid-response message; abort explicitly warns the OTP may need a fresh request; other network errors return unavailable | Critical transactional auth/session operation: consumes OTP and creates session; never exercise against shared data without isolated staging test mechanism |
| `getOnboardingStatus(token, role?)` | `GET /auth/onboarding-status`, optional encoded `role` query | Explicit Bearer token; no explicit timeout | JSON parse fallback `{success:false}`; non-2xx returns structured failure; catch returns structured failure with error message | Read |
| `getMe(token)` | `GET /auth/me?token={encoded token}` | Bearer header **and** token in query string; 4s AbortController | Successful response JSON returned as-is; non-OK, timeout, or network error collapses to `{authenticated:false}`; logs caught error message | Read/session validation; token-in-query is existing behavior and must not be changed in this extraction |
| `getRegisteredRoles(token)` | `GET /auth/me/roles` | Bearer token; no explicit timeout | Returns `data.roles` only when `data.success` and array; non-OK, malformed shape, or exception defaults to `['BUYER']` | Read; fallback can mask a failed role lookup |
| `logout(token)` | `POST /auth/logout`; JSON `{token}` | Bearer header and body token; no explicit timeout | Ignores network errors and always returns success-shaped `{success:true,message:'Logged out successfully'}` | Auth/session mutation; UI success does not prove server invalidation |
| `updateCurrentUser(token, updates)` | `PUT /auth/me`; JSON updates object | Bearer token; no explicit timeout | Parses response or fallback; non-OK and network error return structured failure | Profile mutation |
| `getBuyerAddresses(token)` | `GET /auth/me/addresses` | Bearer token; no explicit timeout | Only array JSON is accepted; non-OK, non-array, or exception returns `null` | Read; `null` does not mean an empty address list |
| `createBuyerAddress(token, address)` | `POST /auth/me/addresses`; JSON address object | Bearer token; no explicit timeout | Parses JSON with null fallback; returns response JSON only if OK, otherwise `null` | Profile/address mutation |
| `updateBuyerAddress(token, addressId, address)` | `PUT /auth/me/addresses/{encoded addressId}`; JSON address object | Bearer token; no explicit timeout | Parses JSON with null fallback; returns JSON only if OK, otherwise `null` | Profile/address mutation |
| `setDefaultBuyerAddress(token, addressId)` | `PUT /auth/me/addresses/{encoded addressId}/default`; no body | Bearer token; no explicit timeout | Parses JSON with null fallback; returns JSON only if OK, otherwise `null` | Profile/address mutation |

### Contract observations and cautions

- OTP send/verify calls do not attach a bearer token in their request options; this is distinct from session-protected methods.
- `getMe` transmits the token in both the query string and Authorization header. Record this as existing behavior, not as a recommendation; any security change requires a separately scoped backend/client review.
- `getRegisteredRoles` falls back to BUYER on request or shape failure. Do not interpret this fallback as proof that BUYER is the only registered role.
- `logout` reports success even when the network request fails. Session clearing elsewhere in the caller must be traced separately.
- Address reads distinguish failure (`null`) from an empty array; address writes also return `null` on non-OK/network failure. Trace AppContext callers to determine whether they preserve or hide that distinction.
- No runtime change was made. This trace is based on client source only; server-side validation, authorization, OTP persistence, and endpoint idempotency are not asserted here.

### Next API contract slice

- [x] Trace Seller read/create/update/delete payloads, response mapping, token headers, and method-specific fallback behavior (merged PR #72; main SHA `5235946abef42d15ec120a3509d835ae85b781de`).
- [x] Trace Delivery job/location/OTP requests; separate GET reads from POST writes, including OTP resend and location publication (merged PR #73; main SHA `84944cea8961084bf5bf488e324cb7b287d15674`).
- [x] Trace Daily Help booking versus provider job/slot operations; classify booking create/start/complete as transactional (documented in this branch; pending CI/merge).
- [ ] Trace Admin read endpoints separately from approvals and service CRUD.
- [ ] Validate all 72 indexed methods against the actual `bazaarApi` object and call sites. The initial index is provisional, especially where methods contain multiple fetch calls.


## Seller API contract trace — source inspection, 13 October 2026

Source: `src/services/api.ts`, blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. Client-side behavior only; backend authorization and validation are not inferred.

| Method | Request and payload | Auth / timeout | Response and failure behavior | Effect classification |
|---|---|---|---|---|
| `registerSeller(seller)` | `POST /sellers/register`; maps seller fields to `storeName`, `ownerName`, email/phone/category/address/locality, distance/rating/review counts, avatar/description/GST/FSSAI and delivery-fee defaults | No bearer token; no explicit timeout; Content-Type JSON | Non-OK throws internally; catch logs and returns `null`; success returns parsed JSON | Seller registration mutation; avoid in shared live smoke |
| `addProduct(sellerId, product)` | `POST /sellers/{encoded sellerId}/products`; maps product to title/category/description/imageUrl/MRP/sellerPrice/discount/stock/unit/tags/featured | No bearer token in client request; no explicit timeout; Content-Type JSON | Non-OK throws internally; catch logs and returns `null`; success returns parsed JSON | Product mutation; legacy/unscoped path needs backend auth review, not changed here |
| `getCurrentSeller()` | `GET /sellers/me` | Reads `kurali_auth_token` from localStorage; Bearer token; no explicit timeout | Missing token returns `null`; non-OK/network/parse error logs and returns `null`; success returns JSON | Read |
| `getSellerProducts()` | `GET /sellers/me/products` | localStorage token; Bearer; no explicit timeout | Missing token returns `[]`; non-OK/network/parse error returns `[]`; success returns JSON without an explicit array guard | Read; empty fallback can mask a failed request |
| `createSellerProduct(product)` | `POST /sellers/me/products`; passes product object as JSON | localStorage token; Bearer; no explicit timeout | Missing token throws session-expired error; JSON parse fallback null; non-OK throws server message or HTTP status; success returns parsed data | Product mutation |
| `updateSellerProduct(productId, product)` | `PUT /sellers/me/products/{encoded productId}`; passes product object as JSON | localStorage token; Bearer; no explicit timeout | Missing token throws; parse fallback null; non-OK throws server message or HTTP status | Product mutation |
| `deleteSellerProduct(productId)` | `DELETE /sellers/me/products/{encoded productId}` | localStorage token; Bearer; no explicit timeout | Missing token returns `false`; non-OK throws server message/status; success returns `true` | Destructive catalogue mutation; never use real product IDs in routine smoke |
| `getSellerOrders()` | `GET /sellers/me/orders` | localStorage token; Bearer; no explicit timeout | Missing token returns `[]`; non-OK/network/parse error returns `[]`; success returns JSON without explicit array guard | Read of potentially real order data |
| `updateSellerOrderStatus(orderId,status)` | `POST /sellers/me/orders/{encoded orderId}/status?status={encoded status}`; no body | localStorage token; Bearer; no explicit timeout | Missing token throws; parse fallback null; non-OK throws server message/status; success returns JSON | Order-state mutation; transactional/business critical; never run in read-only smoke |
| `getSellerDiscounts()` | `GET /sellers/me/discounts` | localStorage token; Bearer; no explicit timeout | Missing token returns `[]`; non-OK/network/parse error returns `[]`; success returns JSON without explicit array guard | Read |
| `createSellerDiscount(payload)` | `POST /sellers/me/discounts`; JSON payload | localStorage token; Bearer; no explicit timeout | Missing token throws session-expired error; parse fallback null; non-OK throws server message/status | Discount/rule mutation |
| `deleteSellerDiscount(ruleId)` | `DELETE /sellers/me/discounts/{encoded ruleId}` | localStorage token; Bearer; no explicit timeout | Missing token returns `false`; non-OK throws server message/status; success returns `true` | Destructive discount mutation |

### Seller trace cautions

- Two seller creation methods have materially different contracts: legacy `registerSeller` and `addProduct` omit the bearer token, while `/sellers/me/**` methods read the stored token and attach it. Do not unify or silently “fix” these in a docs-only phase; verify backend route security and call sites in a separately reviewed change.
- Read methods often collapse missing session, HTTP failure, parse failure, and legitimate empty data to `null` or `[]`; callers may not be able to distinguish an outage from no records.
- Seller order status, product deletion, and discount deletion are writes and are prohibited in live smoke. No such request was issued during this trace.
- No runtime/API behavior changed. Next: trace Delivery requests and classify job claiming, OTP resend/verification, and location publishing as writes.


## Delivery API contract trace — source inspection, 13 October 2026

Source: `src/services/api.ts`, blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. This documents client behavior only; it does not assert server authorization or backend semantics.

| Method | Request and payload | Auth / timeout | Response and failure behavior | Effect classification |
|---|---|---|---|---|
| `trackOrder(orderId)` | `GET /buyers/orders/{encoded orderId}/track` | Reads `kurali_auth_token` from localStorage; sends Bearer only when token exists; no explicit timeout | Non-OK throws internally; catch logs and returns `null`; success returns JSON | Read; optional auth header in client |
| `getLiveTracking(orderId)` | `GET /tracking/orders/{encoded orderId}` | localStorage token; optional Bearer; no explicit timeout | Non-OK or exception returns `null`; success returns JSON | Read; polling can generate repeated requests |
| `resendDeliveryOtp(orderId)` | `POST /delivery/jobs/{encoded orderId}/resend-otp`; no body | Requires localStorage token; Bearer; no explicit timeout | Parses JSON with null fallback; non-OK throws server/fallback message; success returns response data | OTP delivery side effect; never call in routine shared-data smoke |
| `updateDeliveryLocation(agentId, latitude, longitude)` | `POST /tracking/delivery/{encoded agentId}/location`; JSON `{latitude,longitude}` | localStorage token added if present; Bearer is not enforced client-side; no explicit timeout | Returns `res.ok`; catch logs and returns `false` | Location write / live tracking side effect; never use real agent IDs in smoke |
| `registerDeliveryAgent(agent)` | `POST /delivery/register`; selected identity, vehicle, licence and locality fields; locality defaults to `Main Bazaar` | No bearer token; JSON Content-Type; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Registration mutation; no shared-data testing |
| `getAvailableDeliveryJobs()` | `GET /delivery/jobs/available` | No bearer header in this method; no explicit timeout | Non-OK/network error returns `[]`; success returns JSON without explicit array validation | Read of potentially real job/order data; inspect backend access rules separately |
| `claimDeliveryJob(orderId, agentId)` | `POST /delivery/jobs/{encoded orderId}/claim?agentId={encoded agentId}`; no body | Requires localStorage token; Bearer; no explicit timeout | Missing token, network failure or non-OK returns `false`; otherwise `true` | Transactional job claim; never run against shared data |
| `verifyDeliveryOtp(orderId, otp)` | `POST /delivery/jobs/{encoded orderId}/verify-otp`; JSON `{otp}` | Requires localStorage token; Bearer and JSON headers; no explicit timeout | Parses JSON with empty-object fallback; returns success only when HTTP OK and `data.success !== false`; catch returns structured failure | Delivery completion/OTP verification transaction; never run against shared data |
| `getCurrentDeliveryAgent()` | `GET /delivery/me` | localStorage token; requires token; Bearer; no explicit timeout | Missing token, non-OK or exception returns `null`; success returns JSON | Read/session-scoped |
| `getDeliveryAvailableJobs()` | `GET /delivery/jobs/available` | localStorage token; requires token; Bearer; no explicit timeout | Parses JSON with `[]` fallback; non-OK throws internally then catch returns `[]`; success maps array items through `mapBackendOrder` (non-array becomes `[]`) | Read; duplicate client methods have different auth/fallback behavior |
| `getAdminDeliveryAgents()` | `GET /admin/delivery` | Uses `adminAuthHeaders()`; no explicit timeout | Failure logs and returns `[]`; success returns parsed data | Admin read; backend authorization not established by this client trace |
| `getPendingDeliveryAgents()` | `GET /admin/delivery/pending` | Uses `adminAuthHeaders()`; no explicit timeout | Failure logs and returns `[]`; success returns parsed data | Admin read |
| `approveDeliveryAgent(agentId)` | `POST /admin/delivery/{encoded agentId}/approve`; no body | `adminAuthHeaders()`; no explicit timeout | Failure logs and returns `false`; success returns boolean from HTTP status | Approval mutation; do not test on real agents |
| `rejectDeliveryAgent(agentId)` | `POST /admin/delivery/{encoded agentId}/reject`; no body | `adminAuthHeaders()`; no explicit timeout | Failure logs and returns `false`; success returns boolean from HTTP status | Rejection mutation; do not test on real agents |

### Delivery trace cautions

- There are two client methods for the same available-jobs endpoint: `getAvailableDeliveryJobs()` has no bearer header, while `getDeliveryAvailableJobs()` requires the local token and maps backend orders. Call-site/backend security review is required before any behavior change.
- `updateDeliveryLocation` adds a bearer header only if a token exists and reduces all HTTP failures to `false`; client code alone does not establish whether the endpoint is protected server-side.
- `getLiveTracking` and `trackOrder` are reads but may expose order/delivery data and are not equivalent to anonymous public smoke. Use authenticated synthetic identities only in an isolated test setup.
- OTP resend, OTP verification, job claim, rider registration, location updates, and Admin approval/rejection are writes. No such request was issued during this source trace.
- No runtime/API behavior changed. Next: trace Daily Help booking/provider slot/job contracts, then Admin reads and mutations separately.


## Daily Help API contract trace — source inspection, 13 October 2026

Source: `src/services/api.ts`, blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. This records client behavior only; backend authorization, OTP persistence, booking atomicity, and idempotency require separate server-side verification.

| Method | Request and payload | Auth / timeout | Response and failure behavior | Effect classification |
|---|---|---|---|---|
| `getDailyHelpServices()` | `GET /daily-help/services` | No bearer header; no explicit timeout | Non-OK/network/parse failure returns `[]`; success returns JSON | Public-looking catalogue read; server access not inferred |
| `createDailyHelpBooking(payload)` | `POST /daily-help/bookings`; JSON payload as supplied | Adds Bearer if `kurali_auth_token` exists; no explicit timeout | Parses JSON with null fallback; non-OK throws server message/error/status; catch rethrows a new Error | Buyer booking creation; transactional/business-critical write, never run against shared data |
| `getDailyHelpAvailableSlots(date, requestedHours, locality?)` | `GET /daily-help/availability?date=…&requestedHours=…[&locality=…]`; trims locality and omits blank value | No bearer header; no explicit timeout | JSON parse fallback `[]`; non-OK throws internally then catch returns `[]`; non-array becomes `[]` | Availability read |
| `getDailyHelpProfessionalSlots(professionalId, date)` | `GET /daily-help/professionals/{encoded professionalId}/slots?date={encoded date}` | Optional Bearer from localStorage; no explicit timeout | Non-OK/network error returns `[]`; success returns JSON without array guard | Provider slot read |
| `createDailyHelpProfessionalSlot(professionalId, slotDate, startTime, endTime)` | `POST /daily-help/professionals/{encoded professionalId}/slots`; JSON `{slotDate,startTime,endTime}` | Optional Bearer; JSON headers; no explicit timeout | Parses JSON with null fallback; non-OK throws server message/error/status; catch rethrows Error | Provider availability mutation |
| `cancelDailyHelpProfessionalSlot(professionalId, slotId)` | `DELETE /daily-help/professionals/{encoded professionalId}/slots/{encoded slotId}` | Optional Bearer; no explicit timeout | Parses JSON with null fallback; non-OK throws server message/error/status; catch rethrows Error | Destructive slot mutation; never test on real slot IDs |
| `getLatestDailyHelpBooking(buyerPhone)` | `GET /daily-help/bookings/latest?buyerPhone={encoded phone}` | Optional Bearer; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Booking read; phone in query is existing behavior |
| `getDailyHelpBooking(bookingId)` | `GET /daily-help/bookings/{encoded bookingId}` | Optional Bearer; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Booking read |
| `registerDailyHelpProfessional(payload)` | `POST /daily-help/professionals/register`; JSON `{name,phone,locality}` | Optional Bearer read from localStorage inline; no explicit timeout | Non-OK/network/parse failure returns `null`; success returns JSON | Provider registration mutation; avoid shared-data testing |
| `getDailyHelpProfessionalByPhone(phone)` | `GET /daily-help/professionals/by-phone/{encoded phone}` | Optional Bearer; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Provider lookup; phone is in path |
| `updateDailyHelpProfessionalAvailability(professionalId,status,locality?)` | `POST /daily-help/professionals/{encoded professionalId}/availability`; JSON `{status,locality}`; status AVAILABLE/OFFLINE | Optional Bearer; JSON headers; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Provider availability mutation |
| `getDailyHelpProfessionalAvailableJobs(professionalId)` | `GET /daily-help/professionals/{encoded professionalId}/jobs/available` | Optional Bearer; no explicit timeout | Non-OK/network error returns `[]`; success returns JSON without array guard | Provider job read |
| `acceptDailyHelpJob(professionalId,bookingId)` | `POST /daily-help/professionals/{encoded professionalId}/jobs/{encoded bookingId}/accept`; no body | Optional Bearer; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Job acceptance/assignment mutation; no shared-data testing |
| `getDailyHelpProfessionalJobs(professionalId)` | `GET /daily-help/professionals/{encoded professionalId}/jobs` | Optional Bearer; no explicit timeout | Non-OK/network error returns `[]`; success returns JSON without array guard | Provider job-history read |
| `getDailyHelpProfessionalEarnings(professionalId)` | `GET /daily-help/professionals/{encoded professionalId}/earnings` | Optional Bearer; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Earnings read; no payout effect in this client method |
| `updateDailyHelpBookingStatus(bookingId,professionalId,status)` | `POST /daily-help/bookings/{encoded bookingId}/status`; JSON `{professionalId,status}`, status ARRIVING/READY_TO_START | Optional Bearer; JSON headers; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Booking lifecycle mutation |
| `startDailyHelpBooking(bookingId,professionalId,otp)` | `POST /daily-help/bookings/{encoded bookingId}/start`; JSON `{professionalId,otp}` | Optional Bearer; JSON headers; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | OTP-authenticated service start; transactional/business-critical, never run against shared data |
| `completeDailyHelpBooking(bookingId,professionalId)` | `POST /daily-help/bookings/{encoded bookingId}/complete?professionalId={encoded professionalId}`; no body | Optional Bearer; no explicit timeout | Non-OK/network error returns `null`; success returns JSON | Service completion/state transition; transactional/business-critical, never run against shared data |

### Daily Help trace cautions

- Most provider methods attach the token only if present; client-side optional headers do not prove backend endpoints are anonymous or secure. Verify server authorization before changing contracts.
- Several reads collapse HTTP/network errors into `[]` or `null`, which can hide service outages as empty state. Preserve behavior during docs-only modularisation.
- Booking create, provider registration, slot create/cancel, availability changes, job acceptance, booking status, OTP start, and completion all mutate state. No requests were issued during this trace.
- `getLatestDailyHelpBooking` places buyer phone in a query parameter and `getDailyHelpProfessionalByPhone` places phone in a path; this is observed client behavior, not a security endorsement.
- No runtime/API behavior changed. Next: trace Admin reads versus approvals/service CRUD and reconcile the provisional 72-method inventory against exports and direct call sites.


## Admin API contract trace — source inspection, 15 October 2026

Source: `src/services/api.ts`, blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. This is a client-side contract inventory, not proof of backend authorization or server-side effects.

| Method | Request and auth | Response/error behavior | Effect classification |
|---|---|---|---|
| `getAdminDiagnostics()` | `GET /admin/diagnostics`; `adminAuthHeaders()` reads `kurali_auth_token` from localStorage; `cache: no-store` | JSON parse fallback `null`; non-OK throws response message or HTTP status; success returns parsed payload | Read; diagnostic details may be sensitive |
| `getAdminDailyHelpHelpers()` | `GET /admin/daily-help/helpers`; admin headers | Non-OK/network failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read |
| `getAdminDailyHelpServices()` | `GET /admin/daily-help/services`; admin headers | Non-OK/network failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read |
| `createAdminDailyHelpService(payload)` | `POST /admin/daily-help/services`; JSON body; admin bearer header when token exists | JSON parse fallback `null`; non-OK throws message/error/HTTP status | Service/catalogue mutation; never run against shared data |
| `updateAdminDailyHelpService(serviceId,payload)` | `PUT /admin/daily-help/services/{encoded serviceId}`; JSON body; admin headers | JSON parse fallback `null`; non-OK throws message/error/HTTP status | Service/catalogue mutation; never run against shared data |
| `getAdminSellers()` | `GET /admin/sellers`; admin headers | Failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read |
| `getPendingSellers()` | `GET /admin/sellers/pending`; admin headers | Failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read |
| `approveSeller(sellerId)` | `POST /admin/sellers/{encoded sellerId}/approve`; admin headers; no body | Returns `res.ok`; network error logs and returns `false` | Seller approval mutation; do not call on real sellers |
| `rejectSeller(sellerId)` | `POST /admin/sellers/{encoded sellerId}/reject`; admin headers; no body | Returns `res.ok`; network error logs and returns `false` | Seller rejection mutation; do not call on real sellers |
| `getAdminDeliveryAgents()` | `GET /admin/delivery`; admin headers | Explicitly validates array; non-array, HTTP failure, or exception becomes `[]` | Read |
| `getPendingDeliveryAgents()` | `GET /admin/delivery/pending`; admin headers | Failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read |
| `approveDeliveryAgent(agentId)` | `POST /admin/delivery/{encoded agentId}/approve`; admin headers; no body | Returns `res.ok`; network error logs and returns `false` | Delivery-agent approval mutation; do not call on real agents |
| `rejectDeliveryAgent(agentId)` | `POST /admin/delivery/{encoded agentId}/reject`; admin headers; no body | Returns `res.ok`; network error logs and returns `false` | Delivery-agent rejection mutation; do not call on real agents |
| `getAdminBuyers()` | `GET /admin/buyers`; admin headers | Failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read; contains user/account data |
| `getAdminSearchTrends()` | `GET /admin/analytics/search-trends`; admin headers | Failure logs warning and returns `[]`; success returns parsed JSON without array guard | Read/analytics |
| `getAdminAnalytics()` and `getDemandAnalytics()` | Both call `GET /admin/analytics/demand-trends`; admin headers | Both return `null` after HTTP/network failure; successful response is returned as JSON | Duplicate client surface for the same endpoint; call-site consolidation requires separate review |

### Admin trace cautions

- `adminAuthHeaders()` conditionally adds a bearer token; a missing token does not prevent the browser from issuing the request. This is not a security guarantee. Backend authorization must remain authoritative.
- Error contracts differ: list methods usually collapse errors into empty arrays; diagnostics and Daily Help service writes throw; approval/rejection methods return booleans. Preserve these semantics during any later refactor.
- Seller/delivery approval or rejection and Daily Help service create/update are mutations. No such requests were sent during this trace.
- The Daily Help Admin service methods overlap with the provider/buyer Daily Help domain but belong to Admin management. Keep ownership and authorization distinct.
- This trace covers the Admin methods observed in `src/services/api.ts`; the full transitive component-to-method call graph and reconciliation against every exported API method remain to be completed. Do not mark the domain map complete or start state/API extraction yet.


## API export-to-consumer reconciliation — 15 October 2026

### Static inventory result

- `src/services/api.ts` exposes 72 methods in the current source snapshot.
- A static name-based scan across frontend source files found direct-call references for 69 methods. Apparent no-direct-call candidates are `getDemandAnalytics()`, `trackOrder()`, and `getAvailableDeliveryJobs()`.
- **Do not remove these methods based on this scan alone.** Confirm imports/aliases, callback references, any dynamic property access, test-only consumers, and whether they are intentionally retained compatibility surfaces. In particular, delivery has both `getAvailableDeliveryJobs()` and `getDeliveryAvailableJobs()`; their auth and response-mapping behavior differs in the source trace. `getAdminAnalytics()` and `getDemandAnalytics()` both target the demand-trends endpoint, but only the former has an observed Admin Dashboard direct call in the scanned files.
- This scan is a static source cross-check, not a runtime trace. It does not prove backend authorization or whether authenticated role flows execute in E2E.

### Observed domain-to-consumer map

| Domain / surface | Observed source consumers | Boundary and risk notes |
|---|---|---|
| Shared state, session, address normalization, periodic backend sync | `src/context/AppContext.tsx`; consumers include `src/App.tsx`, `src/components/Header.tsx`, auth and buyer/seller/delivery role components | Context is a high-fan-out compatibility boundary. Trace every exported value/action before extraction; preserve auth/session, localStorage, sync cadence, optimistic/fallback behavior, and address mapper compatibility. |
| Authentication and onboarding | `AuthPage.tsx`, `AuthPageV2.tsx`, `BuyerRegistrationPage.tsx`, `AppContext.tsx`, role registration modals | OTP send/verify, registration checks, onboarding status, user updates and role resolution have side effects/timeouts. Do not invoke live OTP or registration writes during smoke. |
| Seller products, orders, discounts | `SellerDashboard.tsx`; selected legacy product/seller methods also flow through `AppContext.tsx` | Product/order/discount writes are business mutations. Preserve distinct legacy versus authenticated endpoint contracts and error behavior. |
| Admin management and analytics | `AdminDashboard.tsx` and the existing market-trends visualization surface | Read methods have mixed `[]`/throw/null behavior; approvals/rejections and service create/update are writes. Backend remains authoritative for admin authorization. |
| Buyer shop, cart, checkout, address and orders | `BuyerHome.tsx`, `OnlineShopHome.tsx`, cart/checkout/account components, `AppContext.tsx` | Checkout/order creation and address updates mutate state; use only synthetic isolated data for transactional tests. |
| Buyer Daily Help | `DailyHelpHome.tsx` | Catalogue and availability are reads; booking creation is a transaction. Phone-bearing lookup parameters are existing behavior, not a security endorsement. |
| Daily Help Provider | `DailyHelpProfessionalDashboard.tsx` | Slot create/cancel, availability, job acceptance, booking status, OTP start and completion are writes; preserve polling/timer cleanup and service-duration semantics. |
| Delivery and tracking | `DeliveryDashboard.tsx`, `AppContext.tsx`, `LiveOrderMap.tsx`, `OrderTrackingModal.tsx` | Job claim, OTP resend/verification, registration and location publishing have side effects; tracking requests poll and can expose real order data. Do not run them against shared records. |
| Route and presentation-only helpers | `App.tsx`, route policy/config, UI-only buyer components and entity mappers | Keep route policy separate from backend security; mapper extractions must retain shape/default/null/zero-coordinate behavior. |

### Reconciliation gaps and next review

1. Confirm all 72 method declarations against the source, and attach exact call-site file/line references rather than relying only on symbol search.
2. Resolve the three apparent no-direct-call methods. Confirm whether they are legacy duplicates, callback/alias references, or required compatibility surfaces before proposing deletion.
3. Trace `AppContext` public values/actions to each consuming component, including indirect callback flows and initial/fallback state.
4. Cross-check effect lifetimes and cleanup for 45-second context/Admin refresh, 10-second Delivery and Provider polling, 5-second tracking reads, geolocation throttling/heartbeat, one-second active-service timer, and auth/OTP timeout/countdown/focus handlers.
5. Link each high-risk mutation to existing regression tests; mark missing coverage as a gap rather than inventing a test pass.
6. Do not begin AppContext/state/API extraction until the call-site graph and side-effect/test review are complete. No runtime changes or live mutations were made during this inventory.


### Targeted source validation — 15 October 2026

This pass validated the three apparent no-direct-call candidates against the current source on `main` (base SHA `204ff778b513310663d4b3c058ee45ae5482a6b8`). This is still a source inventory, not permission to delete or consolidate methods.

- `getDemandAnalytics()`: Admin Dashboard does not call this symbol. `AdminDashboard.tsx` calls `getAdminAnalytics()`, which requests the same `/admin/analytics/demand-trends` endpoint and returns `null` on failure. The methods are similar, but the duplicate is not yet safe to remove: verify imports outside the current tracked TS/TSX inventory, test usage, and compatibility before proposing deletion.
- `trackOrder(orderId)`: no direct reference was found in the current tracked frontend source inventory. It performs a GET to `/buyers/orders/{orderId}/track`, includes the stored auth token when present, and returns `null` on errors. `LiveOrderMap.tsx` and `OrderTrackingModal.tsx` are tracking surfaces but did not directly reference this method in the targeted scan. Trace their actual polling helpers before deciding whether this is legacy or a compatibility surface.
- `getAvailableDeliveryJobs()`: no direct reference was found in the current tracked frontend source inventory. **Do not merge it with or substitute it for `getDeliveryAvailableJobs()`.** Both call `/delivery/jobs/available`, but the former sends no auth header and returns the raw JSON array; the latter requires `kurali_auth_token`, sends a bearer token, maps records through `mapBackendOrder`, and normalizes failures to `[]`. `AppContext.syncDeliveryJobs` and `DeliveryDashboard.tsx` use `getDeliveryAvailableJobs()`.

#### Verified shared-context/effect facts

- `AppContextType` exposes a broad cross-role contract (auth/session, buyer addresses, seller/product/coupon/cart/order, delivery, negotiation chat, UI modal/filter state, toast, backend health and sync). Treat this as a compatibility facade until every destructured consumer is inventoried.
- `AppContext.tsx` hydrates session and role from `kurali_auth_session` / `kurali_role`; it persists role, user, sellers, products, coupons, delivery agents, orders, chats, cart, applied coupon and backend URL through guarded storage helpers. Address/profile mutations also update the serialized auth session. These keys and sequencing are behavior contracts, not incidental implementation details.
- The provider schedules `syncWithBackend` every 45 seconds and separately runs an initial sync/session bootstrap effect. `AdminDashboard.tsx` refreshes its read models every 45 seconds with interval cleanup. Delivery polling runs every 10 seconds and has a 1-second cooldown tick; geolocation watch cleanup and permission behavior must be reviewed. Provider refresh is 10 seconds with a 1-second active timer. Buyer tracking surfaces poll at 5 seconds and must retain cancellation/interval cleanup.
- `showToast` schedules a 4-second timeout without currently retaining a timeout handle for cleanup. Record this as a lifecycle/test review item; do not silently alter timing as part of a domain extraction.

#### Remaining gates

1. Search the full tracked repository and test tree for all candidate symbols, including aliases, indirect references, and string-based/dynamic access; add exact file/line evidence.
2. Complete the per-component `useApp()` destructuring inventory and map each public member to consumers, including App.tsx route/header flows and callbacks passed through modals.
3. Trace the actual tracking polling helper(s) and compare endpoint, auth, response and fallback behavior before considering `trackOrder()`.
4. Build a mutation-to-test matrix for order creation/status, seller/delivery approvals, product and discount CRUD, Daily Help booking/slot/job/OTP lifecycle, delivery job claim/OTP/location, and address changes.
5. Keep this phase documentation/source inspection only. No shared staging writes, runtime extraction, endpoint changes, auth/session changes, or method deletion.


### Direct `useApp()` consumer map — 15 October 2026

This table records the directly destructured `useApp()` contract from the current tracked TS/TSX component set. It is not yet a full transitive graph: values passed as props, callbacks that close over context, route reachability, and nested component ownership still need review.

| Consumer | Direct context contract observed |
|---|---|
| `App.tsx` | role/user, tracking modal state, add-to-cart, toast, role selection and registered roles; also owns provider/router composition. |
| `Header.tsx` | role/session/logout, registered roles, cart, seller/current seller, orders, products, cart modal and Gmail auth modal state. |
| `AdminDashboard.tsx` | user, seller and delivery approval callbacks/data, orders/products, role switch, Gmail auth modal and toast; admin read models and mutations are also called directly through `bazaarApi`. |
| `AuthPage.tsx`, `AuthPageV2.tsx` | login/register OTP actions and toast; both files remain in source, so route/import reachability must be proven before auth consolidation. |
| `BuyerRegistrationPage.tsx` | register-with-OTP action and toast; calls registration/OTP API methods directly. |
| `GmailAuthModal.tsx` | Google login, current user, and seller/delivery/buyer registration-modal toggles. |
| `BuyerAccountPage.tsx` | user/orders, profile update, buyer address create/update/default actions and toast. |
| `BuyerRegistrationModal.tsx` | user and legacy buyer-registration action. |
| `CartDrawer.tsx` | cart/coupon collections, quantity/removal/clear actions, coupon apply/remove, cart calculations, modal state and toast. |
| `CheckoutModal.tsx` | cart, cart calculations, user and order creation. Order creation is transactional; never exercise against shared records. |
| `CompareSellersModal.tsx` | products/sellers, add-to-cart, chat start and cart-modal opening. |
| `DailyHelpHome.tsx` | user and toast; calls catalogue/availability/latest-booking reads and booking creation directly. Booking creation is transactional. |
| `NegotiationChatModal.tsx` | active chat/chats, send/respond actions, products, cart actions, role/user. |
| `OnlineShopHome.tsx` | products/orders, add-to-cart/chat actions, locality filter, comparison state and cart modal. |
| `OrderTrackingModal.tsx` | orders; separately polls the live-tracking API. |
| `LiveOrderMap.tsx` | no direct `useApp()`; polls live tracking independently. |
| `DeliveryDashboard.tsx` | current agent, agents/orders, claim/complete delivery, registration modal, toast and backend sync; directly calls agent/jobs/location/OTP API methods. |
| `DeliveryRegistrationModal.tsx` | delivery-registration modal state, register action, user and toast. |
| `DailyHelpProfessionalDashboard.tsx` | user and toast; directly owns provider availability/slots/jobs/earnings/accept/start/complete calls and 10s/1s timers. |
| `SellerDashboard.tsx` | user, seller-registration modal and toast; directly calls seller product/order/discount APIs. |
| `SellerRegistrationModal.tsx` | seller-registration modal state, register action, user and toast. |

Other presentational components (for example product cards, product details, search suggestions, route-policy helpers and entity mappers) do not directly call `useApp()` in the scanned source. They may still receive state/actions through props; do not treat absence of direct context usage as proof of no dependency.

#### API candidate search result across tracked frontend/test source

- No direct symbol reference was found for `getDemandAnalytics()`, `trackOrder()`, or `getAvailableDeliveryJobs()` outside their declarations in `src/services/api.ts` across the tracked TS/TSX/test source inventory.
- `getAdminAnalytics()` is directly used by Admin Dashboard; `getLiveTracking()` is used by both `LiveOrderMap.tsx` and `OrderTrackingModal.tsx`; `getDeliveryAvailableJobs()` is used by AppContext sync and Delivery Dashboard.
- This scan does not exclude runtime dynamic access, generated code, external consumers, or future tests. Keep all three candidates intact until those compatibility possibilities and explicit API tests are reviewed.

#### Next dependency-graph review

1. Trace App.tsx/Header prop and modal handoffs, including context actions passed through callbacks and nested components.
2. Confirm import/route reachability of legacy/current auth pages before removing any duplicated-looking OTP path.
3. Build a mutation-to-test matrix and add focused API contract tests for auth-header presence, raw-vs-mapped delivery-job response, and error fallback semantics before any API cleanup.
4. Keep runtime extraction blocked until the transitive graph and protecting tests are reviewed.


## Route and component reachability checkpoint — 15 October 2026

### Verified from `src/App.tsx`

- `App` mounts `AppProvider` and `RootNavigation`; the route resolver is the entry point for pathname-to-view selection.
- `AuthPageV2` is the active shared auth/registration page for `register` routes, signed-out home, signed-out `/account`, and signed-out role-dashboard routes.
- `/register/buyer` resolves to `BuyerRegistrationPage`, not `AuthPageV2`.
- Authenticated `/account` resolves to `BuyerAccountPage` (the component is shared despite the name); authorized role-dashboard routes render `MainLayout` and set the selected role. `MainLayout` selects BuyerHome, SellerDashboard, DeliveryDashboard, DailyHelpProfessionalDashboard, or AdminDashboard based on the shared role.
- `Header` is passed search/category state setters from `MainLayout` and also calls `useApp()`; it is therefore a bridge between navigation/search UI and shared app state, not a purely presentational component.
- `CartDrawer`, `CheckoutModal`, `OrderTrackingModal`, and `NegotiationChatModal` are mounted at the shared layout level, so they can cross the buyer page/component boundary. Preserve their global lifetime/visibility semantics during any extraction.
- The legacy-looking file `src/components/Auth/AuthPage.tsx` exists in the repository tree but is not imported by `src/App.tsx`. This only establishes no direct App import, not repository-wide unreachability; inspect all imports, dynamic imports, tests, and OTP-specific behavior before removing it.

### Next verification steps

1. Search every tracked TS/TSX/test file for imports or dynamic references to `AuthPage.tsx`, `AuthPageV2`, and `GmailAuthModal`; record direct route and modal ownership.
2. Trace Header callbacks, AppContext actions, and modal props to their downstream effects before moving files or state.
3. Build the mutation-to-test matrix for order lifecycle, seller product/discount CRUD, admin approvals, delivery claim/OTP/location, Daily Help booking/availability/OTP, and address/profile changes.
4. Add isolated unit/API contract tests for auth-header presence, raw-versus-mapped delivery-job methods, and error fallback semantics before considering any API consolidation.
5. Do not infer safety from client route guards; backend authorization remains authoritative. Do not mutate shared staging to test transactional flows.

## Verified CI and mutation coverage checkpoint — 15 October 2026

### Post-merge evidence

- Main SHA: `d4ac9c2e4b4c7e7eac6e1dbc183218dd50344cf2` (PR #79).
- Workflow [#38621606099](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38621606099) finished successfully on the exact merge SHA. Frontend checks/build, focused and full backend tests, staging-target guards, read-only API smoke and browser E2E all passed.
- Exact-SHA Vercel deployment `dpl_EUto8fe5gsizKn2ttYVrf6beqes3` is READY with the configured aliases.
- Scope limitation: these checks are not proof that authenticated buyer, seller, delivery, Daily Help and admin transactions ran end-to-end. No shared staging writes were performed.

### Mutation-to-test inventory (evidence status)

| Mutation family | Protecting tests needed | Current evidence |
|---|---|---|
| Buyer order/checkout lifecycle | create/read/status transition, idempotency, validation, authorization, synthetic DB lifecycle | Full transactional lifecycle not established; shared staging remains read-only |
| Address/profile | field mapping, validation, default-address semantics, session persistence and reload | Saved-address/profile mapping regressions passed; persistence E2E still needs isolated evidence |
| Seller product/discount CRUD | payload mapping, validation, owner authorization, CRUD lifecycle | Seller product mapping regression passed; full lifecycle needs verification |
| Admin approvals | role authorization and approve/reject transitions using synthetic applications | Client route policy is not backend authorization evidence; no real approvals exercised |
| Delivery claim/OTP/completion | competing claim/idempotency, OTP valid/invalid/expired/attempt limit, state transitions | OTP input validator regression passed; full backend workflow needs evidence |
| Delivery location/tracking | geolocation lifecycle/cleanup, throttling, auth and response contract | Read-only API/browser smoke passed; no location publishing or job claims |
| Daily Help | availability/slot changes, booking lifecycle, accept/start/complete OTP, timer cleanup | Authenticated transactional flow not established |
| Authentication/onboarding | role-specific login/registration, expiry/attempt limits, session hydration, backend authorization | CI passed; do not infer five-role authenticated coverage from browser smoke |
| API compatibility | auth headers, raw-vs-mapped delivery jobs, null/empty/false/throw error contracts | Must be tested before API method consolidation |

### Next gate

Attach exact source/test locations to each row, inspect backend controller/service authorization and current tests, then add the smallest focused contract tests. Do not remove API methods, change runtime behavior, enable staging OTP capture, or start AppContext/state extraction until the dependency graph and test protection are verified. Any authenticated mutation test requires a confirmed isolated staging database and dedicated synthetic identities.


## Runtime refactor checkpoint — 19 October 2026

A focused implementation branch, `refactor/domain-api-boundaries`, begins the runtime work without changing endpoints or backend behavior:

- Added typed API facades for Buyer booking/tracking, Seller, Delivery, Daily Help Provider, Admin, and shared tracking. Role screens/components touched in this change now import the relevant facade instead of the full `bazaarApi` surface.
- Facades intentionally delegate to the existing `bazaarApi` object for now. This is a compatibility seam, not a claim that the 50 KB API implementation has already been split into separate transports or endpoint implementations.
- Extracted the `AppContextType` contract into `src/context/AppContextContract.ts` so the context implementation and consumers can evolve separately.
- Extracted guarded local-storage helpers into `src/shared/storage/safeStorage.ts`; storage keys and error-handling behavior remain unchanged.
- No backend, database, OTP, order, booking, or staging data changes are part of this refactor.

### Validation still required before merge

- TypeScript check and production build must pass on the branch.
- Review the changed import paths and confirm no role has acquired access to methods outside its declared facade.
- Continue with actual domain implementation extraction (moving endpoint implementations out of `src/services/api.ts`) only after this compatibility layer is green.
- AppContext runtime state and effects remain coupled; splitting them into domain hooks is a separate follow-up, gated by behavior-specific tests and a complete mutation/effect inventory.
