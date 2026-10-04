# Database

Oracle is the system of record. Flyway owns schema creation.

## Current reset
`V5__reset_application_schema.sql` is the authoritative clean rebuild migration for the application schema. It drops the discarded application tables with `CASCADE CONSTRAINTS PURGE`, then recreates the current tables and indexes.

Historical V1–V3 migrations remain only because they are already part of Flyway history. Do not edit, delete, or depend on their old address backfill behavior.

## Rules
- Stable application IDs.
- Explicit PK/FK/UNIQUE/CHECK constraints.
- Index FK columns and real query predicates.
- Keep timestamps consistent.
- One authoritative table per business concept.
- No compatibility columns or legacy backfill logic in new features.
