# Unified KuraliUpdates iOS app — implementation contract

**Target:** one native iOS app for BUYER, SELLER, DELIVERY and DAILY_HELP_PROFESSIONAL. Admin remains web-only.
**Base:** current `main`; native Expo app under `apps/ios`.
**Backend:** existing Spring Boot API and Oracle system of record. No second backend, database, or role-specific credential store.

## Current implementation status (PR #381)

- Expo SDK 58 / React Native 0.88 native app under `apps/ios`.
- OTP login, SecureStore token persistence, backend role discovery and one-time role handoff/redeem are implemented.
- Buyer: catalogue, quantity +/- cart, COD checkout, Daily Help discovery/availability/booking/history, bargaining draft + explicit Send offer, accepted-offer confirmation before cart addition.
- Seller: profile/store availability, inventory list/create/delete, bill discount create/delete, order accept/ready-for-pickup transitions, bargaining inbox accept/reject.
- Delivery: profile/availability, available and assigned jobs, claim, pickup confirmation, OTP resend and verification.
- Daily Help Professional: profile/availability, available/assigned jobs, accept, OTP start, server-side completion, earnings and availability slot create/cancel.
- Admin remains web-only. Browser-only storage and React DOM components are not imported into the native app.
- Exact PR head `524217ce088dcf45d5d6fa4bc54c1e41a003d2cd` passed iOS TypeScript check, Expo configuration validation and iOS bundle export. Frontend and backend CI jobs passed. Browser E2E was still pending at last inspection.
- This is not yet full feature parity. Remaining items are listed in the PR description and below; do not infer support for a feature from an API wrapper alone.

## Role and session model

1. Sign in through the existing OTP API. Never store bearer tokens in AsyncStorage, logs, deep links, QR codes or route parameters; use iOS Keychain via Expo SecureStore.
2. Resolve the authenticated user's registered roles from the existing authenticated role endpoint.
3. Select the initial active role only from roles returned by the backend. If multiple roles are available, show an explicit role switcher.
4. Use the existing role-scoped portal-handoff/session contract where the backend requires an active-role token. Do not merely change a local role string or trust a client-side role flag.
5. On role switch, redeem the server-issued one-time handoff and replace the secure session atomically; handle expiry, denial and logout without retaining stale role data.
6. Admin is not an app role and must not be exposed as a selectable mobile dashboard.

## Native feature parity acceptance matrix

### Buyer
- Shop: category/product discovery, search, seller and stock details, product images, price/unit, seller comparison.
- Bargaining: conversations, send offer only on explicit user action, seller response/status, accepted-offer identity and expiry; checkout must rely on backend validation.
- Cart/checkout: quantity increment/decrement, remove, multi-seller grouping, configured radius/fulfilment restrictions, address selection/validation, direct-to-seller payment and COD options only when enabled by backend configuration.
- Daily Help: service catalogue, availability/slots, booking, booking status, timer for active service and history.
- Orders: grouped and seller suborders, status, cancellation only when allowed, tracking and support.
- Account: profile, saved addresses, privacy/support entry points, session/logout.

### Seller
- Server-loaded seller profile, approval/onboarding status and compliance/document correction state.
- Store open/closed availability.
- Inventory: list, create, edit, delete with server validation and image/document upload constraints.
- Orders: incoming/active/completed, permitted status transitions and pickup readiness.
- Discounts and bargaining inbox/offers.
- Earnings/summary only where a verified API contract exists; do not invent metrics.

### Delivery agent
- Server-loaded active/approval status and availability.
- Available jobs and assigned jobs; claim only through existing server-side claim operation.
- Multi-seller checkout/group claim, seller pickup confirmation, delivery OTP resend/verify, completion.
- Live location only with explicit permission and while operationally required; foreground/background behavior and battery/privacy policy must be reviewed before enabling continuous tracking.
- Route/map fallback consistent with existing OpenStreetMap behavior; never fabricate route data.
- Earnings only where a verified API contract exists.

### Daily Help professional
- Server-loaded professional profile, approval status and availability.
- Available jobs, accepted/assigned jobs and booking history.
- Availability slots create/cancel, with server-side conflict protection.
- Accept booking, service-start OTP, active-service timer, completion and earnings using existing provider API contracts.
- Timer/polling cleanup on navigation, logout and app backgrounding; server timestamps remain authoritative.

## Shared app shell and UX
- Match the existing KuraliUpdates website visual system: typography, green palette, spacing, card treatment, labels, terminology and key information hierarchy. Do not approximate with a generic template.
- One native navigation shell with role-aware home, notifications (only if supported), profile and role switcher.
- Shared loading, empty, offline, validation, retry and authorization-denied states.
- Native accessibility: Dynamic Type-friendly layouts, VoiceOver labels, adequate tap targets, keyboard-safe forms and safe-area handling.
- Remove development-only overlays from the release UI.
- Support iPhone and iPad responsive layouts without webview embedding.

## Engineering constraints
- Keep one API client with bearer token injection from SecureStore; do not use `localStorage`.
- Model backend DTOs explicitly and validate untrusted response shapes at the boundary.
- No mock or fabricated orders, earnings, stock, availability, status, images or route metrics.
- Preserve API endpoint semantics, ownership checks, state transitions, idempotency and server-side validation.
- No database migrations or backend contract changes unless a proven blocker is separately justified and tested.
- Keep admin web-only and leave existing web portals/deployments unchanged.
- Never run mutating lifecycle tests against shared staging data. Use mocks/unit/contract tests and the existing explicitly gated isolated synthetic E2E process.

## Required verification before calling this complete
- iOS TypeScript check and Expo iOS export.
- Unit tests for role resolution, role switch/handoff, secure-session replacement, role guards, API error handling and DTO mapping.
- Role-by-role screen and API contract coverage, including denied cross-role/foreign-record access.
- Buyer checkout/bargaining and Daily Help booking lifecycle; seller product/order lifecycle; delivery claim/pickup/OTP lifecycle; professional slot/accept/start/complete lifecycle.
- Polling/timer/location permission cleanup and app foreground/background behavior.
- Visual acceptance against the website on iPhone and iPad.
- Exact PR-head CI evidence. Physical-device Expo Go success is development evidence only; it is not a signed standalone/TestFlight build.
- No claim of full feature parity until each matrix item is implemented and verified or explicitly marked unsupported by the current backend.
