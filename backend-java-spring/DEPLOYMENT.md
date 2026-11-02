# Backend deployment and verification

## Render service

- Service: `kuraliupdates-bazaar`
- Branch: `main`
- Root directory: `backend-java-spring/`
- Runtime: Docker using this directory's Dockerfile
- API base: `https://kuraliupdates-bazaar.onrender.com/api/v1`

## Release verification

After a merge, compare the Render deployment commit SHA with the intended repository commit. A successful image build is not the same as a completed rollout: require the deployment to reach LIVE and inspect sanitized startup logs for application readiness and Flyway outcome.

The owner-designated deployed environment is one shared staging environment. Verify the actual Oracle target/schema independently before any write-heavy test. Do not change environment variables or trigger a manual deployment merely to force a status refresh.

## Database migrations

Flyway is authoritative. The current latest migration in source is V14, `V14__seller_compliance_and_documents.sql`, which adds seller compliance fields and private document BLOB storage. V13 is a destructive staging/test-data reset and must not be rerun as a routine fix. Never edit an applied migration.

Do not run `schema-oracle.sql` against an existing database; it is a schema rebuild script. Do not use legacy runtime SQL as a substitute for versioned Flyway migrations.

## Seller document security

The seller document API accepts a limited file allowlist and size limit and performs content/signature checks. Confirm seller ownership for upload/list and admin-only access for verification/download. Database encryption at rest and TLS do not provide application-layer encryption or malware scanning; these remain explicit security-hardening items unless separately implemented and tested.

## Bargaining and checkout

Negotiation chat is persisted in Oracle and accessed through authenticated APIs. An accepted offer must be validated server-side during checkout; negotiated price must not mutate the catalogue product's base price. Keep the chat schema and current migration names aligned with the actual Flyway inventory; do not retain obsolete V14 references to negotiation-chat schema.

## Safety

Never print credentials, wallet contents, OTP values, bearer tokens, private documents or unnecessary personal data in logs or handoff documentation.
