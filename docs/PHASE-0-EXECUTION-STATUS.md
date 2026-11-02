# Phase 0 Execution Status — PR #228

**Repository:** `imgupta/kuraliupdates-bazaar`  
**PR:** [#228 — Phase 0 source audit checkpoint](https://github.com/imgupta/kuraliupdates-bazaar/pull/228)  
**Branch:** `audit/phase-zero-source-inventory`  
**Last checked:** 2026-11-03 (UTC)  
**Disposition:** OPEN — do not authorize FE-1/BE-1 or broad refactoring yet.

This file is the operational status companion to [PHASE-0-SOURCE-AUDIT-CHECKPOINT.md](./PHASE-0-SOURCE-AUDIT-CHECKPOINT.md). It separates source changes committed in this PR from evidence that requires a running staging service, Oracle access, or external review.

## Work completed in this PR

- Preserved the source-audit checkpoint and the explicit Phase 0 stop gate.
- Corrected the Oracle Flyway history identifier in `AdminDiagnosticsController` to the standard unquoted uppercase Oracle identifier `FLYWAY_SCHEMA_HISTORY`.
- Added the required SQL*Plus/Flyway PL/SQL block terminator to V30.
- Added an explicitly activated `phase0-diagnostics` Spring profile. It disables Flyway only for this diagnostic profile, disables Hibernate DDL generation, and disables SQL initialization.
- Added `PhaseZeroOraclePreflight`, which reads only Oracle metadata: current schema, visible Flyway history-table owners, V30 history rows/checksum/success, AUTH_OTPS table presence and check constraints. It does not read business rows or execute DDL/DML. Query errors are reduced to exception class names; exception messages and connection details are not logged.
- Removed an unchecked collection cast from the preflight implementation.
- Added unit tests for read-only query behavior and graceful handling when metadata is not visible.

## Verification status

| Gate | Current evidence | Status |
|---|---|---|
| PR source changes | Changes committed to this PR branch | Implemented |
| Preflight unit tests | Included in the successful Spring Boot Maven verification step on commit `bdf12fdfdbabb5299e06825caa4dfc79757278ac` | Passed in CI |
| Spring Boot Maven verification | Completed successfully on commit `bdf12fdfdbabb5299e06825caa4dfc79757278ac` | Passed in CI |\n| Frontend lint, TypeScript and production build | All three steps completed successfully on the same commit | Passed in CI |\n| Remaining CI / E2E workflow | Workflow run is pending; no jobs returned yet | Pending |
| Oracle preflight against staging | No Oracle SQL/console/connector access is exposed by the available Render integration | Not run |
| V30 live migration history and constraint state | Render startup logs report Flyway validation failure for V30; exact Oracle row/DDL state remains unknown | Blocked on read-only Oracle evidence |
| Normal Flyway-enabled startup and health | Latest recorded backend deployment failed; no healthy startup on this PR head | Not verified |
| Registration negative authorization tests | Source audit identifies the need; approved staging execution evidence not attached | Open |
| Exhaustive backend/frontend source inventories | Existing checkpoint contains targeted inventories and explicit gaps; not yet exhaustive | Open |
| Production India-only hosting evidence | Development/staging Singapore is accepted; production resource-by-resource residency plan remains a launch gate | Open |
| Secret rotation | Explicitly deferred by owner; source exposure remains a production gate | Deferred, not closed |

## Live Render evidence checked

The Render backend service `kuraliupdates-bazaar` is configured to deploy from `main`, not this PR branch. The most recent listed deployment at the time of the check was for commit `e0264529da34ea5a512e150e9f8df5ca1c515c97` and had status `update_failed`. Runtime logs show:

- `FlywayValidateException: Validate failed: Migrations have failed validation`
- `Detected failed migration to version 30 (allow seller registration otp types)`

This proves the deployed `main` instance was failing Flyway validation at the time of the log. It does **not** establish whether V30 partially applied, whether its check constraint exists, or what the exact Flyway history checksum/status is.

The Render service has no configured PR preview deployment. No deployment was triggered from this PR because the service tracks `main`; changing service configuration or deploying unreviewed PR code to the shared service would be unsafe.


## Isolated Oracle preflight runner

A one-shot GitHub Actions workflow, `.github/workflows/phase0-oracle-preflight.yml`, has been added to the Phase 0 branch. It runs in an ephemeral GitHub-hosted runner, checks out this branch, extracts the supplied wallet into a restricted temporary directory, builds the backend and activates only `phase0-diagnostics`. It does not deploy to or alter the shared Render API service. The runner is read-only at the SQL level and uploads its sanitized log as a short-retention artifact.

Before it can connect, configure these repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `ORACLE_WALLET_BASE64`: base64-encoded contents of the existing wallet ZIP.
- `ORACLE_WALLET_PASSWORD`: password used to open that wallet ZIP.
- `ORACLE_TNS_ALIAS`: service alias from the wallet's `tnsnames.ora` (for example, the `..._high` alias).
- `ORACLE_USERNAME`: existing staging database account name.
- `ORACLE_PASSWORD`: password for that staging account.

Use a dedicated read-only Oracle account if one already exists. The diagnostic SQL is SELECT-only; it never invokes DDL/DML or Flyway repair. If only the application's existing ADMIN account is available, the workflow still executes only the read-only preflight queries, but that is a temporary least-privilege exception and must not become a permanent integration. Do not put secret values in commits, issues, PR comments or chat.

**Execution status:** workflow committed on the Phase 0 branch; execution is pending the five repository secrets above. No Oracle report has been generated yet. The shared Render service has not been modified.

## Oracle recovery safety

Do not run `flyway repair`, delete/insert history rows, drop/recreate constraints, or rerun V30 until all of the following are recorded:

1. Confirmed Oracle service/database and schema identity.
2. Read-only evidence of every visible `FLYWAY_SCHEMA_HISTORY` V30 row (version, type, checksum, success, installed rank/time).
3. Read-only evidence of the actual `AUTH_OTPS` constraint definitions and validation/enabled state.
4. Confirmed restorable backup/snapshot and its recovery owner.
5. A reviewed, state-specific recovery plan with before/after verification.

The diagnostic profile is not a repair mechanism. It must be used only for a controlled staging metadata preflight and then removed from the service's active profile configuration. Normal operation must run with Flyway enabled.

## Remaining Phase 0 exit criteria

### Backend and security
- Complete method-level route inventory for every MVC, WebSocket and non-MVC endpoint, including anonymous/public intent, authentication, role and record-ownership enforcement.
- Complete repository/service/JdbcTemplate/EntityManager/native-SQL writer inventory, including callers and table ownership.
- Map all transaction boundaries, propagation, isolation, rollback rules, locks and cross-domain writes.
- Enumerate scheduler, async, event, executor, WebSocket, cache and process-local state; prove restart/multi-instance behavior where required.
- Run synthetic negative tests for anonymous, invalid/expired/revoked session, wrong role, wrong owner, IDOR, OTP replay, duplicate/race and account suspension.
- Review DTO serialization, PII exposure, rate limiting, file/document storage, logging and audit trails.

### Database and migration
- Reconcile all migration source versions with the actual deployed Flyway history and baseline; V1–V13 source provenance remains unresolved.
- Review all migration DDL/data transformations and partial-failure behavior.
- Obtain authorized read-only Oracle schema evidence for tables, columns, constraints, indexes, triggers, sequences and migration history.
- Verify V16 profile-link backfill assumptions and ambiguous/duplicate/unmatched records before any production migration.
- Demonstrate clean-database bootstrap and a tested backup/restore/recovery procedure.

### Frontend and integrations
- Complete route → portal entry → component → API call graph and standalone bundle dependency boundaries.
- Inventory all browser storage keys, PII/token persistence, auth bootstrap, SSO handoff, polling, timers and subscription cleanup.
- Verify deep-link/refresh/back-forward behavior on the actual hosting provider.
- Inventory every external provider, data region/subprocessor, credentials, timeout, retry, webhook, retention and deletion behavior.
- Execute approved staging E2E and authorization tests with synthetic accounts and restricted artifacts.

### Operations, residency and compliance
- Produce a resource-by-resource India-only production hosting/data-flow plan covering database, backups, logs, documents, CDN, email/SMS and support access. Singapore remains acceptable for development/staging only.
- Secret rotation remains deferred by explicit owner decision; rotate/revoke committed JWT/wallet secrets, invalidate affected tokens, remove source defaults and verify environment injection before production.
- Obtain qualified review of seller/provider contracts, marketplace/payment flows, GST/tax, food/business licensing and Punjab labour/gig-worker applicability.

## Closure rule

Phase 0 may be marked complete only when each applicable criterion has an owner, evidence link, pass/fail result and residual risk disposition. A source-only audit cannot certify live Oracle state, a healthy deployment, legal compliance or India-only residency. Until those external gates are evidenced, the correct disposition is **OPEN** and FE-1/BE-1 remains gated.
