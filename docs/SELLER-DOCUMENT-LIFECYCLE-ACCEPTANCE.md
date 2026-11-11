# Seller document lifecycle — Phase 1 acceptance and operational runbook

**Status:** IN PROGRESS — implementation exists; runtime and end-to-end acceptance are not complete.
**Scope:** PR #323, issues #209 and #210.
**Environment:** owner-designated staging only. Use synthetic identities and synthetic documents.
**Last reconciled:** 12 November 2026.

This document separates source implementation from runtime proof. A source change, passing unit test, successful deployment, scanner health check, or database migration is not by itself evidence that the complete seller lifecycle is accepted.

## 1. Current source-backed behavior

The current `SellerDocumentController` and `ClamAvMalwareScanner` implement:

- Seller upload and metadata endpoints require an authenticated active SELLER session and resolve the seller profile from the authenticated user; caller-supplied seller IDs are not used for seller upload/list ownership.
- Upload allowlists six document categories, PDF/JPEG/PNG MIME types and file signatures, and enforces a 5 MiB maximum.
- Uploaded bytes are persisted with `QUARANTINED` scan state before scanning. Scanner failure/timeout/indeterminate response persists `SCAN_FAILED`; clean and infected results are persisted distinctly.
- Admin list, download, rescan and verification routes check ADMIN authority. Download and verification require `CLEAN`.
- Rejection requires a nonblank reason of at most 1,000 characters. Verification actor and timestamp are stored.
- ClamAV uses bounded INSTREAM chunks and bounded connect/read timeouts; missing host and scanner failures fail closed.

These are source observations only. They do not establish private network reachability, deployed configuration, a clean scan on the target runtime, durable audit evidence, retention/deletion behavior, or a full seller browser journey.

## 2. Required implementation and acceptance matrix

| ID | Requirement | Current disposition | Closure evidence |
|---|---|---|---|
| SD-01 | Upload validation, seller ownership and quarantine-first persistence | Implemented in source; exact-head regression must remain green | Unit/controller tests for anonymous, wrong role, wrong seller, invalid MIME/signature, empty/oversized files and scanner failure |
| SD-02 | Private/internal ClamAV service | Blocked — infrastructure provisioning required | Private service identity/network attachment, no public listener, backend private DNS/port configuration, health check and successful synthetic EICAR detection/clean-file tests |
| SD-03 | Fail-closed scan outcomes | Implemented in source; runtime proof pending | Test CLEAN, FOUND, timeout, refused connection, malformed/empty response and oversized scanner response; all non-clean outcomes remain inaccessible |
| SD-04 | Admin authorization and document ownership binding | Implemented in source; exhaustive route matrix pending | ADMIN allowed; anonymous and every non-admin denied; seller A cannot access seller B's document by changing either path ID |
| SD-05 | Document-access audit trail | Not evidenced by inspected controller/entity/repository | Durable, append-only audit events for admin list, successful/denied download, rescan and verification; actor, action, document/seller identifiers, timestamp, outcome and correlation ID; never store file bytes, OTPs, tokens or document contents in logs |
| SD-06 | Retention, deletion and backup expiry | Policy and implementation not evidenced | Owner + qualified counsel approve purpose-specific retention schedule; automated expiry/deletion, backup expiry behavior, legal-hold exception, deletion audit and restore/re-delete procedure tested |
| SD-07 | Rejection and replacement lifecycle | Partial — rejection reason persisted; replacement journey not proven | Rejected document remains traceable; replacement is a new immutable document record; prior review history is preserved; seller sees actionable reason |
| SD-08 | Rescan and approval gating | Partial — rescan and CLEAN gate exist | Failed/infected document cannot be downloaded or verified; clean replacement can be verified; approval cannot bypass required document types |
| SD-09 | Seller portal access after approval | Not proven by seller-document tests | Authenticated browser journey verifies pending/rejected seller cannot use restricted seller functions and approved seller can |
| SD-10 | Synthetic staging E2E | Blocked — identities, OTP capture and isolated fixture contract required | Run-scoped seller/admin identities, OTP capture allowlist, fixture create/tag/cleanup and Playwright report with redacted evidence |
| SD-11 | Data minimization and operational observability | Partial | No document bytes, filenames containing personal data, OTPs, tokens or secrets in logs/reports; metrics for scan outcomes/latency without content; access restricted to authorized admins |
| SD-12 | Recovery and failure handling | Not proven | Scanner outage, app restart, DB failure during scan-state update, duplicate upload/retry and cleanup failure tests; no fail-open path |

## 3. Infrastructure prerequisites — owner action required

1. Provision a private/internal ClamAV service reachable only from the staging backend network. Do not expose TCP 3310 or clamd to the public internet.
2. Configure staging backend `app.document-scanner.clamav.host`, `app.document-scanner.clamav.port` and timeout through protected environment configuration. The code currently reads the host from `app.document-scanner.clamav.host`; do not assume an environment variable name until the deployment's Spring relaxed-binding convention is verified.
3. Confirm ClamAV database updates, health monitoring, resource limits, network policy, patching owner and outage alerting.
4. Create dedicated synthetic seller and admin identities. Enable OTP capture only for those identities through a staging-only allowlist; do not log or expose OTPs in normal application logs.
5. Define a run-scoped fixture contract that creates uniquely tagged seller/document records and deletes only records bearing that run's unique tag. Cleanup must refuse to run without an exact run ID and verified staging target.
6. Record service resource IDs, environment, private hostname, config key names (not values), verification timestamp and responsible operator in the release evidence. Do not paste secrets or document content into GitHub.

These steps require authorized infrastructure access. They are not completed by this PR's source changes.

## 4. Required Playwright lifecycle

Run only after the prerequisites above are independently verified on an isolated synthetic staging fixture:

1. Register synthetic seller; verify pending state and restricted seller operations.
2. Upload valid synthetic document; assert quarantine is persisted before scan and status becomes CLEAN only after a successful scanner response.
3. Upload invalid signature, infected EICAR fixture, and exercise scanner timeout/unavailable cases; assert each is rejected or remains quarantined and cannot be downloaded or verified.
4. Admin lists documents and downloads only CLEAN content; verify access audit event and no-store response headers.
5. Admin rejects a clean document with a reason; verify actor, timestamp and reason.
6. Seller uploads a replacement; verify prior record/history is retained and replacement receives a new ID and scan lifecycle.
7. Force a rescan; verify clean result is required before admin verification.
8. Verify required document types and seller approval gating; assert restricted portal actions remain denied until approval.
9. Approve seller; verify seller portal access and role/ownership boundaries.
10. Execute run-scoped cleanup; verify only this run's tagged synthetic data is removed and audit evidence is retained.

The suite must capture screenshots/reports without document bytes, OTPs, bearer tokens, personal data or secrets. It must not use shared customer/seller records.

## 5. Retention and deletion decision record — unresolved

Do not invent a universal retention period. The owner, privacy lead and qualified Indian counsel must map each document category to its business/legal purpose, applicable statutory/contractual requirement, dispute/claim limitation, access need and deletion trigger. Approve a schedule with:
- category and purpose;
- lawful basis/notice and access roles;
- active-store retention trigger and period;
- backup expiry period and deletion semantics;
- legal-hold criteria and approver;
- secure deletion method and verification;
- deletion/audit metadata retained after content deletion.

Until approved, document retention/deletion is a release blocker. Do not silently delete records or add a guessed TTL migration. Any approved schema or storage change must use a reviewed Flyway expand/migrate/contract migration and include rollback/forward-fix and backup considerations.

## 6. Audit design acceptance — unresolved

Before adding persistence, inspect and reuse the repository's established audit/event conventions. The audit record should be append-only and transactionally coupled to the relevant authorization/result where possible. Record actor ID/role, action, seller/document IDs, timestamp, outcome, reason code and correlation ID. Do not duplicate file content, full request headers, tokens, OTPs, or unnecessary personal data. Define retention and access controls for audit records. Denied attempts should be captured without leaking whether a protected document exists to the caller.

No audit table or migration is asserted by this document. The implementation must be based on the actual audit architecture and verified migration baseline.

## 7. Security and India governance

- Treat seller documents as confidential business/identity data. Minimize collection to documents actually required for seller onboarding.
- Restrict raw document access to explicitly authorized admin roles; seller access is limited to own metadata/status unless a separately reviewed download feature is approved.
- Use encryption in transit and at rest; verify key management, backup encryption and access logging with the actual providers.
- Review applicable DPDP Act/Rules commencement and obligations, Consumer E-Commerce Rules, GST/FSSAI/Legal Metrology requirements only for the seller/document categories and actual activity in scope. This engineering document is not legal advice; obtain qualified Indian counsel/CA/CS sign-off where applicable.
- Staging uses synthetic/minimized data. Production hosting/data residency, vendor/subprocessor locations and cross-border access must be verified separately before launch.

## 8. Test and release checklist

- [ ] Exact PR head SHA recorded; focused seller document tests pass.
- [ ] Full backend Maven verification passes.
- [ ] Frontend lint/build and relevant portal tests pass.
- [ ] CI browser tests pass; report artifact availability or skip reason recorded.
- [ ] Private ClamAV service/network and clean/infected/timeout probes verified.
- [ ] Synthetic seller/admin/OTP capture configuration verified without exposing values.
- [ ] Full lifecycle Playwright run passes on isolated tagged fixtures.
- [ ] Audit events and access controls verified.
- [ ] Approved retention/deletion schedule and deletion/backup-expiry test attached.
- [ ] Independent security review completed; Critical/High findings have owner, containment and acceptance.
- [ ] Rollback/forward-fix and operational runbook approved.
- [ ] No deployment, secret rotation, database mutation or migration without explicit owner authorization and verified target.

## 9. Rollback and incident response

For a code regression, revert through a reviewed PR and preserve fail-closed access behavior. Never restore public clamd access or bypass scan checks as a rollback. If scanner health fails, uploads remain quarantined/SCAN_FAILED and admin download/verification remains blocked. If unauthorized document access is suspected, restrict access, preserve minimal audit evidence, follow the incident/breach process and obtain the required owner/legal/security decision. Do not purge evidence or rotate credentials outside the approved incident process.

## 10. Phase 1 exit decision

**Seller document lifecycle is NOT COMPLETE.** Source-level upload validation, quarantine, scan-state handling, admin verification and CLEAN-only access are present. Private scanner runtime, durable access audit, approved retention/deletion, synthetic full lifecycle E2E and seller portal approval journey remain open. PR #323 must remain non-merge-ready for release until applicable gates have evidence and independent review.
