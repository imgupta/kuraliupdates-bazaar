# Engineering handoff — KuraliUpdates

Keep this file short and current. It replaces the previous chronological debugging diary; durable architecture and current gaps live in dedicated docs.

## Repository and runtime
- Repository: https://github.com/imgupta/kuraliupdates-bazaar
- Main branch: `main`
- Website: https://kuraliupdates.com
- API: https://kuraliupdates-bazaar.onrender.com/api/v1
- Frontend: six Vercel projects (combined Bazaar + five role portals)
- Backend: Render Docker service rooted at `backend-java-spring/`
- Environment: one owner-designated shared staging environment

## Latest merged application changes
- PR #219, registration OTP audit history, merged to `main` as `9b2e51fbf20aa4f8f3d421d0725a4c9bee99624a` on 3 Nov 2026. Adds the append-only OTP policy audit table (Flyway V29), ADMIN-protected history endpoint, admin UI history view and controller regression tests. All required PR CI jobs passed.
- PR #218, independent buyer/seller registration email and mobile OTP controls, was previously merged. It introduced Flyway V28 and backend-enforced signup-only channel switches, default OFF/OFF.
- PR #205, seller compliance onboarding and private Oracle BLOB documents, merged as `1a44fb45da9f0061d8e9c902c825770662b9fd11` on 2 Nov 2026. Source includes seller onboarding fields, document upload/list and admin review/download/verification API, Flyway V14 and frontend integration.

## Last observed deployment checkpoint — 2 Nov 2026 (historical; predates PR #219)
- Six Vercel deployment records were READY on the merged SHA.
- Render Docker build for the same SHA succeeded, but latest observed deployment state remained `update_in_progress`; final LIVE confirmation was not observed.
- Backend rollout, deployed V14 and document BLOB round-trip were therefore unconfirmed at that checkpoint. Recheck provider status before relying on this dated observation.

## Confirmed business decisions
- Parent company plan: Kura Ventures Private Limited; KuraliUpdates as brand/business division. Incorporation/registrations require professional review and filing.
- Grocery: direct customer-to-seller payment; platform earns commission/platform fee. Do not describe aggregator/bank-split as active without code/config proof.
- Grocery refunds: seller directly refunds customer; platform records/co-ordinates case. No minimum seller refund reserve selected.
- Daily Help: independent provider marketplace; verify current payment implementation before describing settlement as active.
- Delivery agents use their own two-wheelers.
- Maps: OpenStreetMap fallback; Google Routes features require backend key/configuration.

## Next actions
1. Recheck exact main CI, Render LIVE status, application startup and Flyway V14/V28/V29.
2. Complete seller onboarding admin review UI and document security/retry gaps in [SELLER-ONBOARDING.md](SELLER-ONBOARDING.md).
3. Fix five-role E2E fixture preflight and prove isolated synthetic data/cleanup before mutating tests.
4. Continue domain API extraction and AppContext modularisation with regression tests.
5. Add observability, backup/restore and capacity runbooks before scale-up.

## Safety
Do not run V13 or destructive reset routinely. Do not run transactional E2E against real/shared business records. Do not enable staging OTP capture before database target and dedicated identities are verified. Never commit/log secrets, OTPs, tokens, Oracle wallet material or private seller documents. Claim completion only when source, tests, CI and runtime evidence agree.

## Architecture implementation plan

- Follow [`LOW-COST-MICROFRONTEND-MICROSERVICES-IMPLEMENTATION-PLAN.md`](LOW-COST-MICROFRONTEND-MICROSERVICES-IMPLEMENTATION-PLAN.md) for the agreed five-portal / five-domain target, one-static-site frontend deployment, low-cost backend deployment modes, domain/data ownership, phase gates, tests, Docker requirements and rollback rules.
- Initial backend decision: one Spring Boot runtime with five enforced domain modules (Mode A). Five JVM processes in one Docker image/container (Mode B) are optional only after memory, connection-pool, health, shutdown and failure testing; they share one deployment/failure domain and are not independently scalable.
- This is a plan only. No application architecture, runtime, hosting, database or deployment has been changed by the documentation work.
