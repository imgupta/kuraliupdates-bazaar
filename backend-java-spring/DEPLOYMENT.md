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
Flyway is authoritative. Latest source migration is V14, `V14__seller_compliance_and_documents.sql`, adding seller compliance fields and private seller-document BLOB storage. V13 is destructive staging/test-data reset and must not be rerun routinely. Never edit applied migrations.

Do not run `schema-oracle.sql` against an existing database; it is a schema rebuild script. Do not use legacy runtime SQL as a substitute for Flyway migrations.

## Seller document security
The seller document API has a limited file allowlist, size cap and content/signature checks. Confirm seller ownership for upload/list and admin-only access for verification/download. Encryption at rest and TLS do not provide application-layer encryption or malware scanning; both remain hardening items unless separately implemented and tested.

## Bargaining
Negotiation chat is persisted in Oracle and accessed through authenticated APIs. Checkout must validate accepted offer ID and price server-side. Negotiated price must not mutate the catalogue base price.

## Safety
Never print credentials, wallet contents, OTPs, bearer tokens, private documents or unnecessary personal data.
