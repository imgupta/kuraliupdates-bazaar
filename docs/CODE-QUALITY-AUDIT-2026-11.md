# Code quality and complexity audit — 17 November 2026

## Scope and method

This is a source-level review and implementation follow-up based on `main`
commit `e031437eab3e203030b39e921f066f600efeaa5c` and the consolidated
architecture-cleanup branch. It is not a SonarQube report:
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
- Follow-up status: seller registration remains routed to the dedicated
  `SellerRegistrationWizard`; buyer and professional/delivery OTP flows were
  not rewritten. The legacy component still contains seller-only branches.
  They are retained until a complete caller/route inventory and role-specific
  OTP/document-upload regression suite can prove removal safe. This PR does
  not claim that suspected unreachable auth code has been deleted.

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
- Dependency removal was not attempted: the available repository code-search
  result did not provide a complete import inventory, and package manifest
  presence alone does not establish that a package is unused. No dependency
  or lockfile was changed.
- The public ZIP remains because its contents and distribution contract have
  not been independently inspected. Removing it without that evidence could
  break a customer-facing download.

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

This PR implements the admin directory extraction and three backend
responsibility extractions with regression tests, alongside the lazy-loading
change already merged in PR #371. It deliberately retains the legacy seller
registration branches, transaction-heavy order/booking orchestration, package
manifest entries and public ZIP where complete safety evidence is not yet
available. Those are explicitly recorded as unverified candidates, not
completed cleanups.
