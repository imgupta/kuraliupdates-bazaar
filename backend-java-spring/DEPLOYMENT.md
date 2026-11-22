# Backend deployment and verification

## Render service
- Service: `kuraliupdates-bazaar`
- Branch: `main`
- Root: `backend-java-spring/`
- Runtime: Docker
- API base: `https://kuraliupdates-bazaar.onrender.com/api/v1`

## Release verification
After a merge, compare Render deployment SHA with intended main SHA. Require image build success, rollout LIVE, application listener bound, readiness and successful Flyway outcome. A build success or open port alone is not a completed deployment.

- `/health/live` is process liveness only and must not acquire a database connection.
- `/health/ready` (also exposed as `/health`) is migration plus Oracle database readiness. It must remain HTTP 503 until Flyway succeeds and the datasource connection validates.
- Application routes return HTTP 503 while database migration is pending or failed.
- See [Render port binding and Oracle startup readiness](RENDER-PORT-BINDING.md) for startup order, failure behavior and rollout evidence.

The owner-designated environment is one shared staging environment. Independently verify Oracle target/schema before write-heavy tests. Do not change environment variables or trigger manual deployment just to refresh status.

## 22 November 2026 — latest staging migration evidence

Render deployment `dep-dc1ba0e417fc73bc5kf0` is LIVE on merge SHA `65918519b5a17c51299e80545a77351216a5fdce`. Render application logs explicitly record V43, V44, V45 and V46 applied to Oracle schema ADMIN, followed by: `Successfully applied 4 migrations ... now at version v46`.

This proves these four migrations executed on the observed staging schema. It does not prove a full database backup/restore, fresh-schema bootstrap, every constraint/index/trigger, or the failed Oracle concurrency/rollback rehearsal. The Oracle recovery workflow timed out while issuing a synthetic seller session before it reached cleanup/replay and checkout rollback checks. See [Security release checkpoint](../docs/SECURITY-RELEASE-2026-11-22.md).

## Migrations
Flyway is authoritative and remains enabled with `baseline-on-migrate: true` at baseline version 13. The latest verified staging migration checkpoint is schema version v46; Render logs confirm V43–V46 applied. Always verify current source and sanitized runtime logs for later versions; source presence alone does not prove application. V13 is destructive staging/test-data cleanup and must not be rerun routinely. Never edit applied migrations.

Do not run `schema-oracle.sql` against an existing database; it is a schema rebuild script. Do not use legacy runtime SQL as a substitute for Flyway migrations.

## Seller document security
The seller document API has a limited file allowlist, size cap and content/signature checks. Confirm seller ownership for upload/list and admin-only access for verification/download. Encryption at rest and TLS do not provide application-layer encryption or malware scanning; both remain hardening items unless separately implemented and tested.

## Bargaining
Negotiation chat is persisted in Oracle and accessed through authenticated APIs. Checkout must validate accepted offer ID and price server-side. Negotiated price must not mutate the catalogue base price.

## Safety
Never print credentials, wallet contents, OTPs, bearer tokens, private documents or unnecessary personal data.

## Oracle wallet and credentials
Follow [Oracle wallet and credential remediation](ORACLE-WALLET-REMEDIATION.md) for the required Render Secret Files, environment variables, fail-closed startup checks, readiness verification, credential rotation sequence and rollback constraints. The wallet must not be placed in the repository or Docker image. Provision the six required files and credentials on the existing shared staging service only through an approved owner-controlled change; this repository change does not configure Render.
