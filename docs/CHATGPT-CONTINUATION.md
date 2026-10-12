# KuraliUpdates Bazaar — ChatGPT Continuation Handoff

**Last updated:** 2026-10-12 (Asia/Kolkata)  
**Repository:** https://github.com/imgupta/kuraliupdates-bazaar  
**Last verified deployed runtime commit:** `89c434aa0f9f22aeba49003fbd9d7249c4bc273a` (address mapper) · latest docs-only main commit `5a89345dfe26b078e57fe9f30dc83656ebb834ee`  
**Current state:** routing, guarded read-only staging API smoke, and saved-address mapper extraction are merged and deployed. PR #61 merged as `89c434aa`; post-merge run #38210571047 passed all CI jobs. The current docs-only main commit `5a89345d` also passed run #38210829173 and its Vercel deployment is `READY`. The next pure mapper extraction (user profile mapping) is in review on `refactor/extract-user-profile-mapper`.

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

### Step D — current phase: pure user profile mapper extraction

Branch `refactor/extract-user-profile-mapper` moves the existing `UserProfile` interface and `mapServerUser` pure mapper into `src/entities/userProfile.ts`, importing `SavedAddress` from `src/entities/address.ts` and re-exporting `UserProfile` from `AppContext` for compatibility. It adds `tests/userProfile.test.ts` and a CI step.

1. Verify exact-head TypeScript, tests/build, backend tests, read-only API smoke, browser E2E, and Vercel preview before merge.
2. Confirm null/undefined server fields preserve prior values, empty strings and zero coordinates override prior values, and unrelated session/role/address fields are preserved.
3. After merge, verify post-merge CI and deployment, update docs with exact SHA/results, then continue the broader consumer-to-domain dependency map.
4. Do not move AppContext state, address API calls, token/localStorage, or auth/OTP behavior in this phase.

### Step D — later, not now
- Extract Seller, Daily Help Provider, Delivery Agent, Buyer, and Admin feature modules incrementally.
- Only after stable module boundaries and test coverage, prototype separate app builds / module federation.
- Do not introduce runtime federation, separate deployments, or separate auth clients in the current phase.

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
