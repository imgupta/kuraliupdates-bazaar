# Implementation baseline — 17 November 2026

> This page is the consolidated handoff for the recent November 2026 product, onboarding, security, privacy, operations and CI changes. It records source/PR facts separately from staging evidence. It is not a legal compliance certificate or production-readiness sign-off.

## Environment and evidence boundary

- The owner-designated deployed environment remains shared **staging**. The public custom domain and API are part of this environment; do not infer that a separate production environment exists.
- Frontend: React 19, TypeScript, Vite and Tailwind, with combined Bazaar and role-specific build targets.
- Backend: Java/Spring Boot modular monolith on Render; Oracle is the configured system of record and Flyway owns schema evolution.
- API base: `https://kuraliupdates-bazaar.onrender.com/api/v1`.
- Render service: `kuraliupdates-bazaar`, branch `main`, root `backend-java-spring/`.
- Latest reviewed implementation checkpoint: PR #365 merge commit `2c6f74fc4c9be75942bc465ebb25a524cd93d95e`.
- On the associated Render rollout, logs showed 42 migrations validated and V40/V41 completed successfully; application readiness opened. This is staging evidence, not proof of backup/restore, data residency or production readiness.
- The 16 November CI recovery reruns passed backend tests, frontend checks/build, buyer token smoke, five-role authentication/authorization preflight and the browser E2E job. The browser E2E run reported five passed and seven skipped; transactional order/booking flows were not executed because `E2E_TRANSACTIONAL_FLOWS_ENABLED=false`. Do not describe full transactional E2E as passed.

## Product journeys and registration

### Public entry and Buyer

- The public entry screen is sign-in focused. Buyer registration is the primary path at `/register/buyer`; partner application links are presented from the Buyer registration page rather than as competing login cards (PR #361).
- Buyer registration initially asks for full name, email and mobile. Delivery address is optional/collapsible at registration and can be added later through My Account or first-order checkout (PR #362).
- OTP behavior follows the admin-configured channels returned by the registration OTP settings API. Enabled channels determine which OTPs are required; do not hard-code a requirement that both email and mobile OTP be enabled (PR #363).
- Checkout remains responsible for requiring a valid delivery address before a delivery order can be placed.
- Registration simplification does not change the underlying OTP provider, session/authentication protocol or payment model.

### Seller application and Admin CRM

- Seller onboarding now uses a coordinated application/CRM workflow (PRs #354, #355, #358, #359).
- The seller wizard is reduced to four steps and retains contact verification, shop/business identity, location, conditional compliance information, operating hours, shop photo and agreement acceptance.
- A verified seller lead is linked to the application; the verified email/mobile identity cannot be silently changed in a lead-linked application.
- Admin CRM supports assisted application creation/editing, document upload/review, seller continuation, application progress/correction, assignment and audit history. Seller continuation uses a one-time token that is cryptographically hashed at rest and expires after 30 days.
- Seller documents are limited to PDF/JPEG/PNG and 5 MB, checked by file signature and malware-scanned. Scanner failure or indeterminate scan must fail closed; only clean files are eligible for admin download/verification.
- Admin review/approval remains the activation gate. A submitted application or uploaded document does not itself activate a seller.

### Delivery and Daily Help provider registration

- Delivery-agent and Daily Help provider registration collect a Ward Number instead of asking the provider to choose locality. Operational locality is derived from the signed-in account with the existing Kurali fallback (PR #364).
- Ward number is persisted on both delivery-agent and Daily Help professional profiles through the associated Flyway migration.
- Daily Help provider approval and job/slot authorization remain backend-controlled; client-side state is not an authorization boundary.

## Admin operations and commerce controls

- Admin mobile usability and seller onboarding/customer CRM were improved (PR #357).
- Admin Orders workspace supports order search/inspection, controlled delivery/contact snapshot updates, eligible unpaid COD cancellation, and pre-fulfilment order-item quantity adjustments.
- Quantity adjustments lock and adjust inventory transactionally and recalculate line/subtotal/order totals while retaining existing price/discount snapshots.
- Order operation history is append-only; internal support notes are admin-only; refund requests/reconciliation are represented in a ledger; customer notices use a durable outbox.
- These capabilities do not change the documented grocery funds flow: customer pays the seller directly, seller funds the grocery refund, and the platform records/tracks the workflow. Do not claim an active payment aggregator, escrow or automatic bank-split integration without separate verified evidence.

## Security, privacy and India compliance foundations

PR #365 introduced the first integrated backend/database foundation:

- Flyway V40 adds a privacy-request register, versioned privacy-notice acknowledgement, admin compliance configuration and security audit events.
- Authenticated users can submit/track privacy requests for access, correction, erasure, consent withdrawal and grievance. The API records and tracks requests; it does not automatically export, correct, erase or withdraw all data. Operational fulfilment and evidence remain necessary.
- Admin-only configuration covers GST applicability, FSSAI-required seller categories, minimum registration age/minor policy and privacy/grievance contacts.
- Seller registration enforces configured GST/FSSAI category requirements while preserving optional defaults where configured. Format checks are not government verification and category applicability still requires legally reviewed configuration.
- Public privacy-notice metadata is exposed by the backend.
- The implementation register covers DPDP, CERT-In, Consumer E-Commerce and FSSAI topics. Treat this as an engineering/operational evidence register, not legal advice or a declaration of compliance.
- Age/minor configuration is policy metadata only. No DOB/age-assurance or verifiable parental-consent workflow was added; minors must remain disabled until an approved workflow exists.
- Existing bearer session tokens remain stored in the session table. A token-hash migration requires a planned forced re-authentication rollout and was not silently applied.
- OTP expiry purge, class-based retention/deletion, provider-region verification, India log-location evidence, backup expiry and processor-contract review remain open operational/engineering gates.
- No India-only data residency claim is made from these code changes.

## Authentication, concurrency and test safety

- Role-scoped session enforcement has been extended across seller, seller documents, delivery and order-tracking operations; backend ownership checks remain authoritative.
- Recent CI preflight verified Buyer, Seller, Delivery, Provider and Admin sessions and checked that Admin can read the approval queue while Buyer and Seller cannot.
- Portal handoff expiry cleanup was changed to a bulk, concurrency-safe operation (PR #344), with repository-level concurrent tests (PR #345).
- A staging-only Oracle rehearsal was added for concurrent one-time portal-handoff redemption and expiry cleanup (PRs #346/#347). The existence of this workflow is not proof that a successful Oracle rehearsal has been run; inspect its workflow evidence before claiming that.
- E2E cleanup was hardened for cancelled synthetic unpaid COD orders (PR #341).
- Shared staging smoke/preflight remains read-only. Transactional E2E is manual/explicitly gated and must use isolated synthetic fixtures, exact run-scoped cleanup and the designated staging lane. Never run destructive tests against customer or production data.
- Render cold-start readiness and exact deployed-backend SHA checks were improved in PRs #348/#349/#351. Browser screenshot/video capture is limited to failures and shared staging runs remain serialized (PR #342).

## Database and deployment changes

- Flyway is the sole schema-evolution mechanism. Never edit an applied migration or introduce a duplicate version number.
- PR #340 moved Oracle connectivity from wallet-based configuration to walletless JDBC Thin TCPS. Render must use the OCI TLS-authentication JDBC connection string in `ORACLE_JDBC_URL`, with credentials kept in Render secret settings. Do not use an mTLS/TNS alias string for this walletless configuration.
- Remove/avoid wallet-directory, wallet-file and OraclePKI runtime assumptions for the walletless path. Never commit wallet files or print secrets.
- PR #365 added V40 privacy/compliance structures; PR #364 added ward-number persistence. Render logs for the reviewed rollout showed V40 and V41 successful.
- For each release, independently verify frontend deployment readiness, Render deployment SHA/LIVE state, sanitized startup readiness and database migration state. CI success alone does not prove runtime or transaction correctness.

## Important remaining work / release gates

1. Run the explicitly approved transactional staging suite with synthetic fixtures to verify checkout, inventory rollback, bargaining, delivery and Daily Help lifecycle; capture cleanup evidence.
2. Verify the dedicated Oracle concurrency rehearsal and any Oracle-backed rollback test from their actual workflow runs. Do not substitute H2 tests for Oracle evidence.
3. Complete seller CRM and document lifecycle acceptance, including correction/resubmission, approval/rejection and record-level authorization.
4. Complete end-to-end admin permission matrix, order edit/cancel/refund reconciliation and notification-outbox failure/retry verification.
5. Implement and evidence privacy-request fulfilment, retention schedules, OTP/session expiry cleanup, deletion propagation and backup expiry.
6. Verify all processors/subprocessors, service regions, cross-border/support access, log location, backup/DR location and processor contracts. Production India hosting is a target requiring resource-level proof, not an achieved state.
7. Obtain qualified Indian legal/CA/CS and relevant provider/bank review for DPDP, Consumer E-Commerce, GST, FSSAI, grievance, payment/fund-flow and provider/worker arrangements.
8. Complete backup/restore rehearsal, credential rotation/revocation evidence, security audit and final production release approval.

## Related canonical documents

- [Architecture and system invariants](../ARCHITECTURE.md)
- [Current implementation status and historical evidence](CURRENT-STATE.md)
- [Seller onboarding and compliance workflow](SELLER-ONBOARDING.md)
- [Frontend portal and route inventory](FRONTEND-PORTAL-ROUTE-INVENTORY.md)
- [Deployment and release runbook](../DEPLOYMENT.md)
- [Mandatory India PR governance](INDIA-PR-GOVERNANCE.md)
- [Codebase documentation standard](CODEBASE-DOCUMENTATION-STANDARD.md)

## Change traceability

- PR #340 — walletless Oracle TLS configuration.
- PRs #341–#353 — E2E cleanup, CI/staging safety, portal handoff concurrency, readiness, security and regression coverage.
- PRs #354–#359 — seller application/CRM, document review/audit, Admin mobile/Orders workspace and seller wizard fixes.
- PRs #361–#364 — unified registration entry, simplified Buyer registration, admin-configured OTP channels and Ward Number registration.
- PR #365 — India privacy and marketplace compliance foundations.
