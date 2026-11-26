# Buyer launch readiness audit

**Baseline:** `main` at `e914010e325fbde4c68c3bae2ef799507fb8684f` (PR #420)
**Assessment date:** 26 November 2026
**Disposition:** NOT APPROVED FOR PUBLIC BUYER LAUNCH

This audit separates merged source and CI evidence from staging/production evidence. A passing unit test, Vercel READY deployment or read-only smoke check is not proof of a successful customer transaction.

## Buyer experience delivered

Merged source includes catalogue search/category/product discovery, product cards and quantity controls, bargaining and accepted-offer basket behavior, Buy Now isolation, seller-grouped cart/checkout, seller-direct COD/UPI lifecycle, per-seller payment obligations, UTR submission and seller confirmation, buyer order tracking and issue reporting, Buy Again, favourites and saved lists, unit-price display, related-category discovery, catalogue-backed suggestions and the mobile cart overflow correction in PR #420.

Known limitations: favourites/lists are browser/device-local; search synonyms are curated; seller UPI ownership verification is an admin operational attestation; UTR and seller-entered refund references are not independent bank settlement proof.

## Evidence at baseline

| Area | Evidence | Status |
|---|---|---|
| Frontend regressions and TypeScript | Local frontend test runner | PASS |
| Shared and five role-portal builds | Local production builds | PASS |
| PR #420 exact-head CI | GitHub PR checks | Passed before merge |
| Buyer Vercel deployment | #420 merge SHA; alias includes buyer.kuraliupdates.com | READY |
| Live buyer checkout on deployed site | No post-merge authenticated buyer/seller transaction evidence in this audit | NOT VERIFIED |
| V48/V49/V50 migration chain | Source migrations present; isolated schema execution not evidenced here | NOT VERIFIED |
| Oracle multi-session checkout/idempotency/stock rollback | Unit/service tests are not Oracle concurrency evidence | NOT VERIFIED |
| Seller-direct UPI partial-payment lifecycle | Service tests exist; current isolated Oracle rehearsal not evidenced | NOT VERIFIED |
| Admin 403/recovery rehearsal | Earlier checkpoint recorded failures; require exact run IDs and current deployment evidence | RE-VERIFY |
| Full endpoint × role × owner IDOR matrix | Formal security register remains open | OPEN |
| Trusted proxy chain/IP rate limiting | Exact provider-to-backend peer chain/CIDRs not evidenced | OPEN |
| Five-role session/MFA/CSRF/handoff | Complete deployed-host acceptance not evidenced | OPEN |
| Backup/restore and migration recovery | Isolated restore evidence not established | OPEN |
| DTO/data exposure and sensitive-read audit | Formal security register remains open | OPEN |
| Authenticated DAST and CSP enforcement | Post-deploy evidence not established | OPEN |
| Privacy rights, retention and deletion propagation | Operational procedures/backup-expiry evidence not established | OPEN |
| Seller document lifecycle | Partial source implementation; complete operational E2E not established | OPEN |
| Notification outbox delivery/dead-letter | Source exists; provider delivery evidence not established | OPEN |
| Seller-funded refund reconciliation | Finance reconciliation evidence not established | OPEN |
| Load/capacity/alerts/recovery objectives | Production-like load report not established | OPEN |
| India-only hosting/data residency | Not verified | BLOCKING |
| Indian legal/tax/payment/marketplace/labour review | Requires qualified counsel/CA/CS and owner sign-off | BLOCKING |

## P0 — before any live customer order

1. Run V48/V49/V50 on a disposable isolated Oracle schema using the exact backend artifact; capture Flyway history, schema validation and forward-recovery evidence.
2. Execute synthetic, run-scoped Oracle transactions for single/multi-seller COD and UPI, partial payment, UTR retry/conflict, seller confirmation/rejection, unpaid dispatch denial, cancellation, expiry, refund-state handling, stock contention, idempotency and rollback. Preserve cleanup proof.
3. Verify deployed buyer/seller/admin/delivery sessions and role/owner authorization on every relevant hostname; close P0 IDOR findings without weakening intended access controls.
4. Verify proxy peer chain from provider evidence; configure only exact trusted proxy CIDRs; prove spoofed forwarding headers cannot bypass rate limits.
5. Complete admin MFA enrollment, step-up, replay rejection, recovery and break-glass procedure.
6. Complete isolated Oracle backup/restore and migration recovery rehearsal.
7. Obtain security/DBA/business-owner release approval after reviewing the evidence pack.

## P1 — before broad public rollout

1. Complete controller/DTO response inventory and sensitive-read/auth/session/denial audit coverage.
2. Run fresh post-deploy ZAP baseline and authenticated DAST with synthetic identities; triage every finding.
3. Collect CSP reports and complete staged enforcement plan.
4. Operationalize privacy rights, retention/deletion, OTP/session purge and backup expiry.
5. Complete seller document access/correction/resubmission/quarantine/retention/deletion audit.
6. Demonstrate notification outbox delivery, retries, dead-letter alerting and seller-funded refund reconciliation.
7. Complete load/capacity testing, alerting, on-call and incident response rehearsal.

## External launch approvals (cannot be established by a code PR)

- Verify actual regions for compute, Oracle, backups, object/document storage, CDN, logs, email/SMS, analytics, support and DR. If India-only hosting is required, configure every applicable resource accordingly and retain provider evidence.
- Obtain qualified Indian counsel/CA/CS review of entity/marketplace contracts, grievance process, seller-direct payments/refunds, GST/TCS, FSSAI/Legal Metrology, labour/gig-worker/insurance and Punjab applicability.
- Approve DPDP notices, purposes, rights, children/minor controls and processor contracts.
- Complete Consumer E-Commerce amendment readiness ahead of its stated 1 January 2027 effective date, based on qualified legal advice.
- Confirm seller onboarding, seller disclosures, grievance/contact operations, customer support staffing and refund reconciliation procedures.

## Controlled pilot

Only after P0 gates and external approvals are signed off: start with invited buyers and a small number of verified Kurali sellers; use low order limits and daily reconciliation; monitor checkout failures, duplicates, stock/payment mismatch, unpaid dispatch attempts, delivery, refund aging, support and API/Oracle health; expand only after documented pilot review. Never use real buyer funds to test unverified payment paths.

## Evidence handling

Record exact commit SHA, deployment IDs, workflow run IDs, environment, synthetic identity class, test time, result and cleanup outcome. Never include OTPs, tokens, credentials, UPI secrets, private seller documents or raw personal data. A skipped or unavailable test is NOT VERIFIED, not passed.

**Final decision:** Buyer frontend code is deployed, but the marketplace is NOT cleared for public launch by this audit.
