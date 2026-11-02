# Frontend Portal and Route Inventory

**Status:** Phase 0 partial inventory; exhaustive route enumeration remains open.  
**Date:** 2026-11-03

## Verified entry/build structure

Source inspected: package.json, vite.config.ts, src/App.tsx and docs/CURRENT-STATE.md.

| Portal | Build script | Vite HTML entry | Current runtime composition |
|---|---|---|---|
| Buyer | build:buyer | portal-buyer.html | BuyerPortal imported by shared src/App.tsx |
| Seller | build:seller | portal-seller.html | SellerDashboard imported by shared src/App.tsx |
| Delivery | build:delivery | portal-delivery.html | DeliveryDashboard imported by shared src/App.tsx |
| Daily Help Provider | build:daily-help | portal-daily-help.html | DailyHelpProfessionalDashboard; Vite role key is professional |
| Admin | build:admin | portal-admin.html | AdminDashboard imported by shared src/App.tsx |

Individual scripts write to dist/<portal> and copy the selected portal HTML to index.html. build:portals runs all five sequentially.

## Current routing/deployment facts

- vite.config.ts uses base: '/' and documents standalone host-root deployment assumptions.
- src/App.tsx imports all five dashboards into one PortalAppShell. Individual entry builds exist, but complete route isolation is not proven by inspected files.
- Historical docs describe six Vercel projects (combined Bazaar plus five role portals). This historical observation is not the approved target of one combined static deployment. Current provider configuration requires live verification.
- Proposed target paths are Buyer /, Seller /seller/*, Delivery /delivery/*, Daily Help /daily-help/* and Admin /admin/*. These are target paths, not verified live routes.

## Route inventory still required

Extract exact paths from the route registry, navigation and redirects; do not infer them from portal names.

| Route family | Required details |
|---|---|
| Public landing | home, category/search, public seller/provider discovery |
| Authentication | login/logout, forgot/reset password, session expiry and post-login redirect |
| Buyer registration | steps, OTP verify/resend, return-to-main behavior, resume/draft, completion/recovery |
| Seller onboarding | lead, email/mobile verification, business details, documents, review status, callback/resume |
| Delivery onboarding | application, identity linkage, approval, rejection/unavailable states |
| Daily Help provider | identity, service setup, slots, review and status |
| Admin | login, role checks, queues, settings, audit history and protected document actions |
| Legacy compatibility | aliases, redirects, query parameters, external links and bookmarked deep links |

For each route capture exact path, portal owner, component/entry, public/auth status, required role/permission, redirect, API/data dependencies, refresh behavior and tests.

## Cross-portal dependencies to map

- PortalAppShell and shared shell responsibilities.
- AppContext providers, consumers, state, actions, effects and compatibility facade.
- Shared API facade methods and domain API clients.
- Auth bootstrap, token/session storage keys, refresh/logout and role resolution.
- Shared UI, validation, types, routing helpers and feature flags.
- Private feature-folder imports crossing portal boundaries.
- Polling, timers, WebSocket subscriptions, geolocation watches and cleanup.

## Tests required before consolidated hosting

- Each portal builds independently and emits the correct HTML.
- Root and nested portal URLs load the correct application.
- Direct deep links and browser refresh work.
- Unknown portal paths do not silently load the wrong app.
- Login/logout, expired sessions, role mismatch and cross-portal redirects are safe.
- Legacy registration aliases/query parameters remain compatible.
- Asset URLs, cache headers and SPA fallback work on selected host.
- Mobile, keyboard, focus and accessible form behavior is verified for critical journeys.

## Current conclusion

Five build targets exist, but exact route ownership and import/session dependencies remain unenumerated. Root asset base is not proof of readiness for nested paths. Complete route and dependency discovery before changing URL strategy or moving portal code.
