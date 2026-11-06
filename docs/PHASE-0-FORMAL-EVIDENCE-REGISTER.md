# Phase 0 — Formal Evidence and Exit Register

**Prepared:** 6 November 2026  
**Repository baseline:** `main` at `8fb5a16b357c86c9b2a49d29fa02e70fb7d3610b` (PR #258 merged)  
**Purpose:** Reconcile Phase 0 work, evidence and exit formalities without converting missing evidence into a pass.  
**Decision:** **Formal closure is not evidenced by the current repository record.** The completed security-hardening milestone is acknowledged; the exit register remains open until the blocking evidence below is attached and independently reviewed.

## 1. What is confirmed complete

| Work item | Evidence | Disposition |
|---|---|---|
| Default-deny route policy, explicit public method/path allowlist and ADMIN route restriction | PR #231 merged; source changes and security regressions | Implemented and merged |
| Persistent one-time portal handoff storage | PR #231 / Flyway V31 source and tests | Implemented; Oracle deployment/runtime evidence must be separately retained |
| Delivery live-location ownership guard | PR #231 | Implemented and merged |
| CORS active-role / E2E run-id preflight coverage | PR #231 | Implemented and merged |
| Search analytics attribution from verified session, not caller userId | PR #231 and later Phase 1 regression coverage | Implemented and tested at stated PR scope |
| Daily Help profile mutation controller guard coverage | PR #253 | Merged; CI passed |
| Isolated H2 OTP-attempt JDBC transaction tests | PR #253 | Merged; local H2 evidence only, not Oracle proof |
| Buyer address controller session/ownership tests | PR #255 | Merged; CI passed |
| Buyer order history, tracking and pickup controller authorization tests | PR #257 | Merged; exact-head CI passed |
| Delivery controller authenticated-principal guard tests | PR #258 | Merged; 204 Maven tests passed, frontend checks passed, read-only smoke 7/0 with databaseHealthChecked=false; browser E2E 3 passed / 9 skipped |
| Buyer checkout and order-history BUYER-role enforcement at controller and service boundaries | PR #259 | Merged; 215 Maven tests passed, frontend and seller-registration quality gates passed; read-only smoke 7/0 with databaseHealthChecked=false; browser E2E 3 passed / 9 skipped |

**Important boundary:** PRs #253, #255, #257, #258 and #259 are subsequent Phase 1 authorization/test slices. They improve the evidence base but do not retroactively prove that every Phase 0 exit criterion has been met.

## 2. Formal exit checklist

Use only these dispositions: **PASS — evidence attached**, **PARTIAL — bounded evidence**, **BLOCKED — prerequisite absent**, or **NOT VERIFIED — no authoritative evidence found**.

| Exit criterion | Current disposition | Evidence / missing proof |
|---|---|---|
| Every HTTP endpoint mapped to method, path, public/authenticated role and resource owner | PARTIAL | Endpoint authorization inventory exists; exhaustive method-level matrix and proof for every sensitive route not demonstrated |
| Every sensitive endpoint has anonymous, wrong-role, wrong-owner and correct-owner tests | PARTIAL | PR #231 and Phase 1 PRs #253/#255/#257/#258/#259 cover specific slices; full seller, delivery, Daily Help, negotiation, admin and nested-resource matrix remains open |
| Every repository/entity/table/native SQL writer has a domain owner and call path | PARTIAL | Transaction/write inventory exists; current-state doc says full call graph and all writers remain incomplete |
| All transaction boundaries, propagation, isolation, rollback rules and cross-domain participants inventoried | PARTIAL | Known transaction observations recorded; exhaustive proof and failure/rollback tests remain open |
| All Flyway migrations and DDL mapped, applied versions/FKs/triggers verified against live Oracle | NOT VERIFIED | Source migration inventory exists; current live schema/applied version evidence is not attached to this register |
| Scheduled jobs, async executors, event listeners, WebSocket handlers and process-local state fully inventoried | PARTIAL | Earlier source scan found no scheduled/async/event listener in inspected paths; full repository-wide inventory and WebSocket/non-MVC confirmation required |
| External integrations, secrets, timeouts, retries, idempotency, webhooks and failure behavior inventoried | PARTIAL | Preliminary register exists; full integration inventory and verified secret lifecycle absent |
| Critical workflows traced across happy path, auth, retries, timeouts, duplicates and partial failure | PARTIAL | Workflow and transaction inventories exist; complete end-to-end evidence remains incomplete |
| Frontend route/build/import/context/auth-storage/refresh dependencies fully mapped | PARTIAL | Route and architecture inventories exist; current-state document still lists full frontend context/import/auth-storage mapping as remaining |
| Hosting, database, replicas, object storage, backups, logs, CDN, vendors, support access and DR regions verified | BLOCKED | Render backend region was observed as Singapore on 3 Nov 2026; Oracle and several other regions/vendor flows remain unverified. India is production target, not verified current residency |
| Data inventory, purposes/notices, lawful basis, processors, retention/deletion, backups and rights workflows evidenced | PARTIAL | Preliminary legal/data register exists; complete operational implementation and processor/retention evidence absent |
| Backup/restore and migration recovery rehearsal completed | NOT VERIFIED | No successful restore/recovery rehearsal evidence attached |
| Credential/wallet exposure containment, rotation and secret-only runtime validation complete | BLOCKED | PR #84 remains explicitly draft and says do not merge/deploy until replacement wallet/secret files and environment values are securely configured and validated. Treat historical committed material as potentially exposed; do not print secrets |
| Qualified Indian legal/tax/company/labour/payment professional review completed | BLOCKED | Legal register explicitly says preliminary issue spotting, not legal sign-off; counsel/CA/CS/bank/provider confirmation remains required |
| All Critical/High findings have verified containment, owner, due date and regression evidence | PARTIAL / BLOCKED | PR #84 is an explicit release blocker; hosting, legal, backup and full authorization items lack complete closure evidence |

## 3. Evidence register — links and source records

- PR #231 — Phase 0 security-hardening milestone: https://github.com/imgupta/kuraliupdates-bazaar/pull/231
- PR #253 — Daily Help profile guards and H2 OTP test isolation: https://github.com/imgupta/kuraliupdates-bazaar/pull/253
- PR #255 — buyer address ownership/session tests: https://github.com/imgupta/kuraliupdates-bazaar/pull/255
- PR #257 — buyer order history/tracking/pickup controller tests: https://github.com/imgupta/kuraliupdates-bazaar/pull/257
- PR #258 — delivery controller principal guards: https://github.com/imgupta/kuraliupdates-bazaar/pull/258
- PR #259 — buyer checkout and order-history role enforcement: https://github.com/imgupta/kuraliupdates-bazaar/pull/259
- PR #84 — Oracle wallet/secret remediation gate: https://github.com/imgupta/kuraliupdates-bazaar/pull/84
- Canonical source inventory: `PHASE-0-ENDPOINT-AUTHORIZATION-MATRIX.md`, `PHASE-0-TRANSACTION-WRITE-INVENTORY.md`, `SERVICE-DEPENDENCY-MAP.md`, `DATA-OWNERSHIP-MATRIX.md`, `INDIA-LEGAL-REGULATORY-AND-SECURITY-REGISTER.md`, `CURRENT-STATE.md`.

CI results are scoped to the exact PR heads and test suites described in each PR. A green workflow does not imply skipped authenticated E2E, Oracle concurrency, live database readiness, restore, residency or legal sign-off passed.

## 4. Required closure evidence pack

Attach these artifacts before changing the final disposition to closed:

1. Exhaustive endpoint-method-role-owner matrix, with a test reference for every sensitive route and explicit disposition for routes with no owner check.
2. Repository/table/native SQL writer and transaction-boundary inventory reconciled to the current source SHA.
3. Complete migration ledger plus authorized read-only Oracle evidence for applied versions and schema objects.
4. Isolated Oracle integration test report for critical concurrency/rollback/idempotency cases, or an approved documented exception that keeps the relevant launch gate blocked.
5. Successful backup restore and migration recovery rehearsal report, including environment, timestamp, source/target, checksums/validation and approver; never include credentials.
6. Provider evidence for compute, database, replicas, documents, backups, logs, CDN/cache, email/SMS, support and DR locations, with India production target assessed.
7. Secret incident/rotation record confirming replacement wallet and credentials are configured through protected secret storage, old credentials invalidated, and runtime validated without exposing values. Coordinate Git-history purge only after rotation and approved process.
8. Qualified Indian counsel, CA/CS, labour, insurance and bank/payment-provider review against the actual entity, contracts, fund flow and worker operations. Record reviewer role, date, scope and written outcome; this repository checklist is not that review.
9. Critical/High risk register with containment, accountable owner, due date, regression evidence and explicit risk acceptance where applicable.
10. Final reviewer sign-off tying all above artifacts to one immutable source commit and the exact environment/runtime evidence.

## 5. Sign-off form

| Field | Required entry |
|---|---|
| Source commit reviewed | Exact immutable SHA |
| Technical owner | Name / role / date |
| Security reviewer | Name / role / date |
| Data/hosting reviewer | Name / role / date |
| Legal reviewer | Qualified professional / firm / scope / date |
| Finance/tax/payment reviewer | Qualified professional/provider / scope / date |
| Backup/restore approver | Name / role / date / evidence reference |
| Critical/High risks accepted | IDs, owner, rationale, expiry |
| Final decision | OPEN / CLOSED WITH APPROVED EXCEPTIONS |
| Approval evidence | PR/review references and artifact links |

No reviewer identity, approval, legal opinion, restore result, region or secret rotation is inferred or pre-filled.

## 6. Relationship to Phase 1

Phase 1 continues independently as functional/security validation. Current Phase 1 merged authorization slices include PRs #232–#259 as recorded in `PHASE-1-EXECUTION-PLAN.md`. Remaining work includes the broader IDOR matrix, authenticated role journeys with isolated identities/OTP/cleanup, Oracle-backed concurrency and rollback, abuse/privacy controls, and operational recovery proof. Phase 1 test progress must not be used to declare Phase 0 legal, residency, backup or secret-management gates complete.

**Formal disposition as of 6 November 2026: Phase 0 milestone delivered; formal exit not evidenced. Keep Phase 0 closure and production release gates open until the closure evidence pack is complete and approved.**
