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


## Source-confirmed route registry

Inspected `src/app/routing/routeConfig.ts`, `roleRouteAccess.ts` and `portalRedirect.ts` at main SHA `560a34a4a94241e007a396a2ad4cbc8e2e67e428`.

| Exact path | Route kind | Owner/role |
|---|---|---|
| `/` | home | public |
| `/register/buyer` | buyer registration | Buyer |
| `/register/seller` | registration | Seller |
| `/register/delivery` | registration | Delivery |
| `/register/daily-help` | registration | Daily Help Provider (`professional`) |
| `/account` | account | authenticated account |
| `/buyer` | role dashboard | Buyer |
| `/seller` | role dashboard | Seller |
| `/delivery` | role dashboard | Delivery |
| `/daily-help` | role dashboard | Daily Help Provider (`professional`) |
| `/admin` | role dashboard | Admin |

Important observed behavior:
- `resolveAppRoute` normalizes trailing slashes and defaults unknown paths to `home`.
- `resolvePortalRoute` maps `/` to the configured portal role only when the role is supported.
- `authorizeRoleRoute` checks signed-in state, admin flag and registered role. It is client-side only; backend authorization is authoritative.
- `buildPortalRedirectUrl` accepts HTTPS configured URLs only; cross-origin portals go to `/`, same-origin portals use the role path; query/hash are removed.
- The five portal entry points exist, but route ownership is still shared through `PortalAppShell`/AppContext; exact per-portal route coverage and legacy URL aliases outside this registry need further inspection.

## Confirmed backend API families

The route registry above is frontend-only. The inspected backend controllers expose corresponding API families under `/auth`, `/buyers`, `/sellers`, `/delivery`, `/daily-help`, `/negotiations`, `/tracking` and `/admin`, plus seller-registration lead/draft/OTP settings and seller-document endpoints. Full method/path/authz mapping remains in progress; do not treat these API paths as browser routes.
