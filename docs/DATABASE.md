# Database

Oracle is the system of record. Flyway owns schema creation and migration history.

## Migration history

- `V5__reset_application_schema.sql` rebuilds the current application schema.
- `V10__daily_help_professional_slots.sql`, `V11__daily_help_workflow_extensions.sql`, and `V12__backfill_saved_addresses_after_reset.sql` add Daily Help workflow support and restore compatible saved-address data.
- `V13__reset_staging_test_data.sql` is a destructive staging/test-data reset. It clears synthetic/business workflow records, retains selected admin login accounts, and reseeds the Daily Help catalogue. It is not schema creation and must never run against production.
- Historical V1–V3 migrations remain because they are part of Flyway history. Do not edit, delete, or reuse applied migrations.

## V13 operational checklist

Before running:
1. Verify staging frontend, Render service, and Oracle database/schema identity independently.
2. Verify the target is isolated staging, not production.
3. Confirm the owner has authorized this destructive reset and the intended records may be discarded.
4. Capture the current Flyway status with secrets and PII omitted.

After running:
1. Confirm V13 is recorded as successful in `flyway_schema_history`.
2. Confirm application startup and `/api/v1/health` pass.
3. Confirm standard Daily Help service catalogue rows exist.
4. Verify login/admin access and execute the staging regression checklist.
5. Record timestamp, deployed commit SHA, migration version, and sanitized outcomes.

Do not run `flyway clean`, manually delete Flyway history, or rerun V13 to fix an application defect. If an applied migration needs correction, create a new numbered migration.

## Design rules

- Stable application IDs.
- Explicit PK/FK/UNIQUE/CHECK constraints.
- Index FK columns and real query predicates.
- Keep timestamps consistent.
- One authoritative table per business concept.
- No compatibility columns or legacy backfill logic in new features.
- Never expose OTP values, credentials, tokens, wallet materials, or PII in logs/tests.
