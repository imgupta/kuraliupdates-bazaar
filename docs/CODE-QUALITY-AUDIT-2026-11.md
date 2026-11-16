# Code quality and complexity audit — 17 November 2026

## Scope and method

This is a source-level review of the current `main` snapshot (base commit
`02942c16b854cdad1d13fc910506acf35afcf219`). It is not a SonarQube report:
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
- Action: preserve the dedicated seller wizard and record the verified
  unreachable seller branch for a targeted follow-up with role-specific tests.
  No authentication contract or OTP logic was changed here.

### 2. Admin UI decomposition

- `src/features/admin/AdminPortal.tsx` is 1,417 lines. It owns data loading,
  tab state, edit forms, configuration workflows, document review actions,
  diagnostics and multiple tab render trees.
- It already composes dedicated components for market trends, seller onboarding
  CRM, seller-registration OTP configuration and India compliance settings.
  The remaining state and callbacks are shared across tabs, so extracting JSX
  alone would create a large prop surface and could move permission checks or
  refresh semantics accidentally.
- Action: map the extraction boundary and retain the existing child components.
  A safe next boundary is a tab-owned controller plus view for buyer/order
  management, seller-document review and operational configuration, with
  tests for root-admin gating and refresh/save/error behaviour. No risky
  component rewrite was forced without those tests.

### 3. Backend service responsibility review

- Largest reviewed services include `AuthService.java` (664 lines),
  `DailyHelpService.java` (535 lines) and `OrderService.java` (491 lines).
- The controller layer already has narrower admin controllers alongside
  `AdminController`, including order, seller-onboarding and diagnostics
  controllers. This is evidence of incremental decomposition already in place,
  not proof that every service boundary is clean.
- Action: no service methods were moved. Authentication, order and Daily Help
  services contain transaction-sensitive workflows; splitting them safely
  requires method-level call graphs and focused rollback/concurrency tests.
  Existing public API, transaction annotations and repository interactions
  are intentionally unchanged.

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
- Dependency removal was not attempted: package manifest presence alone does
  not establish that a package is unused, and a complete import/reference scan
  plus lockfile-aware build is required. No dependency or lockfile was changed.

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

- TypeScript lint and all five portal builds plus the combined build must pass.
- Inspect Vite output to confirm role dashboards are emitted as async chunks and
  that the selected dashboard loads successfully.
- Run existing browser E2E for buyer, seller, delivery, professional and admin
  route entry. Skipped tests remain skipped and must not be counted as passes.
- Backend source is unchanged; Maven verification remains a required regression
  gate for the repository.
- No Oracle data, secrets, staging configuration, payment behaviour, OTP
  behaviour, schema or migration was changed.

## Outcome

This PR implements the low-risk bundle-loading improvement and consolidates
all six audit workstreams into a source-backed record. It deliberately does not
claim that all high-risk refactors or every suspected dead-code deletion have
been completed. The remaining candidates above need targeted tests and
method-level evidence before deletion or extraction is safe.
