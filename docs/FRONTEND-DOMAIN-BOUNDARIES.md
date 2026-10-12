# Frontend Domain Boundaries and Extraction Inventory

**Last updated:** 2026-10-12  
**Last confirmed live alias commit:** `5a89345dfe26b078e57fe9f30dc83656ebb834ee` (`READY`). Latest merged runtime commit `a1ea642f4cf201053088d820dce3dced469b5bf2` is CI-green but not yet visible as a main deployment.  
**Status:** Pure saved-address mapper (PR #61) and user-profile mapper (PR #63) are merged. User-profile mapper's main deployment is pending confirmation; no AppContext state/API-domain refactor has been merged.

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
