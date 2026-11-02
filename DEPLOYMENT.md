# Deployment and release runbook

## Environment
There is one deployed environment designated **staging** by the owner. Public custom domains and Render API are part of this same environment; do not assume a separate production environment.

- Frontend: six existing Vercel projects (combined Bazaar + Buyer, Seller, Delivery, Daily Help and Admin).
- Backend: Render service `kuraliupdates-bazaar`, branch `main`, Docker root `backend-java-spring/`.
- Database: Oracle configured through Render environment settings. Independently verify database/schema identity before any mutating test.

## Release gates
1. Review PR diff for secrets, generated files and unintended runtime changes.
2. Run frontend lint/type checks/build and backend `mvn clean verify`.
3. Merge only after required checks pass.
4. Verify each relevant Vercel deployment is READY on the exact merged SHA. Docs-only changes may be skipped by ignore-build rules.
5. Verify Render separately: image build succeeded, rollout reached LIVE, deployed SHA matches intended main SHA.
6. Inspect sanitized startup logs for application readiness and Flyway result.
7. Run read-only health/API smoke.
8. Run mutating E2E only after Oracle identity, dedicated synthetic fixtures, ownership and scoped cleanup are verified.

Vercel READY does not prove API readiness. A Render image build does not prove rollout completion. CI success does not prove transactional workflows executed.

## Quota-aware Vercel builds
Role-only changes should build only the affected role portal; shared runtime, dependencies, Vite config or global CSS can fan out to all portals. Combined Bazaar remains a separate target. Do not trigger artificial builds merely to test quota behavior.

## Render
Auto-deploy is enabled for `main`. Verify exact deployment SHA and final LIVE state after a merge. Do not manually redeploy or change environment variables unless required and approved.

## Database safety
Flyway owns schema changes. V13 is destructive staging/test-data cleanup; do not rerun as routine cleanup. V14 adds seller compliance fields and seller-document BLOB storage. Never edit applied migrations or expose JDBC URLs, credentials, wallet files or schema secrets.

## Rollback
Rollback application deployment to last known-good commit. Assess database compatibility separately; do not rewrite Flyway history or blindly reverse applied schema changes. Prefer a forward corrective migration.

## Security
Keep credentials in hosting secret stores. Never commit or log OTPs, tokens, Oracle wallet material, private seller documents or personal data.
