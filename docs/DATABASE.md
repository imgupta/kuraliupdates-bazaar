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


## Staging reset and delivery OTP status — 11 October 2026

### Staging database reset / V13
The owner reports that staging data was cleaned and Flyway V13 was executed. The repository's intended migration is `V13__reset_staging_test_data.sql`; it is a one-time destructive **data reset**, not a schema reset. It disables Oracle parallel DML, clears business/workflow/test records, retains designated admin accounts, and reseeds the standard Daily Help catalogue. Never edit or rerun an applied migration to fix application defects. The execution report still needs read-only confirmation from `flyway_schema_history` and a sanitized database/schema identity; do not infer it from a healthy API response alone.

### Delivery OTP
- PR #36 was merged. It corrected the over-escaped browser regex, and focused OTP tests plus full backend verification passed before merge.
- Subsequent `main` commit `b970c391b040596128236fbb20be62a6e3cdff15` adds awaited server-authoritative delivery claiming and further tests for leading-zero OTP, malformed input, replay protection, and payout idempotency.
- Render deployment `dep-db5b5u15efls73ah5cj0` is LIVE on that commit. The Vercel custom-domain lookup also reports READY on that commit.
- Code-level checks passing do not constitute end-to-end proof. Complete the DEL-002 through DEL-009 cases using a dedicated staging buyer, seller, and active delivery agent; preserve the canonical order ID; verify the persisted OTP-to-order assignment; check server status read-back after success; and ensure invalid/replayed codes do not change payout or trip counts.
- Never log or publish OTP values, bearer tokens, raw authentication payloads, Oracle wallet/configuration secrets, or personal data.

### Release safety caveat
The checked Render account currently lists one web service on `main`, and no dedicated staging service is separately identified in the account metadata. The owner has stated that this is staging; before any end-to-end test that creates/mutates data, capture the approved staging Oracle target/schema identity from a safe configuration source or read-only database identity query. Do not run destructive resets or mutating end-to-end tests against an unverified target.
