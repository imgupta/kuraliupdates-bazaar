# Microfrontend execution checkpoint

**Last updated:** 17 October 2026  
**Repository:** `imgupta/kuraliupdates-bazaar`  
**Current implementation branch:** `refactor/shared-live-order-map-boundary`

## Completed

- Established the role portal build targets for Buyer, Seller, Delivery, Daily Help Provider, and Admin; these are separate build outputs, but the repository still shares React source, transport, and compatibility state.
- Existing route registry and role-route policy regression tests cover canonical paths, legacy registration/account paths, route normalization, and client navigation policy.
- Existing focused regressions cover saved-address mapping, user-profile mapping, seller-product mapping, and cross-portal redirect behavior.
- Moved the live order map implementation from the Buyer-owned folder to `src/components/shared/LiveOrderMap.tsx`.
- Updated Delivery to import the shared map rather than reaching into the Buyer folder. Preserved the old Buyer path as a re-export for compatibility.
- Added `tests/moduleBoundaries.test.ts` and wired it into the existing GitHub Actions frontend checks.
- Corrected E2E documentation for the current OTP cooldown implementation and recorded the latest verified workflow snapshot.

## Current test and workflow facts

- Workflow: `.github/workflows/e2e-login.yml`; one unified workflow runs frontend checks/builds, backend Maven verification, guarded read-only staging API smoke checks, Playwright and gated private-report publishing.
- Playwright capture: screenshots and video are configured for each test; traces are retained on failure.
- Authenticated role cases require the staging marker, exact allowed frontend/API targets, OTP capture token and role identity. Check the HTML report for actual passed/skipped/failed counts; a green job alone does not prove every role executed.
- OTP cooldown handling no longer waits 61 seconds or retries the send. A 429 triggers a check for an already captured OTP; if none exists, the test fails promptly with guidance to use a fresh dedicated staging identity or rerun after cooldown.
- Latest previously verified workflow before this branch: [run #167](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/39033828124). Backend, frontend, E2E/read-only smoke jobs passed. The Cloudflare publish job was skipped for the PR run by design; the artifact was uploaded but hosted publication was not established by that run.
- Vercel free-plan daily deployment quota failures are intentionally ignored for now per owner direction.

## Pending

1. **This branch:** run the new module-boundary regression and the existing frontend/backend/E2E/smoke jobs; review any failures before merge.
2. Expand the source-linked dependency and mutation-to-test map, including indirect props/callbacks, timers/listeners, API auth headers, raw-vs-mapped delivery job responses, and fallback/error contracts.
3. Add deterministic contract/component tests before extracting state or API domains from `AppContext` and `bazaarApi`.
4. Define one shared auth/session contract and module public entry points before independent deployments; preserve existing localStorage keys and role/session behavior.
5. Consider a single non-public independent-portal proof of concept only after module boundaries and session handoff are tested. Do not introduce module federation or change public aliases in this step.
6. Expand transactional business-flow E2E only after the test-data/database isolation and safe cleanup strategy is explicitly verified. Current smoke probes remain read-only.

## Scope guardrails

- No backend, Oracle schema/data, authentication/OTP production behavior, order/booking lifecycle, or public routing/alias changes in this component-boundary step.
- Never use real customer data for tests; never run destructive reset migrations as routine cleanup.
- Report authenticated role skips honestly.
