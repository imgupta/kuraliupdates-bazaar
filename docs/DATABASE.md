# Database and migration operations

Oracle is the system of record. Flyway owns schema creation and migration history.

## Current migration inventory

- V5: current application schema rebuild baseline.
- V10–V12: Daily Help professional slots/workflow extensions and saved-address restoration.
- V13: destructive staging/test-data reset; not a routine migration to rerun.
- V14: `V14__seller_compliance_and_documents.sql`; seller compliance fields and private seller-document BLOB table.

The exact ordered migration files in `backend-java-spring/src/main/resources/db/migration/` are authoritative. Historical applied migrations remain immutable.

## V14 seller documents

The seller-document table stores document metadata and binary content in Oracle BLOB storage. The API is intended to enforce seller ownership for upload/list and admin authorization for review/download/verification. Verify the migration against the deployed Oracle schema before relying on it operationally.

## Safe migration procedure

1. Confirm intended Render service and independently verify Oracle database/schema identity.
2. Review the migration SQL for destructive statements, locking, indexes, constraints and rollback implications.
3. Back up/confirm recovery strategy for the target schema.
4. Deploy the backend and inspect sanitized Flyway startup output.
5. Verify Flyway reports the expected version and successful migration.
6. Run read-only schema/API checks.
7. Execute targeted synthetic tests only after isolation and cleanup are proven.

## V13 warning

V13 clears staging/test business data and reseeds selected catalogue data. It is a one-time destructive operation, not a reset button. Never run against an unverified target, never rerun to fix application bugs, and never edit the applied migration.

## Design rules

- Stable IDs and explicit PK/FK/UNIQUE/CHECK constraints.
- Index based on real query predicates and FK joins.
- Keep one authoritative representation per business concept.
- Avoid storing secrets or unnecessary sensitive personal data.
- Do not log OTPs, tokens, document bytes, credentials or wallet material.
- Prefer forward-only corrective migrations over rewriting migration history.
