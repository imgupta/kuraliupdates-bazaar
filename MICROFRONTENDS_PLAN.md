# Microfrontend migration plan

**Status:** Proposed architecture; no production routing or deployment changes approved yet.

## Current-state verification

- The repository is one React 19 + TypeScript + Vite application in the root `src/` tree.
- `vercel.json` currently rewrites all paths to the single SPA entry point.
- The Vercel project `kuraliupdates-bazaar` is a single Vite project with the existing KuraliUpdates domains.
- Vercel's Microfrontends API currently reports that this project is not part of a Microfrontends group.
- The backend remains the existing Spring Boot REST API on Render. Do not split or duplicate backend services as part of this frontend migration.

## Target boundary

Use five independently deployable React applications, aligned to the five user roles, with a shared design system and explicit API contracts:

1. **Buyer storefront** — catalogue, cart, checkout, buyer profile and addresses.
2. **Seller portal** — seller onboarding, catalogue management and seller order workflows.
3. **Delivery portal** — delivery jobs, pickup/handover, OTP validation and tracking.
4. **Daily-help portal** — provider onboarding, availability, bookings, service timer and earnings.
5. **Admin portal** — approvals, operational oversight and support diagnostics.

A lightweight entry/shell may provide links and shared navigation, but must not become a second business application. Do not split the current app into five empty shells or duplicate working features before a route-by-route migration plan is approved.

## Shared contracts and invariants

- Keep React as the frontend technology; do not introduce Angular.
- Keep the current Spring Boot API as the system of record. No frontend may write directly to Oracle.
- Preserve existing REST paths, request/response DTOs, server-side authorization and role checks.
- Treat backend authorization as authoritative; hiding a route or button is not access control.
- Define one canonical login/session strategy before moving routes. Do not store long-lived bearer tokens in local storage or expose tokens through cross-app URLs.
- Share only versioned UI primitives and stable TypeScript API contracts. Avoid runtime sharing of application state across independently deployed frontends.
- Keep the current public domains and route behavior intact during the migration. Domain and path ownership must be explicitly mapped before changing DNS or Vercel routing.
- Use the current single deployed environment, designated staging by the owner. Do not assume a separate production environment exists.

## Rollout sequence

### Phase 0 — baseline and mapping

- Inventory route registry, authentication/session handling, role guards, API clients, global context, styles/assets and current domain aliases.
- Map each route to exactly one target application and identify shared dependencies.
- Record baseline frontend checks and read-only smoke tests.
- Decide whether Vercel Microfrontends is the intended orchestration mechanism or whether separate Vercel projects with explicit path/domain routing are simpler and sufficient. Do not enable platform routing until this decision is reviewed.

### Phase 1 — shared foundations

- Extract a versioned shared UI package and API contract package only where consumers are demonstrated.
- Define session handoff, logout propagation, deep-link behavior, error handling, telemetry and common navigation.
- Add contract tests for role-based route access and API-client behavior.

### Phase 2 — first vertical slice

- Move one bounded, low-risk route group to a separate app without changing backend contracts.
- Prefer seller portal or another isolated authenticated area over checkout or delivery OTP.
- Deploy to a non-public preview first; verify deep links, refresh, login expiry, logout, mobile layout and API calls.
- Do not point the existing public domain at the new app until all checks pass.

### Phase 3 — incremental migration

- Move one role at a time; each migration needs route ownership, rollback steps, build checks, browser tests and post-deploy smoke checks.
- Keep the old route available until the new app is verified, then switch routing atomically and observe errors before proceeding.
- Avoid simultaneous rewrites of authentication, API DTOs and routing.

### Phase 4 — retirement

- Remove old routes/components only after traffic and tests prove they are unused.
- Update architecture and deployment docs with project names, domain/path ownership, environment variables by name only, and rollback instructions.

## Release gates

Do not merge a routing or domain cutover unless all are true:

- Frontend typecheck and production builds pass for every changed app.
- Existing API contract and backend tests pass.
- Browser tests cover direct deep links, refresh, authenticated/unauthenticated access, expired sessions and logout.
- Role isolation is verified for buyer, seller, delivery agent, service provider and admin.
- Read-only staging API smoke checks pass.
- The exact frontend and backend commit SHAs are recorded and the rollback path is tested.
- No synthetic orders, bookings, OTP operations or database mutations are used on shared staging without a separately approved isolated test-data strategy.

## Immediate next implementation task

Complete the Phase 0 route/dependency inventory and propose the first vertical slice. Do not create additional Vercel projects, change domains, enable Microfrontends, or split application code until that inventory and authentication handoff are reviewed.

## Phase 0 evidence links and current gate

Use these source-backed artifacts together; they are review drafts unless explicitly merged:
- [Route and dependency inventory (PR #86)](https://github.com/imgupta/kuraliupdates-bazaar/pull/86)
- [Mutation and test-coverage map (PR #87)](https://github.com/imgupta/kuraliupdates-bazaar/pull/87)
- [Authentication/session contract (PR #88)](https://github.com/imgupta/kuraliupdates-bazaar/pull/88)

The auth/session review specifically needs to address the current localStorage-backed session snapshot and bearer token, server-authoritative session restoration, logout propagation, cross-app deep links, role enforcement, and the API client's `getMe` token-in-query behavior. Do not change that behavior as incidental frontend extraction; make any remediation a separately tested backend-compatible change.

The mutation map is a safety boundary: do not use shared staging for order/booking creation, product writes, approval changes, OTP resend/verification, delivery claims, availability changes, or location publishing. Use mocks or a separately approved isolated test environment. Inspect E2E output for skipped authenticated role scenarios before claiming complete role coverage.

**Current implementation gate:** Phase 0 only. Do not create independently deployed role apps or change public routing until the session/API contract and seller-portal mocked API/component test plan are reviewed.

## Latest verification snapshot (2026-10-14)

- Refreshed migration-plan commit `5a03ceff0595cfa08ee757903db4b1a20b6af9d1`: all CI jobs passed in [run 38630788989](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38630788989).
- [Seller product form validation PR #89](https://github.com/imgupta/kuraliupdates-bazaar/pull/89) isolates validation from React/API side effects and adds boundary tests. Its CI passed all three jobs in [run 38631176589](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/38631176589).
- **Authenticated E2E is not yet verified.** In run 38631176589, three unauthenticated browser checks passed and all five authenticated role journeys (buyer, seller, delivery agent, service provider, admin) were skipped because the designated staging OTP capture token and role identity secrets were absent. Read-only API smoke checks passed. Do not interpret the green workflow as proof of authenticated role coverage.
- Before the first role-app extraction, configure dedicated staging-only E2E identities and the secure OTP test interface, rerun the authenticated journeys, and inspect test output for skips. Continue to prohibit transactional tests against shared staging.
