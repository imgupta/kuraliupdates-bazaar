# Database and migration operations

Oracle is the system of record. Flyway owns schema creation and migration history.

## Current migration facts
- V5: application schema rebuild baseline.
- V10–V12: Daily Help slots/workflow extensions and saved-address restoration.
- V13: destructive staging/test-data reset; not a routine migration to rerun.
- V14: `V14__seller_compliance_and_documents.sql`; seller compliance fields and private seller-document BLOB table.

The ordered migration files under `backend-java-spring/src/main/resources/db/migration/` are authoritative. Applied migrations are immutable.

## V14 seller documents
Seller document metadata and binary content are stored in Oracle BLOB storage. API access is intended to enforce seller ownership for upload/list and admin authorization for review/download/verification. Verify deployed schema and endpoint behavior before relying on this operationally.

## Safe migration procedure
1. Verify Render service and independently confirm Oracle database/schema identity.
2. Review migration SQL for destructive statements, locks, indexes, constraints and recovery implications.
3. Confirm backup/recovery plan.
4. Deploy and inspect sanitized Flyway startup logs.
5. Verify expected schema version and successful migration.
6. Run read-only schema/API checks.
7. Run synthetic tests only after isolation and scoped cleanup are proven.

## V13 warning
V13 clears staging/test business data and reseeds selected catalogue data. It is a one-time destructive operation. Never run against an unverified target, never rerun to fix application defects, and never edit the applied migration.

## Design/security rules
Use stable IDs and explicit PK/FK/UNIQUE/CHECK constraints; index real query predicates; avoid duplicate representations; do not store unnecessary sensitive data. Never log OTPs, tokens, document bytes, credentials or wallet material. Prefer forward corrective migrations over rewriting history.
