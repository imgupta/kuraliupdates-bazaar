# Frontend Modularisation Baseline and Execution Plan

**Status:** Routing foundation merged; domain extraction not started.  
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
- The workflow's read-only API smoke step was **skipped** because no `KURALI_API_BASE_URL` / `KURALI_STAGING_API_BASE_URL` was configured. Do not report API smoke as passed.
- A fresh Vercel deployment for merged SHA `1a8c1189` is not confirmed. Deployment API returned `402 payment_required` due to the daily deployment quota. Do not bypass quota or repeatedly retry before reset.

### Current routing surface

- Legacy routes retained: `/`, `/register/seller`, `/register/delivery`, `/register/daily-help`, `/register/buyer`, `/account`.
- Canonical role routes: `/buyer`, `/seller`, `/delivery`, `/daily-help`, `/admin`.
- Route access policy is for frontend navigation UX. Backend authorization remains authoritative.
- Browser route tests cover direct navigation, refresh, and Back/Forward at the unauthenticated UI level. Authenticated role coverage may skip without test secrets/OTP; inspect reports before claiming all five roles passed authenticated flows.

### Next gates

1. Re-check Vercel deployment quota and verify the deployed commit matches `1a8c1189`. Run read-only route checks and ensure API smoke is configured and actually runs.
2. Until the deployed routing build is verified, do not merge more runtime changes. Documentation and static dependency analysis can continue.
3. Before the first domain extraction, create the consumer-to-`useApp`/API dependency map described in `docs/FRONTEND-DOMAIN-BOUNDARIES.md`.
4. Extract one low-risk pure helper first, preserve the `useApp` compatibility facade, add tests, and keep auth/OTP/backend/schema behavior unchanged.
5. Update all three docs (this plan, continuation handoff, domain boundary inventory) at every meaningful checkpoint.

