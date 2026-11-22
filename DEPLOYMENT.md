# Deployment and release runbook

## Latest verified release — 22 November 2026

PR #382 merge SHA: `65918519b5a17c51299e80545a77351216a5fdce`.

- Six Vercel projects (Bazaar, Buyer, Seller, Delivery, Admin, Daily Help) are READY on the merge SHA. Provider deployment target is labelled production, but the owner-designated environment remains shared staging.
- Render deployment `dep-dc1ba0e417fc73bc5kf0` is LIVE on the same SHA.
- Render startup logs confirm Flyway applied V43–V46 to Oracle schema ADMIN; schema is at v46.
- Main CI #45007469777 failed at two admin-positive browser E2E assertions (403 instead of 200); four passed and six skipped. Transactional lifecycle E2E was disabled.
- Oracle recovery run #45007469765 timed out during synthetic seller-session issuance before cleanup/rollback checks.
- Main-push ZAP was skipped. The pre-merge baseline had 11 warnings and preceded the deployed edge headers.

Do not treat deployment readiness or migration success as full release validation. See [Security release checkpoint](docs/SECURITY-RELEASE-2026-11-22.md) for failure details and the release backlog.

## Environment

There is one deployed environment designated **staging** by the owner. Public custom domains and Render API are part of this same environment; do not assume a separate production environment.

- Frontend: Vercel projects for the combined Bazaar and role-specific portal builds.
- Backend: Render service `kuraliupdates-bazaar`, branch `main`, Docker root `backend-java-spring/`.
- Database: Oracle Autonomous Database configured through Render environment settings. Independently verify database/schema identity before any mutating test.
- Oracle connection mode: walletless JDBC Thin TCPS. Configure `ORACLE_JDBC_URL` with the TLS-authentication connection string from OCI Console → Autonomous Database → Database connection → TLS Authentication → TLS. Do not use the mTLS/TNS alias string for this configuration. Keep `ORACLE_USERNAME` and `ORACLE_PASSWORD` in Render secret settings.

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

## Quota-aware frontend builds

Role-only changes should build only the affected role portal; shared runtime, dependencies, Vite config or global CSS can fan out to all portals. Combined Bazaar remains a separate target. Do not trigger artificial builds merely to test quota behavior.

## Render and backend readiness

- Auto-deploy is enabled for `main`. Verify exact deployment SHA and final LIVE state after a merge. Do not manually redeploy or change environment variables unless required and approved.
- Allow for Render cold starts. Readiness workflows must wait for liveness before token/API smoke and must compare the health-reported backend commit with the expected deployed backend SHA.
- A workflow-only commit may not trigger a backend deployment. Resolve the expected backend SHA from the latest first-parent mainline commit that changed `backend-java-spring/`; do not compare the backend's deployed SHA blindly with a later docs/workflow-only commit.
- Inspect sanitized application logs for Flyway validation/migration success and readiness. Do not expose connection strings, credentials, wallet contents, tokens or personal data.

## Database safety

Flyway owns schema changes. Applied migrations are immutable and version numbers must be unique. Never restore a Java migration with a version already used by an SQL migration. V13 is destructive staging/test-data cleanup; do not rerun as routine cleanup. V14 adds seller compliance fields and seller-document BLOB storage.

The current Oracle runtime path is walletless TLS. Do not reintroduce wallet-directory validation, wallet files, TNS alias configuration or OraclePKI dependencies without an explicit architecture change and reviewed rollout plan.

## Staging test safety

- Shared staging health, readiness and smoke checks must be read-only.
- Pull-request preflight may create only short-lived run-tagged role sessions and must clean up only the exact run ID.
- Transactional E2E is explicitly gated/manual and must use dedicated synthetic fixtures, the serialized staging lane and run-scoped cleanup.
- Do not run destructive tests against customer data or an assumed production database.
- A test marked skipped is not a pass. Record the exact passed/failed/skipped counts and whether Oracle-backed transactions actually ran.
- H2 repository concurrency tests are useful deterministic regressions but do not replace Oracle concurrency/rollback evidence.

## Rollback

Rollback application deployment to last known-good commit. Assess database compatibility separately; do not rewrite Flyway history or blindly reverse applied schema changes. Prefer a forward corrective migration.

## Security

PR #382 adds same-origin browser API proxying, HttpOnly cookie sessions and double-submit CSRF, session token hashing (V43), OTP abuse limits, admin TOTP MFA/step-up, admin mutation audit events, browser idle/absolute expiry and rotation, and edge/backend security headers. Keep `KU_SECURITY_TRUSTED_PROXY_CIDRS` empty until exact proxy CIDRs are independently verified; CSP remains report-only pending report review. Do not rotate `JWT_SECRET` without an approved MFA encryption-key migration/re-enrollment plan. See [Security release checkpoint](docs/SECURITY-RELEASE-2026-11-22.md).


Keep credentials in hosting secret stores. Never commit or log OTPs, tokens, Oracle credentials, private seller documents or personal data. Treat historical wallet files/credentials as potentially exposed if they were ever committed; verify rotation/revocation independently rather than assuming a code removal rotated secrets.
