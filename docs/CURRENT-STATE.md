# Current implementation status and remaining work

**Last reconciled:** 2 November 2026  
**Repository baseline:** main commit `1a44fb45da9f0061d8e9c902c825770662b9fd11` (seller compliance onboarding / private Oracle BLOB documents).

This page distinguishes merged source from deployed/runtime verification. Recheck provider status before treating dated deployment observations as current.

## Implemented in source / merged

- React + TypeScript + Vite frontend with combined Bazaar and role-specific Buyer, Seller, Delivery, Daily Help and Admin entry points.
- Domain-oriented hooks and typed API facades; AppContext remains a compatibility facade and shared API extraction is incomplete.
- Multi-seller checkout, seller-owned suborders, bargaining workflow and server-side accepted-offer validation.
- Daily Help provider/service/slot and booking lifecycle.
- Delivery agent approval, server-authoritative job claim/OTP/status/payout flows; optional combined routing/store-pickup paths require runtime feature/config verification.
- Seller compliance onboarding fields, map location, shop-front photo, agreement acceptance and applicable GST/FSSAI document integration.
- Oracle BLOB seller document storage and authenticated seller/admin document API; Flyway V14 source migration.

## Assisted seller registration and CRM — implementation candidate

The approved target design is documented in [SELLER-REGISTRATION-REDESIGN.md](SELLER-REGISTRATION-REDESIGN.md). A consolidated implementation candidate is being reviewed in [PR #217](https://github.com/imgupta/kuraliupdates-bazaar/pull/217); details and rollout gates are in [SELLER-ONBOARDING-CRM-IMPLEMENTATION.md](SELLER-ONBOARDING-CRM-IMPLEMENTATION.md).

The candidate adds pre-business dual-channel OTP, verified lead binding, callback consent, an admin-only lead queue, assignment, call notes/outcomes and follow-up scheduling, plus additive Flyway V27. It is not considered deployed or operational until CI and isolated staging verification pass. MSG91/Resend credentials, Oracle backup/restore, migration application and private ClamAV health must be independently verified. Do not accept real merchant data until those gates are met.

Locked decisions:
- Five-step mobile-first registration wizard.
- Admin-configurable seller radius, initially proposed at 5 km around verified Kurali town-centre coordinates.
- English, Punjabi and Hindi.
- Conditional compliance/document collection.
- Persistent drafts, safe buyer-to-seller account linking, backend geofence validation, manual admin review and seller status tracking.
- Seller eligibility radius remains independent of grocery delivery radius.

This is a planning baseline only. No application code, schema, hosting configuration or deployment is changed by the specification. The proposed API routes and data entities are not yet implemented contracts.

## Last deployment observation (2 Nov 2026)

- Six Vercel project deployment records were READY on commit `1a44fb45da9f0061d8e9c902c825770662b9fd11`.
- Render Docker image build for that SHA succeeded, but the latest observed Render state was `update_in_progress`; final LIVE/server-available confirmation was not observed at that time.
- Consequently Vercel deployment records were confirmed; backend rollout, V14 execution on the configured Oracle schema and runtime document BLOB round-trip were not confirmed.
- The earlier backend CI failure related to an older commit. Inspect Actions for the exact merged SHA before claiming current CI is green.

## Priority 0 — release and database verification

- [ ] Recheck exact main SHA and latest GitHub Actions conclusion.
- [ ] Confirm Render deployment for that SHA reaches LIVE and inspect sanitized startup logs.
- [ ] Confirm Flyway V14 is successfully applied to the intended Oracle schema.
- [ ] Verify API readiness and database connectivity using read-only checks.
- [ ] Do not run transactional E2E until database identity and isolated synthetic fixture ownership are proven.

## Priority 1 — seller onboarding completion

- [ ] Implement the approved redesign in [SELLER-REGISTRATION-REDESIGN.md](SELLER-REGISTRATION-REDESIGN.md), beginning with Phase 0 discovery.
- [ ] Admin frontend for seller profile/document review, preview/download, verify/reject with reason and audit history.
- [ ] FSSAI expiry capture/validation where applicable.
- [ ] Replace free-text food-category keyword heuristic with explicit centrally maintained compliance applicability mapping.
- [ ] Populate agreement acceptance evidence consistently; collect IP only if justified by privacy/legal review.
- [ ] Add seller resume/retry flow when OTP account creation succeeds but later document upload fails.
- [ ] Define seller document status, replacement and download behavior.
- [ ] Add malware scanning/quarantine, access audit, retention/deletion and incident-response controls.
- [ ] Threat-model application-layer encryption/key management; Oracle encryption at rest and TLS alone are not application-layer encryption.
- [ ] Test BLOB round-trip, seller ownership isolation, admin-only access, MIME/signature/size rejection and approval gating.

## Priority 2 — safe E2E and operational proof

- [ ] Correct the existing `E2E_STAGING_CONFIG_JSON`: seller/delivery/provider identity-to-profile IDs must match.
- [ ] Configure a Buyer-visible synthetic product owned by the configured seller with sufficient stock.
- [ ] Configure an active Daily Help service and available slot owned by the configured provider.
- [ ] Set Daily Help start value to exact slot time in local `YYYY-MM-DDTHH:mm:ss` format and align duration.
- [ ] Rerun the read-only five-role fixture preflight; all roles/profile/product/service/slot checks must pass.
- [ ] Confirm isolated DB target, run-scoped synthetic data and safe cleanup before enabling mutating order/booking E2E.
- [ ] Record which transactional scenarios actually ran; skipped tests are not passes.

## Priority 3 — maintainability and scale

- [ ] Continue moving endpoint implementations from shared `src/services/api.ts` into domain API modules in small tested batches.
- [ ] Split remaining AppContext state/actions/effects only after consumer mapping and contract tests; preserve compatibility until migrated.
- [ ] Add API contract tests for role/ownership boundaries and seller document lifecycle.
- [ ] Review database query plans/indexes for high-volume catalogue, order, tracking and slot queries before scaling.
- [ ] Add observability: correlation IDs, structured redacted logs, metrics, error alerts and deployment health checks.
- [ ] Review backup/restore, Oracle capacity/quotas, Render cold-start/availability and Vercel build quotas.
- [ ] Keep feature flags/configuration documented and validate startup configuration rather than assuming optional Google Routes/store-pickup modes are enabled.

## Legal / operational items (not engineering-complete)

- [ ] Counsel/accountant review of seller agreement, customer terms, refund/dispute process, marketplace disclosures, GST/FSSAI applicability and privacy/DPDP obligations.
- [ ] Confirm contracting entity and company incorporation/registrations before onboarding live sellers.
- [ ] Document grievance escalation, seller response SLA, refund evidence and commission reconciliation.
- [ ] Review delivery-agent independent-contractor terms, safety/insurance and local compliance.

## Explicitly not to claim yet

- Seller onboarding is not fully operational until admin review UI, retry/recovery and security controls are complete.
- V14 is not confirmed deployed until Render startup/database evidence confirms it.
- Google Maps road routing is not available merely because an OpenStreetMap fallback exists.
- Transactional five-role E2E is not passed merely because browser smoke or CI passes.
- A Vercel READY deployment does not prove the backend or end-to-end user journey is healthy.
