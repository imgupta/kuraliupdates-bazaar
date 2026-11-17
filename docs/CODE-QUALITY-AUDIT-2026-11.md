# Code quality and complexity audit — 17 November 2026

## Scope and method

This is a source-level review and implementation follow-up based on `main`
commit `a1bcfea0b3103e1145fe79e52889edd5e250e350` and the final hygiene
cleanup branch. It is not a SonarQube report:
cyclomatic complexity, cognitive complexity, duplication percentage, coverage,
and production bundle sizes have not been measured by a local analyzer in this
review. File counts and line counts below are structural indicators only.

The repository snapshot contains approximately 438 tracked files, including
197 Java files, 63 TypeScript files, 49 TSX files, 22 SQL migration/script
files, and 60 Markdown files.

## Findings and actions across the six workstreams

### 1. Authentication dead code and duplicate registration paths

- `AuthPageV2.tsx` is 648 lines and contains the legacy `AuthPageV2Legacy`
  flow. The exported wrapper routes seller registration to the dedicated
  `SellerRegistrationWizard` (498 lines), while buyer registration also has
  a dedicated `BuyerRegistrationPage` (224 lines).
- The legacy component still contains seller-specific form state, validation,
  payload fields and rendering branches. Those seller branches are unreachable
  through the exported seller route as currently wired, making them a strong
  dead-code candidate. They were not mechanically deleted in this change:
  delivery/professional registration shares the same component and removing
  interleaved branches without a full route/OTP regression suite risks
  changing registration behaviour.
- Buyer registration is exposed through a dedicated route and the legacy auth
  component still contains buyer registration code. The two flows are not
  assumed equivalent; field capture and API payload parity must be checked
  before consolidating them.
- Implemented: removed the unreachable seller-only validation, form fields,
  pending payload properties, document-upload branch and seller approval
  copy from `AuthPageV2Legacy`. The exported `AuthPageV2` wrapper still routes
  seller registration to `SellerRegistrationWizard`; buyer registration stays
  on `BuyerRegistrationPage`, while delivery and Daily Help registration keep
  their existing email-OTP and role-specific fields. A source-contract test
  guards these route and flow boundaries.

### 2. Admin UI decomposition

- `src/features/admin/AdminPortal.tsx` is 1,417 lines. It owns data loading,
  tab state, edit forms, configuration workflows, document review actions,
  diagnostics and multiple tab render trees.
- It already composes dedicated components for market trends, seller onboarding
  CRM, seller-registration OTP configuration and India compliance settings.
  The remaining state and callbacks are shared across tabs, so extracting JSX
  alone would create a large prop surface and could move permission checks or
  refresh semantics accidentally.
- Implemented: extracted the read-only user/role ID directory into
  `AdminDirectoryTab.tsx`; its persisted-ID grouping and search rules now live
  in the pure `adminDirectory.ts` module with focused tests. `AdminPortal.tsx`
  is reduced by roughly 100 lines without changing its root-admin gate or
  directory data sources.
- Retained: buyer/order editing, account controls, document review and
  configuration workflows remain in the parent because their callbacks and
  refresh/error state are shared. Moving those workflows still needs targeted
  interaction tests; this PR does not claim the entire admin portal is split.

### 3. Backend service responsibility review

- Largest reviewed services include `AuthService.java` (664 lines),
  `DailyHelpService.java` (535 lines) and `OrderService.java` (491 lines).
- The controller layer already has narrower admin controllers alongside
  `AdminController`, including order, seller-onboarding and diagnostics
  controllers. This is evidence of incremental decomposition already in place,
  not proof that every service boundary is clean.
- Implemented: extracted pure authentication request normalization/masking
  into `AuthRequestNormalizer`, delivery-configuration reads into
  `DeliveryConfigurationService`, and phone identity comparison into
  `PhoneIdentityMatcher`, each with focused unit tests. `OrderService` no
  longer owns delivery configuration SQL, and `DailyHelpService` no longer
  owns phone normalization details.
- Retained: order placement/cancellation and Daily Help booking/OTP lifecycle
  orchestration remain in their existing transactional services. Moving those
  methods without dedicated transaction-boundary and rollback/concurrency
  tests would be unsafe. Public API and transaction annotations are unchanged.

### 4. Portal bundle and dependency loading

- The five standalone portal HTML files use role-specific entry modules under
  `src/entries/`; those entry modules import only their matching dashboard.
  The standalone portal architecture therefore already avoids importing all
  role dashboards through `App.tsx`.
- The combined app's `src/App.tsx` previously imported all five dashboard
  modules eagerly, even though only one role dashboard is rendered at a time.
- Action: convert the combined app's role dashboards to React lazy imports
  and add an accessible loading fallback. This creates role-specific async
  chunks for the combined entry. The actual compressed bundle delta must be
  read from the exact-head Vite build; no size reduction is claimed here.
- `package.json` has no dedicated frontend unit-test or bundle-analysis
  script. Existing `lint` and `build` scripts remain the baseline gates.

### 5. Redundant code, dependencies and public artefacts

- `DeliveryPortal.tsx` has a local `uniqueOrdersById` normalizer. The shared
  `entities/orderGrouping.ts` function groups checkout child orders and
  computes aggregate checkout fields; these are different responsibilities,
  so replacing one with the other would not be a safe deduplication.
- `src/services/api.ts` is documented in code as a backwards-compatible
  facade over domain APIs. It is a migration bridge, not automatically dead
  code; it should only be removed after all importers move to domain modules.
- `public/kuraliupdates-bazaar.zip` is a 115,061-byte public asset. Its
  presence makes it web-accessible, but the archive contents and intended
  distribution purpose were not independently verified in this source-only
  review. It is retained rather than deleting a potentially intentional
  downloadable artefact without inspecting its contents and checking consumers.
- Implemented: removed stale lockfile workspace-root entries for the legacy
  `cookie-parser`, `dotenv`, `express` and `jszip` packages and their three
  corresponding `@types` packages. These packages were absent from the current
  `package.json`; the tracked tree has no root `server.js` or other tracked
  server entrypoint. The lockfile package records are retained where they may
  still be part of transitive resolution; current declared frontend dependencies
  are unchanged.
- Implemented: inspected the public ZIP central-directory inventory (78
  entries; 115,061 compressed bytes). It is an old source snapshot containing
  legacy React components, a small Spring Boot skeleton and a separate Angular
  scaffold, rather than a current release bundle. The inventory showed only
  `.env.example` (not `.env`) and no wallet, private-key, keystore, truststore
  or certificate-store paths. No in-repo README/architecture download reference
  was found. Removed the undocumented stale archive from `public/` so future
  deployments no longer publish that obsolete source snapshot. This was a
  filename/metadata inventory, not a full scan of compressed file contents.

### 6. Documentation consolidation

- Architecture, deployment, implementation-baseline and seller-onboarding
  documents are complementary operational records. Compliance, staging,
  migration-recovery and E2E limitations are intentionally preserved.
- Action: this audit is linked from `ARCHITECTURE.md`; no historical test
  evidence or release gate was deleted or rewritten as a success claim.

## Complexity snapshot

| Area | File | Lines | Structural risk |
|---|---|---:|---|
| Admin UI | `src/features/admin/AdminPortal.tsx` | 1,417 | High: many tabs and shared state |
| Auth UI | `src/components/Auth/AuthPageV2.tsx` | 648 | High: multiple roles and OTP states |
| Seller registration | `src/components/Auth/SellerRegistrationWizard.tsx` | 498 | Medium-high: multi-step document flow |
| Delivery UI | `src/features/delivery/DeliveryPortal.tsx` | 578 | Medium-high: polling, GPS and delivery state |
| Seller UI | `src/features/seller/SellerPortal.tsx` | 369 | Medium |
| Auth service | `AuthService.java` | 664 | High: identity and OTP lifecycle |
| Daily Help service | `DailyHelpService.java` | 535 | High: booking lifecycle |
| Order service | `OrderService.java` | 491 | High: order and transaction lifecycle |

These figures are not cyclomatic-complexity scores. A formal complexity baseline
requires running the configured analyzer against the checked-out commit.

## Verification required for this PR

- TypeScript lint, all five portal builds and the combined build must pass.
- Run the new auth-boundary source-contract tests and existing route/portal
  regression tests; skipped browser E2E cases remain skipped, not passed.
- Run backend Maven verification as the repository regression gate.
- No Oracle data, secrets, payment behaviour, OTP contract, API route, schema
  or migration was changed. The legacy auth cleanup removes unreachable UI
  code only; delivery/professional OTP requests remain intact.

## Outcome

The previous PRs implemented lazy dashboard loading, the admin directory
extraction and three backend responsibility extractions. This follow-up closes
the remaining low-risk audit items: seller-only dead branches are removed from
the legacy auth component while the dedicated seller wizard is preserved;
stale lockfile-only server dependencies are cleaned up; and the obsolete
public source archive is removed after metadata inventory. Transaction-heavy
order/booking orchestration and unverified third-party dependencies remain
intentionally unchanged.
