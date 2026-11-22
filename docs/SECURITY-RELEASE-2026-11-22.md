# Security release checkpoint — 22 November 2026

**Repository:** `imgupta/kuraliupdates-bazaar`  
**Branch:** `main`  
**Merged PR:** [#382 — security: consolidate web security hardening](https://github.com/imgupta/kuraliupdates-bazaar/pull/382)  
**Merge commit:** `65918519b5a17c51299e80545a77351216a5fdce`  
**Environment:** owner-designated shared staging. Vercel labels deployments as `production`; that provider target label does not change the owner's environment designation or establish a separate production environment.

> This is an evidence checkpoint, not a security certification or production-readiness approval. A deployed commit or applied migration does not prove the full release is safe.

## 1. Verified release state

| Area | Evidence | Result |
|---|---|---|
| PR merge | PR #382 merged 22 Nov 2026; merge SHA above | Confirmed |
| Vercel frontend | Six projects (Bazaar, Buyer, Seller, Delivery, Admin, Daily Help) report READY on merge SHA | Confirmed |
| Render backend | Deployment `dep-dc1ba0e417fc73bc5kf0` is LIVE on merge SHA | Confirmed |
| Oracle Flyway | Render logs show V43, V44, V45 and V46 applied to schema `ADMIN`; Flyway reports four migrations successfully applied and schema at v46 | Confirmed for these four migrations |
| Frontend CI | Frontend checks, type checks and builds completed successfully | Passed |
| Backend CI | Focused regressions and full backend verification completed successfully | Passed |
| CodeQL | Java/Kotlin and JavaScript/TypeScript analyses completed successfully | Passed |
| Dependency scan | Maven and Bun dependency manifest/lockfile scan completed successfully | Passed |
| Browser E2E | Main run #45007469777: 4 passed, 2 failed, 6 skipped | Failed |
| Oracle recovery rehearsal | Run #45007469765 failed at synthetic seller-session issuance timeout; cleanup/replay and checkout rollback proof did not complete | Failed / incomplete |
| Main-branch ZAP | ZAP job was skipped on main push. Pre-merge PR baseline had 57 PASS, 11 WARN-NEW, 0 FAIL-NEW, 0 FAIL-INPROG | Not a clean post-deploy scan |

### Deployment identifiers

- Main CI: [run #45007469777](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/45007469777)
- Oracle recovery: [run #45007469765](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/45007469765)
- Render deployment: `dep-dc1ba0e417fc73bc5kf0`
- Merge commit: [`65918519b5a17c51299e80545a77351216a5fdce`](https://github.com/imgupta/kuraliupdates-bazaar/commit/65918519b5a17c51299e80545a77351216a5fdce)

## 2. Main CI failures — must be fixed

### 2.1 Admin authorization E2E returns 403

In [main CI run #45007469777](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/45007469777), the browser E2E job failed twice (including retries):

1. Five-role portal authorization matrix expected the admin role to access `/admin/sellers/{sellerId}/documents`; staging returned HTTP 403.
2. Root admin approval-queue test expected HTTP 200 from `/admin/sellers/pending`; staging returned HTTP 403.

Diagnose the admin authentication/authorization path, session/token type, MFA step-up state, proxy/cookie behavior and endpoint policy. Do not weaken access controls or change expected status codes without proving the intended policy. Add positive and negative tests for root admin, non-root admin if supported, buyer, seller, delivery and provider identities.

The same job reported **4 passed / 2 failed / 6 skipped**. The six skipped tests included transactional lifecycle coverage; `E2E_TRANSACTIONAL_FLOWS_ENABLED=false` in that run. Skipped tests are not passes.

### 2.2 Oracle recovery rehearsal timed out

[Run #45007469765](https://github.com/imgupta/kuraliupdates-bazaar/actions/runs/45007469765) failed because the request to `POST /e2e/auth/token` for a synthetic seller session exceeded its 30-second timeout. The workflow did not reach the 60-second handoff expiry, concurrent cleanup, expired redemption assertion or checkout rollback rehearsal. No conclusion about the correctness of those Oracle operations can be drawn from this run.

Diagnose service readiness/cold start, database readiness, endpoint execution time and E2E token fixture setup. Rerun only against the designated staging target with dedicated synthetic identities and run-scoped cleanup. Capture whether the Oracle transaction actually ran.

## 3. Security controls delivered by PR #382

- First-party browser API requests use same-origin `/api/v1` proxy routing through Vercel; Vite provides local development proxy parity.
- Browser authentication uses Secure, HttpOnly, host-only session cookies and double-submit CSRF protection. Browser-readable bearer credentials are replaced by a non-secret local-storage marker. Explicit local development bearer workflow remains supported.
- Browser sessions use a 30-minute sliding idle expiry, 12-hour absolute expiry and active-use token rotation; browser refresh is coordinated across tabs. Non-browser bearer clients retain their separate 12-hour absolute session behavior.
- V43 hashes opaque session token references at rest; portal handoff/session lookups use digests.
- OTP abuse limits are 5 sends/hour and 20 verifications/hour per identifier, and 10 sends/hour and 30 verifications/hour per pseudonymous device. IP-derived limits are only safe when the trusted proxy chain is correctly configured.
- Admin MFA supports TOTP, encrypted secret storage, one-time hashed recovery codes, session-bound step-up and replay protection.
- V44 adds append-only admin security audit events for admin mutations; sensitive reads, authentication/session events and authorization denials are not yet comprehensively covered.
- Vercel and backend security headers include HSTS, no-store behavior where appropriate, nosniff, frame protection, referrer policy, Permissions Policy and CSP report-only.
- Explicit response DTOs were added for admin seller and delivery-fleet response surfaces; the complete controller/entity response inventory remains open.

### Critical configuration caveats

- `KU_SECURITY_TRUSTED_PROXY_CIDRS` remains empty/inactive until the exact Vercel-to-Render immediate-peer/proxy chain is verified. Do not trust arbitrary `X-Forwarded-For` values or populate guessed CIDRs.
- CSP remains report-only pending report collection and asset compatibility review.
- Do not rotate `JWT_SECRET` casually: admin MFA encryption key derivation depends on it. Any rotation needs a migration/re-enrollment and recovery plan.
- Verify cookie attributes, CSRF bootstrap, proxy behavior and role handoff on every deployed web hostname.
- Pre-merge ZAP baseline had 11 warnings; the scan was non-blocking and preceded deployment of the new edge headers. Re-run after deployment and triage warnings; the main push ZAP job was skipped.

## 4. Overall pending register

### P0 — release/security blockers

| ID | Pending work | Required closure evidence |
|---|---|---|
| P0-01 | Fix admin E2E 403 for seller documents and approval queue | Source-backed diagnosis; positive/negative role tests; green exact-SHA staging E2E |
| P0-02 | Fix Oracle recovery rehearsal 30-second token-issuance timeout | Successful synthetic seller session; concurrent expired-handoff cleanup; expired replay returns 401; checkout rollback rehearsal; cleanup evidence |
| P0-03 | Complete endpoint-by-endpoint IDOR/resource ownership matrix | Anonymous, wrong-role, wrong-owner, revoked/expired and authorized tests for buyer, seller, delivery, Daily Help, documents, bargaining, tracking and admin |
| P0-04 | Verify trusted proxy chain and configure only exact trusted CIDRs | Provider/network evidence for immediate peer chain; spoofed forwarding-header tests; IP rate-limit tests through actual proxy |
| P0-05 | Verify all role journeys and session behavior after cookie migration | Buyer, Seller, Delivery, Daily Help Provider and Admin login, refresh, logout, cross-portal handoff, expiry, CSRF and recovery journeys on all hostnames |
| P0-06 | Complete isolated Oracle transactional suite | Checkout, stock contention/rollback, multi-seller rollback, bargain acceptance/rejection, delivery OTP/tracking, Daily Help booking/start/complete and cleanup |
| P0-07 | Verify admin MFA enrollment and recovery operationally | Admin enrollment/step-up/replay/recovery-code/break-glass test; protected backup and owner recovery procedure |
| P0-08 | Complete backup/restore and migration recovery rehearsal | Verified Oracle backup restore to isolated target; V43–V46 forward/rollback or forward-fix plan; session continuity evidence |

### P1 — security, privacy and operations

| ID | Pending work | Required closure evidence |
|---|---|---|
| P1-01 | Complete DTO and response-data inventory | Controller-by-controller DTO mapping; no unintended entity/internal-field exposure |
| P1-02 | Extend security audit coverage | Sensitive reads, auth/session lifecycle, role/ownership denials, admin MFA events; retention, access review and alert routing |
| P1-03 | Triage security headers and ZAP warnings | Fresh post-deploy ZAP baseline; authenticated DAST with synthetic role identities; documented accepted/remediated findings |
| P1-04 | CSP enforcement readiness | CSP report collection, violation triage, asset compatibility, staged enforcement plan |
| P1-05 | Privacy rights fulfilment and data lifecycle | Operational access/correction/erasure/withdrawal workflow; retention schedules; OTP/session expiry purge; deletion propagation; backup expiry proof |
| P1-06 | Credential lifecycle evidence | Preserve authorized rotation/revocation evidence and verify secret-only runtime; review historical repository exposure and approved history remediation. Owner previously reported credentials rotated; independent evidence is still needed in the release pack. |
| P1-07 | Provider/data residency and processor map | Actual compute, DB, backups, documents, logs, CDN, email/SMS, analytics, support and DR regions; subprocessors, access and transfer assessment |
| P1-08 | CERT-In operational readiness | Applicability decision, point of contact, 180-day log/jurisdiction assessment where applicable, time sync, six-hour incident escalation rehearsal |
| P1-09 | Seller document lifecycle | Ownership, admin access, correction/resubmission, malware quarantine, retention/deletion, access audit and private download acceptance |
| P1-10 | Notifications and financial operations | Outbox delivery/retry/dead-letter evidence; seller-funded refund reconciliation and finance controls |

### P2 — product, scale and maintainability

- Complete source-backed endpoint, repository/table writer, transaction, scheduler/async/WebSocket and integration dependency inventories.
- Complete frontend route/build/import/context/session-storage mapping and architecture diagrams.
- Capacity/load tests and operational alerts for API, Oracle, OTP, queue/outbox and proxy.
- Review cost, cold-start and recovery objectives for the shared staging architecture before selecting production topology.

### Legal and marketplace launch gates

- Qualified Indian counsel/CA/CS review of entity, marketplace contracts, grievance process, direct seller payment/refunds, GST/TCS, FSSAI/Legal Metrology, labour/gig-worker obligations, insurance and Punjab-specific applicability.
- DPDP phased obligations, privacy notices, lawful purposes, rights fulfilment, children/minor controls and processor contracts.
- Consumer E-Commerce 2026 amendment readiness before its stated 1 January 2027 effective date: grievance/NCH, seller disclosures, sponsored/ranking labels, price-history controls and annual dark-pattern audit/certificate.
- India-only production hosting is a target, not a verified current state. Do not open production or live seller onboarding until provider/resource regions and legal controls are evidenced and approved.

## 5. Release decision

**Status: deployed to the owner-designated staging environment; not security-certified; not production-ready.**

Do not describe main CI as fully green. Do not describe Oracle recovery, full transactional E2E, authenticated DAST, backup/restore, full IDOR coverage, India data residency or legal sign-off as complete. Keep production and live seller intake gated until the P0 evidence pack is reviewed and approved.

## 6. Evidence handling

Keep logs sanitized. Never store OTPs, bearer/session tokens, credentials, wallet contents, private seller documents or raw personal data in this document or CI artifacts accessible beyond the approved team. Link run IDs and commit SHAs rather than copying sensitive logs.
