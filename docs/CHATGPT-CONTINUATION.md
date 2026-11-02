# Engineering handoff — KuraliUpdates

This file is a short current handoff, not a chronological debugging diary. Keep durable decisions and verified next actions here; archive or remove obsolete dated status entries rather than appending new history forever.

## Repository

- Repo: https://github.com/imgupta/kuraliupdates-bazaar
- Main branch: `main`
- Website: https://kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1
- Frontend: six existing Vercel projects (combined Bazaar + five role portals)
- Backend: Render Docker service rooted at `backend-java-spring/`
- Environment: one owner-designated shared staging environment

## Latest documented application change

PR #205, seller compliance onboarding and private Oracle BLOB documents, was merged into main as `1a44fb45da9f0061d8e9c902c825770662b9fd11` (Nov 2, 2026). This includes seller onboarding fields, document upload/list and admin review/download/verification API, Flyway V14, and associated frontend integration.

## Last observed deployment checkpoint (Nov 2, 2026)

- All six Vercel production deployment records were READY on commit `1a44fb45da9f0061d8e9c902c825770662b9fd11`.
- Render Docker build for the same commit succeeded, but the latest observed deployment status remained `update_in_progress`; a final LIVE/server-available event had not yet been confirmed.
- Therefore frontend build/deployment records were confirmed; backend rollout, V14 execution on the target Oracle schema and runtime seller document round-trip were not yet confirmed.
- Recheck live provider status before using this checkpoint as current status. This is a dated observation, not a live health claim.

## Confirmed product decisions

- Parent company plan: Kura Ventures Private Limited; KuraliUpdates as brand/business division. Incorporation and statutory registrations remain subject to professional review/filing.
- Grocery marketplace: direct customer-to-seller payment; platform earns seller commission/platform fee. No payment aggregator/bank-split integration should be described as active without code/config verification.
- Grocery refunds: seller directly refunds the customer; platform records/coordinates the case. No mandatory seller refund reserve was selected.
- Daily Help: independent provider marketplace model; confirm current runtime payment handling before describing settlement as active.
- Delivery agents use their own two-wheelers.
- Maps: OpenStreetMap fallback; Google Routes features require backend key/configuration.

## Immediate engineering priorities

1. Recheck current main CI and Render deployment status for the exact main SHA; confirm application startup and Flyway V14.
2. Run seller onboarding acceptance tests: account creation, document upload retry/recovery, BLOB round-trip, seller ownership isolation, admin-only download/verification, invalid MIME/signature/oversize rejection, and manual approval gating.
3. Complete admin frontend document-review UI; backend endpoints alone are not an end-to-end admin workflow.
4. Close seller onboarding gaps: collect FSSAI expiry where applicable; populate agreement acceptance IP where lawful/needed; define seller document download/replacement behavior; replace food-category keyword heuristic with explicit category applicability mapping.
5. Security hardening: malware scanning, assess application-layer document encryption/key management, audit log for document access/verification, retention/deletion policy and rate limits.
6. Fix registration partial-failure handling: OTP verification may create an account before a later document upload fails; provide a reliable resume/retry state and prevent silent incomplete onboarding.
7. Correct and rerun the five-role staging fixture preflight. Keep transactional E2E disabled until role/profile IDs, buyer-visible synthetic product, active Daily Help service/slot, exact local start time, database isolation and scoped cleanup all pass.
8. Continue frontend modularisation: move endpoint implementations out of the shared API module in small tested batches; preserve AppContext compatibility until consumers are migrated.

## Safety boundaries

- Do not run V13 or any destructive reset as routine cleanup.
- Do not run transactional E2E against real/shared business records.
- Do not enable staging OTP capture until database target and dedicated test identities are verified.
- Never commit or log secrets, OTPs, bearer tokens, Oracle wallet material or private seller documents.
- Mark work complete only after source, tests, CI and runtime state support the claim.
