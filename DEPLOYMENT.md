# Deployment and release runbook

## Environment model

There is one deployed environment designated **staging** by the owner. The public website/custom domains and Render API currently belong to this same environment. Do not infer a separate production environment from Vercel's provider target label.

- Frontend: six existing Vercel projects (combined Bazaar plus Buyer, Seller, Delivery, Daily Help and Admin).
- Backend: Render service `kuraliupdates-bazaar`, branch `main`, Docker root `backend-java-spring/`.
- Database: Oracle configured through Render environment settings; independently verify database/schema identity before any mutating test.

## Release sequence

1. Review PR diff and confirm no secrets, generated files, or unintended runtime changes.
2. Run frontend lint/type checks/build and backend `mvn clean verify`.
3. Merge only after required checks pass.
4. Verify each relevant Vercel project deployment is READY on the exact merged commit SHA. For docs-only changes, confirm ignore-build behavior rather than expecting six new deployments.
5. Verify Render deployment separately: build succeeded, rollout reached LIVE, and deployed commit SHA equals intended main SHA.
6. Inspect sanitized startup logs for successful Flyway validation/migration and application readiness.
7. Run read-only health/API smoke against the intended host.
8. Run mutating staging E2E only after database identity, dedicated synthetic fixtures, run-scoped ownership and cleanup have been verified.

A Vercel READY status does not prove the API is live. A successful Render image build does not prove the new instance completed rollout. CI success does not prove real workflow execution.

## Vercel quota-aware builds

The six existing projects use changed-path/ignore-build logic. Role-only changes should build only the affected role portal; shared runtime, dependency, Vite configuration or global CSS changes can fan out to all portals. Combined Bazaar remains a separate build target. Do not trigger artificial builds merely to test quota behavior.

## Render backend

- Service: `kuraliupdates-bazaar`
- Branch: `main`
- Root: `backend-java-spring/`
- Dockerfile: `backend-java-spring/Dockerfile`
- API base: `https://kuraliupdates-bazaar.onrender.com/api/v1`

Auto-deploy is enabled. After a main commit, verify the exact deployment SHA and final LIVE state. Do not manually redeploy or change environment variables unless the deployment is genuinely stuck or an approved configuration change is required.

## Database safety

- Flyway owns schema changes; never edit applied migrations.
- V13 is destructive staging/test-data cleanup. Do not rerun as routine cleanup.
- V14 adds seller compliance fields and seller-document BLOB storage.
- Verify migration outcome and DB target from approved, sanitized sources. Do not expose JDBC URLs, credentials, wallet files or schema secrets.

## Rollback

Rollback the application to the last known-good commit using the hosting provider. Assess database compatibility separately; do not rewrite Flyway history or blindly reverse schema migrations. Prefer a forward corrective migration when data/schema changes have already been applied.

## Security

Keep all credentials in hosting secret stores. Never put OTPs, tokens, Oracle wallet material, private seller documents or personal data in Git, issue comments, logs or test artifacts.
