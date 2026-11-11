# Backend deployment and verification

## Render service
- Service: `kuraliupdates-bazaar`
- Branch: `main`
- Root: `backend-java-spring/`
- Runtime: Docker
- API base: `https://kuraliupdates-bazaar.onrender.com/api/v1`

## Release verification
After a merge, compare Render deployment SHA with intended main SHA. Require image build success, rollout LIVE, application readiness and successful Flyway outcome. A build success alone is not a completed deployment.

The owner-designated environment is one shared staging environment. Independently verify Oracle target/schema before write-heavy tests. Do not change environment variables or trigger manual deployment just to refresh status.

## Migrations
Flyway is authoritative and remains enabled with `baseline-on-migrate: true` at baseline version 13. Current source migrations include `V22_1` and `V23` through `V36`; their presence in source does not prove they have run on the shared database. V13 is destructive staging/test-data cleanup and must not be rerun routinely. Never edit applied migrations.

Do not run `schema-oracle.sql` against an existing database; it is a schema rebuild script. Do not use legacy runtime SQL as a substitute for Flyway migrations.

## Seller document security
The seller document API has a limited file allowlist, size cap and content/signature checks. Confirm seller ownership for upload/list and admin-only access for verification/download. Encryption at rest and TLS do not provide application-layer encryption or malware scanning; both remain hardening items unless separately implemented and tested.

## Bargaining
Negotiation chat is persisted in Oracle and accessed through authenticated APIs. Checkout must validate accepted offer ID and price server-side. Negotiated price must not mutate the catalogue base price.

## Safety
Never print credentials, wallet contents, OTPs, bearer tokens, private documents or unnecessary personal data.

## Oracle wallet and credentials
Follow [Oracle wallet and credential remediation](ORACLE-WALLET-REMEDIATION.md) for the required Render Secret Files, environment variables, fail-closed startup checks, readiness verification, credential rotation sequence and rollback constraints. The wallet must not be placed in the repository or Docker image. Provision the six required files and credentials on the existing shared staging service only through an approved owner-controlled change; this repository change does not configure Render.
