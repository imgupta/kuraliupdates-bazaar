# Frontend Modularisation Baseline and Execution Plan

**Status:** PR #66 pure Seller product mapper and documentation PRs #67–#69 are merged. Main SHA `0659a5e82d9eab755d017a6e8abdd8a0588f60db`; post-merge CI run #38301147128 passed all three jobs; Vercel deployment `dpl_CRKcGhvm2HMzFWzNhQEgRYWQXeQe` is READY on the exact SHA. AppContext state/API-domain extraction has not started; the dependency map remains partial pending endpoint payload/error/timeout tracing.
**Baseline branch:** `main`  
**Original architecture baseline commit:** `1c43319281573d23f1b22e1bc97f64ae5548e292`  
**Scope:** Frontend only. Preserve current user-facing behaviour, Spring Boot API contracts, Oracle schema/data, and the existing single environment designated staging by the owner.

## Goals

1. Make Buyer, Seller, Delivery Agent, Daily Help Provider, and Admin independently developable and testable.
2. Enforce explicit module boundaries before introducing separately deployed micro-frontends.
3. Reduce regressions by adding deterministic module tests and role-specific browser coverage.
4. Preserve one shared, server-authoritative authentication/session contract.
5. Avoid a high-risk rewrite or a big-bang deployment.

## Repository baseline

### Stack and build

- React 19, TypeScript, Vite 8, Tailwind CSS 4.
- Current scripts in `package.json`: `dev`, `build`, `preview`, `clean`, and `lint` (`tsc --noEmit`).
- No dedicated frontend unit-test script is currently defined.
- Current Playwright setup is `playwright.config.ts`; browser tests are under `e2e/`.
- CI workflow: `.github/workflows/e2e-login.yml`.

### Current high-coupling files

| File | Approx. size | Current responsibility / concern |
|---|---:|---|
| `src/App.tsx` | 5.3 KB | Role dashboard composition, shell/header, global modals/toasts, and pathname-based navigation are combined. |
| `src/context/AppContext.tsx` | 60.6 KB | Authentication/session, profile/address, products, sellers, coupons, cart, orders, delivery jobs, chat, approvals, and backend sync share one context. |
| `src/services/api.ts` | 50.1 KB | Authentication and all five domains' endpoints live in one API object. |
| `src/components/Header.tsx` | 15.6 KB | Shared header also coordinates role-sensitive navigation and shared UI state. |
| `src/components/Admin/AdminDashboard.tsx` | 45.1 KB | Large admin screen should be decomposed internally after the module boundary is established. |
| `src/components/Auth/AuthPage.tsx` | 34.6 KB | Legacy-looking auth page; verify references before removal. |
| `src/components/Auth/AuthPageV2.tsx` | 33.1 KB | Current root/role registration auth implementation. |
| `src/components/Seller/SellerDashboard.tsx` | 22.3 KB | Seller UI imports the global context and shared API object. |
| `src/components/Delivery/DeliveryDashboard.tsx` | 22.8 KB | Delivery UI imports global context/API and imports `LiveOrderMap` from the Buyer folder. |
| `src/components/DailyHelpProfessional/DailyHelpProfessionalDashboard.tsx` | 22.1 KB | Provider dashboard imports global context/API. |
| `src/components/Buyer/DailyHelpHome.tsx` | 17.8 KB | Customer-facing Daily Help discovery/booking belongs to Buyer, not the provider module. |

### Current route and role behaviour

- `src/App.tsx` manually reads `window.location.pathname`.
- Existing special paths include `/register/seller`, `/register/delivery`, `/register/daily-help`, `/register/buyer`, and `/account`.
- The role dashboards are selected from the current role in the global app context rather than being independently routed modules.
- Role values in `src/types/index.ts`: `buyer`, `seller`, `delivery`, `professional`, `admin`.
- Preserve these existing paths as compatibility aliases while introducing canonical role routes; do not break existing bookmarks or registration entry points.
- The Daily Help customer catalogue and booking flow stays in Buyer. Provider slots, job acceptance, service timer, history, and earnings belong to Daily Help Provider.

### Current test coverage and gaps

- `e2e/login.spec.ts` checks homepage/login availability, empty-input validation, and optional authenticated login/session checks for all five roles.
- Authenticated role tests skip when their identity or OTP secret is absent. CI must report skipped tests honestly; a green job alone does not prove all roles were exercised.
- `scripts/production-smoke.mjs` is a separate read-only API smoke suite gated by an API base URL.
- Add deterministic frontend tests first; reserve real OTP and transactional browser tests for the designated staging environment with dedicated synthetic identities.
- Existing regression areas to explicitly cover: session persistence and My Account, saved addresses, seller product/order flows, duplicate delivery jobs/orders, delivery OTP validation/replay, Daily Help booking/start/complete, and admin authorization.

## Target architecture

The initial target is a **modular monolith** in the current Vite app. Actual micro-frontend deployment is a later milestone after boundaries and tests are proven.

```text
src/
  app/                 # composition, routing, shell, route guards, error boundary
  modules/
    buyer/
    seller/
    delivery/
    daily-help-provider/
    admin/
  shared/
    auth/              # one auth/session contract and client
    api/               # HTTP transport, shared error model, common contracts
    ui/                # truly generic reusable UI
    layout/
    config/
    observability/
  entities/            # stable cross-domain data types only
  test/                # shared fixtures, mocks, test setup
```

Each module should contain its own `pages/`, `components/`, `hooks/`, `services/`, `state/`, `types/`, `tests/`, and a public `index.ts` as warranted by the module's actual size. Do not create empty folders or abstractions without a consumer.

Later extraction target, only after the modular monolith passes its gates:

```text
apps/
  shell/
  buyer/
  seller/
  delivery/
  daily-help-provider/
  admin/
packages/
  contracts/
  design-system/
  auth-client/
  api-client/
```

A monorepo is acceptable. Evaluate Vite-compatible module federation only in a small proof of concept; do not introduce runtime federation during the first phases.

## Non-negotiable architecture rules

1. A module must not import another role module's private files. Cross-role imports must use a documented public contract or a truly shared component.
2. Shared code must be framework/domain-neutral where possible. Do not move the old global context into a differently named global store.
3. Authentication/session is shared once. Feature state belongs to its module.
4. The shared HTTP transport owns base URL, auth headers, request parsing, timeouts, and normalized errors. Domain APIs own endpoint paths and typed payloads.
5. Keep backend request/response shapes compatible during the frontend refactor. Backend changes require separate justification and tests.
6. Do not treat local/demo fallback mutations as successful server persistence. Failure states must remain explicit.
7. Route guards are for navigation UX only; backend authorization remains the security boundary.
8. Do not log OTP values, bearer tokens, or other credentials.
9. Do not change Oracle schema, database records, backend deployment, or OTP/auth semantics as part of frontend modularisation.
10. Make each pull request small, buildable, and reversible. Do not merge experimental changes into `main` before CI and staging verification pass.

## Phased execution plan

### Phase 1 — Baseline and architecture contract (this PR)

- Record current baseline commit, route map, role inventory, high-coupling files, and known test gaps.
- Document module boundaries, safety rules, and phased exit criteria.
- No production-facing code, backend, or database changes.

**Exit gate:** documentation reviewed; baseline commit and current scripts recorded; no runtime behaviour changed.

### Phase 2 — Routing and application shell

- Add React Router (or an equally explicit, tested router) and central route definitions.
- Add authentication and role guards, shared shell, and global error boundary/toast placement.
- Preserve existing routes as aliases during migration.
- Keep the existing screens and business logic intact.

**Exit gate:** direct navigation, refresh, Back/Forward, unauthenticated redirects, role restrictions, and existing registration/account paths pass tests.

### Phase 3 — Split global state incrementally

- Extract the shared authentication/session contract first.
- Extract Buyer state, then Seller, Delivery, Daily Help Provider, and Admin state in separate commits.
- Keep only true cross-cutting state in the root provider.
- Avoid changing business rules while relocating state.

**Exit gate:** role modules can mount with module-specific providers/test fixtures; session restore/logout remains consistent; no duplicate source of truth for auth.

### Phase 4 — Domain API clients and contracts

- Extract transport and normalized errors.
- Split API operations into `authApi`, `buyerApi`, `sellerApi`, `deliveryApi`, `dailyHelpApi`, and `adminApi`.
- Replace loose `any` at module boundaries with typed request/response contracts.
- Keep backend endpoints/payloads unchanged unless separately approved.

**Exit gate:** contract tests cover success, validation error, expired session, unauthorized response, timeout, and network failure.

### Phase 5 — Role module extraction

Recommended order:
1. Seller
2. Daily Help Provider
3. Delivery Agent
4. Buyer (including customer-facing Daily Help booking)
5. Admin

For each module, move one vertical slice at a time, add a public entry point, remove cross-role private imports, and test before continuing.

**Exit gate:** each module's internal files are private to the module; composed application still builds and preserves the baseline flows.

### Phase 6 — Independent testing

- Add Vitest and React Testing Library for unit/component/hook tests.
- Add MSW or equivalent deterministic API mocking.
- Add module test commands and CI reporting.
- Keep Playwright for composed-app and staging E2E.
- Use synthetic, run-tagged test records; never delete real data or run transactional tests against an unverified database target.

**Exit gate:** deterministic tests run without the live backend; staging tests are explicitly labelled; missing OTP secrets are reported as skipped, not passed.

### Phase 7 — Enforce boundaries and prove extraction

- Add import-boundary lint checks.
- Measure module build output and shared dependency duplication.
- Build a minimal shell + one remote proof of concept on a non-default branch.
- Evaluate runtime federation and independent deployment pipelines only after the proof of concept passes.
- Keep a single staging environment unless the owner explicitly provisions another.

**Exit gate:** one module can be built/tested independently, the shell can compose it, contract compatibility is checked, and a rollback path is documented.

## Proposed initial route map

Canonical role routes are proposals; retain legacy paths until verified:

| Purpose | Proposed canonical path | Compatibility requirement |
|---|---|---|
| Public/auth | `/auth/*` | `/` must continue to show the current unauthenticated entry experience |
| Buyer | `/buyer/*` | Preserve root behaviour for signed-in buyer sessions if currently relied on |
| Seller | `/seller/*` | Keep registration path `/register/seller` |
| Delivery Agent | `/delivery/*` | Keep registration path `/register/delivery` |
| Daily Help Provider | `/daily-help/*` | Keep registration path `/register/daily-help` |
| Admin | `/admin/*` | Enforce role access on both client and backend |
| Account | `/account` | Preserve for all authenticated roles |

## CI and verification gates

For every phase that changes runtime code:

1. `bun install --frozen-lockfile` (or the repository's verified lockfile-compatible install command).
2. `bun run lint`.
3. `bun run build`.
4. Relevant deterministic module tests.
5. Playwright smoke/regression tests for changed routes.
6. For auth/order/booking mutations, staging-only E2E with dedicated test identities and run-tagged synthetic records.
7. Verify the actual deployed commit and smoke test before considering the change complete.

Do not claim role coverage when the role's authenticated test was skipped. Do not merge or deploy an unverified architecture change.

## Out of scope for Phase 1

- No code movement or dashboard rewrite.
- No visual redesign.
- No backend/API/database schema change.
- No change to authentication, OTP, order, payment, delivery, or Daily Help business rules.
- No independent app deployments or module federation yet.


## Current execution checkpoint — 2026-10-12

Read `docs/CHATGPT-CONTINUATION.md` first for the operational handoff and `docs/FRONTEND-DOMAIN-BOUNDARIES.md` for the concrete state/API extraction inventory.

### Completed and verified

- PR #55 established this plan; merged.
- PR #56 centralized legacy route resolution; merged as `5e348b1ed71640f526342de48d21e9b9d08df94a`.
- PR #57 added deterministic route-registry regression tests; merged as `b6148e34ed4f36c4a05f89d1e24cfbfc95dd175f`.
- PR #58 added canonical role dashboard routes and client-side route access policy; merged as `1a8c1189ebd9c8c86503e690f0e396e696391e70`.
- Post-merge run https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38175672333 completed successfully for frontend, backend, and browser E2E.
- The workflow's read-only API smoke step was skipped in run #38209942997. PR #60 fixes this with a canonical staging URL fallback and strict host/path guard. Its CI run #38210084448 passed all **10/10** read-only API checks; authenticated browser tests remained skipped because role secrets were unset. Re-run checks after the final documentation update before merging.
- A Vercel deployment tied to `bcdc2f300cc8c8f5c3f0430d1ef81bb9d809c574` is now `READY` and includes the routing code merged in PR #58. A prior deployment API attempt hit the daily quota, but the later automatic main deployment succeeded.

### Current routing surface

- Legacy routes retained: `/`, `/register/seller`, `/register/delivery`, `/register/daily-help`, `/register/buyer`, `/account`.
- Canonical role routes: `/buyer`, `/seller`, `/delivery`, `/daily-help`, `/admin`.
- Route access policy is for frontend navigation UX. Backend authorization remains authoritative.
- Browser route tests cover direct navigation, refresh, and Back/Forward at the unauthenticated UI level. Authenticated role coverage may skip without test secrets/OTP; inspect reports before claiming all five roles passed authenticated flows.

### Next gates

1. The verified runtime baseline is deployment `dpl_ALThn73jiVhUQqb3kVyzTHt9s31V` (`READY`), tied to `96cd0cf36ffee801703c5d5d269e8072f7160a2f`. It includes the routing code and staging smoke workflow.
2. PR #60 made the read-only API smoke execute by default with a strict host/path guard. Run #38210187887 passed 10/10 API checks; post-merge run #38210267860 passed all three jobs.
3. PR #61 extracted the saved-address mapper; SHA `89c434aa0f9f22aeba49003fbd9d7249c4bc273a` has a `READY` deployment.
4. PR #63 merged the user-profile mapper as `a1ea642f4cf201053088d820dce3dced469b5bf2`; PR-head and post-merge CI passed, and its exact PR preview was `READY`.
5. The live aliases still point to SHA `5a89345d`, so verify a main deployment tied to `a1ea642f` before any further runtime change.
6. After that deployment and read-only smoke pass, complete the consumer-to-`useApp`/API dependency map before selecting state/API extraction.
7. Keep auth/OTP/backend/schema behavior unchanged; retain the `useApp` compatibility facade and update all three docs after each checkpoint.

## First domain extraction — PR in progress

- Branch: `refactor/extract-saved-address-mapper`.
- Scope: move the existing pure saved-address mapper and interface into `src/entities/address.ts`; re-export `SavedAddress` from `src/context/AppContext.tsx` so existing imports remain valid.
- Regression tests: `tests/savedAddress.test.ts`, run by the existing CI workflow.
- No API call, session/local-storage key, auth/OTP behavior, backend contract, schema, or address-screen behavior is intentionally changed.
- Merge gate: TypeScript, all frontend tests/build, backend suite, read-only API smoke, browser E2E, and Vercel preview must pass for the exact PR head.


## Saved-address mapper extraction — completed 2026-10-12

- PR #61: `https://github.com/imgupta/kuraliupdates-bazaar/pull/61`.
- Merged SHA: `89c434aa0f9f22aeba49003fbd9d7249c4bc273a`.
- New module: `src/entities/address.ts`; regression tests: `tests/savedAddress.test.ts`.
- Exact PR CI #38210469528 and post-merge CI #38210571047 passed; the read-only API smoke ran and passed; Vercel deployment `dpl_EDB7FEt856PE5qjtyztZx7Tz2ivL` is `READY`.
- This moved only the mapper and type. No AppContext state/actions, API methods, localStorage, OTP/auth, backend, or schema changes.


## Second pure mapper extraction — PR in progress

- Branch: `refactor/extract-user-profile-mapper`.
- Scope: move `UserProfile` and `mapServerUser` from `src/context/AppContext.tsx` to `src/entities/userProfile.ts`; re-export `UserProfile` from AppContext.
- Tests: `tests/userProfile.test.ts` is run in the existing CI workflow.
- Compatibility rules under test: nullish values retain previous fields; empty strings and zero coordinates are valid overrides; all unrelated profile/session/role/address fields survive via spread of the previous profile.
- No state movement, API behavior, localStorage, authentication, OTP, backend, or schema changes are intended.


## Continuation checkpoint — 13 October 2026

- **Completed:** baseline docs, canonical role route/access-policy tests, saved-address pure mapper, user-profile pure mapper, compatibility exports and mapper regression tests.
- **Deployment gate:** PR #63 runtime SHA `a1ea642f4cf201053088d820dce3dced469b5bf2` is merged and CI-green, but current custom-domain aliases still resolve to `5a89345dfe26b078e57fe9f30dc83656ebb834ee`. Vercel check for the merged SHA reports a build-rate-limit failure. Do not attempt quota bypass or repeated deployments.
- **Allowed while blocked:** read-only code/dependency inventory and documentation updates only.
- **Next execution order:** (1) verify main deployment SHA and aliases; (2) run read-only route and API smoke, confirming steps executed rather than skipped; (3) finish consumer-to-domain dependency map; (4) propose a small, test-first extraction PR; (5) only after gates pass, continue role module boundaries.
- **Architecture decision unchanged:** build a modular monolith first. Do not create five separately deployed apps or introduce runtime module federation yet.


## Continuation checkpoint — 13 October 2026

- Latest `main` documentation checkpoint: `f2c354037ab2b25ba0f54397c2f535dd7325017d`.
- Latest merged runtime change remains the pure user-profile mapper in PR #63 (`a1ea642f4cf201053088d820dce3dced469b5bf2`); its CI passed, but that merged SHA is not yet confirmed on the live custom-domain aliases.
- Current verified alias is still deployment `dpl_HDZsaUHWJ9wJfKVrvCAkxbzRzhfm`, commit `5a89345dfe26b078e57fe9f30dc83656ebb834ee`.
- A newer Vercel preview exists for `feat/staging-e2e-otp-capture` at `996ba97d`, but it is not the main deployment and does not satisfy the mapper deployment gate.
- Vercel's check for `a1ea642f` reports a build-rate-limit failure (`upgradeToPro=build-rate-limit`). Do not retry repeatedly, bypass quota, or change billing/security settings automatically.
- Continue with read-only inventory and documentation only until a main deployment for `a1ea642f` is visible and read-only route/API smoke checks are confirmed. No backend, database, OTP/auth, localStorage, or runtime behavior changes in this checkpoint.


## Dependency inventory update — 13 October 2026

A read-only source pass now records direct API method names for Seller, Delivery, Daily Help Provider, Admin and Auth, plus the `AppContext` bridge. This remains an inventory, not a behavior change or completed transitive call graph. The next code phase is still blocked on confirming the merged profile-mapper SHA is deployed and read-only smoke is executed. See `docs/FRONTEND-DOMAIN-BOUNDARIES.md` for the current per-consumer evidence and remaining checklist.


- CI caveat (13 October 2026): workflow run #42 (`38296500979`) was created for earlier PR head `1be287fee41e8429941de20c346a455ac6769449`. The docs have since been expanded and the current PR head is newer (`a912fff08094d293912b4dde6e7c1fc3aa333eb5` at the time of this note). Therefore run #42 does **not** validate the latest PR head. At last check its backend and frontend jobs passed, but the browser/read-only API smoke job was still in progress. Do not merge until a successful run is associated with the current head and its required checks are complete.


## Current execution checkpoint — 13 October 2026

- PR #65 merged at `44374253b5fe3a5d65d946ffbece37d0b3cd1704`; its workflow run `38296784536` passed frontend, backend, browser E2E, and read-only API smoke.
- Vercel deployment `dpl_GChRk727VyTCu2d6zBwThFVPE2NZ` is `READY` on the merge SHA and carries the custom-domain aliases; read-only fetch of `www.kuraliupdates.com` returned HTTP 200.
- The quota blocker is cleared for this deployment.
- Current PR branch: `refactor/extract-seller-product-mapper`. Scope: move the unchanged Seller product response mapper to `src/entities/sellerProduct.ts`, add deterministic mapper tests, and run those tests in the existing single CI workflow.
- This is a pure mapping boundary, not a state/API split. Do not change seller product endpoints, CRUD handlers, fallback behavior, or product types. Merge only after exact-head CI and preview verification pass.
- Modular monolith remains the target. No separate role deployments or runtime module federation in this phase.


## Current execution checkpoint — 13 October 2026 (PR #66)

- PR #66 merged: https://github.com/imgupta/kuraliupdates-bazaar/pull/66
- Main SHA: `9ee871abfb60d86cce3a396b816bf778e99f8e5d`.
- CI run #38298764709 passed all three jobs: frontend checks, browser E2E/read-only smoke, and backend tests.
- Vercel deployment `dpl_F1uvjC9QwBPdqPYJ6LH7eCkmQw6K` is `READY` and deployed from the exact main SHA.
- Merged change: `mapSellerProduct` extracted to `src/entities/sellerProduct.ts`; regression tests are in `tests/sellerProduct.test.ts` and are invoked by the existing `.github/workflows/e2e-login.yml`.
- This remains a pure mapper boundary. No endpoint, CRUD semantics, AppContext state/action, auth/session, localStorage, OTP, backend contract, or database schema/data behavior changed.
- Do not infer authenticated five-role E2E coverage from the green browser job; verify per-role test report status (passed vs skipped).
- **Next:** complete the transitive dependency inventory in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`, including indirect API calls, request/response and error/fallback contracts, storage/session reads, timers/listeners, and mutation classification. No broader runtime extraction until that checklist is complete.


## Source-tracing checkpoint — 13 October 2026

- PR #67 merged at `7edd96455a57da73d76e03fdea817d30e629b577`; post-merge workflow #38300351263 passed frontend, backend, browser E2E, and read-only API smoke checks.
- Vercel deployment `dpl_13kh7LcMfTADMQNUfdKte1V9JEHm` is `READY` on the exact main SHA.
- A read-only source pass documented polling cadence and API failure semantics in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`: shared backend sync 45s, Delivery jobs 10s, LiveOrderMap tracking 5s, Daily Help Provider refresh 10s plus active timer tick 1s, Admin refresh 45s.
- `bazaarApi` methods do not share one error contract. Some catch failures and return empty/default values (`null`, `[]`, `false`), some return structured result objects, and others throw. Preserve the observed contract in any future domain grouping.
- **Next gate:** finish the endpoint/payload/error/fallback inventory and mutation classification for every consumer. No AppContext state/API-domain extraction until that map is explicitly marked complete and reviewed.


## Buyer/auth trace extension — 13 October 2026

The source survey expanded to nested Buyer and auth components. Details are in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`. Notable boundary rules:

- Buyer Daily Help catalogue/booking remains in the Buyer domain; provider availability, job acceptance, OTP start, service timer, earnings, and slot management remain in the Daily Help Provider domain.
- Buyer booking creation is transactional. The Buyer Daily Help UI polls booking state at 5 seconds during `IN_PROGRESS`, otherwise 15 seconds, and updates the active service timer display every second.
- `OrderTrackingModal` and Delivery's `LiveOrderMap` both call live tracking. Avoid duplicate polling ownership or moving tracking logic without checking both call paths.
- Legacy `AuthPage.tsx`, current `AuthPageV2.tsx`, and `BuyerRegistrationPage.tsx` all contain OTP-related paths. Check routing/import reachability before any auth consolidation; preserve OTP/session semantics.
- Main CI #38300661109 passed after PR #68. No runtime changes in PR #67 or #68. The domain map remains partial.


## Checkpoint after PR #69 — 13 October 2026

- Main commit: `0659a5e82d9eab755d017a6e8abdd8a0588f60db`; PR #69 merged and post-merge CI #38301147128 passed frontend, backend, and browser E2E/read-only smoke jobs.
- Exact-SHA Vercel deployment `dpl_CRKcGhvm2HMzFWzNhQEgRYWQXeQe` is READY with root/www/bazaar aliases.
- Dependency map has been extended to Buyer Daily Help booking, order tracking, checkout/cart, and auth consumers. A provisional endpoint index has been added, but it is not a substitute for manually verified request/response/error contracts.
- **Current phase:** read-only dependency analysis and docs only. No AppContext/API-domain extraction until all consumer edges, payload/error/fallback behavior, timers/listeners, storage effects, mutation classification, and protecting tests are documented and reviewed.
- Keep transactional flows isolated from shared records. Authenticated role tests remain unverified until each role is shown to execute rather than skip.


## Current phase — API contract tracing before state extraction

- PR #70 merged as `5645a53bd9221c3c8240d68be881c7396a23d595`; exact-head CI passed. Post-merge workflow and deployment still require explicit verification.
- Auth/session and buyer-address client contracts are now documented in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`.
- This remains a documentation and source-inspection phase. Do not begin AppContext state/API-domain extraction until the full consumer graph, request/response contracts, failure/fallback semantics, storage effects, timer cleanup, mutation classes, and regression tests are complete.
- Keep existing behavior, one session source, API endpoint/body/header/timeout semantics, and the single environment designated staging. Authenticated five-role E2E coverage is not proven by a green job if tests are skipped.


## Seller API trace checkpoint — 13 October 2026

- PR #71 merge SHA `f0c08358faeb4acd06da0700ab6d4354aed5c24e` passed post-merge workflow #38302399531 (frontend, backend, browser E2E/read-only smoke).
- Exact-SHA Vercel deployment for this merge SHA is not yet verified; the READY deployment currently verified is still on parent SHA `5645a53bd9221c3c8240d68be881c7396a23d595`.
- Seller endpoint payload/auth/failure contracts are recorded in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`. No runtime change was made.
- Next bounded phase: Delivery API trace. Continue to prohibit state/API extraction until the full map is reviewed, and do not exercise transactional or destructive operations against shared data.


## Delivery API trace checkpoint — 13 October 2026

- Seller API trace PR #72 is merged at main SHA `5235946abef42d15ec120a3509d835ae85b781de`; main workflow #38303688063 passed frontend, backend, and browser E2E/read-only smoke jobs.
- Delivery request contracts and side-effect classifications are now recorded in `docs/FRONTEND-DOMAIN-BOUNDARIES.md` on the active docs branch. This change is documentation-only.
- Exact-SHA Vercel deployment for current main is not verified; the known READY deployment remains tied to prior SHA `5645a53bd9221c3c8240d68be881c7396a23d595`.
- Continue to block API/state extraction until all domain contracts and consumer call sites are traced. Never test job claiming, OTP resend/verification, location publication, or delivery registration against shared data.


## Daily Help API trace checkpoint — 13 October 2026

- PR #73 Delivery API trace merged at main SHA `84944cea8961084bf5bf488e324cb7b287d15674`; PR-head workflow #38366106002 passed all three jobs. Post-merge workflow #38366636788 is still running at the time of this checkpoint.
- Daily Help booking, availability, provider slot/job, OTP-start and completion contracts are being traced in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`. This branch is documentation-only.
- Exact-SHA Vercel deployment for current main is not yet verified; latest queried READY deployment points to SHA `5235946abef42d15ec120a3509d835ae85b781de`.
- Do not start runtime/state/API extraction until all domain contracts and direct consumer call sites are traced and reviewed. Shared-data checks remain read-only.


## Admin API contract trace — 15 October 2026

- Daily Help API trace PR #74 merged after exact-head workflow #38366764090 passed frontend checks, backend tests, and browser E2E/read-only staging API smoke.
- Next bounded phase: document Admin read and mutation client contracts from `src/services/api.ts`; preserve observed response/error behavior and classify approval/rejection/service-management methods as writes.
- The full endpoint-to-consumer graph is still incomplete. Continue documentation/source inspection only; do not begin AppContext/state/API-domain extraction until every export and transitive consumer, payload/error/fallback contract, storage effect, timer/listener, mutation class, and protecting test is reviewed.
- Keep all live smoke checks read-only. Do not use shared data for seller/delivery approval, Daily Help service changes, booking, OTP, job claiming, location publishing, or destructive actions. A green browser job is not evidence of authenticated coverage for all five roles.


## API consumer reconciliation — 15 October 2026

- PR #75 merged at `f7c0495b5c0d94368e55e5c4654cfbd55e0138d5`; exact PR-head workflow #38617516236 passed frontend, backend, and browser E2E/read-only staging API smoke.
- Vercel deployment `dpl_3TtDhsbihxognX7G8yctGiKC8RYw` is READY for that exact SHA; domain aliases are attached.
- Static source inventory: 72 `bazaarApi` methods; 69 have apparent direct-call references in the scanned source. Review `getDemandAnalytics()`, `trackOrder()`, and `getAvailableDeliveryJobs()` as possible unused/legacy duplicates, but do not delete or consolidate without resolving indirect/aliased references and test coverage.
- Domain ownership currently observed: cross-role shared state and several sync/mutation adapters in `AppContext`; seller CRUD/orders/discounts in Seller Dashboard; Admin read/approval/service-management flows in Admin Dashboard; OTP/auth in auth pages; buyer booking in Buyer Daily Help; provider slots/jobs/booking lifecycle in Daily Help Provider; job claim/OTP/location in Delivery; live tracking in buyer tracking UI.
- Status: **inventory in progress, extraction blocked**. Next: validate candidate methods and transitive call chains; trace AppContext actions to all component consumers; record effect/cleanup and test protection. Keep this phase documentation-only, preserve API/error/auth/storage semantics, and keep live checks read-only.


## Source-audit checkpoint — 15 October 2026

- PR #76's post-merge workflow #38619030119 passed all three jobs for main SHA `204ff778b513310663d4b3c058ee45ae5482a6b8`; the matching Vercel deployment is `READY` on the same SHA.
- A targeted source review found that `getAvailableDeliveryJobs()` and `getDeliveryAvailableJobs()` share an endpoint but not a contract. One is unauthenticated/raw JSON; the other requires a token and maps backend orders. Treat as separate compatibility surfaces until reviewed, never consolidate based on endpoint similarity alone.
- `getDemandAnalytics()` overlaps the endpoint of `getAdminAnalytics()`, while Admin Dashboard uses `getAdminAnalytics()`; `trackOrder()` has no direct reference in the scanned TS/TSX source set and needs tracking-helper/test search.
- `AppContext` owns session/role hydration, many localStorage-backed cross-role collections, profile/address session persistence, and periodic backend sync. The existing 45s/10s/5s polling intervals, 1s timer ticks, geolocation lifecycle and toast timeout must be preserved or explicitly regression-tested before refactoring.
- **Gate unchanged:** no runtime/state/API extraction until the full consumer graph, exact request/response/error/fallback behavior, storage effects, effect cleanup, mutation classes and protecting tests are reviewed. Keep the modular-monolith direction; no module federation or separate role deployments.


## Direct context dependency checkpoint — 15 October 2026

- PR #77 merged at `79a152b8565d3d0fc5fc698875495d8e8d439030`; post-merge CI #38619689342 passed all three jobs and exact-SHA Vercel deployment `dpl_EcA45gc8UrMEfXUfzcXPjiPQ9M1L` is READY.
- A direct `useApp()` consumer matrix is now documented in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`, including Admin, Auth, Buyer, Seller, Delivery, Daily Help Provider, App and Header.
- The tracked frontend/test source scan finds no direct call to `getDemandAnalytics()`, `trackOrder()`, or `getAvailableDeliveryJobs()`; this is not sufficient evidence to delete them. Preserve all API methods until route/import reachability, indirect/dynamic consumers and API contract tests are resolved.
- Remaining blockers: transitive props/callback graph; auth page reachability; explicit tests for raw-vs-mapped delivery jobs, auth header behavior and fallback contracts; mutation-to-test matrix; effect/listener/timer cleanup review.
- Modular monolith remains the target. No runtime extraction, API deletion, module federation, independent role deployments, backend/schema changes or shared staging writes in this documentation phase.


## Checkpoint — 15 October 2026

- PR #78 post-merge CI is verified green on main SHA `a54dcf963048ccda0311a42e10d623811f5d9ef9`: workflow #38620540447 passed frontend checks, backend tests, and browser E2E/read-only staging smoke. Run: https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38620540447.
- Vercel deployment `dpl_H7X9WD6ZhHSBcxdmUPJ2qJbipvN8` is READY for the exact same SHA and carries the KuraliUpdates custom-domain aliases.
- Route entry trace from `src/App.tsx`: current active auth component is `AuthPageV2`; buyer registration is handled separately by `BuyerRegistrationPage`. Legacy `src/components/Auth/AuthPage.tsx` is present but not imported by App.tsx. Do not remove it until repository-wide reference and behavior checks confirm it is unused.
- The active root composition is still a single React app with one AppProvider and role-selected dashboards. Keep the modular-monolith plan; do not move to module federation or separate role deployments.
- Remaining gate before runtime extraction: complete indirect import/prop/callback reachability, mutation-to-test matrix, and contract tests around API auth headers, raw-vs-mapped delivery jobs, and error fallbacks. Shared staging remains read-only.

## Mutation-to-test matrix checkpoint — 15 October 2026

This matrix separates existing evidence from missing proof. “CI passed” means the current repository checks passed; it does not mean the corresponding authenticated business workflow was executed.

| Domain / mutation | Required isolated test coverage | Current evidence / gap |
|---|---|---|
| Buyer checkout/order creation and order status lifecycle | Service/API contract tests plus synthetic isolated-database lifecycle test; assert idempotency and status transitions | Current frontend/backend CI passed; shared-staging transactional execution is intentionally not performed. End-to-end lifecycle evidence remains a gap. |
| Buyer address/profile changes | Mapper/validation tests; persistence and session-refresh tests with a dedicated isolated identity | Saved-address and profile mapping regressions passed. Full authenticated persistence lifecycle remains to be proven in isolated staging. |
| Seller product and discount CRUD | API payload/validation tests; create-read-update-delete lifecycle using synthetic seller/product records | Seller-product mapping regression passed; full CRUD lifecycle coverage needs explicit verification. |
| Admin seller/delivery/provider approvals | Authorization tests for allowed/denied roles plus synthetic application approval/rejection tests | Client route tests are not backend authorization proof. Do not approve/reject real staging records. |
| Delivery job claim and completion | Concurrent claim/idempotency tests, status transition tests, OTP valid/invalid/expired/attempt-limit tests | Delivery OTP input validator regression passed; backend lifecycle and authorization coverage must be checked separately. |
| Delivery OTP retrieval for E2E | Staging-only allowlist, one-time retrieval, expiry, non-cacheable response, no logging, disabled-by-default and environment/database isolation tests | Open PR #52 proposes this mechanism; it remains a separate review gate. Do not enable runtime configuration until the database target is verified. |
| Delivery location/live tracking | Mocked geolocation permission/watch cleanup, throttling and request-contract tests; read-only live endpoint smoke only | Current read-only browser/API smoke passed; no location publishing or job mutation performed. |
| Daily Help booking, slots, job acceptance, start/complete OTP | Unit/API tests for state transitions, concurrency, expiry and timer cleanup; synthetic isolated transaction lifecycle | No shared-staging booking or provider writes allowed. Authenticated full lifecycle remains unverified. |
| Auth / role onboarding | OTP expiry/attempt limits, role resolution, session persistence, backend authorization, dedicated identity registration/login flows | CI passed; browser read-only success does not establish all five authenticated role flows. |
| API compatibility boundaries | Tests for auth-header presence, raw vs mapped delivery-job responses, null/empty/false/throw fallbacks | Must be in place before consolidation/removal of apparently unused methods. |

### Gate before runtime modularization

1. Add exact source/test file references for each matrix row and label each assertion as existing, newly added, or missing.
2. Verify backend authorization at the service/controller boundary; UI role guards are not a security boundary.
3. Run business lifecycle tests only against a verified isolated staging database with dedicated identities and synthetic records.
4. Keep read-only smoke checks separate from authenticated transactional E2E reporting.
5. Preserve shared AppContext, auth/session storage, polling/timer cleanup and current API error semantics during extraction.



## Runtime refactor implementation checkpoint — 19 October 2026

The first runtime refactor is being prepared on `refactor/domain-api-boundaries` (not yet merged):

1. Typed, domain-scoped API facades are introduced for Buyer booking/tracking, Seller, Delivery, Daily Help Provider, Admin, and shared tracking. Existing API implementations remain in `src/services/api.ts` for compatibility in this first step.
2. Role screens and relevant components use their scoped facade, limiting the methods visible to each consumer at compile time.
3. `AppContextType` is extracted to `src/context/AppContextContract.ts`.
4. Guarded local-storage helpers are extracted to `src/shared/storage/safeStorage.ts` without changing storage keys or fallback behavior.

This is an initial compatibility seam, not the completion of modularization. The remaining major runtime work is to move API implementations into domain files, then split AppContext state/actions/effects into tested domain hooks and shell state. These steps must preserve the existing backend API, authentication/session keys, polling/timer/geolocation cleanup, and UI behavior. No E2E or transactional staging tests are included in this workstream.
