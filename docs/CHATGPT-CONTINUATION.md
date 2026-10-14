# KuraliUpdates Bazaar — ChatGPT Continuation Handoff

**Last updated:** 2026-10-13 (Asia/Kolkata)  
**Repository:** https://github.com/imgupta/kuraliupdates-bazaar  
**Latest merged main SHA:** `84944cea8961084bf5bf488e324cb7b287d15674` (PR #73, Delivery API trace docs-only).
**Current verified state:** PR #73 head workflow #38366106002 passed frontend checks, backend tests, and browser E2E/read-only API smoke. Post-merge main workflow #38366636788 is running on exact main SHA `84944cea8961084bf5bf488e324cb7b287d15674`. Vercel's latest queried main deployment is READY for prior SHA `5235946abef42d15ec120a3509d835ae85b781de`; deployment for current main SHA is not yet verified. Authenticated five-role E2E execution remains unproven unless reports show tests actually ran and were not skipped.

> Read this file first when continuing work in a new chat. Then read `docs/UI-MODULARIZATION-PLAN.md` and `docs/FRONTEND-DOMAIN-BOUNDARIES.md`. Always re-check GitHub and Vercel state before acting; this file is a checkpoint, not a live status feed.

## 1. Operating rules — do not violate

1. **Verify each phase before proceeding to the next.** Make a bounded change, run the existing CI, inspect the preview/deployment, then merge only after the required checks pass.
2. The owner has explicitly stated there is **one deployed environment only**, and it is designated **staging**. The public site is not a separate production environment for this project. Do not label it production in user-facing status.
3. Keep all authenticated/transactional E2E activity off the real shared data unless it is safely isolated. Use synthetic identities and synthetic records only. Do not delete real records or perform blanket database cleanup.
4. Keep production-like checks read-only. Do not place orders, create bookings, modify inventory, trigger payouts, send real OTPs, or delete records as part of routine smoke checks.
5. Do not modify backend contracts, database schema/migrations, OTP semantics, authentication semantics, or deployment secrets as part of frontend modularisation without a separate, explicit plan and verification.
6. Do not use the client-side route guard as a security boundary. The Spring Boot backend must continue to enforce authorization.
7. Do not attempt to evade Vercel deployment quotas or change billing/security settings automatically.
8. Update this handoff and the relevant Markdown docs whenever a phase, PR, test result, deployment, blocker, or decision changes.

## 2. Latest verified repository state

- `main` is `1a8c1189ebd9c8c86503e690f0e396e696391e70`.
- Commit message: `feat: add guarded role dashboard routing`.
- PR #58 is merged: https://github.com/imgupta/kuraliupdates-bazaar/pull/58
- Post-merge CI run #38175672333 passed all jobs: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38175672333
  - Frontend checks: success (TypeScript, route registry tests, access-policy tests, production build).
  - Backend tests: success.
  - Browser E2E: success.
  - **Read-only API smoke step was skipped** because `KURALI_API_BASE_URL` / `KURALI_STAGING_API_BASE_URL` was not configured in the workflow environment.
- PR #57 (route registry regression tests) is merged; its post-merge run #38175286266 succeeded.
- PR #55 introduced the modularisation plan; it is merged.
- PR #58 added canonical dashboard routes:
  - `/buyer` → buyer
  - `/seller` → seller
  - `/delivery` → delivery agent
  - `/daily-help` → daily-help provider (`professional`)
  - `/admin` → admin
- Existing paths are preserved: `/`, `/register/seller`, `/register/delivery`, `/register/daily-help`, `/register/buyer`, `/account`.
- The role route access policy checks signed-in state, registered roles, and verified admin flag. It is client-side navigation UX only; backend authorization remains authoritative.
- Browser history synchronization uses `popstate` and `history.pushState`; this is not yet a migration to React Router.

## 3. Deployment status and blocker

- A Vercel preview from the routing branch was marked READY before merge, and the latest PR-head CI passed.
- The current `main` commit `bcdc2f300cc8c8f5c3f0430d1ef81bb9d809c574` has a Vercel deployment marked `READY`. This deployment contains the runtime routing code merged in PR #58 (`1a8c1189`) plus docs-only changes.
- An attempt to create a verification deployment was rejected by Vercel with `402 payment_required`: `api-deployments-free-per-day`, over 100 deployments in 24 hours, retry after 86400 seconds from the response.
- This is a quota/billing gate, not an application CI failure. Do not retry repeatedly or attempt a bypass. Re-check existing deployment metadata and the quota window before attempting any deployment after the reset.
- The most recent prior main deployment visible to the tool was commit `b6148e34` (older than the current merged commit). That is not proof the new route code is live.
- Once the deployment quota resets, verify a deployment tied to commit `1a8c1189`, then perform **read-only, unauthenticated** smoke checks for the homepage and each canonical route, refresh/direct navigation, and browser Back/Forward. Do not run authenticated transactional tests until the test isolation requirements in section 1 are satisfied.

## 4. What changed in the latest routing phase

Files introduced/changed by PR #58 include:
- `src/app/routing/routeConfig.ts` — pure typed route resolution and `pathForRole`.
- `src/app/routing/roleRouteAccess.ts` — pure route access policy.
- `src/App.tsx` — route resolver, direct dashboard route handling, access denied screen, popstate listener.
- `src/components/Header.tsx` — role-switcher updates path using history.
- `tests/routeConfig.test.ts` — route/normalization tests.
- `tests/roleRouteAccess.test.ts` — signed-in, role membership, and admin policy tests.
- `e2e/login.spec.ts` — direct navigation, refresh, Back/Forward checks.
- `.github/workflows/e2e-login.yml` — runs the deterministic tests in the existing single workflow.

A failed intermediate preview and E2E run caught a malformed mobile handler and a bad URL assertion; both were corrected before merge. The final head passed CI. Do not confuse failed intermediate commits with the merged commit.

## 5. Next steps — execute in this order

### Step A — re-check deployment and API smoke PR
1. Read current `main` SHA, PR state, CI run and Vercel deployment metadata.
2. Deployment for `bcdc2f300cc8c8f5c3f0430d1ef81bb9d809c574` is `READY` and includes the routing code. Keep this exact SHA as the current runtime verification anchor until a later deployment is verified.
3. Review PR for `ci/enable-staging-readonly-api-smoke`. It should make the existing GET-only API smoke run against the known staging API and reject any other host/path.
4. Merge that PR only after CI passes and the API smoke step is **successfully executed**, not skipped. Record each endpoint result.

### Step B — finish routing verification
1. Verify the current staging deployment matches commit `1a8c1189` once a deployment is available.
2. Run read-only route checks on the actual staging hostname: `/`, `/buyer`, `/seller`, `/delivery`, `/daily-help`, `/admin`, and preserved registration/account paths.
3. Verify refresh and Back/Forward. Report separately which authenticated-role tests were skipped due to missing isolated synthetic accounts/OTP.
4. Confirm whether API smoke is skipped; do not report overall CI green as proof that API smoke ran.

### Step C — complete: saved-address mapper extraction

- PR #61 merged as `89c434aa0f9f22aeba49003fbd9d7249c4bc273a`.
- `src/entities/address.ts` now owns the `SavedAddress` interface and `toSavedAddress` mapper.
- `src/context/AppContext.tsx` imports the mapper and re-exports the type, preserving compatibility.
- `tests/savedAddress.test.ts` covers backend ID fallback, label/address defaults, optional-field normalization, zero coordinates, and `isDefault` conversion.
- CI run #38210469528 passed exact PR-head checks; post-merge run #38210571047 passed all three jobs. Vercel deployment `dpl_EDB7FEt856PE5qjtyztZx7Tz2ivL` is `READY` for the merged SHA.
- No AppContext state/action, address API, auth/session, localStorage, backend contract, or schema behavior was changed.

### Step D — complete: user profile mapper extraction merged, deployment verification pending

- PR #63 merged as `a1ea642f4cf201053088d820dce3dced469b5bf2`.
- `src/entities/userProfile.ts` now owns `UserProfile` and `mapServerUser`; `AppContext` re-exports the type.
- `tests/userProfile.test.ts` passed on the PR head; CI run #38211026737 passed all jobs; post-merge run #38211155596 passed all jobs.
- Exact PR preview for SHA `5f854644` was `READY`.
- The live aliases still point to deployment `dpl_HDZsaUHWJ9wJfKVrvCAkxbzRzhfm` at SHA `5a89345d`. No deployment for merged SHA `a1ea642f` is visible yet.
- **Hold further runtime changes** until the merged SHA is deployed and the read-only API smoke passes on the resulting main deployment.

### Step E — next phase after deployment verification

1. Verify a Vercel main deployment tied to `a1ea642f4cf201053088d820dce3dced469b5bf2`, and confirm `kuraliupdates.com` / `bazaar.kuraliupdates.com` aliases point to it.
2. Verify post-merge read-only API smoke (10 checks) and the unauthenticated browser checks. Keep the five authenticated role tests marked skipped until test identity/OTP secrets are safely configured.
3. Complete the consumer-to-domain dependency map in `docs/FRONTEND-DOMAIN-BOUNDARIES.md` before selecting any state/API extraction.
4. Keep backend contracts, database/schema, auth/session, OTP, and localStorage behavior unchanged.
5. Update the three Markdown handoff files with the exact deployed SHA and test outcomes before continuing.


## 6. Known project architecture and file hotspots

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4.
- Backend: Java / Spring Boot under `backend-java-spring`.
- Frontend entry: `src/App.tsx`.
- Shared context: `src/context/AppContext.tsx`, ~60.6 KB.
- API layer: `src/services/api.ts`, ~50.1 KB.
- Header/role navigation: `src/components/Header.tsx`.
- Admin dashboard: `src/components/Admin/AdminDashboard.tsx`.
- Seller dashboard: `src/components/Seller/SellerDashboard.tsx`.
- Delivery dashboard: `src/components/Delivery/DeliveryDashboard.tsx`.
- Daily Help Provider dashboard: `src/components/DailyHelpProfessional/DailyHelpProfessionalDashboard.tsx`.
- Buyer-facing Daily Help catalogue/booking stays a buyer feature; provider jobs/availability/timer/earnings belong to the provider module.
- Existing single CI workflow: `.github/workflows/e2e-login.yml`.
- Read-only API smoke script: `scripts/production-smoke.mjs`.
- The workflow's API smoke is conditional on `KURALI_API_BASE_URL` or `KURALI_STAGING_API_BASE_URL`; the latest successful run skipped it.

## 7. Data and test safety gates

Before any authenticated workflow that mutates data, require all of:
- dedicated test identities for each of the five roles;
- a secure staging-only OTP test interface or documented safe test OTP mechanism;
- dedicated synthetic records identifiable by test run/correlation ID;
- a reliable cleanup operation scoped strictly to those records;
- a check proving the target host and API are the designated staging environment;
- tests that avoid real payment/payout, customer messaging, or external side effects.

Until all conditions are verified, keep browser tests unauthenticated/read-only and do not claim complete role-flow E2E coverage. A green browser job alone may mean role-specific authenticated tests were skipped.

## 8. Required update format for every new chat/phase

At the end of each meaningful work session, update:
1. `docs/CHATGPT-CONTINUATION.md`: current SHA, PRs, CI URLs/results, deployment state/blockers, exact next action.
2. `docs/UI-MODULARIZATION-PLAN.md`: phase status and decisions.
3. `docs/FRONTEND-DOMAIN-BOUNDARIES.md`: dependency mapping and extraction progress.

Use absolute commit SHAs and direct PR/run/deployment URLs. Distinguish verified, pending, skipped, blocked, and inferred facts. Never state a deployment or authenticated workflow succeeded unless tool results prove it.


## 9. Continuation update — 13 October 2026

### Rechecked live state
- Current `main` docs checkpoint: `f2c354037ab2b25ba0f54397c2f535dd7325017d`.
- PR #63 runtime merge: `a1ea642f4cf201053088d820dce3dced469b5bf2`; post-merge CI was recorded as passing in prior checkpoint.
- Current custom-domain aliases still point to READY deployment `dpl_HDZsaUHWJ9wJfKVrvCAkxbzRzhfm`, SHA `5a89345dfe26b078e57fe9f30dc83656ebb834ee`.
- Vercel's status check for `a1ea642f` is failure with `upgradeToPro=build-rate-limit`. A READY preview on branch `feat/staging-e2e-otp-capture` at `996ba97da84daf0c1b163cf5b9ebd4b32cfe4f78` is not the main alias and is not proof the mapper change is live.

### Next action
1. Do not make runtime changes or attempt to bypass the Vercel quota gate.
2. Continue read-only dependency mapping across all `useApp()` consumers and direct/indirect `bazaarApi` calls.
3. Keep this handoff, `docs/UI-MODULARIZATION-PLAN.md`, and `docs/FRONTEND-DOMAIN-BOUNDARIES.md` aligned.
4. Resume runtime extraction only after a main deployment for `a1ea642f` is visible and read-only API/route smoke checks are confirmed executed.


### Read-only dependency inventory progress
- Added direct call-site names for each role dashboard and the AppContext-to-API bridge to `docs/FRONTEND-DOMAIN-BOUNDARIES.md`.
- This is not a complete transitive API contract map; payloads, error/fallback behavior, timers, and mutation paths still need tracing.
- PR #65 is open as a draft. CI run #42 was in progress at last check; backend and frontend jobs passed, while the browser job was still running read-only API smoke. Check the latest run before merge or changing this branch.


- CI caveat (13 October 2026): workflow run #42 (`38296500979`) was created for earlier PR head `1be287fee41e8429941de20c346a455ac6769449`. The docs have since been expanded and the current PR head is newer (`a912fff08094d293912b4dde6e7c1fc3aa333eb5` at the time of this note). Therefore run #42 does **not** validate the latest PR head. At last check its backend and frontend jobs passed, but the browser/read-only API smoke job was still in progress. Do not merge until a successful run is associated with the current head and its required checks are complete.


## Current continuation checkpoint — 13 October 2026

- PR #65 is merged: https://github.com/imgupta/kuraliupdates-bazaar/pull/65
- Merge/main/live SHA: `44374253b5fe3a5d65d946ffbece37d0b3cd1704`.
- CI run `38296784536` passed all three jobs; browser E2E and GET-only API smoke steps completed successfully. This does not imply authenticated five-role transactional tests ran unless the report shows them non-skipped.
- Vercel deployment `dpl_GChRk727VyTCu2d6zBwThFVPE2NZ` is `READY`; aliases include the root, www, and bazaar domains. `www.kuraliupdates.com` returned HTTP 200 on a read-only fetch.
- The previous Vercel rate-limit gate is cleared for this deployment.
- Next bounded runtime change is a pure Seller product mapper extraction into `src/entities/sellerProduct.ts`, with regression tests. Keep API calls, CRUD behavior, shared state, auth/session, localStorage, backend contracts, and schema unchanged.
- The current branch `refactor/extract-seller-product-mapper` contains that proposed extraction and a CI test step; do not merge until the exact PR head passes the existing workflow and its preview is checked.


## Current verified checkpoint — 13 October 2026 (PR #66)

- **Main / merged SHA:** `9ee871abfb60d86cce3a396b816bf778e99f8e5d`.
- **PR #66:** https://github.com/imgupta/kuraliupdates-bazaar/pull/66 — merged at 2026-10-12T19:36:25Z; merge SHA matches current main.
- **Post-merge workflow:** https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38298764709 — all three jobs completed successfully: frontend checks, browser E2E/read-only smoke, and backend tests.
- **Deployment:** Vercel deployment `dpl_F1uvjC9QwBPdqPYJ6LH7eCkmQw6K` is `READY` on the exact main SHA; aliases include `kuraliupdates.com`, `www.kuraliupdates.com`, and `bazaar.kuraliupdates.com`.
- **PR #66 scope:** pure Seller product mapper extraction to `src/entities/sellerProduct.ts`, regression tests in `tests/sellerProduct.test.ts`, and an existing-workflow test invocation. No API endpoint/CRUD, shared AppContext state/actions, auth/session, localStorage, backend contract, OTP, schema, or database changes.
- **E2E caveat:** a successful browser job is not proof that authenticated buyer, seller, delivery agent, daily-help provider, and admin journeys ran non-skipped. Check the report and required secrets before claiming full role-flow coverage.
- **Immediate next action:** update this handoff and the two architecture documents in a docs-only PR; then continue read-only tracing of transitive `useApp()` and `bazaarApi` dependencies, payload/error/fallback semantics, timers/listeners, and mutation classification. Do not begin AppContext/API-domain extraction until the dependency map is complete.
- **Architecture decision:** retain a modular monolith in the existing React app; do not create five separately deployed frontends in this phase. Preserve the single environment designated staging and keep routine live checks read-only.


## Source-tracing checkpoint — 13 October 2026

- PR #67 merged as `7edd96455a57da73d76e03fdea817d30e629b577`; post-merge CI #38300351263 passed all three jobs. Exact-SHA Vercel deployment `dpl_13kh7LcMfTADMQNUfdKte1V9JEHm` is `READY`.
- Read-only source pass expanded the dependency evidence in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`; this remains documentation only.
- Newly recorded cadence/effect details: AppContext backend sync every 45 seconds; Delivery job refresh every 10 seconds and geolocation publish throttled to >=10 seconds / >=15 m movement with a 30-second heartbeat; LiveOrderMap reads tracking every 5 seconds; Daily Help Provider refreshes every 10 seconds and ticks service duration every second while an active started job exists; Admin dashboard refreshes every 45 seconds; auth UI has countdown/focus timeouts and API send/verify OTP timeout guards.
- API failure contracts are mixed: methods return `null`, `[]`, `false`, or structured result objects in some cases and throw errors in others. Keep this inconsistency documented as current behavior; do not normalize it as part of a pure extraction.
- Next: continue tracing remaining API methods and request/response payloads, classify storage/network effects and mutation risk, then review the map for completeness before proposing any state/API refactor. Keep all live smoke checks read-only and do not use shared real data for transactional tests.


## Buyer/auth consumer trace extension — 13 October 2026

- PR #68 merged as `895864adcd0df99b06f93e41b33b0daa0fba1a1b`; its PR-head CI and post-merge main CI run #38300661109 passed all three jobs.
- The latest Vercel deployment verified so far is still the READY deployment for `7edd96455a57da73d76e03fdea817d30e629b577`. PR #68 is docs-only; do not imply a deployment of `895864ad` has been verified until Vercel metadata ties a READY deployment to that exact SHA.
- The source inventory now includes Buyer Daily Help discovery/booking and order tracking, checkout/cart children, and both legacy/current OTP auth components. See the per-consumer evidence in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`.
- Buyer Daily Help is separate from the provider dashboard: it fetches service catalogue/slots/latest booking, polls booking state every 5s while IN_PROGRESS and 15s otherwise, and updates elapsed-time display every second while service is active. Booking creation is transactional and must not run in shared-data smoke tests.
- `OrderTrackingModal` calls live tracking and refreshes tracking/OTP-related state every 5 seconds. Keep tracking read-only, but verify OTP display semantics before moving it.
- Both `src/components/Auth/AuthPage.tsx` and `AuthPageV2.tsx` exist and call OTP endpoints; `BuyerRegistrationPage.tsx` also directly checks registration and sends/verifies OTP. Do not remove or consolidate an auth component without confirming route/import reachability and compatibility first.
- Next: finish call-site inventory for shared overlays and remaining nested components, then classify all API methods/payloads and stale-response cleanup. No runtime extraction yet.


## Latest continuation — 13 October 2026 (after PR #69)

- Rechecked main SHA: `0659a5e82d9eab755d017a6e8abdd8a0588f60db`.
- PR #69 merged: https://github.com/imgupta/kuraliupdates-bazaar/pull/69.
- Post-merge run #38301147128 completed successfully for all three jobs: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38301147128.
- Vercel exact-SHA deployment `dpl_CRKcGhvm2HMzFWzNhQEgRYWQXeQe` is READY; aliases include `kuraliupdates.com`, `www.kuraliupdates.com`, and `bazaar.kuraliupdates.com`.
- PR #69 was docs-only and extends Buyer booking/tracking/checkout and auth consumers. No runtime refactor occurred.
- A source-derived 72-method first-pass endpoint index was added to `docs/FRONTEND-DOMAIN-BOUNDARIES.md`; it is explicitly provisional pending manual verification of payloads, error contracts, timeout, auth headers, and multiple-fetch side effects.
- **Next action:** manually validate the API method index and expand exact contracts for one domain at a time; trace every remaining `useApp()`/nested consumer, then review map completeness. Do not begin AppContext/API-domain extraction until the map is complete and reviewed. Do not infer five-role authenticated coverage from a green browser job.


## Continuation — auth/profile API contract trace started

- PR #70 merged as `5645a53bd9221c3c8240d68be881c7396a23d595`; its exact-head CI run #38301498227 passed frontend checks, backend tests, and browser E2E/read-only smoke: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38301498227.
- Post-merge main workflow #38301927858 was still running at last check: frontend passed; backend and browser E2E/read-only smoke were in progress. Verify that run before claiming post-merge success.
- Vercel deployment lookup for the new main SHA could not be completed because the Vercel tool returned a team-scope authorization error / 404 for the old preview URL. Re-check deployment metadata with the authorized team scope; do not infer deployment success from CI.
- Started a second docs-only trace for authentication/session and buyer-address methods. The client-side request/error contract is documented in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`; no API/auth/OTP runtime code changed.
- Next: verify post-merge CI and exact-SHA deployment for PR #70, then continue Seller, Delivery, Daily Help and Admin API contract traces in separate bounded slices. Keep the dependency map partial until all API methods and transitive consumers are reviewed. Never run OTP/order/booking/approval/location writes in routine live smoke.


## Continuation — Seller API contract trace, 13 October 2026

- PR #71 merged as `f0c08358faeb4acd06da0700ab6d4354aed5c24e`: https://github.com/imgupta/kuraliupdates-bazaar/pull/71.
- Post-merge workflow #38302399531 completed successfully for frontend checks, backend tests, and browser E2E/read-only smoke: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38302399531.
- Vercel lookup confirms deployment `dpl_9rogp5mcRsBVLEjm2xRsVBmsQi6t` READY on SHA `5645a53bd9221c3c8240d68be881c7396a23d595` (PR #70 baseline), **not** the newer PR #71 merge SHA. Exact-SHA deployment of `f0c08358faeb4acd06da0700ab6d4354aed5c24e` remains unverified; do not claim it is deployed.
- Seller API client contracts have now been traced in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`; only documentation changed. The legacy seller registration/product calls omit a bearer token in the client request, unlike `/sellers/me/**` methods; this is recorded as observed behavior, not changed.
- Next: trace Delivery API request/response/error semantics. Continue one domain per docs-only PR, wait for all latest-head CI jobs, verify post-merge workflow and exact-SHA deployment. Keep shared-data smoke read-only and do not claim five-role authenticated E2E without non-skipped evidence.


## Continuation — Delivery API contract trace, 13 October 2026

- Current main SHA before this slice: `5235946abef42d15ec120a3509d835ae85b781de`; post-merge workflow #38303688063 passed all three jobs: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38303688063.
- PR #72 Seller API trace is merged; the client-side request/header/fallback details are documented in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`.
- Delivery client methods were traced from `src/services/api.ts` blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. Current PR branch is docs-only; no API/runtime/auth/OTP behavior changed.
- Current READY Vercel deployment `dpl_9rogp5mcRsBVLEjm2xRsVBmsQi6t` still points to SHA `5645a53bd9221c3c8240d68be881c7396a23d595`; exact-SHA deployment for newer main is unverified. Do not claim current main is deployed.
- Next: wait for all latest-head checks on Delivery trace PR, merge only if docs-only and green, verify post-merge CI and exact-SHA deployment, then continue Daily Help and Admin traces. Keep shared-data checks read-only; do not run OTP resend/verify, claim jobs, location writes, order creation, booking, approvals, or destructive actions against real data.


## Continuation — Daily Help API contract trace, 13 October 2026

- PR #73 Delivery API trace merged at `84944cea8961084bf5bf488e324cb7b287d15674`. PR-head workflow #38366106002 passed all three jobs, including read-only API smoke and browser E2E: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38366106002.
- Post-merge main workflow #38366636788 is running; do not report post-merge CI as passed until its conclusion is success: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38366636788.
- The latest Vercel deployment lookup is READY on prior SHA `5235946abef42d15ec120a3509d835ae85b781de`; exact-SHA deployment for current main is not yet verified.
- Daily Help client contracts are being documented in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`. Do not trigger bookings, provider registration, slot changes, availability changes, job acceptance, OTP start, or completion against shared data.


## Admin API trace checkpoint — 15 October 2026

- PR #74 (Daily Help API client contract trace) merged as `6d1616bc40823e00d7d58ef3d212725ee3792e37`.
- Exact PR-head workflow #38366764090 passed all three jobs: frontend checks, backend tests, and browser E2E/read-only staging API smoke. The smoke-target guards and read-only API smoke steps executed successfully; authenticated five-role flows are not proven by this job alone.
- The Admin API contract trace is now being prepared as a separate documentation-only change on branch `docs/trace-admin-api-contracts`.
- Source inspected: `src/services/api.ts` blob `ddb67904e14b8d75840389581d4a6c0bcd8a5367`. The Admin trace records request methods/paths, token header behavior, response fallbacks, and mutation classification. No Admin mutation or live transactional request was issued.
- Post-merge workflow for `6d1616bc` and exact-SHA Vercel deployment still need explicit verification; do not infer either from PR-head CI. Keep this as a deployment verification gate.
- Next after Admin trace: reconcile all API exports with direct and transitive call sites, validate the provisional endpoint index, then review timer/listener cleanup, storage effects, duplicate requests and regression-test coverage. Do not begin AppContext/state/API extraction until this inventory is complete and reviewed.


## API consumer reconciliation checkpoint — 15 October 2026

- PR #75 (Admin API contract trace) merged as `f7c0495b5c0d94368e55e5c4654cfbd55e0138d5`: https://github.com/imgupta/kuraliupdates-bazaar/pull/75.
- PR-head workflow #38617516236 passed all three jobs (frontend checks, backend tests, browser E2E/read-only staging API smoke): https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38617516236.
- Vercel deployment `dpl_3TtDhsbihxognX7G8yctGiKC8RYw` is READY and its metadata matches the exact merged SHA `f7c0495b5c0d94368e55e5c4654cfbd55e0138d5`. Aliases include `kuraliupdates.com`, `www.kuraliupdates.com`, and `bazaar.kuraliupdates.com`. The project has one environment designated staging; do not call it a separate production environment.
- A source-tree inventory found 72 methods on `bazaarApi`. A static name-based call-site scan across the frontend source files found apparent consumers for 69; `getDemandAnalytics()`, `trackOrder()`, and `getAvailableDeliveryJobs()` were not found in direct-call syntax. Treat these as review candidates, not deletion candidates: search aliases/indirect use and compare with runtime behavior/tests before any removal.
- Consumer grouping observed: `AppContext` owns cross-role sync/session/address and selected buyer/order/delivery operations; `SellerDashboard` calls seller product/order/discount methods; `AdminDashboard` calls admin reads and approval/service-management methods; auth pages call OTP/registration methods; Buyer Daily Help calls catalogue/availability/booking methods; the Daily Help Provider dashboard calls provider availability/job/timer lifecycle methods; Delivery dashboard calls delivery jobs, OTP resend, location and agent lookup; tracking UI calls live tracking.
- This is a static inventory, not a complete transitive graph or proof of backend authorization. The three candidate methods and call chains, context value/action consumers, payload/error contracts, timers/listeners, storage effects, and protecting tests still require review.
- Next bounded step: add precise call-site references and transitive context dependency/effect notes to `docs/FRONTEND-DOMAIN-BOUNDARIES.md`, validate the three candidate methods, and update this handoff and plan. Do not change runtime behavior or begin state/API extraction until the map is reviewed. Keep smoke checks read-only and never create/delete transactional records in shared data.


## Continuation checkpoint — 15 October 2026 (targeted source audit)

- Post-merge workflow for PR #76 is confirmed complete and successful: [run #38619030119](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38619030119), exact main SHA `204ff778b513310663d4b3c058ee45ae5482a6b8`; frontend, backend, and browser E2E/read-only staging smoke jobs all passed.
- Vercel main deployment `dpl_BpRKyV4k8155p49KDY3aBGByB3jo` is `READY` on that exact SHA and includes `kuraliupdates.com`, `www.kuraliupdates.com`, and `bazaar.kuraliupdates.com` aliases. Keep the product's one configured environment described as staging; do not infer a separate production environment from provider metadata.
- New documentation-only branch: `docs/validate-api-legacy-candidates`. It records a targeted source audit in `docs/FRONTEND-DOMAIN-BOUNDARIES.md` and updates this handoff and `docs/UI-MODULARIZATION-PLAN.md`.
- Key finding: `getAvailableDeliveryJobs()` is not a safe duplicate of `getDeliveryAvailableJobs()`: same URL, different auth behavior and response mapping. The live component/AppContext call sites use the authenticated mapped method. Do not delete or alias the unauthenticated raw method until full repo/test/dynamic-reference search is complete.
- `getDemandAnalytics()` and `getAdminAnalytics()` request the same demand-trends endpoint, but only `getAdminAnalytics()` was observed in `AdminDashboard.tsx`. `trackOrder()` had no direct use in the scanned frontend sources; track the actual polling helper behind the tracking components before any deletion decision.
- `AppContext` remains a broad cross-role facade with guarded localStorage hydration/persistence, a 45-second backend sync, and session/address mutation sequencing. No runtime code was changed.
- Next: finish full-repository candidate search and consumer map, trace tracking helper contracts, map public `useApp` members to consumers, then link mutations to regression tests. Runtime extraction remains blocked until this review is complete and documented. Live staging checks stay read-only; no real/shared transactional records, OTPs, approvals, bookings, job claims or location writes.


## Continuation checkpoint — direct context consumer map

- PR #77 merged at `79a152b8565d3d0fc5fc698875495d8e8d439030`; its post-merge workflow #38619689342 passed frontend checks, backend tests and browser E2E/read-only staging smoke. Exact-SHA Vercel deployment `dpl_EcA45gc8UrMEfXUfzcXPjiPQ9M1L` is READY and carries the domain aliases.
- New documentation-only branch: `docs/map-appcontext-consumers`. It extends `docs/FRONTEND-DOMAIN-BOUNDARIES.md` with directly destructured `useApp()` contracts by component and candidate API symbol scan results.
- Direct consumers now recorded for App/Header, Admin, both auth pages, buyer account/registration/cart/checkout/compare/Daily Help/chat/shop/tracking, Delivery, Daily Help Provider and Seller dashboards/registration modals. Prop/callback/route reachability is still not a complete transitive graph.
- The tracked TS/TSX/test scan found no direct references to `getDemandAnalytics()`, `trackOrder()`, or `getAvailableDeliveryJobs()` outside their declarations. Preserve these methods pending dynamic/external compatibility review and API-contract tests; the raw unauthenticated `getAvailableDeliveryJobs()` differs materially from authenticated/mapped `getDeliveryAvailableJobs()`.
- Next: map callback/prop handoffs and auth route reachability, then link every mutation category to tests. No runtime extraction until the transitive dependency graph is reviewed. Keep staging checks read-only and do not create orders/bookings, claim jobs, trigger OTP writes, publish location, or change approvals/services.
